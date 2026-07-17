import { z } from 'zod'
import { definePrompt } from './define-prompt'

// Natural-language → automation draft. The model returns STRICT JSON that the
// caller parses with core's AutomationDraftSchema before showing or saving it
// (R-T3). The drafter only proposes — a human reviews and activates (R-AI3).
// Stable instruction/catalog prefix first; the free-text description is passed
// as a separate user message (cache stability, 07_AI_Strategy.md §9).

export const automationDraftVariablesSchema = z.object({
  /** "event.type — human label" lines; the model must pick triggerEventType from these keys. */
  triggerCatalog: z.string().min(1),
  /** "action.key — what it does (expected input)" lines; actions must come from these keys. */
  actionCatalog: z.string().min(1),
})
export type AutomationDraftVariables = z.infer<typeof automationDraftVariablesSchema>

export const automationDraftV1 = definePrompt<AutomationDraftVariables>({
  id: 'automations.draft',
  version: 1,
  description:
    'Drafts an automation (trigger + filter + actions) from a natural-language description, as strict JSON validated against AutomationDraftSchema.',
  tierHint: 'frontier',
  variables: automationDraftVariablesSchema,
  template: (vars) =>
    [
      'You are Aurex, drafting an automation for AurexOS from a plain-language description.',
      'An automation = one trigger event + an optional filter over its payload + an ordered list of actions.',
      '',
      'Rules:',
      '- Choose exactly one `triggerEventType` from the trigger catalog keys below. Never invent one.',
      '- Choose `actions` only from the action catalog keys below, in the order they should run.',
      '- Keep `input` objects minimal and literal; use empty objects when unsure rather than inventing fields.',
      '- Give the automation a short, human `name` and a one-sentence `summary`.',
      '- If the request cannot be expressed with the available triggers/actions, return your best partial draft and note the gap in `summary`.',
      '',
      'Output ONLY a JSON object with this exact shape — no prose, no code fences:',
      '{',
      '  "name": string,',
      '  "summary": string,',
      '  "triggerEventType": string,   // a key from the trigger catalog',
      '  "triggerFilter": object,      // {} if none',
      '  "actions": [ { "actionKey": string, "input": object, "note": string } ]',
      '}',
      '',
      '## Trigger catalog',
      vars.triggerCatalog,
      '',
      '## Action catalog',
      vars.actionCatalog,
    ].join('\n'),
})
