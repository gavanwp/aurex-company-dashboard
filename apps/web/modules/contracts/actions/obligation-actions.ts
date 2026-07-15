'use server'

import { z } from 'zod'
import { CreateContractObligationInput, UpdateContractObligationInput } from '@aurexos/core'
import type { TablesInsert, TablesUpdate } from '@aurexos/db'
import { emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import type { WorkspaceContext } from '@/lib/workspace-context'
import { failure, requireContractManage, revalidateContracts } from './contracts-access'

const idSchema = z.string().uuid()

async function assertContract(ctx: WorkspaceContext, contractId: string): Promise<boolean> {
  const { data } = await ctx.supabase
    .from('contracts')
    .select('id')
    .eq('id', contractId)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  return !!data
}

/** Add an obligation to a contract. Emits contracts.obligation.created. */
export async function addObligation(
  input: z.input<typeof CreateContractObligationInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateContractObligationInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid obligation' }
  }

  try {
    const ctx = await requireContractManage()
    const d = parsed.data
    if (!(await assertContract(ctx, d.contractId))) {
      return { ok: false, error: 'Contract not found' }
    }

    const { data: created, error } = await ctx.supabase
      .from('contract_obligations')
      .insert({
        workspace_id: ctx.workspace.id,
        contract_id: d.contractId,
        description: d.description,
        due_rule: d.dueRule as TablesInsert<'contract_obligations'>['due_rule'],
        owner_user_id: d.ownerUserId ?? null,
        source_clause: d.sourceClause?.trim() ? d.sourceClause.trim() : null,
      })
      .select('id')
      .single()
    if (error || !created) return { ok: false, error: error?.message ?? 'Could not add obligation' }

    await writeAudit(ctx, {
      action: 'contracts.obligation.created',
      entityType: 'contract_obligation',
      entityId: created.id,
      after: { contractId: d.contractId, description: d.description },
    })
    await emitDomainEvent(ctx, {
      eventType: 'contracts.obligation.created',
      entityType: 'contract_obligation',
      entityId: created.id,
      payload: { contractId: d.contractId },
    })

    revalidateContracts(d.contractId)
    return { ok: true, data: { id: created.id } }
  } catch (err) {
    return failure(err)
  }
}

