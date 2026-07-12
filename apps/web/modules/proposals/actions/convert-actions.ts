'use server'

import type { InvoiceLineItem } from '@aurexos/core'
import { ProposalPricingSchema } from '@aurexos/core'
import type { TablesInsert } from '@aurexos/db'
import { emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import type { WorkspaceContext } from '@/lib/workspace-context'
import { computeLineAmountMinor, computePricingTotal } from '../lib/pricing'
import { failure, requireProposalManage, revalidateProposals } from './proposals-access'

const UNIQUE_VIOLATION = '23505'

// CROSS-MODULE SCAFFOLDING NOTE
// The accepted→scaffold handoff is meant to run through the public creators of
// Finance / CRM / Projects. As of this build none of those modules export a
// server-side creator from their index.ts (finance exposes InvoiceForm + queries,
// crm/projects expose views + queries only). Per the build brief's "if a needed
// creator isn't exported, do the minimal safe thing and note it", this action
// performs workspace-scoped, RLS-backstopped direct writes to invoices /
// crm_deals / projects and emits each module's own domain event. It never
// imports another module's internals. When those modules publish creators, the
// three write blocks below become calls to them with no change to this contract.

export interface ConvertOptions {
  /** Also spin up a delivery project from the proposal (default false). */
  createProject?: boolean
}

export interface ConvertResult {
  invoiceId: string
  invoiceNumber: string
  projectId: string | null
  dealAdvanced: boolean
  alreadyConverted: boolean
}

function nextInvoiceNumber(existing: string[], year: number): string {
  const prefix = `INV-${year}-`
  let max = 0
  for (const number of existing) {
    if (!number.startsWith(prefix)) continue
    const seq = Number.parseInt(number.slice(prefix.length), 10)
    if (Number.isInteger(seq) && seq > max) max = seq
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

async function findConvertedInvoice(
  ctx: WorkspaceContext,
  proposalId: string,
): Promise<{ id: string; number: string } | null> {
  const { data } = await ctx.supabase
    .from('domain_events')
    .select('entity_id')
    .eq('workspace_id', ctx.workspace.id)
    .eq('event_type', 'finance.invoice.created')
    .eq('payload->>proposalId', proposalId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data?.entity_id) return null
  const { data: invoice } = await ctx.supabase
    .from('invoices')
    .select('id, number')
    .eq('id', data.entity_id)
    .eq('workspace_id', ctx.workspace.id)
    .maybeSingle()
  return invoice ?? null
}

/** Build invoice line items from the proposal's pricing (discount as a line). */
function pricingToLineItems(pricing: {
  lines: { description: string; quantity: number; rateMinor: number; optional?: boolean }[]
  discountMinor: number
}): InvoiceLineItem[] {
  const items: InvoiceLineItem[] = pricing.lines
    .filter((line) => !line.optional)
    .map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPriceMinor: line.rateMinor,
      amountMinor: computeLineAmountMinor(line.quantity, line.rateMinor),
    }))
  if (pricing.discountMinor > 0) {
    items.push({
      description: 'Discount',
      quantity: 1,
      unitPriceMinor: -pricing.discountMinor,
      amountMinor: -pricing.discountMinor,
    })
  }
  return items
}

/**
 * The flagship: turn an ACCEPTED proposal into live work. Creates a draft invoice
 * from the pricing, advances the linked deal to won, and optionally scaffolds a
 * delivery project. Idempotent — a second call returns the invoice the first one
 * created rather than duplicating it. Each step emits its module's domain event.
 */
