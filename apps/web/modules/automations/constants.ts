import type { DomainEventType } from '@aurexos/core'

// The automation vocabulary: which domain events can trigger an automation, and
// which actions an automation can run. This registry is the single source the
// builder offers, the AI drafter must choose from, and the (Phase-3) execution
// engine will dispatch. Execution wiring is deferred — these are declarative
// definitions (06_Module_Breakdown.md §17; ADR-0005).

export interface TriggerDef {
  /** A domain event from the core catalog (packages/core/events). */
  eventType: DomainEventType
  label: string
  /** Owning module, for grouping in the picker. */
  module: string
  /** One-line description of when it fires. */
  hint: string
}

/** Curated, meaningful automation triggers (a subset of the full event catalog). */
export const TRIGGER_DEFS: readonly TriggerDef[] = [
  {
    eventType: 'crm.deal.created',
    label: 'Deal created',
    module: 'CRM',
    hint: 'A new deal enters the pipeline.',
  },
  {
    eventType: 'crm.deal.stage_changed',
    label: 'Deal stage changed',
    module: 'CRM',
    hint: 'A deal moves to a new stage.',
  },
  {
    eventType: 'crm.contact.created',
    label: 'Contact created',
    module: 'CRM',
    hint: 'A new contact is added.',
  },
  {
    eventType: 'proposals.proposal.accepted',
    label: 'Proposal accepted',
    module: 'Proposals',
    hint: 'A client accepts a proposal.',
  },
  {
    eventType: 'contracts.contract.signed',
    label: 'Contract signed',
    module: 'Contracts',
    hint: 'A contract is fully signed.',
  },
  {
    eventType: 'contracts.contract.expiry_flagged',
    label: 'Contract nearing expiry',
    module: 'Contracts',
    hint: 'The renewal radar flags an expiring contract.',
  },
  {
    eventType: 'finance.invoice.sent',
    label: 'Invoice sent',
    module: 'Finance',
    hint: 'An invoice is sent to a client.',
  },
  {
    eventType: 'finance.invoice.paid',
    label: 'Invoice paid',
    module: 'Finance',
    hint: 'An invoice is paid in full.',
  },
  {
    eventType: 'finance.invoice.overdue',
    label: 'Invoice overdue',
    module: 'Finance',
    hint: 'An invoice passes its due date unpaid.',
  },
  {
    eventType: 'projects.project.created',
    label: 'Project created',
    module: 'Projects',
    hint: 'A new project is created.',
  },
  {
    eventType: 'tasks.task.status_changed',
    label: 'Task status changed',
    module: 'Tasks',
    hint: 'A task moves to a new status.',
  },
  {
    eventType: 'meetings.meeting.completed',
    label: 'Meeting completed',
    module: 'Meetings',
    hint: 'A meeting is marked complete.',
  },
  {
    eventType: 'hr.leave.requested',
    label: 'Leave requested',
    module: 'Team',
    hint: 'A teammate files a leave request.',
  },
]

export interface ActionDef {
  actionKey: string
  label: string
  description: string
  /** What the action's `input` typically contains, shown as a hint in the builder. */
  inputHint: string
  /** AI/outbound actions require human approval before they leave the workspace (R-AI3). */
  requiresApproval?: boolean
}

/** The action registry an automation's steps are drawn from. */
export const ACTION_DEFS: readonly ActionDef[] = [
  {
    actionKey: 'notify.team',
    label: 'Notify the team',
    description: 'Send an in-app notification to workspace members.',
    inputHint: 'message, audience',
  },
  {
    actionKey: 'tasks.create',
    label: 'Create a task',
    description: 'Open a task, optionally assigned and due-dated.',
    inputHint: 'title, assignee, dueInDays',
  },
  {
    actionKey: 'crm.log_activity',
    label: 'Log a CRM activity',
    description: 'Record an activity on the related contact or deal.',
    inputHint: 'type, note',
  },
  {
    actionKey: 'ai.summarize',
    label: 'Summarize with Aurex',
    description: 'Ask Aurex to summarize the triggering entity.',
    inputHint: 'focus (optional)',
  },
  {
    actionKey: 'email.draft',
    label: 'Draft an email',
    description: 'Draft a context-aware email for review — never sent automatically.',
    inputHint: 'to, intent',
    requiresApproval: true,
  },
  {
    actionKey: 'finance.reminder_draft',
    label: 'Draft a payment reminder',
    description: 'Draft a relationship-aware overdue reminder for review.',
    inputHint: 'tone',
    requiresApproval: true,
  },
  {
    actionKey: 'automation.delay',
    label: 'Wait / delay',
    description: 'Pause the automation before the next step.',
    inputHint: 'days',
  },
]

export interface RecipeDef {
  key: string
  name: string
  description: string
  triggerEventType: string
  actionKeys: string[]
}

/** Starter automations for the recipe gallery — one click prefills the builder. */
export const RECIPE_DEFS: readonly RecipeDef[] = [
  {
    key: 'deal-won-kickoff',
    name: 'Kick off delivery on a won deal',
    description: 'When a proposal is accepted, create a kickoff task and notify the team.',
    triggerEventType: 'proposals.proposal.accepted',
    actionKeys: ['tasks.create', 'notify.team'],
  },
  {
    key: 'overdue-invoice-nudge',
    name: 'Chase an overdue invoice',
    description: 'When an invoice goes overdue, draft a relationship-aware reminder for review.',
    triggerEventType: 'finance.invoice.overdue',
    actionKeys: ['finance.reminder_draft', 'notify.team'],
  },
  {
    key: 'contract-renewal-watch',
    name: 'Prepare for a contract renewal',
    description: 'When the renewal radar flags a contract, summarize it and open a follow-up task.',
    triggerEventType: 'contracts.contract.expiry_flagged',
    actionKeys: ['ai.summarize', 'tasks.create'],
  },
  {
    key: 'new-lead-welcome',
    name: 'Log every new contact',
    description: 'When a contact is created, log a CRM activity so the timeline stays complete.',
    triggerEventType: 'crm.contact.created',
    actionKeys: ['crm.log_activity'],
  },
]

export function recipeDef(key: string): RecipeDef | undefined {
  return RECIPE_DEFS.find((r) => r.key === key)
}

const TRIGGER_BY_KEY = new Map(TRIGGER_DEFS.map((t) => [t.eventType, t]))
const ACTION_BY_KEY = new Map(ACTION_DEFS.map((a) => [a.actionKey, a]))

export function triggerDef(eventType: string): TriggerDef | undefined {
  return TRIGGER_BY_KEY.get(eventType as DomainEventType)
}

export function actionDef(actionKey: string): ActionDef | undefined {
  return ACTION_BY_KEY.get(actionKey)
}

export function triggerLabel(eventType: string): string {
  return TRIGGER_BY_KEY.get(eventType as DomainEventType)?.label ?? eventType
}

export function actionLabel(actionKey: string): string {
  return ACTION_BY_KEY.get(actionKey)?.label ?? actionKey
}

/** Catalog lines fed to the AI prompts (assistant + drafter). */
export function triggerCatalogText(): string {
  return TRIGGER_DEFS.map((t) => `${t.eventType} — ${t.label} (${t.hint})`).join('\n')
}

export function actionCatalogText(): string {
  return ACTION_DEFS.map((a) => `${a.actionKey} — ${a.description} [input: ${a.inputHint}]`).join(
    '\n',
  )
}
