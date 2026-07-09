import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { NoopBudgetGuard, type BudgetDecision, type BudgetGuard } from '../budget/budget'
import { ModelRouter, type RouteDecision } from '../router/router'
import { ConsoleUsageSink, type AiUsageEvent, type UsageSink } from '../usage/usage'
import { loadGatewayConfig, PROVIDER_DATA_POLICIES, type AiGatewayConfig, type TierRoute } from './config'
import { AnthropicAdapter } from './providers/anthropic'
import { GeminiAdapter } from './providers/gemini'
import { createOpenAiCompatibleAdapter } from './providers/openai-compatible'
import { OpenAiAdapter } from './providers/openai'
import {
  GatewayError,
  GatewayRequestSchema,
  PROVIDER_OPENAI_COMPATIBLE,
  describeError,
  isRecord,
  type GatewayLogger,
  type GatewayRequest,
  type GatewayResponse,
  type ProviderAdapter,
  type ProviderChatParams,
  type Redactor,
  type StreamDelta,
  type TokenUsage,
} from './types'

// The AI Gateway — the ONLY code path to model providers (R-AI1; ADR-0006).
// Call sequence, identical for complete/stream/embed:
//   validate (Zod, R-T3) → budget check (R-S4 ceilings) → route (router) →
//   attempt with bounded jittered retry → cross-provider failover on retryable
//   errors → record usage (R-AI2, gateway-written, never caller-optional) →
//   redacted logging → return.
// No singletons: construct via `new AiGateway(deps)` or the `buildGateway`
// factory. Everything is injected so Edge Functions, the web app, and tests
// wire their own sinks.

export interface AiGatewayDeps {
  config: AiGatewayConfig
  adapters: ProviderAdapter[]
  router: ModelRouter
  usageSink: UsageSink
  budgetGuard: BudgetGuard
  redactor: Redactor
  logger: GatewayLogger
}

/** Boundary schema for embed calls (R-T3). */
export const EmbedRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  feature: z.string().min(1),
  inputs: z.array(z.string().min(1)).min(1),
})
export type EmbedRequest = z.infer<typeof EmbedRequestSchema>

export interface EmbedResponse {
  embeddings: number[][]
  model: string
  provider: string
  latencyMs: number
}

export class AiGateway {
  private readonly deps: AiGatewayDeps
  private readonly adapters: Map<string, ProviderAdapter>
  /** Passive health: provider id → cooldown expiry (ms epoch). */
  private readonly cooldowns = new Map<string, number>()

  constructor(deps: AiGatewayDeps) {
    this.deps = deps
    this.adapters = new Map()
    for (const adapter of deps.adapters) {
      if (this.adapters.has(adapter.id)) {
        deps.logger.warn('ai.gateway.duplicate_adapter', { adapterId: adapter.id })
      }
      this.adapters.set(adapter.id, adapter)
    }
  }

  /**
   * Non-streaming completion. Throws GatewayError on validation failure,
   * budget denial, or when every route is exhausted (R-AI6: honest failure,
   * never a fabricated answer).
   */
  async complete(input: unknown): Promise<GatewayResponse> {
    const startedAt = Date.now()
    const requestId = randomUUID()
    const request = this.parseRequest(input)

    const budget = await this.deps.budgetGuard.check(request.workspaceId, request.tier)
    if (budget.kind === 'deny') {
      await this.recordDenied(request, requestId, startedAt)
      throw new GatewayError('budget_exceeded', budget.reason, { retryable: false })
    }

    const decision = this.route(request, budget, requestId)
    let lastError: GatewayError | undefined

    for (const attempt of decision.attempts) {
      const adapter = this.adapters.get(attempt.provider)
      if (adapter === undefined) {
        this.deps.logger.warn('ai.gateway.adapter_missing', { requestId, provider: attempt.provider })
        continue
      }
      try {
        const result = await this.withRetry(
          () => adapter.chat(this.toProviderParams(request, attempt)),
          { provider: attempt.provider, requestId },
        )
        const latencyMs = Date.now() - startedAt
        this.markHealthy(attempt.provider)
        await this.recordUsage({
          request,
          requestId,
          decision,
          attempt,
          usage: result.usage,
          latencyMs,
          outcome: 'success',
        })
        const response: GatewayResponse = {
          text: result.text,
          usage: result.usage,
          model: attempt.modelId,
          provider: attempt.provider,
          latencyMs,
        }
        if (result.toolCalls !== undefined) response.toolCalls = result.toolCalls
        return response
      } catch (error) {
        const gatewayError = asGatewayError(error, attempt.provider)
        lastError = gatewayError
        this.deps.logger.warn('ai.gateway.attempt_failed', {
          requestId,
          provider: attempt.provider,
          model: attempt.modelId,
          code: gatewayError.code,
          retryable: gatewayError.retryable,
        })
        if (gatewayError.retryable) {
          this.markUnhealthy(attempt.provider)
          continue // cross-provider failover (AIArchitecture.md §14.2)
        }
        break // non-retryable: failing over would just repeat the mistake
      }
    }

    const latencyMs = Date.now() - startedAt
    await this.recordUsage({
      request,
      requestId,
      decision,
      attempt: decision.attempts[0] ?? { provider: 'unrouted', modelId: 'unrouted' },
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs,
      outcome: 'error',
    })
    throw (
      lastError ??
      new GatewayError('provider_error', 'no adapter available for any route in tier', {
        retryable: false,
      })
    )
  }

