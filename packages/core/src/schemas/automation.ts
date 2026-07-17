import { z } from 'zod'
import {
  AUTOMATION_RUN_STATUSES,
  AUTOMATION_SCOPES,
  AUTOMATION_STATUSES,
  JOB_STATUSES,
} from '../types/index'

// Governs automations.trigger_filter (0011): predicate over the event payload.
export const AutomationTriggerFilterSchema = z.record(z.string(), z.unknown())
export type AutomationTriggerFilter = z.infer<typeof AutomationTriggerFilterSchema>

// Governs automations.condition_graph (0011).
export const AutomationConditionGraphSchema = z
  .object({
    nodes: z.array(z.unknown()).default([]),
    edges: z.array(z.unknown()).default([]),
  })
  .passthrough()
export type AutomationConditionGraph = z.infer<typeof AutomationConditionGraphSchema>

// Governs automations.actions (0011): ordered registry action invocations.
export const AutomationActionSchema = z.object({
  actionKey: z.string().min(1).max(120),
  input: z.record(z.string(), z.unknown()).default({}),
  idempotencyKey: z.string().max(200).optional(),
})
export type AutomationAction = z.infer<typeof AutomationActionSchema>

export const AutomationActionsSchema = z.array(AutomationActionSchema)
export type AutomationActions = z.infer<typeof AutomationActionsSchema>

// Governs automations.error_policy (0011).
export const AutomationErrorPolicySchema = z
  .object({
    retryCount: z.number().int().nonnegative().default(0),
    circuitBreakAfter: z.number().int().positive().default(5),
    notifyOwner: z.boolean().default(true),
  })
  .passthrough()
export type AutomationErrorPolicy = z.infer<typeof AutomationErrorPolicySchema>

export const AutomationSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  status: z.enum(AUTOMATION_STATUSES),
  triggerEventType: z.string().min(1),
  triggerFilter: AutomationTriggerFilterSchema,
  conditionGraph: AutomationConditionGraphSchema,
  actions: AutomationActionsSchema,
  errorPolicy: AutomationErrorPolicySchema,
  ownerUserId: z.string().uuid().nullable(),
  scope: z.enum(AUTOMATION_SCOPES),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Automation = z.infer<typeof AutomationSchema>

export const CreateAutomationInput = z.object({
  name: z.string().min(1, 'Automation name is required').max(200),
  status: z.enum(AUTOMATION_STATUSES).default('draft'),
  triggerEventType: z.string().min(1, 'Trigger event type is required'),
  triggerFilter: AutomationTriggerFilterSchema.default({}),
  conditionGraph: AutomationConditionGraphSchema.default({}),
  actions: AutomationActionsSchema.default([]),
  errorPolicy: AutomationErrorPolicySchema.default({}),
  scope: z.enum(AUTOMATION_SCOPES).default('workspace'),
})
export type CreateAutomationInput = z.infer<typeof CreateAutomationInput>

export const UpdateAutomationInput = CreateAutomationInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateAutomationInput = z.infer<typeof UpdateAutomationInput>

// Governs automation_runs.step_results (0011).
export const AutomationStepResultSchema = z.object({
  actionKey: z.string(),
  status: z.enum(['succeeded', 'failed', 'skipped']),
  output: z.unknown().optional(),
  error: z.string().max(5_000).optional(),
  durationMs: z.number().int().nonnegative().optional(),
})
export type AutomationStepResult = z.infer<typeof AutomationStepResultSchema>

export const AutomationStepResultsSchema = z.array(AutomationStepResultSchema)
export type AutomationStepResults = z.infer<typeof AutomationStepResultsSchema>

export const AutomationRunSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  automationId: z.string().uuid(),
  triggerEventId: z.string().uuid().nullable(),
  status: z.enum(AUTOMATION_RUN_STATUSES),
  stepResults: AutomationStepResultsSchema,
  error: z.unknown().nullable(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type AutomationRun = z.infer<typeof AutomationRunSchema>

// ── AI surfaces (R-AI: gateway-backed) ──────────────────────────────────────

/** Input for the natural-language automation drafter. */
export const DraftAutomationInput = z.object({
  description: z.string().trim().min(4, 'Describe the automation you want').max(1_000),
})
export type DraftAutomationInput = z.infer<typeof DraftAutomationInput>

/**
 * What the model must return when drafting an automation. Parsed with this
 * schema before it is ever shown or saved — a malformed draft is rejected, never
 * guessed at (R-T3). The draft is always reviewed by a human before it can be
 * activated (R-AI3): the drafter only proposes.
 */
export const AutomationDraftSchema = z.object({
  name: z.string().min(1).max(200),
  summary: z.string().max(600).optional(),
  triggerEventType: z.string().min(1),
  triggerFilter: AutomationTriggerFilterSchema.default({}),
  actions: z
    .array(
      z.object({
        actionKey: z.string().min(1).max(120),
        input: z.record(z.string(), z.unknown()).default({}),
        note: z.string().max(300).optional(),
      }),
    )
    .default([]),
})
export type AutomationDraft = z.infer<typeof AutomationDraftSchema>

/** Input for the automation Q&A assistant ("quick answers"). */
export const AskAutomationInput = z.object({
  question: z.string().trim().min(2, 'Ask a question').max(1_000),
})
export type AskAutomationInput = z.infer<typeof AskAutomationInput>

// jobs (0011) are service-role-only; this input is consumed by the packages/db
// admin wrapper's enqueue call, never by client code.
export const EnqueueJobInput = z.object({
  queue: z.string().min(1).max(80),
  jobKey: z.string().min(1).max(200),
  payload: z.record(z.string(), z.unknown()).default({}),
  runAt: z.string().optional(),
  maxAttempts: z.number().int().min(1).default(5),
})
export type EnqueueJobInput = z.infer<typeof EnqueueJobInput>

export const JobSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  queue: z.string(),
  jobKey: z.string(),
  payload: z.record(z.string(), z.unknown()),
  status: z.enum(JOB_STATUSES),
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().min(1),
  runAt: z.string(),
  lockedAt: z.string().nullable(),
  lockedBy: z.string().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Job = z.infer<typeof JobSchema>
