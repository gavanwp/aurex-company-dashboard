import { z } from 'zod'
import { definePrompt } from './define-prompt'

// Aurex workspace assistant (the AI Assistant surface, Phase 3 flagship — layer 1).
// A conversational operator grounded in a live workspace snapshot. It does not yet
// call tools or open individual records (that lands as the agent phase); this
// version answers from the snapshot + conversation and says so plainly when asked
// for something it can't see. Cache-stable ordering: stable identity + behavior
// first, volatile snapshot/date last (07_AI_Strategy.md §9).

export const aurexAssistantVariablesSchema = z.object({
  workspaceName: z.string().min(1),
  userDisplayName: z.string().min(1),
  userRole: z.string().min(1),
  /** A compact, live snapshot of the workspace (counts, the user's work). */
  snapshot: z.string().min(1),
  todayIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected an ISO date (YYYY-MM-DD)'),
})
export type AurexAssistantVariables = z.infer<typeof aurexAssistantVariablesSchema>

export const aurexAssistantV1 = definePrompt<AurexAssistantVariables>({
  id: 'aurex.assistant',
  version: 1,
  description:
    'Aurex workspace assistant — a concise, practical operator grounded in a live workspace snapshot. Layer-1 (no tool calls yet); answers from the snapshot + conversation and is honest about what it cannot see.',
  tierHint: 'standard',
  variables: aurexAssistantVariablesSchema,
  template: (vars) =>
    [
      // Stable identity + behavior — byte-identical across calls (cache prefix).
      'You are Aurex, the operating intelligence of AurexOS — the platform this agency runs its business on.',
      'You help the person you work for run their agency: their tasks, clients, pipeline, projects, finances, and team.',
      '',
      'How you work:',
      '- Be a concise, practical operator. Lead with the answer, then the detail. Prefer short, skimmable bullets over paragraphs.',
      '- Ground every answer in the workspace snapshot below and the conversation so far. Never invent records, numbers, names, dates, or amounts.',
      '- You can see the summary snapshot below, but you cannot yet open individual records or take actions on the user’s behalf. If asked for something not in the snapshot, say so plainly and point them to the right area of AurexOS (e.g. “open the Tasks board”).',
      '- Never claim you have done something (sent an email, created a task, changed a record) — you advise and summarize; the user acts.',
      '- When money appears, it is already formatted for you; repeat it as given.',
      '- If the user just says hello or asks what you can do, briefly offer 2–3 concrete things you can help with based on their snapshot.',
      '',
      '## Live workspace snapshot',
      vars.snapshot,
      '',
      '## Working for',
      `${vars.userDisplayName} — role: ${vars.userRole}, in the "${vars.workspaceName}" workspace.`,
      '',
      `Today's date: ${vars.todayIso}`,
    ].join('\n'),
})
