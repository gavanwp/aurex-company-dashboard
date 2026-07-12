'use server'

import type { z } from 'zod'
import { CreateInvoiceInput, UpdateInvoiceInput } from '@aurexos/core'
import type { Tables, TablesInsert, TablesUpdate } from '@aurexos/db'
import { emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import type { WorkspaceContext } from '@/lib/workspace-context'
import { computeInvoiceTotals, normalizeLineItems } from '../lib/money'
import { failure, requireFinanceManage, revalidateFinance } from './finance-access'

const UNIQUE_VIOLATION = '23505'
const DUPLICATE_NUMBER_MESSAGE = 'That invoice number is already used — pick another.'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

async function getInvoiceRow(
  ctx: WorkspaceContext,
  id: string,
): Promise<Tables<'invoices'> | null> {
  const { data } = await ctx.supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  return data
}

/**
 * Create a draft invoice. Totals are recomputed server-side from the line
 * items (R-D8) — any client-sent subtotal/tax/total is discarded. New invoices
 * always start in 'draft'; the lifecycle only advances through markSent.
 */
export async function createInvoice(
  input: z.input<typeof CreateInvoiceInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateInvoiceInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid invoice' }
  }

  try {
    const ctx = await requireFinanceManage()
    const d = parsed.data

    const lineItems = normalizeLineItems(d.lineItems)
    const totals = computeInvoiceTotals(lineItems)

    const { data: created, error } = await ctx.supabase
      .from('invoices')
      .insert({
        workspace_id: ctx.workspace.id,
        client_id: d.clientId,
        project_id: d.projectId ?? null,
        number: d.number,
        status: 'draft',
        currency: d.currency,
        subtotal_minor: totals.subtotalMinor,
        tax_minor: totals.taxMinor,
        total_minor: totals.totalMinor,
        issue_date: d.issueDate ?? null,
        due_date: d.dueDate ?? null,
        line_items: lineItems as TablesInsert<'invoices'>['line_items'],
      })
      .select('*')
      .single()
    if (error || !created) {
      if (error?.code === UNIQUE_VIOLATION) return { ok: false, error: DUPLICATE_NUMBER_MESSAGE }
      return { ok: false, error: error?.message ?? 'Could not create invoice' }
    }

    await writeAudit(ctx, {
      action: 'finance.invoice.created',
      entityType: 'invoice',
      entityId: created.id,
      after: created,
    })
    await emitDomainEvent(ctx, {
      eventType: 'finance.invoice.created',
      entityType: 'invoice',
      entityId: created.id,
      payload: {
        number: created.number,
        totalMinor: created.total_minor,
        currency: created.currency,
      },
    })
    revalidateFinance()
    return { ok: true, data: { id: created.id } }
  } catch (err) {
    return failure(err)
  }
}

/**
 * Edit an invoice — allowed ONLY while status is 'draft'. Once sent (or beyond)
 * an invoice is immutable; the only path to change it is void & reissue. Totals
 * are recomputed server-side from the line items.
 */
export async function updateInvoice(
  input: z.input<typeof UpdateInvoiceInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = UpdateInvoiceInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid invoice' }
  }

  try {
    const ctx = await requireFinanceManage()
    const { id, ...d } = parsed.data

    const before = await getInvoiceRow(ctx, id)
    if (!before) return { ok: false, error: 'Invoice not found' }
    if (before.status !== 'draft') {
      return {
        ok: false,
        error: 'Only draft invoices can be edited. Void and reissue to change a sent invoice.',
      }
    }

    const patch: TablesUpdate<'invoices'> = {}
    if (d.clientId !== undefined) patch.client_id = d.clientId
    if (d.projectId !== undefined) patch.project_id = d.projectId ?? null
    if (d.number !== undefined) patch.number = d.number
    if (d.currency !== undefined) patch.currency = d.currency
    if (d.issueDate !== undefined) patch.issue_date = d.issueDate ?? null
    if (d.dueDate !== undefined) patch.due_date = d.dueDate ?? null
    if (d.lineItems !== undefined) {
      const lineItems = normalizeLineItems(d.lineItems)
      const totals = computeInvoiceTotals(lineItems)
      patch.line_items = lineItems as TablesInsert<'invoices'>['line_items']
      patch.subtotal_minor = totals.subtotalMinor
      patch.tax_minor = totals.taxMinor
      patch.total_minor = totals.totalMinor
    }

    const { data: after, error } = await ctx.supabase
      .from('invoices')
      .update(patch)
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .eq('status', 'draft')
      .select('*')
      .single()
    if (error || !after) {
      if (error?.code === UNIQUE_VIOLATION) return { ok: false, error: DUPLICATE_NUMBER_MESSAGE }
      return { ok: false, error: error?.message ?? 'Could not update invoice' }
    }

    await writeAudit(ctx, {
      action: 'finance.invoice.updated',
      entityType: 'invoice',
      entityId: id,
      before,
      after,
    })
    revalidateFinance()
    return { ok: true, data: { id } }
  } catch (err) {
    return failure(err)
  }
}

/** draft → sent. Stamps issue_date (today) if unset. Emits finance.invoice.sent. */
export async function markSent(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireFinanceManage()

    const before = await getInvoiceRow(ctx, id)
    if (!before) return { ok: false, error: 'Invoice not found' }
    if (before.status !== 'draft') {
      return { ok: false, error: 'Only draft invoices can be sent.' }
    }

    const { data: after, error } = await ctx.supabase
      .from('invoices')
      .update({ status: 'sent', issue_date: before.issue_date ?? todayIso() })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .eq('status', 'draft')
      .select('*')
      .single()
    if (error || !after) return { ok: false, error: error?.message ?? 'Could not send invoice' }

    await writeAudit(ctx, {
      action: 'finance.invoice.sent',
      entityType: 'invoice',
      entityId: id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: 'finance.invoice.sent',
      entityType: 'invoice',
      entityId: id,
      payload: { number: after.number, totalMinor: after.total_minor, currency: after.currency },
    })
    revalidateFinance()
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

/** Any non-paid state → void (terminal). Emits finance.invoice.voided. */
export async function voidInvoice(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireFinanceManage()

    const before = await getInvoiceRow(ctx, id)
    if (!before) return { ok: false, error: 'Invoice not found' }
    if (before.status === 'paid') {
      return { ok: false, error: "A paid invoice can't be voided." }
    }
    if (before.status === 'void') return { ok: true, data: undefined }

    const { data: after, error } = await ctx.supabase
      .from('invoices')
      .update({ status: 'void' })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .neq('status', 'paid')
      .select('*')
      .single()
    if (error || !after) return { ok: false, error: error?.message ?? 'Could not void invoice' }

    await writeAudit(ctx, {
      action: 'finance.invoice.voided',
      entityType: 'invoice',
      entityId: id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: 'finance.invoice.voided',
      entityType: 'invoice',
      entityId: id,
      payload: { number: after.number, previousStatus: before.status },
    })
    revalidateFinance()
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}
