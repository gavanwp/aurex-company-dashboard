// Domain event contracts (13_Folder_Structure.md §7: snake.dot, past tense, module-prefixed).
// Every mutation in a module action emits exactly one of these into domain_events.

export const DOMAIN_EVENTS = [
  'workspace.created',
  'workspace.member.invited',
  'workspace.member.removed',
  'projects.project.created',
  'projects.project.updated',
  'projects.project.deleted',
  'tasks.task.created',
  'tasks.task.updated',
  'tasks.task.status_changed',
  'tasks.task.assigned',
  'tasks.task.deleted',
  'tasks.comment.created',
  'crm.client.created',
  'crm.client.updated',
  'crm.client.deleted',
  'crm.contact.created',
  'crm.contact.updated',
  'crm.contact.deleted',
  'crm.deal.created',
  'crm.deal.updated',
  'crm.deal.stage_changed',
  'crm.deal.deleted',
  'documents.document.published',
  'kb.page.verified',
  'finance.invoice.created',
  'finance.invoice.sent',
  'finance.invoice.paid',
  'finance.invoice.partially_paid',
  'finance.invoice.overdue',
  'finance.invoice.voided',
  'finance.payment.recorded',
  'finance.expense.submitted',
  'finance.expense.approved',
  'finance.expense.rejected',
  'proposals.proposal.created',
  'proposals.proposal.sent',
  'proposals.proposal.viewed',
  'proposals.proposal.accepted',
  'proposals.proposal.declined',
  'proposals.proposal.expired',
  'contracts.contract.created',
  'contracts.contract.sent',
  'contracts.contract.signed',
  'contracts.contract.activated',
  // 'expiry_flagged' (not 'expiring'): the R-Q2 event verb must be past tense —
  // the renewal radar flags a contract as approaching its end date.
  'contracts.contract.expiry_flagged',
  'contracts.contract.terminated',
  'contracts.obligation.created',
  'contracts.obligation.converted',
  'meetings.meeting.summarized',
  'meetings.meeting.scheduled',
  'meetings.meeting.completed',
  'meetings.decision.recorded',
  'meetings.action_item.created',
  'meetings.action_item.converted',
  'email.thread.created',
  'email.message.logged',
  'email.thread.linked',
  'email.thread.status_changed',
  'calendar.event.created',
  'calendar.event.updated',
  'calendar.event.cancelled',
  'hr.profile.created',
  'hr.profile.updated',
  'hr.leave.requested',
  'hr.leave.approved',
  'hr.leave.rejected',
  'hr.leave.cancelled',
  'automation.run.completed',
  'automation.run.failed',
  'ai.run.completed',
  'ai.approval.requested',
  'ai.approval.decided',
] as const

export type DomainEventType = (typeof DOMAIN_EVENTS)[number]

export interface DomainEvent<TPayload = Record<string, unknown>> {
  eventType: DomainEventType
  workspaceId: string
  actorId: string
  entityType: string
  entityId: string
  payload: TPayload
}
