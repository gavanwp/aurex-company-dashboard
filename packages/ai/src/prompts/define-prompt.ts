import type { z } from 'zod'
import type { ModelTier } from '../gateway/types'

// Prompt manager (R-AI5: prompts are code). Every prompt is a versioned,
// PR-reviewed definition in this directory — never an inline string in feature
// code (lint-banned). Behavior-affecting changes bump `version` and must pass
// the eval harness before merge (07_AI_Strategy.md §10); the eval harness and
// the `prompt_versions` registry table land in Phase 3.

/** The registry-facing view of a prompt: enough to look up, log, and render. */
export interface RegisteredPrompt {
  /** Stable key, `module.snake_name` style, e.g. `aurex.system_frame`. */
  readonly id: string
  /** Bumped on any behavior-affecting change; AIRuns pin (id, version) (AIArchitecture.md §11.2). */
  readonly version: number
  readonly description: string
  /** Which tier this prompt is written for — routing input, not a hard bind (R-S4). */
  readonly tierHint: ModelTier
  /** Validates `vars` (R-T3) and renders. Throws ZodError on invalid vars — a half-filled prompt never ships to a model. */
  render(vars: unknown): string
}

export interface PromptDefinition<TVars> extends RegisteredPrompt {
  /** The typed variable contract; exported so callers can build vars type-safely. */
  readonly variablesSchema: z.ZodType<TVars>
}

export interface DefinePromptOptions<TVars> {
  id: string
  version: number
  description: string
  tierHint: ModelTier
  variables: z.ZodType<TVars>
  template: (vars: TVars) => string
}

/**
 * Creates a prompt definition whose render() validates variables before
 * templating (R-T3 at the prompt boundary).
 *
 * Prompt hygiene is cost hygiene (AIArchitecture.md §13): templates must keep
 * stable content first and volatile values (dates, names) last, so provider
 * prompt caching gets a stable prefix (07_AI_Strategy.md §9).
 */
export function definePrompt<TVars>(options: DefinePromptOptions<TVars>): PromptDefinition<TVars> {
  return {
    id: options.id,
    version: options.version,
    description: options.description,
    tierHint: options.tierHint,
    variablesSchema: options.variables,
    render(vars: unknown): string {
      const parsed = options.variables.parse(vars)
      return options.template(parsed)
    },
  }
}