export async function convertAcceptedProposal(
  proposalId: string,
  options: ConvertOptions = {},
): Promise<ActionResult<ConvertResult>> {
  try {
    const ctx = await requireProposalManage()

    const { data: proposal } = await ctx.supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!proposal) return { ok: false, error: 'Proposal not found' }
    if (proposal.status !== 'accepted') {
      return { ok: false, error: 'Only an accepted proposal can be converted.' }
    }

    // Idempotency: if an invoice was already minted for this proposal, return it.
    const existing = await findConvertedInvoice(ctx, proposalId)
    if (existing) {
      return {
        ok: true,
        data: {
          invoiceId: existing.id,
          invoiceNumber: existing.number,
          projectId: null,
          dealAdvanced: false,
          alreadyConverted: true,
        },
      }
    }

    const pricingParsed = ProposalPricingSchema.safeParse(proposal.pricing ?? {})
    const pricing = pricingParsed.success
      ? pricingParsed.data
      : { currency: 'USD', lines: [], discountMinor: 0, totalMinor: 0 }
    const currency = pricing.currency
    const totalMinor = computePricingTotal(pricing.lines, pricing.discountMinor)

    // ── 1. Optional delivery project (created first so the invoice can link it) ──
    let projectId: string | null = null
    if (options.createProject) {
      const { data: project, error: projectError } = await ctx.supabase
        .from('projects')
        .insert({
          workspace_id: ctx.workspace.id,
          client_id: proposal.client_id,
          name: proposal.title,
          status: 'planning',
          owner_id: ctx.userId,
        })
        .select('id')
        .single()
      if (projectError || !project) {
        return { ok: false, error: projectError?.message ?? 'Could not create project' }
      }
      projectId = project.id
      await writeAudit(ctx, {
        action: 'projects.project.created',
        entityType: 'project',
        entityId: projectId,
        after: { name: proposal.title, source: 'proposal', proposalId },
      })
      await emitDomainEvent(ctx, {
        eventType: 'projects.project.created',
        entityType: 'project',
        entityId: projectId,
        payload: { name: proposal.title, proposalId },
      })
    }

    // ── 2. Draft invoice from the pricing ───────────────────────────────────────
    const lineItems = pricingToLineItems(pricing)
    const { data: numbersRaw } = await ctx.supabase
      .from('invoices')
      .select('number')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
    const number = nextInvoiceNumber(
      (numbersRaw ?? []).map((n) => n.number),
      new Date().getFullYear(),
    )

    const { data: invoice, error: invoiceError } = await ctx.supabase
      .from('invoices')
      .insert({
        workspace_id: ctx.workspace.id,
        client_id: proposal.client_id,
        project_id: projectId,
        number,
        status: 'draft',
        currency,
        subtotal_minor: totalMinor,
        tax_minor: 0,
        total_minor: totalMinor,
        line_items: lineItems as TablesInsert<'invoices'>['line_items'],
      })
      .select('id, number')
      .single()
    if (invoiceError || !invoice) {
      if (invoiceError?.code === UNIQUE_VIOLATION) {
        return { ok: false, error: 'Invoice number collision — try converting again.' }
      }
      return { ok: false, error: invoiceError?.message ?? 'Could not create invoice' }
    }

    await writeAudit(ctx, {
      action: 'finance.invoice.created',
      entityType: 'invoice',
      entityId: invoice.id,
      after: { number: invoice.number, totalMinor, currency, source: 'proposal', proposalId },
    })
    await emitDomainEvent(ctx, {
      eventType: 'finance.invoice.created',
      entityType: 'invoice',
      entityId: invoice.id,
      // proposalId is the idempotency key findConvertedInvoice() reads back.
      payload: { number: invoice.number, totalMinor, currency, proposalId },
    })

    // ── 3. Advance the linked deal to won ───────────────────────────────────────
    let dealAdvanced = false
    if (proposal.deal_id) {
      const { data: deal } = await ctx.supabase
        .from('crm_deals')
        .select('id, stage')
        .eq('id', proposal.deal_id)
        .eq('workspace_id', ctx.workspace.id)
        .is('deleted_at', null)
        .maybeSingle()
      if (deal && deal.stage !== 'won') {
        const { error: dealError } = await ctx.supabase
          .from('crm_deals')
          .update({ stage: 'won' })
          .eq('id', deal.id)
          .eq('workspace_id', ctx.workspace.id)
        if (!dealError) {
          dealAdvanced = true
          await writeAudit(ctx, {
            action: 'crm.deal.stage_changed',
            entityType: 'deal',
            entityId: deal.id,
            before: { stage: deal.stage },
            after: { stage: 'won', proposalId },
          })
          await emitDomainEvent(ctx, {
            eventType: 'crm.deal.stage_changed',
            entityType: 'deal',
            entityId: deal.id,
            payload: { from: deal.stage, to: 'won', proposalId },
          })
        }
      }
    }

    revalidateProposals()
    return {
      ok: true,
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        projectId,
        dealAdvanced,
        alreadyConverted: false,
      },
    }
  } catch (err) {
    return failure(err)
  }
}
