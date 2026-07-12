'use server'

import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import { CreatePaymentInput } from '@aurexos/core'
import { emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import { failure, requireFinanceManage, revalidateFinance } from './finance-access'

/**
 * Record a payment against an invoice, then reconcile the invoice's status from
 * the sum of ALL its payments (never from a client-sent balance):
 *   sum ≥ total → 'paid'      (emit finance.invoice.paid)
 *   0 < sum < total → 'partial' (emit finance.invoice.partially_paid)
 * A finance.payment.recorded event is always emitted; every step is audited.
 */
export async function recordPayment(
  input: z.input<typeof CreatePaymentInput>,
): Promise<ActionResult<{ status: string; paidMinor: number }>> {
  const parsed = CreatePaymentInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid payment' }
  }

  try {
    const ctx = await requireFinanceManage()
    const d = parsed.data

    const { data: invoice } = await ctx.supabase
      .from('invoices')
      .select('*')
      .eq('id', d.invoiceId)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!invoice) return { ok: false, error: 'Invoice not found' }
    if (invoice.status === 'draft') {
      return { ok: false, error: 'Send the invoice before recording a payment.' }
    }
    if (invoice.status === 'void') {
      return { ok: false, error: "You can't record a payment on a void invoice." }
    }

    const { data: payment, error: paymentError } = await ctx.supabase
      .from('payments')
      .insert({
        workspace_id: ctx.workspace.id,
        invoice_id: invoice.id,
        // Payments are always recorded in the invoice's own currency (R-D8).
        currency: invoice.currency,
        amount_minor: d.amountMinor,
        method: d.method,
        received_at: d.receivedAt ?? new Date().toISOString(),
        fees_minor: d.feesMinor,
        external_ref: d.externalRef ?? null,
      })
      .select('*')
      .single()
    if (paymentError || !payment) {
      return { ok: false, error: paymentError?.message ?? 'Could not record payment' }
    }

    // Re-sum from the source of truth (all live payments on this invoice).
    const { data: allPayments } = await ctx.supabase
      .from('payments')
      .select('amount_minor')
      .eq('invoice_id', invoice.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
    const paidMinor = (allPayments ?? []).reduce((sum, p) => sum + p.amount_minor, 0)

    const nextStatus = paidMinor >= invoice.total_minor ? 'paid' : 'partial'
    if (nextStatus !== invoice.status) {
      await ctx.supabase
        .from('invoices')
        .update({ status: nextStatus })
        .eq('id', invoice.id)
        .eq('workspace_id', ctx.workspace.id)
    }

    await writeAudit(ctx, {
      action: 'finance.payment.recorded',
      entityType: 'payment',
      entityId: payment.id,
      after: payment,
    })
    await emitDomainEvent(ctx, {
      eventType: 'finance.payment.recorded',
      entityType: 'payment',
      entityId: payment.id,
      payload: {
        invoiceId: invoice.id,
        amountMinor: payment.amount_minor,
        method: payment.method,
        paidMinor,
      },
    })
    if (nextStatus !== invoice.status) {
      await emitDomainEvent(ctx, {
        eventType:
          nextStatus === 'paid' ? 'finance.invoice.paid' : 'finance.invoice.partially_paid',
        entityType: 'invoice',
        entityId: invoice.id,
        payload: { number: invoice.number, paidMinor, totalMinor: invoice.total_minor },
      })
    }

    revalidateFinance()
    revalidatePath(`/finance/invoices/${invoice.id}`)
    return { ok: true, data: { status: nextStatus, paidMinor } }
  } catch (err) {
    return failure(err)
  }
}
