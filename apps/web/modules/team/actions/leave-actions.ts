'use server'

import type { z } from 'zod'
import { CancelLeaveInput, DecideLeaveInput, RequestLeaveInput } from '@aurexos/core'
import type { Tables } from '@aurexos/db'
import { emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'
import { canManageTeam, failure, requireTeamManage, revalidateTeam } from './team-access'

// Leave lifecycle. Filing is self-service (any internal member requests their own
// leave); deciding (approve/reject) is Owner/Admin/HR; a member may cancel their
// own request. Each step runs the mutation spine (R-A3) and emits an hr.leave.*
// event so Calendar/availability can react (06_Module_Breakdown.md §16 → §6).

type LeaveRow = Tables<'hr_leave_requests'>

const READ_EXCLUDED_ROLES = new Set(['client', 'guest'])

async function getLeaveRow(ctx: WorkspaceContext, id: string): Promise<LeaveRow | null> {
  const { data } = await ctx.supabase
    .from('hr_leave_requests')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  return data
}

/**
 * File a leave request. Members file their own; Owner/Admin/HR may file on behalf
 * of another member. Always starts 'pending'. Emits hr.leave.requested.
 */
export async function requestLeave(
  input: z.input<typeof RequestLeaveInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = RequestLeaveInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid leave request' }
  }

  try {
    const ctx = await getWorkspaceContext()
    if (READ_EXCLUDED_ROLES.has(ctx.role)) return { ok: false, error: 'forbidden' }
    const d = parsed.data

    // Filing for someone else requires manage rights; otherwise it is your own.
    const targetUserId = d.userId ?? ctx.userId
    if (targetUserId !== ctx.userId && !(await canManageTeam(ctx))) {
      return { ok: false, error: 'forbidden' }
    }

    const { data: created, error } = await ctx.supabase
      .from('hr_leave_requests')
      .insert({
        workspace_id: ctx.workspace.id,
        user_id: targetUserId,
        type: d.type,
        start_date: d.startDate,
        end_date: d.endDate,
        status: 'pending',
        reason: d.reason ?? null,
      })
      .select('id')
      .single()
    if (error || !created) return { ok: false, error: 'Could not file leave request' }

    await emitDomainEvent(ctx, {
      eventType: 'hr.leave.requested',
      entityType: 'hr_leave_request',
      entityId: created.id,
      payload: { userId: targetUserId, type: d.type, startDate: d.startDate, endDate: d.endDate },
    })
    await writeAudit(ctx, {
      action: 'hr.leave.requested',
      entityType: 'hr_leave_request',
      entityId: created.id,
      after: { userId: targetUserId, type: d.type, startDate: d.startDate, endDate: d.endDate },
    })
    revalidateTeam(targetUserId)
    return { ok: true, data: { id: created.id } }
  } catch (err) {
    return failure(err)
  }
}

/**
 * Approve or reject a pending request. Owner/Admin/HR only. Emits
 * hr.leave.approved / hr.leave.rejected.
 */
export async function decideLeave(
  input: z.input<typeof DecideLeaveInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = DecideLeaveInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid decision' }
  }

  try {
    const ctx = await requireTeamManage()
    const d = parsed.data

    const row = await getLeaveRow(ctx, d.id)
    if (!row) return { ok: false, error: 'Request not found' }
    if (row.status !== 'pending') {
      return { ok: false, error: 'Only pending requests can be decided' }
    }

    const { error } = await ctx.supabase
      .from('hr_leave_requests')
      .update({
        status: d.decision,
        decided_by: ctx.userId,
        decided_at: new Date().toISOString(),
        decision_note: d.note ?? null,
      })
      .eq('id', d.id)
      .eq('workspace_id', ctx.workspace.id)
    if (error) return { ok: false, error: 'Could not record the decision' }

    await emitDomainEvent(ctx, {
      eventType: d.decision === 'approved' ? 'hr.leave.approved' : 'hr.leave.rejected',
      entityType: 'hr_leave_request',
      entityId: d.id,
      payload: { userId: row.user_id, startDate: row.start_date, endDate: row.end_date },
    })
    await writeAudit(ctx, {
      action: d.decision === 'approved' ? 'hr.leave.approved' : 'hr.leave.rejected',
      entityType: 'hr_leave_request',
      entityId: d.id,
      before: row,
      after: { ...row, status: d.decision },
    })
    revalidateTeam(row.user_id)
    return { ok: true, data: { id: d.id } }
  } catch (err) {
    return failure(err)
  }
}

/** Cancel a request. The requester may cancel their own; managers may cancel any. */
export async function cancelLeave(
  input: z.input<typeof CancelLeaveInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CancelLeaveInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Invalid request' }
  }

  try {
    const ctx = await getWorkspaceContext()
    if (READ_EXCLUDED_ROLES.has(ctx.role)) return { ok: false, error: 'forbidden' }

    const row = await getLeaveRow(ctx, parsed.data.id)
    if (!row) return { ok: false, error: 'Request not found' }
    if (row.user_id !== ctx.userId && !(await canManageTeam(ctx))) {
      return { ok: false, error: 'forbidden' }
    }
    if (row.status === 'cancelled') return { ok: true, data: { id: row.id } }

    const { error } = await ctx.supabase
      .from('hr_leave_requests')
      .update({ status: 'cancelled' })
      .eq('id', row.id)
      .eq('workspace_id', ctx.workspace.id)
    if (error) return { ok: false, error: 'Could not cancel the request' }

    await emitDomainEvent(ctx, {
      eventType: 'hr.leave.cancelled',
      entityType: 'hr_leave_request',
      entityId: row.id,
      payload: { userId: row.user_id },
    })
    await writeAudit(ctx, {
      action: 'hr.leave.cancelled',
      entityType: 'hr_leave_request',
      entityId: row.id,
      before: row,
      after: { ...row, status: 'cancelled' },
    })
    revalidateTeam(row.user_id)
    return { ok: true, data: { id: row.id } }
  } catch (err) {
    return failure(err)
  }
}