  /**
   * Streaming variant — mirrors complete(). Failover applies only BEFORE the
   * first delta is emitted; once tokens have flowed, an error is surfaced as an
   * honest `error` delta (R-AI6). Mid-stream cross-provider failover requires
   * checkpointed conversation state and is deliberately Phase 3
   * (AIArchitecture.md §2.2 item 2).
   */
  async *stream(input: unknown): AsyncGenerator<StreamDelta, void, undefined> {
    const startedAt = Date.now()
    const requestId = randomUUID()
    const request = this.parseRequest(input)

    const budget = await this.deps.budgetGuard.check(request.workspaceId, request.tier)
    if (budget.kind === 'deny') {
      await this.recordDenied(request, requestId, startedAt)
      throw new GatewayError('budget_exceeded', budget.reason, { retryable: false })
    }

    const decision = this.route(request, budget, requestId)
    let lastError: GatewayError | undefined

    for (const attempt of decision.attempts) {
      const adapter = this.adapters.get(attempt.provider)
      if (adapter === undefined) {
        this.deps.logger.warn('ai.gateway.adapter_missing', { requestId, provider: attempt.provider })
        continue
      }
      const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 }
      let emitted = false
      try {
        for await (const delta of adapter.chatStream(this.toProviderParams(request, attempt))) {
          if (delta.type === 'usage') {
            usage.inputTokens = delta.usage.inputTokens
            usage.outputTokens = delta.usage.outputTokens
            if (delta.usage.cachedInputTokens !== undefined) {
              usage.cachedInputTokens = delta.usage.cachedInputTokens
            }
          }
          emitted = true
          yield delta
        }
        const latencyMs = Date.now() - startedAt
        this.markHealthy(attempt.provider)
        yield { type: 'done', model: attempt.modelId, provider: attempt.provider, latencyMs }
        await this.recordUsage({
          request,
          requestId,
          decision,
          attempt,
          usage,
          latencyMs,
          outcome: 'success',
        })
        return
      } catch (error) {
        const gatewayError = asGatewayError(error, attempt.provider)
        lastError = gatewayError
        this.deps.logger.warn('ai.gateway.stream_attempt_failed', {
          requestId,
          provider: attempt.provider,
          model: attempt.modelId,
          code: gatewayError.code,
          retryable: gatewayError.retryable,
          midStream: emitted,
        })
        if (gatewayError.retryable) this.markUnhealthy(attempt.provider)
        if (emitted || !gatewayError.retryable) {
          yield {
            type: 'error',
            code: gatewayError.code,
            message: gatewayError.message,
            retryable: gatewayError.retryable,
          }
          await this.recordUsage({
            request,
            requestId,
            decision,
            attempt,
            usage,
            latencyMs: Date.now() - startedAt,
            outcome: 'error',
          })
          return
        }
        // Nothing emitted yet and retryable → fail over to the next route.
      }
    }

