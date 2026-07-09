import { z } from 'zod'

// Provider-agnostic gateway contracts (ADR-0006; 07_AI_Strategy.md §4.1).
// Nothing above the gateway sees a vendor SDK type — adapters translate both ways.
// Every type that crosses a boundary has a Zod schema (R-T3) and the TS type is
// derived from it (R-T4).

/**
 * Logical model tiers (07_AI_Strategy.md §4.1). Feature code declares a tier,
 * never a concrete model id (R-S4) — the tier → model mapping lives in config.ts
 * and is overridable via env, so model migrations are config changes, not deploys.
 */
export const MODEL_TIERS = ['light', 'standard', 'frontier', 'embeddings'] as const
export type ModelTier = (typeof MODEL_TIERS)[number]

/**
 * Well-known adapter ids. Adapter ids are open strings so OpenAI-compatible
 * endpoints can register under their own id (e.g. `openai-compatible:vllm-local`).
 */
export const PROVIDER_ANTHROPIC = 'anthropic'
export const PROVIDER_OPENAI = 'openai'
export const PROVIDER_GEMINI = 'gemini'
export const PROVIDER_OPENAI_COMPATIBLE = 'openai-compatible'

/** A tool invocation the model requested. `input` is validated by the tool registry (Phase 3), never trusted raw. */
export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.record(z.unknown()),
})
export type ToolCall = z.infer<typeof ToolCallSchema>

/**
 * Our internal message shape — vendor formats never leak past the gateway
 * (07_AI_Strategy.md §1.5 "model-agnostic by contract").
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  /** Present on `assistant` messages that requested tool calls. */
  toolCalls: z.array(ToolCallSchema).optional(),
  /** Present on `tool` messages: id of the tool call this result answers (Anthropic/OpenAI correlation). */
  toolCallId: z.string().optional(),
  /** Present on `tool` messages: tool name (Gemini correlates function responses by name, not id). */
  toolName: z.string().optional(),
})
export type ChatMessage = z.infer<typeof ChatMessageSchema>

/**
 * A tool made visible to the model. `inputSchema` is a JSON Schema object; in
 * Phase 3 these are derived from the `packages/core` Zod schemas by the tool
 * registry (AIArchitecture.md §5) — the gateway treats them as opaque.
 */
export const ToolSpecSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  inputSchema: z.record(z.unknown()),
})
export type ToolSpec = z.infer<typeof ToolSpecSchema>

/**
 * The single request contract for every model call in AurexOS (R-AI1).
 * Parsed with Zod at the gateway boundary before any token is spent (R-T3).
 * `workspaceId` and `feature` are mandatory so metering is tenancy-aware and
 * per-capability from the first call (ADR-0006).
 */
export const GatewayRequestSchema = z.object({
  tier: z.enum(MODEL_TIERS),
  messages: z.array(ChatMessageSchema).min(1),
  tools: z.array(ToolSpecSchema).optional(),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(1).optional(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  /** Which product capability spends these tokens (e.g. `aurex.chat`, `finance.expense_categorize`) — drives per-capability cost reporting (AIArchitecture.md §12). */
  feature: z.string().min(1),
  metadata: z.record(z.string()).optional(),
})
export type GatewayRequest = z.infer<typeof GatewayRequestSchema>

/** Token accounting incl. provider prompt-cache reads — the >60% cached-input target (07_AI_Strategy.md §9) is measured from this. */
export const TokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cachedInputTokens: z.number().int().nonnegative().optional(),
})
export type TokenUsage = z.infer<typeof TokenUsageSchema>

/** The gateway's non-streaming response. `provider`/`model` echo the actual route taken (may differ from the tier default after failover). */
export interface GatewayResponse {
  text: string
  toolCalls?: ToolCall[]
  usage: TokenUsage
  model: string
  provider: string
  latencyMs: number
}

/**
 * Gateway error taxonomy. `retryable` drives retry/backoff and cross-provider
 * failover (AIArchitecture.md §14.2): retryable errors fail over, non-retryable
 * errors surface honestly (R-AI6) — never silently swallowed (R-Q6).
 */
