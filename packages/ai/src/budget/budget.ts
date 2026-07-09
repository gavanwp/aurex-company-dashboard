import type { ModelTier } from '../gateway/types'

// Budget enforcement contract (07_AI_Strategy.md §9; AIArchitecture.md §12).
// Checked at gateway admission, BEFORE tokens are spent. The real implementation
// (per-workspace monthly ceilings + per-user daily soft caps read from Postgres)
// lands with the ai migrations in Phase 3; the contract is pinned now so the
// gateway codepath never changes.
//
// Ceiling ladder the Phase 3 implementation must express:
//   80% of monthly budget  -> allow, notify Owner (side effect, not a decision)
//   100% soft cap          -> degrade: interactive continues Light-tier-only,
//                             proactive jobs pause
//   hard cap               -> deny: graceful AI-unavailable state (R-AI6)
// Money is integer minor units when ceilings are stored (R-D8).

export type BudgetDecision =
  | { kind: 'allow' }
  /** Continue, but clamp routing to `tier` or cheaper (router degradation ladder). */
  | { kind: 'degrade'; tier: ModelTier; reason: string }
  /** Refuse before spending tokens — surfaces as GatewayError `budget_exceeded`. */
  | { kind: 'deny'; reason: string }

export interface BudgetGuard {
  check(workspaceId: string, tier: ModelTier): Promise<BudgetDecision>
}

/**
 * Default guard until per-workspace ceilings ship: always allows. Injected (not
 * imported by the gateway) so swapping in the Postgres-backed guard is a
 * one-line wiring change — the gateway call sequence already includes the check.
 */
export class NoopBudgetGuard implements BudgetGuard {
  async check(): Promise<BudgetDecision> {
    return { kind: 'allow' }
  }
}
