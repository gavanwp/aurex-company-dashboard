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
