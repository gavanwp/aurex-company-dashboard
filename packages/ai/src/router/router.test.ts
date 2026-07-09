import { describe, expect, it } from 'vitest'
import type { AiGatewayConfig } from '../gateway/config'
import { ModelRouter } from './router'

const config: AiGatewayConfig = {
  tiers: {
    frontier: [
      { provider: 'anthropic', modelId: 'frontier-primary' },
      { provider: 'openai', modelId: 'frontier-fallback' },
    ],
    standard: [
      { provider: 'anthropic', modelId: 'standard-primary' },
      { provider: 'openai', modelId: 'standard-fallback' },
    ],
    light: [
      { provider: 'anthropic', modelId: 'light-primary' },
      { provider: 'openai', modelId: 'light-fallback' },
    ],
    embeddings: [{ provider: 'openai', modelId: 'embed-pinned' }],
  },
  retry: { maxAttemptsPerRoute: 3, baseDelayMs: 250, maxDelayMs: 4_000, providerCooldownMs: 30_000 },
  defaults: { maxOutputTokens: 4_096, timeoutMs: 60_000 },
}

describe('ModelRouter', () => {
  it('returns tier routes in config order when everything is healthy', () => {
    const router = new ModelRouter(config)
    const decision = router.resolve({ tier: 'frontier', providerHealth: {} })

    expect(decision.effectiveTier).toBe('frontier')
    expect(decision.degraded).toBe(false)
    expect(decision.attempts.map((a) => a.provider)).toEqual(['anthropic', 'openai'])
    expect(decision.attempts[0]?.modelId).toBe('frontier-primary')
  })

  it('moves an unhealthy primary behind healthy fallbacks instead of dropping it', () => {
    const router = new ModelRouter(config)
    const decision = router.resolve({
      tier: 'standard',
      providerHealth: { anthropic: false },
    })

    expect(decision.attempts.map((a) => a.provider)).toEqual(['openai', 'anthropic'])
  })

  it('degrades down the ladder when the budget guard says so (AIArchitecture §12)', () => {
    const router = new ModelRouter(config)
    const decision = router.resolve({
      tier: 'frontier',
      providerHealth: {},
      remainingBudget: { kind: 'degrade', tier: 'light', reason: 'workspace at 100% soft cap' },
    })

    expect(decision.requestedTier).toBe('frontier')
    expect(decision.effectiveTier).toBe('light')
    expect(decision.degraded).toBe(true)
    expect(decision.reason).toBe('budget_degraded')
    expect(decision.attempts[0]?.modelId).toBe('light-primary')
  })

  it('never degrades the embeddings tier — the model is pinned per corpus (AIArchitecture §3.2)', () => {
    const router = new ModelRouter(config)
    const decision = router.resolve({
      tier: 'embeddings',
      providerHealth: {},
      remainingBudget: { kind: 'degrade', tier: 'light', reason: 'budget constrained' },
    })

    expect(decision.effectiveTier).toBe('embeddings')
    expect(decision.degraded).toBe(false)
    expect(decision.attempts).toEqual([{ provider: 'openai', modelId: 'embed-pinned' }])
  })

  it('never upgrades: a degrade target above the requested tier is ignored', () => {
    const router = new ModelRouter(config)
    const decision = router.resolve({
      tier: 'light',
      providerHealth: {},
      remainingBudget: { kind: 'degrade', tier: 'standard', reason: 'nonsensical but defended' },
    })

    expect(decision.effectiveTier).toBe('light')
  })

  it('puts a healthy preferred provider first (workspace tier preference)', () => {
    const router = new ModelRouter(config)
    const decision = router.resolve({
      tier: 'standard',
      providerHealth: {},
      workspacePrefs: { preferredProvider: 'openai' },
    })

    expect(decision.attempts.map((a) => a.provider)).toEqual(['openai', 'anthropic'])
  })
})
