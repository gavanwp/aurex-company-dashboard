import 'server-only'

import { can, type Capability, type DomainEventType } from '@aurexos/core'
import type { TablesInsert } from '@aurexos/db'
import { dispatchAutomationsForEvent } from '@/lib/automation-engine'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

/**
 * Thrown by action-kit guards; feature actions catch it (or let a shared
 * wrapper catch it) and surface `error.message` as an ActionResult.
 */
export class ActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ActionError'
  }
}

/** The uniform return shape of every server action. */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string }

/**
 * Resolve workspace context and assert the caller's role grants `capability`.
 * The spine of every mutation: validate → requireCapability → mutate → emit.
 */
export async function requireCapability(capability: Capability): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  if (!can(ctx.role, capability)) {
    throw new ActionError('forbidden')
  }
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