/** Edit an obligation (description / due rule / owner). */
export async function updateObligation(
  input: z.input<typeof UpdateContractObligationInput>,
): Promise<ActionResult> {
  const parsed = UpdateContractObligationInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid obligation' }

  try {
    const ctx = await requireContractManage()
    const { id, ...d } = parsed.data
    const { data: before } = await ctx.supabase
      .from('contract_obligations')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!before) return { ok: false, error: 'Obligation not found' }

    const patch: TablesUpdate<'contract_obligations'> = {}
    if (d.description !== undefined) patch.description = d.description
    if (d.dueRule !== undefined) {
      patch.due_rule = d.dueRule as TablesUpdate<'contract_obligations'>['due_rule']
    }
    if (d.ownerUserId !== undefined) patch.owner_user_id = d.ownerUserId ?? null
    if (d.sourceClause !== undefined) {
      patch.source_clause = d.sourceClause?.trim() ? d.sourceClause.trim() : null
    }
    if (Object.keys(patch).length === 0) return { ok: true, data: undefined }
    patch.updated_at = new Date().toISOString()

    const { error } = await ctx.supabase
      .from('contract_obligations')
      .update(patch)
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
    if (error) return { ok: false, error: error.message }

    revalidateContracts(before.contract_id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

/** Soft-delete an obligation. */
export async function removeObligation(id: string): Promise<ActionResult> {
  try {
    if (!idSchema.safeParse(id).success) return { ok: false, error: 'Invalid obligation id' }
    const ctx = await requireContractManage()
    const { data: before } = await ctx.supabase
      .from('contract_obligations')
      .select('id, contract_id')
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!before) return { ok: false, error: 'Obligation not found' }

    const { error } = await ctx.supabase
      .from('contract_obligations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
    if (error) return { ok: false, error: error.message }

    revalidateContracts(before.contract_id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

// ── The flagship: convert an obligation to a task (human-in-the-loop) ─────────

export interface ConvertObligationResult {
  taskId: string
  alreadyConverted: boolean
}

/** Read the converted-task link for an obligation from domain_events, if any. */
async function findConvertedTaskId(
  ctx: WorkspaceContext,
  obligationId: string,
): Promise<string | null> {
  const { data } = await ctx.supabase
    .from('domain_events')
    .select('payload')
    .eq('workspace_id', ctx.workspace.id)
    .eq('event_type', 'contracts.obligation.converted')
    .eq('entity_id', obligationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const payload = data?.payload as { taskId?: unknown } | null
  return payload && typeof payload.taskId === 'string' ? payload.taskId : null
}

/**
 * Turn a contract obligation into a real, tracked task. Mirrors the meetings
 * action-item→task convert: a workspace-scoped, RLS-backstopped direct write to
 * tasks (the tasks module exports no server-side creator yet), emitting the
 * tasks domain event AND the contracts conversion event that links the two.
 * Idempotent — a second call returns the task the first one created (the link is
 * derived from domain_events, so no extra column on contract_obligations).
 */
export async function convertObligationToTask(
  obligationId: string,
): Promise<ActionResult<ConvertObligationResult>> {
  try {
    if (!idSchema.safeParse(obligationId).success) {
      return { ok: false, error: 'Invalid obligation id' }
    }
    const ctx = await requireContractManage()

    const { data: obligation } = await ctx.supabase
      .from('contract_obligations')
      .select('*')
      .eq('id', obligationId)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!obligation) return { ok: false, error: 'Obligation not found' }

    // Idempotency: already converted → return the existing task link.
    const existingTaskId = await findConvertedTaskId(ctx, obligationId)
    if (existingTaskId) {
      return { ok: true, data: { taskId: existingTaskId, alreadyConverted: true } }
    }

    // The task inherits the contract's linked project so it lands in the right
    // place; due date comes from the obligation's due rule.
    const { data: contract } = await ctx.supabase
      .from('contracts')
      .select('id, project_id, title')
      .eq('id', obligation.contract_id)
      .eq('workspace_id', ctx.workspace.id)
      .maybeSingle()

    const rule = (obligation.due_rule ?? {}) as { dueDate?: unknown }
    const dueDate = typeof rule.dueDate === 'string' ? rule.dueDate : null

    const { data: task, error: taskError } = await ctx.supabase
      .from('tasks')
      .insert({
        workspace_id: ctx.workspace.id,
        project_id: contract?.project_id ?? null,
        title: obligation.description,
        description: contract ? `Contract obligation: ${contract.title}` : null,
        status: 'todo',
        priority: 'none',
        assignee_id: obligation.owner_user_id,
        reporter_id: ctx.userId,
        due_date: dueDate,
        labels: [],
      })
      .select('id')
      .single()
    if (taskError || !task) {
      return { ok: false, error: taskError?.message ?? 'Could not create task' }
    }

    await writeAudit(ctx, {
      action: 'tasks.task.created',
      entityType: 'task',
      entityId: task.id,
      after: { title: obligation.description, source: 'contract_obligation', obligationId },
    })
    await emitDomainEvent(ctx, {
      eventType: 'tasks.task.created',
      entityType: 'task',
      entityId: task.id,
      payload: {
        title: obligation.description,
        projectId: contract?.project_id ?? null,
        obligationId,
      },
    })
    await emitDomainEvent(ctx, {
      // Past-tense verb per the R-Q2 event-naming contract (verb ends in -ed).
      eventType: 'contracts.obligation.converted',
      entityType: 'contract_obligation',
      entityId: obligationId,
      payload: { taskId: task.id, contractId: obligation.contract_id },
    })

    revalidateContracts(obligation.contract_id)
    return { ok: true, data: { taskId: task.id, alreadyConverted: false } }
  } catch (err) {
    return failure(err)
  }
}
