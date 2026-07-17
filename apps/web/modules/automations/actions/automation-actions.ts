'use server'

import { z } from 'zod'
import { CreateAutomationInput, UpdateAutomationInput, type AutomationStatus } from '@aurexos/core'
import type { Tables } from '@aurexos/db'
import { emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import type { WorkspaceContext } from '@/lib/workspace-context'
import { failure, requireAutomationManage, revalidateAutomations } from './automations-access'

// The mutation spine (R-A3): validate → authorize → execute → emit event → audit.
// Automations are never activated by the AI drafter or by create alone — activation
// is an explicit human action (setAutomationStatus), so a proposed automation
// cannot start acting on the workspace without review (R-AI3 in spirit).

type AutomationRow = Tables<'automations'>

async function getRow(ctx: WorkspaceContext, id: string): Promise<AutomationRow | null> {
  const { data } = await ctx.supabase
    .from('automations')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  return data
}

export async function createAutomation(
  input: z.input<typeof CreateAutomationInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateAutomationInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid automation' }
  }
  try {
    const ctx = await requireAutomationManage()
    const d = parsed.data
    const { data: created, error } = await ctx.supabase
      .from('automations')
      .insert({
        workspace_id: ctx.workspace.id,
        name: d.name,
        // New automations always start as drafts — they never run until a human
        // activates them.
        status: 'draft',
        trigger_event_type: d.triggerEventType,
        trigger_filter: d.triggerFilter as AutomationRow['trigger_filter'],
        condition_graph: d.conditionGraph as AutomationRow['condition_graph'],
        actions: d.actions as AutomationRow['actions'],
        error_policy: d.errorPolicy as AutomationRow['error_policy'],
        owner_user_id: ctx.userId,
        scope: d.scope,
      })
      .select('id')
      .single()
    if (error || !created) return { ok: false, error: 'Could not create automation' }

    await emitDomainEvent(ctx, {
      eventType: 'automation.created',
      entityType: 'automation',
      entityId: created.id,
      payload: { name: d.name, triggerEventType: d.triggerEventType },
    })
    await writeAudit(ctx, {
      action: 'automation.created',
      entityType: 'automation',
      entityId: created.id,
      after: { name: d.name, triggerEventType: d.triggerEventType, actions: d.actions },
    })
    revalidateAutomations(created.id)
    return { ok: true, data: { id: created.id } }
  } catch (err) {
    return failure(err)
  }
}

export async function updateAutomation(
  input: z.input<typeof UpdateAutomationInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = UpdateAutomationInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid automation' }
  }
  try {
    const ctx = await requireAutomationManage()
    const d = parsed.data
    const existing = await getRow(ctx, d.id)
    if (!existing) return { ok: false, error: 'Automation not found' }

    const patch: Partial<AutomationRow> = {}
    if (d.name !== undefined) patch.name = d.name
    if (d.triggerEventType !== undefined) patch.trigger_event_type = d.triggerEventType
    if (d.triggerFilter !== undefined)
      patch.trigger_filter = d.triggerFilter as AutomationRow['trigger_filter']
    if (d.conditionGraph !== undefined)
      patch.condition_graph = d.conditionGraph as AutomationRow['condition_graph']
    if (d.actions !== undefined) patch.actions = d.actions as AutomationRow['actions']
    if (d.errorPolicy !== undefined)
      patch.error_policy = d.errorPolicy as AutomationRow['error_policy']
    if (d.scope !== undefined) patch.scope = d.scope

    const { error } = await ctx.supabase
      .from('automations')
      .update(patch)
      .eq('id', d.id)
      .eq('workspace_id', ctx.workspace.id)
    if (error) return { ok: false, error: 'Could not update automation' }

    await emitDomainEvent(ctx, {
      eventType: 'automation.updated',
      entityType: 'automation',
      entityId: d.id,
      payload: { name: patch.name ?? existing.name },
    })
    await writeAudit(ctx, {
      action: 'automation.updated',
      entityType: 'automation',
      entityId: d.id,
      before: existing,
      after: { ...existing, ...patch },
    })
    revalidateAutomations(d.id)
    return { ok: true, data: { id: d.id } }
  } catch (err) {
    return failure(err)
  }
}

const SetStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(['active', 'paused', 'draft']),
})

/**
 * Activate / pause / return-to-draft. Activation is the gate that lets an
 * automation start acting on workspace events, so it is an explicit,
 * separately-audited human action.
 */
export async function setAutomationStatus(
  input: z.input<typeof SetStatusInput>,
): Promise<ActionResult<{ id: string; status: AutomationStatus }>> {
  const parsed = SetStatusInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid status change' }
  try {
    const ctx = await requireAutomationManage()
    const { id, status } = parsed.data
    const existing = await getRow(ctx, id)
    if (!existing) return { ok: false, error: 'Automation not found' }
    if (
      status === 'active' &&
      (!Array.isArray(existing.actions) || existing.actions.length === 0)
    ) {
      return { ok: false, error: 'Add at least one action before activating' }
    }

    const { error } = await ctx.supabase
      .from('automations')
      .update({ status })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
    if (error) return { ok: false, error: 'Could not change status' }

    const eventType =
      status === 'active'
        ? 'automation.activated'
        : status === 'paused'
          ? 'automation.paused'
          : 'automation.updated'
    await emitDomainEvent(ctx, {
      eventType,
      entityType: 'automation',
      entityId: id,
      payload: { status },
    })
    await writeAudit(ctx, {
      action: eventType,
      entityType: 'automation',
      entityId: id,
      before: { status: existing.status },
      after: { status },
    })
    revalidateAutomations(id)
    return { ok: true, data: { id, status } }
  } catch (err) {
    return failure(err)
  }
}

const DeleteAutomationInput = z.object({ id: z.string().uuid() })

export async function deleteAutomation(
  input: z.input<typeof DeleteAutomationInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = DeleteAutomationInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request' }
  try {
    const ctx = await requireAutomationManage()
    const existing = await getRow(ctx, parsed.data.id)
    if (!existing) return { ok: true, data: { id: parsed.data.id } }

    // Soft delete (R-D3).
    const { error } = await ctx.supabase
      .from('automations')
      .update({ deleted_at: new Date().toISOString(), status: 'paused' })
      .eq('id', parsed.data.id)
      .eq('workspace_id', ctx.workspace.id)
    if (error) return { ok: false, error: 'Could not delete automation' }

    await emitDomainEvent(ctx, {
      eventType: 'automation.deleted',
      entityType: 'automation',
      entityId: parsed.data.id,
      payload: { name: existing.name },
    })
    await writeAudit(ctx, {
      action: 'automation.deleted',
      entityType: 'automation',
      entityId: parsed.data.id,
      before: existing,
    })
    revalidateAutomations()
    return { ok: true, data: { id: parsed.data.id } }
  } catch (err) {
    return failure(err)
  }
}
