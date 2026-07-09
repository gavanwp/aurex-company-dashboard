import { z } from 'zod'
import { MODEL_TIERS } from '../gateway/types'

// Usage metering contracts (R-AI2: every AI action is audited; ADR-0006:
// tenancy-aware metering is native). The GATEWAY records usage — features
// cannot skip it (AIArchitecture.md §2.5 enforcement pattern).

export const AI_USAGE_OUTCOMES = ['success', 'error', 'denied'] as const
export type AiUsageOutcome = (typeof AI_USAGE_OUTCOMES)[number]

/**
 * One row per gateway call, aligned with the forthcoming `ai_usage` table
 * (AIArchitecture.md §11.1). Parsed with Zod before every sink write (R-T3).
 * `costEstimateMinorUnits` is integer minor units (R-D8); the provider pricing
 * table that fills it lands with the ai migrations.
 */
export const AiUsageEventSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  feature: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  tier: z.enum(MODEL_TIERS),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cachedInputTokens: z.number().int().nonnegative(),
  costEstimateMinorUnits: z.number().int().nonnegative().optional(),
  latencyMs: z.number().nonnegative(),
  outcome: z.enum(AI_USAGE_OUTCOMES),
  requestId: z.string().min(1),
  createdAt: z.string(),
})
export type AiUsageEvent = z.infer<typeof AiUsageEventSchema>

/** Injected into the gateway; implementations must be workspace-scoped like every other write (R-AI4). */
export interface UsageSink {
  record(event: AiUsageEvent): Promise<void>
}

/** Dev/test sink: validates and prints the event. Never wired in production. */
export class ConsoleUsageSink implements UsageSink {
  async record(event: AiUsageEvent): Promise<void> {
    const parsed = AiUsageEventSchema.parse(event)
    // eslint-disable-next-line no-console -- dev-only sink by design
    console.info('[ai_usage]', JSON.stringify(parsed))
  }
}

/**
 * Minimal structural view of a Supabase client — kept structural so this
 * package does not depend on `@aurexos/db`; the app injects its typed client.
 */
export interface UsageTableClient {
  from(table: string): {
    insert(rows: Record<string, unknown>[]): PromiseLike<{ error: { message: string } | null }>
  }
}

/**
 * Production sink writing to the `ai_usage` table (AIArchitecture.md §11.1).
 * The insert shape below matches the planned migration (snake_case, R-D6;
 * `workspace_id` + RLS, R-D1/R-D2). Actual wiring — the migration, RLS
 * policies, and injecting the server-side client — lands with the ai
 * migrations; until then this class is exported but not wired by default.
 */
export class SupabaseUsageSink implements UsageSink {
  private readonly client: UsageTableClient
  private readonly table: string

  constructor(client: UsageTableClient, table = 'ai_usage') {
    this.client = client
    this.table = table
  }

  async record(event: AiUsageEvent): Promise<void> {
    const parsed = AiUsageEventSchema.parse(event)
    const row: Record<string, unknown> = {
      workspace_id: parsed.workspaceId,
      user_id: parsed.userId ?? null,
      feature: parsed.feature,
      provider: parsed.provider,
      model: parsed.model,
      tier: parsed.tier,
      input_tokens: parsed.inputTokens,
      cached_input_tokens: parsed.cachedInputTokens,
      output_tokens: parsed.outputTokens,
      cost_estimate_minor_units: parsed.costEstimateMinorUnits ?? null,
      latency_ms: Math.round(parsed.latencyMs),
      outcome: parsed.outcome,
      request_id: parsed.requestId,
      created_at: parsed.createdAt,
    }
    const { error } = await this.client.from(this.table).insert([row])
    if (error) {
      throw new Error(`ai_usage insert failed: ${error.message}`)
    }
  }
}
