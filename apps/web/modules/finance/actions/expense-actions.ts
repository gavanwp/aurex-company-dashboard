'use server'

import type { z } from 'zod'
import { CreateExpenseInput } from '@aurexos/core'
import type { Tables } from '@aurexos/db'
import { emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import type { WorkspaceContext } from '@/lib/workspace-context'
import {
  failure,
  requireFinanceManage,
  requireFinanceRead,
  revalidateFinance,
} from './finance-access'

async function getExpenseRow(
  ctx: WorkspaceContext,
  id: string,
): Promise<Tables<'expenses'> | null> {
  const { data } = await ctx.supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  return data
}

/**
 * Submit an expense for approval → 'pending'. Any internal member may submit
 * (it is stamped with their id); only managers approve/reject. Amount is minor
 * units (the dialog converts dollars before calling this).
 */
export async function submitExpense(
  input: z.input<typeof CreateExpenseInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateExpenseInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid expense' }
  }

  try {
    const ctx = await requireFinanceRead()
    const d = parsed.data

    const { data: created, error } = await ctx.supabase
      .from('expenses')
      .insert({
        workspace_id: ctx.workspace.id,
        vendor: d.vendor,
        amount_minor: d.amountMinor,
        currency: d.currency,
        category: d.category ?? null,
        expense_date: d.expenseDate,
        billable: d.billable,
        project_id: d.projectId ?? null,
        submitted_by: ctx.userId,
        approval_status: 'pending',
      })
      .select('*')
      .single()
    if (error || !created) {
      return { ok: false, error: error?.message ?? 'Could not submit expense' }
    }

    await writeAudit(ctx, {
      action: 'finance.expense.submitted',
      entityType: 'expense',
      entityId: created.id,
      after: created,
    })
    await emitDomainEvent(ctx, {
      eventType: 'finance.expense.submitted',
      entityType: 'expense',
      entityId: created.id,
      payload: {
        vendor: created.vendor,
        amountMinor: created.amount_minor,
        billable: created.billable,
      },
    })
    revalidateFinance()
    return { ok: true, data: { id: created.id } }
  } catch (err) {
    return failure(err)
  }
}

async function decideExpense(id: string, decision: 'approved' | 'rejected'): Promise<ActionResult> {
  try {
    const ctx = await requireFinanceManage()

    const before = await getExpenseRow(ctx, id)
    if (!before) return { ok: false, error: 'Expense not found' }
    if (before.approval_status !== 'pending') {
      return { ok: false, error: `Only pending expenses can be ${decision}.` }
    }

    const { data: after, error } = await ctx.supabase
      .from('expenses')
      .update({ approval_status: decision })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .eq('approval_status', 'pending')
      .select('*')
      .single()
    if (error || !after) {
      return { ok: false, error: error?.message ?? `Could not ${decision.slice(0, -1)} expense` }
    }

    await writeAudit(ctx, {
      action: decision === 'approved' ? 'finance.expense.approved' : 'finance.expense.rejected',
      entityType: 'expense',
      entityId: id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: decision === 'approved' ? 'finance.expense.approved' : 'finance.expense.rejected',
      entityType: 'expense',
      entityId: id,
      payload: { vendor: after.vendor, amountMinor: after.amount_minor },
    })
    revalidateFinance()
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

/** pending → approved (owner/admin/finance). Emits finance.expense.approved. */
export async function approveExpense(id: string): Promise<ActionResult> {
  return decideExpense(id, 'approved')
}

/** pending → rejected (owner/admin/finance). Emits finance.expense.rejected. */
export async function rejectExpense(id: string): Promise<ActionResult> {
  return decideExpense(id, 'rejected')
}
