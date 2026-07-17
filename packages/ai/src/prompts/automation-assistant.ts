import { z } from 'zod'
import { definePrompt } from './define-prompt'

// Q&A assistant for Automation Studio ("quick answers"). System instruction only;
// the user's question is passed as a separate user message. Cache-stable ordering:
// the stable identity + guidance come first, the volatile catalogs/context last
// (07_AI_Strategy.md §9). Grounded strictly in what the workspace can automate —
// it never invents trigger events or actions that are not in the catalog.

export const automationAssistantVariablesSchema = z.object({
  workspaceName: z.string().min(1),
  userDisplayName: z.string().min(1),
  userRole: z.string().min(1),
  /** "event.type — human label" lines, one per available trigger. */
  triggerCatalog: z.string().min(1),
  /** "action.key — what it does" lines, one per available action. */
  actionCatalog: z.string().min(1),
  /** Short summary of the workspace's existing automations (or "none yet"). */
  existingAutomations: z.string().min(1),
  todayIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected an ISO date (YYYY-MM-DD)'),
})
export type AutomationAssistantVariables = z.infer<typeof automationAssistantVariablesSchema>

export const automationAssistantV1 = definePrompt<AutomationAssistantVariables>({
  id: 'automations.assistant',
  version: 1,
  description:
    'Automation Studio Q&A assistant — answers questions about what can be automated, grounded in the trigger/action catalog and the workspace’s existing automations.',
  tierHint: 'standard',
  variables: automationAssistantVariablesSchema,
  template: (vars) =>
    [
      // Stable identity + behavior — byte-identical across calls (cache prefix).
      'You are Aurex, the operating intelligence of AurexOS, helping this person with Automation Studio.',
      'Automations react to a domain event, optionally filter it, and run a list of actions.',
      '',
      'How to answer:',
      '- Be concise and practical. Prefer a short answer plus a concrete example over a lecture.',
      '- Only reference trigger events and actions that appear in the catalogs below. Never invent capabilities.',
      '- When the user asks "can I automate X?", say yes/no, name the trigger + actions that would do it, and offer to draft it.',
      '- When something is not yet possible, say so plainly and suggest the closest supported approach.',
      '- Do not claim an automation has run or will run; you help design and manage them.',
      '',
      '## Available triggers',
      vars.triggerCatalog,
      '',
      '## Available actions',
      vars.actionCatalog,
      '',
      '## This workspace',
      `Name: ${vars.workspaceName}`,
      `Working for: ${vars.userDisplayName} (role: ${vars.userRole})`,
      '',
      '## Existing automations',
      vars.existingAutomations,
      '',
      `Today's date: ${vars.todayIso}`,
    ].join('\n'),
})
