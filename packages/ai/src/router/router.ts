import type { AiGatewayConfig, TierRoute } from '../gateway/config'
import type { ModelTier } from '../gateway/types'
import type { BudgetDecision } from '../budget/budget'

// Model router (AIArchitecture.md §3.1). Pure and deterministic: given the
// declared tier, workspace preferences, provider health, and the budget
// verdict, it returns the ordered list of (provider, model) attempts. The
// GATEWAY logs the decision (R-AI2); the router never performs I/O.

export interface WorkspaceRoutePrefs {
  /** Workspace AI-governance override: try this provider first when healthy (07_AI_Strategy.md §4.1 routing inputs). */
  preferredProvider?: string
}

export interface RouteInput {
  tier: ModelTier
  workspacePrefs?: WorkspaceRoutePrefs
  /** Provider id → healthy. Missing keys are assumed healthy. */
  providerHealth: Record<string, boolean>
  /** The budget guard's verdict for this call; `degrade` engages the ladder. */
  remainingBudget?: BudgetDecision
}

/** Returned to the gateway and logged with every call — routing must be reconstructable in incident review (R-AI2). */
export interface RouteDecision {
  requestedTier: ModelTier
  effectiveTier: ModelTier
  degraded: boolean
  /** Ordered attempts: position 0 is primary, the rest are failover candidates. */
  attempts: TierRoute[]
  reason: 'default' | 'budget_degraded'
}

/** Degradation ladder, most→least expensive (AIArchitecture.md §12: budget pressure forces cheaper tiers, never silent failure). */
const DEGRADATION_LADDER: readonly ModelTier[] = ['frontier', 'standard', 'light']

export class ModelRouter {
  private readonly config: AiGatewayConfig

  constructor(config: AiGatewayConfig) {
    this.config = config
  }

  resolve(input: RouteInput): RouteDecision {
    const requestedTier = input.tier
    const effectiveTier = applyBudgetLadder(requestedTier, input.remainingBudget)
    const degraded = effectiveTier !== requestedTier
    const attempts = orderAttempts(this.config.tiers[effectiveTier], input)
    return {
      requestedTier,
      effectiveTier,
      degraded,
      attempts,
      reason: degraded ? 'budget_degraded' : 'default',
    }
  }
}

/**
 * Clamps the tier down the ladder when the budget guard says degrade.
 * The embeddings tier NEVER degrades: the embedding model is pinned per
 * workspace corpus — mixing models in one index breaks retrieval
 * (AIArchitecture.md §3.2). Denials are refused by the gateway before routing.
 */
function applyBudgetLadder(tier: ModelTier, budget: BudgetDecision | undefined): ModelTier {
  if (budget === undefined || budget.kind !== 'degrade') return tier
  if (tier === 'embeddings') return tier

  const currentIndex = DEGRADATION_LADDER.indexOf(tier)
  const targetIndex = DEGRADATION_LADDER.indexOf(budget.tier)
  if (currentIndex === -1 || targetIndex === -1) return tier

  // Larger ladder index = cheaper. Only ever degrade, never upgrade.
  return targetIndex > currentIndex ? budget.tier : tier
}

/**
 * Ordering policy: healthy providers first (config order preserved), unhealthy
 * providers kept as last-resort attempts rather than dropped — if every healthy
 * route fails, trying a possibly-recovered provider beats returning nothing
 * (R-AI6). Workspace preference moves matching healthy routes to the front.
 */
function orderAttempts(routes: TierRoute[], input: RouteInput): TierRoute[] {
  const isHealthy = (route: TierRoute): boolean => input.providerHealth[route.provider] !== false
  const healthy = routes.filter(isHealthy)
  const unhealthy = routes.filter((route) => !isHealthy(route))

  const preferred = input.workspacePrefs?.preferredProvider
  if (preferred !== undefined) {
    const preferredRoutes = healthy.filter((route) => route.provider === preferred)
    const remaining = healthy.filter((route) => route.provider !== preferred)
    return [...preferredRoutes, ...remaining, ...unhealthy]
  }

  return [...healthy, ...unhealthy]
}