    const finalError =
      lastError ??
      new GatewayError('provider_error', 'no adapter available for any route in tier', {
        retryable: false,
      })
    yield {
      type: 'error',
      code: finalError.code,
      message: finalError.message,
      retryable: finalError.retryable,
    }
    await this.recordUsage({
      request,
      requestId,
      decision,
      attempt: decision.attempts[0] ?? { provider: 'unrouted', modelId: 'unrouted' },
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: Date.now() - startedAt,
      outcome: 'error',
    })
  }

  /**
   * Embeddings via the pinned embeddings tier. No degradation ladder applies
   * (AIArchitecture.md §3.2); per-workspace model pinning enforcement lands
   * with the ai migrations — until then the configured tier route is the pin.
   */
  async embed(input: unknown): Promise<EmbedResponse> {
    const startedAt = Date.now()
    const requestId = randomUUID()
    const parsed = EmbedRequestSchema.safeParse(input)
    if (!parsed.success) {
      throw new GatewayError('invalid_request', parsed.error.message, { retryable: false })
    }
    const request = parsed.data

    const budget = await this.deps.budgetGuard.check(request.workspaceId, 'embeddings')
    if (budget.kind === 'deny') {
      throw new GatewayError('budget_exceeded', budget.reason, { retryable: false })
    }

    const decision = this.deps.router.resolve({
      tier: 'embeddings',
      providerHealth: this.healthSnapshot(),
      remainingBudget: budget,
    })

    let lastError: GatewayError | undefined
    for (const attempt of decision.attempts) {
      const adapter = this.adapters.get(attempt.provider)
      if (adapter === undefined) continue
      const embedFn = adapter.embed
      if (embedFn === undefined) continue
      try {
        const result = await this.withRetry(() => embedFn.call(adapter, attempt.modelId, request.inputs), {
          provider: attempt.provider,
          requestId,
        })
        const latencyMs = Date.now() - startedAt
        this.markHealthy(attempt.provider)
        await this.recordEvent({
          workspaceId: request.workspaceId,
          ...(request.userId !== undefined ? { userId: request.userId } : {}),
          feature: request.feature,
          provider: attempt.provider,
          model: attempt.modelId,
          tier: 'embeddings',
          inputTokens: result.usage.inputTokens,
          outputTokens: 0,
          cachedInputTokens: 0,
          latencyMs,
          outcome: 'success',
          requestId,
          createdAt: new Date().toISOString(),
        })
        return {
          embeddings: result.embeddings,
          model: attempt.modelId,
          provider: attempt.provider,
          latencyMs,
        }
      } catch (error) {
        const gatewayError = asGatewayError(error, attempt.provider)
        lastError = gatewayError
        if (gatewayError.retryable) {
          this.markUnhealthy(attempt.provider)
          continue
        }
        break
      }
    }
    throw (
      lastError ??
      new GatewayError('provider_error', 'no embedding-capable adapter for embeddings tier', {
        retryable: false,
      })
    )
  }

  // ---------------------------------------------------------------- internals

  private parseRequest(input: unknown): GatewayRequest {
    const parsed = GatewayRequestSchema.safeParse(input)
    if (!parsed.success) {
      throw new GatewayError('invalid_request', parsed.error.message, { retryable: false })
    }
    return parsed.data
  }

  private route(request: GatewayRequest, budget: BudgetDecision, requestId: string): RouteDecision {
    const decision = this.deps.router.resolve({
      tier: request.tier,
      providerHealth: this.healthSnapshot(),
      remainingBudget: budget,
    })
    // Routing decisions are logged per call (07_AI_Strategy.md §4.1); payloads
    // pass through the redactor so tenant content never lands in logs (R-AI2).
    this.deps.logger.info('ai.gateway.route', {
      requestId,
      decision,
      request: this.deps.redactor.redact(request),
    })
    return decision
  }

  private toProviderParams(request: GatewayRequest, attempt: TierRoute): ProviderChatParams {
    const params: ProviderChatParams = {
      model: attempt.modelId,
      messages: request.messages,
      maxTokens: request.maxTokens ?? this.deps.config.defaults.maxOutputTokens,
    }
    if (request.tools !== undefined) params.tools = request.tools
    if (request.temperature !== undefined) params.temperature = request.temperature
    return params
  }

  /** Bounded, jittered exponential backoff on a single route (ADR-0006: retry semantics are ours to own). */
  private async withRetry<T>(
    fn: () => Promise<T>,
    context: { provider: string; requestId: string },
  ): Promise<T> {
    const { maxAttemptsPerRoute, baseDelayMs, maxDelayMs } = this.deps.config.retry
    let lastError: GatewayError | undefined
    for (let attempt = 1; attempt <= maxAttemptsPerRoute; attempt += 1) {
      try {
        return await fn()
      } catch (error) {
        const gatewayError = asGatewayError(error, context.provider)
        lastError = gatewayError
        if (!gatewayError.retryable || attempt === maxAttemptsPerRoute) throw gatewayError
        const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
        const jittered = Math.round(backoff * (0.5 + Math.random() * 0.5))
        this.deps.logger.debug('ai.gateway.retry', {
          requestId: context.requestId,
          provider: context.provider,
          attempt,
          delayMs: jittered,
          code: gatewayError.code,
        })
        await sleep(jittered)
      }
    }
    // Unreachable: the loop either returns or throws on its final attempt.
    throw lastError ?? new GatewayError('provider_error', 'retry loop exhausted', { retryable: false })
  }

  private async recordUsage(args: {
    request: GatewayRequest
    requestId: string
    decision: RouteDecision
    attempt: TierRoute
    usage: TokenUsage
    latencyMs: number
    outcome: 'success' | 'error'
  }): Promise<void> {
    await this.recordEvent({
      workspaceId: args.request.workspaceId,
      ...(args.request.userId !== undefined ? { userId: args.request.userId } : {}),
      feature: args.request.feature,
      provider: args.attempt.provider,
      model: args.attempt.modelId,
      tier: args.decision.effectiveTier,
      inputTokens: args.usage.inputTokens,
      outputTokens: args.usage.outputTokens,
      cachedInputTokens: args.usage.cachedInputTokens ?? 0,
      latencyMs: args.latencyMs,
      outcome: args.outcome,
      requestId: args.requestId,
      createdAt: new Date().toISOString(),
    })
  }

  private async recordDenied(
    request: GatewayRequest,
    requestId: string,
    startedAt: number,
  ): Promise<void> {
    await this.recordEvent({
      workspaceId: request.workspaceId,
      ...(request.userId !== undefined ? { userId: request.userId } : {}),
      feature: request.feature,
      provider: 'gateway', // denied at admission — no provider was routed
      model: 'unrouted',
      tier: request.tier,
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      latencyMs: Date.now() - startedAt,
      outcome: 'denied',
      requestId,
      createdAt: new Date().toISOString(),
    })
  }

  /**
   * R-AI2 enforcement point: the gateway writes usage itself; there is no code
   * path that returns a model response without passing through here. A sink
   * failure is logged at error level (ops alert), never swallowed silently —
   * and never blocks the user-facing response that already succeeded.
   */
  private async recordEvent(event: AiUsageEvent): Promise<void> {
    try {
      await this.deps.usageSink.record(event)
    } catch (error) {
      this.deps.logger.error('ai.usage.sink_failed', {
        requestId: event.requestId,
        workspaceId: event.workspaceId,
        error: describeError(error),
      })
    }
  }

  private healthSnapshot(): Record<string, boolean> {
    const now = Date.now()
    const snapshot: Record<string, boolean> = {}
    for (const [provider, until] of this.cooldowns) {
      snapshot[provider] = until <= now
    }
    return snapshot
  }

  private markUnhealthy(provider: string): void {
    this.cooldowns.set(provider, Date.now() + this.deps.config.retry.providerCooldownMs)
  }

  private markHealthy(provider: string): void {
    this.cooldowns.delete(provider)
  }
}

