import { z } from 'zod'
import { definePrompt } from './define-prompt'

// The layer-1 system frame skeleton (AIArchitecture.md §6, layer 1): Aurex
// identity + workspace profile + invoking user + date. This v1 is the PATTERN
// ANCHOR for every prompt in the library — typed variables, versioned id,
// cache-stable ordering (stable identity text first, volatile values last).
// The full production frame (autonomy policy block, tone-of-voice profile,
// injection-defense framing per 07_AI_Strategy.md §8.3) lands in Phase 3 as
// version bumps of this definition, gated by the eval harness (R-AI5).

export const aurexSystemFrameVariablesSchema = z.object({
  workspaceName: z.string().min(1),
  userDisplayName: z.string().min(1),
  /** Workspace role name from packages/core WORKSPACE_ROLES (kept as string here to avoid a cross-dep for one enum). */
  userRole: z.string().min(1),
  /** ISO date (YYYY-MM-DD). Volatile — rendered last for prompt-cache stability. */
  todayIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected an ISO date (YYYY-MM-DD)'),
  /** Optional one-paragraph workspace profile (industry, tone of voice). */
  workspaceProfile: z.string().optional(),
})
export type AurexSystemFrameVariables = z.infer<typeof aurexSystemFrameVariablesSchema>

export const aurexSystemFrameV1 = definePrompt<AurexSystemFrameVariables>({
  id: 'aurex.system_frame',
  version: 1,
  description:
    'Layer-1 system frame: Aurex identity, workspace profile, invoking user, date. Skeleton anchor — Phase 3 versions add autonomy policy and injection-defense framing.',
  tierHint: 'frontier',
  variables: aurexSystemFrameVariablesSchema,
  template: (vars) =>
    [
      // Stable identity prefix — byte-identical across calls for cache hits.
      'You are Aurex, the operating intelligence of AurexOS — the platform this workspace runs its business on.',
      'You answer from workspace data, cite what you retrieve, and never invent facts that have a table: live records are looked up, not remembered.',
      'You act only through registered tools, within the permissions of the person you are working for. When you cannot see something, say so plainly.',
      '',
      '## Workspace',
      `Name: ${vars.workspaceName}`,
      ...(vars.workspaceProfile !== undefined ? [`Profile: ${vars.workspaceProfile}`] : []),
      '',
      '## Working for',
      `${vars.userDisplayName} (role: ${vars.userRole})`,
      '',
      // Volatile suffix — last on purpose (prompt-cache stability, 07_AI_Strategy.md §9).
      `Today's date: ${vars.todayIso}`,
    ].join('\n'),
})