export const GATEWAY_ERROR_CODES = [
  'rate_limit',
  'timeout',
  'provider_error',
  'budget_exceeded',
  'invalid_request',
] as const
export type GatewayErrorCode = (typeof GATEWAY_ERROR_CODES)[number]

export class GatewayError extends Error {
  readonly code: GatewayErrorCode
  readonly retryable: boolean
  readonly provider: string | undefined

  constructor(
    code: GatewayErrorCode,
    message: string,
    options: { retryable: boolean; provider?: string; cause?: unknown },
  ) {
    super(message, { cause: options.cause })
    this.name = 'GatewayError'
    this.code = code
    this.retryable = options.retryable
    this.provider = options.provider
  }
}

/**
 * Streaming deltas — the SSE-ready unit flowing gateway → orchestrator → UI
 * (07_AI_Strategy.md §4 "streaming first-class"). Discriminated union with a
 * Zod schema so route handlers can re-validate what they relay (R-T3);
 * serialization helpers live in `src/streaming/sse.ts`.
 *
 * Adapters emit `text` / `tool_call_delta` / `usage`; the gateway appends the
 * terminal `done` or `error` envelope.
 */
export const StreamDeltaSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({
    type: z.literal('tool_call_delta'),
    id: z.string(),
    name: z.string().optional(),
    /** Partial JSON of the tool input — accumulate per `id`, then parse once complete. */
    inputJsonDelta: z.string(),
  }),
  z.object({ type: z.literal('usage'), usage: TokenUsageSchema }),
  z.object({
    type: z.literal('done'),
    model: z.string(),
    provider: z.string(),
    latencyMs: z.number().nonnegative(),
  }),
  z.object({
    type: z.literal('error'),
    code: z.enum(GATEWAY_ERROR_CODES),
    message: z.string(),
    retryable: z.boolean(),
  }),
])
export type StreamDelta = z.infer<typeof StreamDeltaSchema>

/** What the gateway hands an adapter: the concrete model is resolved by the router — adapters never choose models (R-S4). */
export interface ProviderChatParams {
  model: string
  messages: ChatMessage[]
  tools?: ToolSpec[]
  /** Always set — the gateway fills the configured default when the caller omits it. */
  maxTokens: number
  temperature?: number
}

export interface ProviderChatResult {
  text: string
  toolCalls?: ToolCall[]
  usage: TokenUsage
}

export interface ProviderHealth {
  healthy: boolean
  detail?: string
}

export interface EmbedResult {
  embeddings: number[][]
  usage: { inputTokens: number }
}

/**
 * The provider adapter contract (ADR-0006: "adding a provider = adding an
 * adapter"). Implementations own the ONLY provider SDK imports in the repo
 * (R-AI1) and must map vendor errors into the GatewayError taxonomy.
 */
export interface ProviderAdapter {
  readonly id: string
  chat(params: ProviderChatParams): Promise<ProviderChatResult>
  chatStream(params: ProviderChatParams): AsyncIterable<StreamDelta>
  /** Only adapters serving the pinned embeddings tier implement this. */
  embed?(model: string, inputs: string[]): Promise<EmbedResult>
  health(): Promise<ProviderHealth>
}

/** Structured logger injected into the gateway — never `console` directly, so Edge Functions and the web app can route logs their own way. */
export interface GatewayLogger {
  debug(message: string, fields?: Record<string, unknown>): void
  info(message: string, fields?: Record<string, unknown>): void
  warn(message: string, fields?: Record<string, unknown>): void
  error(message: string, fields?: Record<string, unknown>): void
}

/**
 * Redaction hook applied to every payload the gateway logs (R-AI2 +
 * 07_AI_Strategy.md §8.6): telemetry records shapes and sizes, never tenant
 * content. Injected so the app can supply a PII-classification-aware
 * implementation later without touching the gateway.
 */
export interface Redactor {
  redact(payload: unknown): unknown
}

/** Narrowing helper for `unknown` values that should be plain objects (R-T2: no `any`, narrow instead). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Safe message extraction from an unknown thrown value (R-Q6: errors handled deliberately). */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
