import { z } from 'zod'
import {
  MODEL_TIERS,
  PROVIDER_ANTHROPIC,
  PROVIDER_GEMINI,
  PROVIDER_OPENAI,
  PROVIDER_OPENAI_COMPATIBLE,
  type ModelTier,
} from './types'

// Tier → model routing configuration (R-S4: model identifiers are config, never
// literals in feature logic). Router config is "config, not code" — model
// migrations roll out and roll back here with no deploy (AIArchitecture.md §3.1).

/** One routing candidate: which adapter and which concrete model id it should call. */
export interface TierRoute {
  provider: string
  modelId: string
}

export interface RetryConfig {
  /** Same-route attempts before failing over to the next route (bounded — never unbounded loops). */
  maxAttemptsPerRoute: number
  baseDelayMs: number
  maxDelayMs: number
  /** How long a provider stays deprioritized after a retryable failure (passive health, AIArchitecture.md §2.2). */
  providerCooldownMs: number
}

export interface GatewayDefaults {
  /** Applied when a GatewayRequest omits maxTokens. */
  maxOutputTokens: number
  /** Per-call HTTP timeout handed to provider SDK clients. */
  timeoutMs: number
}

export interface AiGatewayConfig {
  tiers: Record<ModelTier, TierRoute[]>
  retry: RetryConfig
  defaults: GatewayDefaults
}

/**
 * Default tier map (07_AI_Strategy.md §4.1: Claude primary, OpenAI secondary).
 * Order within a tier IS the failover order. Every entry is overridable via
 * `AI_TIER_*` env vars — these literals exist only in this config module (R-S4).
 *
 * The embeddings tier is pinned per workspace corpus: provider swap for
 * embeddings is never a router flip, it is a scheduled re-embed backfill
 * (AIArchitecture.md §3.2 / §8.4) — hence a single route with no fallback.
 */
const DEFAULT_TIERS: Record<ModelTier, TierRoute[]> = {
  frontier: [
    { provider: PROVIDER_ANTHROPIC, modelId: 'claude-opus-4-8' },
    { provider: PROVIDER_OPENAI, modelId: 'gpt-4o' },
  ],
  standard: [
    { provider: PROVIDER_ANTHROPIC, modelId: 'claude-sonnet-4-6' },
    { provider: PROVIDER_OPENAI, modelId: 'gpt-4o' },
  ],
  light: [
    { provider: PROVIDER_ANTHROPIC, modelId: 'claude-haiku-4-5' },
    { provider: PROVIDER_OPENAI, modelId: 'gpt-4o-mini' },
  ],
  embeddings: [{ provider: PROVIDER_OPENAI, modelId: 'text-embedding-3-small' }],
}

/**
 * Compliance posture per provider (ADR-0006 / AIArchitecture.md §2.8): an
 * adapter without a zero-retention + no-training agreement does not serve
 * production traffic. `buildGateway` logs a warning when wiring a provider
 * whose posture is not yet confirmed; refusing outright becomes a Phase 3
 * admission check once agreements are tracked in Settings.
 */
export const PROVIDER_DATA_POLICIES: Record<
  string,
  { zeroRetention: boolean; noTraining: boolean; note: string }
> = {
  [PROVIDER_ANTHROPIC]: {
    zeroRetention: true,
    noTraining: true,
    note: 'Zero-retention agreement in place (AIArchitecture.md §3.2).',
  },
  [PROVIDER_OPENAI]: {
    zeroRetention: true,
    noTraining: true,
    note: 'Same contract as primary; shadow-eval parity per model refresh.',
  },
  [PROVIDER_GEMINI]: {
    zeroRetention: false,
    noTraining: false,
    note: 'Future adapter — agreement not yet in place; do not route production tenant data.',
  },
  [PROVIDER_OPENAI_COMPATIBLE]: {
    zeroRetention: true,
    noTraining: true,
    note: 'Self-hosted / owner-operated endpoints (FutureArchitecture.md) — retention is under our control.',
  },
}

/**
 * Env override format for a tier: comma-separated `provider:modelId` pairs in
 * failover order, e.g. `AI_TIER_LIGHT=anthropic:claude-haiku-4-5,openai:gpt-4o-mini`.
 */
function parseTierRoutes(raw: string): TierRoute[] {
  return raw.split(',').map((entry) => {
    const separator = entry.indexOf(':')
    if (separator <= 0 || separator === entry.length - 1) {
      throw new Error(`invalid tier route "${entry}" — expected "provider:modelId"`)
    }
    return {
      provider: entry.slice(0, separator).trim(),
      modelId: entry.slice(separator + 1).trim(),
    }
  })
}

const tierOverrideSchema = z
  .string()
  .min(1)
  .transform(parseTierRoutes)
  .optional()

/**
 * Gateway env contract, parsed with Zod at load time (R-S3/R-T3). The app's
 * boot-time env validation in `packages/config/env.ts` composes this schema;
 * the gateway itself never touches raw `process.env` — callers inject the map.
 */
export const gatewayEnvSchema = z.object({
  AI_TIER_LIGHT: tierOverrideSchema,
  AI_TIER_STANDARD: tierOverrideSchema,
  AI_TIER_FRONTIER: tierOverrideSchema,
  AI_TIER_EMBEDDINGS: tierOverrideSchema,
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().optional(),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  AI_RETRY_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).optional(),
  AI_RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().optional(),
  AI_RETRY_MAX_DELAY_MS: z.coerce.number().int().positive().optional(),
  AI_PROVIDER_COOLDOWN_MS: z.coerce.number().int().positive().optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  /** Optional OpenAI-compatible endpoint (vLLM/Ollama-class, FutureArchitecture.md). */
  AI_OPENAI_COMPATIBLE_BASE_URL: z.string().url().optional(),
  AI_OPENAI_COMPATIBLE_API_KEY: z.string().min(1).optional(),
})
export type GatewayEnv = z.infer<typeof gatewayEnvSchema>

/**
 * Builds the gateway config from defaults + validated env overrides.
 * Throws at load time on malformed config — fail at boot, not at 2 a.m. (R-S3).
 */
export function loadGatewayConfig(env: Readonly<Record<string, string | undefined>>): AiGatewayConfig {
  const parsed = gatewayEnvSchema.parse(env)

  const tiers: Record<ModelTier, TierRoute[]> = {
    light: parsed.AI_TIER_LIGHT ?? DEFAULT_TIERS.light,
    standard: parsed.AI_TIER_STANDARD ?? DEFAULT_TIERS.standard,
    frontier: parsed.AI_TIER_FRONTIER ?? DEFAULT_TIERS.frontier,
    embeddings: parsed.AI_TIER_EMBEDDINGS ?? DEFAULT_TIERS.embeddings,
  }

  for (const tier of MODEL_TIERS) {
    if (tiers[tier].length === 0) {
      throw new Error(`gateway config: tier "${tier}" has no routes`)
    }
  }

  return {
    tiers,
    retry: {
      maxAttemptsPerRoute: parsed.AI_RETRY_MAX_ATTEMPTS ?? 3,
      baseDelayMs: parsed.AI_RETRY_BASE_DELAY_MS ?? 250,
      maxDelayMs: parsed.AI_RETRY_MAX_DELAY_MS ?? 4_000,
      providerCooldownMs: parsed.AI_PROVIDER_COOLDOWN_MS ?? 30_000,
    },
    defaults: {
      maxOutputTokens: parsed.AI_MAX_OUTPUT_TOKENS ?? 4_096,
      timeoutMs: parsed.AI_TIMEOUT_MS ?? 60_000,
    },
  }
}
