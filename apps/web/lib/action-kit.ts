import 'server-only'

import type { Capability, DomainEventType } from '@aurexos/core'
import type { TablesInsert } from '@aurexos/db'
import { dispatchAutomationsForEvent } from '@/lib/automation-engine'
import { requirePermission } from '@/lib/permissions'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

// Re-exported so the many `import { ActionError } from '@/lib/action-kit'` sites
// keep working; the definitions live in action-error.ts to break the cycle with
// the permission resolver.
export { ActionError } from '@/lib/action-error'
export type { ActionResult } from '@/lib/action-error'

/**
 * Legacy Phase-1 capability → engine permission key (0019 cutover, ADR-0008).
 * requireCapability now resolves through the data-driven engine; call sites keep
 * their capability strings while the underlying check is engine-backed. Old
 * capability semantics are preserved via the seeded matrix + org-owner elevation.
 */
const CAPABILITY_TO_PERMISSION: Record<Capability, string> = {
  'workspace.manage': 'settings.workspace.manage',
  'workspace.members.manage': 'users.role.assign',
  'projects.view': 'projects.project.view',
  'projects.create': 'projects.project.create',
  'projects.edit': 'projects.project.edit',
  'projects.delete': 'projects.project.delete',
  'tasks.view': 'tasks.task.view',
  'tasks.create': 'tasks.task.create',
  'tasks.edit': 'tasks.task.edit',
  'tasks.delete': 'tasks.task.delete',
  'crm.view': 'crm.crm.view',
  'crm.create': 'crm.crm.edit',
  'crm.edit': 'crm.crm.edit',
  'crm.delete': 'crm.crm.delete',
  'clients.view': 'clients.client.view',
  'clients.create': 'clients.client.edit',
  'clients.edit': 'clients.client.edit',
  'clients.delete': 'clients.client.delete',
  'dashboard.view': 'dashboard.dashboard.view',
  'settings.view': 'settings.workspace.manage',
}

/**
 * Resolve workspace context and assert the caller holds the permission the
 * capability maps to. The spine of every mutation: validate → requireCapability
 * → mutate → emit. Engine-backed as of the 0019 cutover.
 */
export async function requireCapability(capability: Capability): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  await requirePermission(ctx, CAPABILITY_TO_PERMISSION[capability])
  return ctx
}

/**
 * Append a domain event to domain_events. Best-effort: failures are logged,
 * never thrown — an event insert must not roll back a committed mutation.
 */
export async function emitDomainEvent(
  ctx: WorkspaceContext,
  e: {
    eventType: DomainEventType
    entityType: string
    entityId: string
    payload?: Record<string, unknown>
  },
): Promise<void> {
  try {
    const { error } = await ctx.supabase.from('domain_events').insert({
      workspace_id: ctx.workspace.id,
      actor_id: ctx.userId,
      event_type: e.eventType,
      entity_type: e.entityType,
      entity_id: e.entityId,
      payload: (e.payload ?? {}) as TablesInsert<'domain_events'>['payload'],
    })
    if (error) {
      console.error(`emitDomainEvent(${e.eventType}) failed:`, error.message)
    }
  } catch (err) {
    console.error(`emitDomainEvent(${e.eventType}) failed:`, err)
  }

  // Automation Studio consumes the event stream here (R-A6): active automations
  // whose trigger matches this event run now. Best-effort and fully shielded —
  // the engine never throws, so a failing automation can never break the
  // mutation that emitted the event.
  await dispatchAutomationsForEvent(ctx, {
    eventType: e.eventType,
    entityType: e.entityType,
    entityId: e.entityId,
    payload: e.payload ?? {},
  })
}

/**
 * Append an audit_log entry. Best-effort: failures are logged, never thrown.
 */
export async function writeAudit(
  ctx: WorkspaceContext,
  a: {
    action: string
    entityType: string
    entityId: string
    before?: unknown
    after?: unknown
  },
): Promise<void> {
  try {
    const { error } = await ctx.supabase.from('audit_log').insert({
      workspace_id: ctx.workspace.id,
      actor_id: ctx.userId,
      action: a.action,
      entity_type: a.entityType,
      entity_id: a.entityId,
      before: (a.before ?? null) as TablesInsert<'audit_log'>['before'],
      after: (a.after ?? null) as TablesInsert<'audit_log'>['after'],
    })
    if (error) {
      console.error(`writeAudit(${a.action}) failed:`, error.message)
    }
  } catch (err) {
    console.error(`writeAudit(${a.action}) failed:`, err)
  }
}