/** Normalizes anything thrown into the taxonomy. Unknown errors are non-retryable: a programming error should fail loudly, not loop (R-Q6). */
export function asGatewayError(error: unknown, provider: string): GatewayError {
  if (error instanceof GatewayError) return error
  return new GatewayError('provider_error', describeError(error), {
    retryable: false,
    provider,
    cause: error,
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

// ------------------------------------------------------------------- defaults

/** Structured console logger for dev and Edge Function contexts; the app injects its own transport in production. */
export class ConsoleLogger implements GatewayLogger {
  debug(message: string, fields?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console -- default logger by design
    console.debug(message, fields ?? {})
  }
  info(message: string, fields?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console -- default logger by design
    console.info(message, fields ?? {})
  }
  warn(message: string, fields?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console -- default logger by design
    console.warn(message, fields ?? {})
  }
  error(message: string, fields?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console -- default logger by design
    console.error(message, fields ?? {})
  }
}

const REDACTED_KEYS = new Set(['content', 'text', 'input', 'inputJsonDelta', 'template', 'apiKey'])

/**
 * Default redaction: telemetry logs shapes and sizes, never tenant content
 * (07_AI_Strategy.md §8.6). A PII-classification-aware redactor replaces this
 * in Phase 3; the hook is applied to every logged payload either way (R-AI2).
 */
export class DefaultRedactor implements Redactor {
  redact(payload: unknown): unknown {
    if (Array.isArray(payload)) return payload.map((item) => this.redact(item))
    if (isRecord(payload)) {
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(payload)) {
        if (REDACTED_KEYS.has(key)) {
          out[key] = typeof value === 'string' ? `[redacted ${value.length} chars]` : '[redacted]'
        } else {
          out[key] = this.redact(value)
        }
      }
      return out
    }
    return payload
  }
}

// -------------------------------------------------------------------- factory

export interface BuildGatewayOptions {
  /**
   * Environment map injected by the caller — raw `process.env` access stays in
   * `packages/config/env.ts` (R-S3); pass the validated map from there.
   */
  env: Readonly<Record<string, string | undefined>>
  /** Extra or replacement adapters (e.g. a mock in Playwright's gateway-down suite, R-AI6). */
  adapters?: ProviderAdapter[]
  usageSink?: UsageSink
  budgetGuard?: BudgetGuard
  redactor?: Redactor
  logger?: GatewayLogger
}

/**
 * Wires a gateway from env + config: providers are instantiated only when
 * their API keys are present, and providers without a confirmed
 * zero-retention/no-training posture are wired with a loud warning
 * (config.ts PROVIDER_DATA_POLICIES; ADR-0006 compliance posture).
 */
export function buildGateway(options: BuildGatewayOptions): AiGateway {
  const logger = options.logger ?? new ConsoleLogger()
  const config = loadGatewayConfig(options.env)
  const adapters: ProviderAdapter[] = [...(options.adapters ?? [])]

  const anthropicKey = options.env['ANTHROPIC_API_KEY']
  if (anthropicKey !== undefined && anthropicKey.length > 0) {
    adapters.push(new AnthropicAdapter({ apiKey: anthropicKey, timeoutMs: config.defaults.timeoutMs }))
  }
  const openaiKey = options.env['OPENAI_API_KEY']
  if (openaiKey !== undefined && openaiKey.length > 0) {
    adapters.push(new OpenAiAdapter({ apiKey: openaiKey, timeoutMs: config.defaults.timeoutMs }))
  }
  const geminiKey = options.env['GEMINI_API_KEY']
  if (geminiKey !== undefined && geminiKey.length > 0) {
    adapters.push(new GeminiAdapter({ apiKey: geminiKey, timeoutMs: config.defaults.timeoutMs }))
  }
  const compatibleBaseUrl = options.env['AI_OPENAI_COMPATIBLE_BASE_URL']
  const compatibleKey = options.env['AI_OPENAI_COMPATIBLE_API_KEY']
  if (
    compatibleBaseUrl !== undefined &&
    compatibleBaseUrl.length > 0 &&
    compatibleKey !== undefined &&
    compatibleKey.length > 0
  ) {
    adapters.push(
      createOpenAiCompatibleAdapter({
        id: PROVIDER_OPENAI_COMPATIBLE,
        baseUrl: compatibleBaseUrl,
        apiKey: compatibleKey,
        timeoutMs: config.defaults.timeoutMs,
      }),
    )
  }

  for (const adapter of adapters) {
    const policy = PROVIDER_DATA_POLICIES[adapter.id]
    if (policy === undefined || !policy.zeroRetention || !policy.noTraining) {
      logger.warn('ai.gateway.data_policy_unconfirmed', {
        adapterId: adapter.id,
        note: policy?.note ?? 'no data policy entry for this adapter id',
      })
    }
  }

  return new AiGateway({
    config,
    adapters,
    router: new ModelRouter(config),
    usageSink: options.usageSink ?? new ConsoleUsageSink(),
    budgetGuard: options.budgetGuard ?? new NoopBudgetGuard(),
    redactor: options.redactor ?? new DefaultRedactor(),
    logger,
  })
}
