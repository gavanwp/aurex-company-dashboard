'use server'

import type { z } from 'zod'
import { CreateProposalInput, type ProposalPricing, UpdateProposalInput } from '@aurexos/core'
import type { Tables, TablesInsert, TablesUpdate } from '@aurexos/db'
import { emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import type { WorkspaceContext } from '@/lib/workspace-context'
import { computePricingTotal } from '../lib/pricing'
import { failure, requireProposalManage, revalidateProposals } from './proposals-access'

// Statuses from which the proposal is still editable — once sent it is immutable
// (the client may be reading it; the only path to change is a new version).
const EDITABLE_STATUSES = new Set(['draft', 'internal_review'])

async function getProposalRow(
  ctx: WorkspaceContext,
  id: string,
): Promise<Tables<'proposals'> | null> {
  const { data } = await ctx.supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  return data
}

/** Recompute the authoritative total from the line items (R-D8). */
function sealPricing(pricing: ProposalPricing): ProposalPricing {
  return {
    currency: pricing.currency,
    lines: pricing.lines,
    discountMinor: pricing.discountMinor,
    totalMinor: computePricingTotal(pricing.lines, pricing.discountMinor),
  }
}

/**
 * Create a proposal. Always starts in 'draft'; the lifecycle only advances via
 * markInternalReview / sendProposal. The pricing total is recomputed server-side
 * — any client-sent total is discarded.
 */
export async function createProposal(
  input: z.input<typeof CreateProposalInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateProposalInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid proposal' }
  }

  try {
    const ctx = await requireProposalManage()
    const d = parsed.data

    const { data: created, error } = await ctx.supabase
      .from('proposals')
      .insert({
        workspace_id: ctx.workspace.id,
        client_id: d.clientId,
        deal_id: d.dealId ?? null,
        title: d.title,
        status: 'draft',
        valid_until: d.validUntil ?? null,
        accept_method: d.acceptMethod,
        sections: d.sections as TablesInsert<'proposals'>['sections'],
        pricing: sealPricing(d.pricing) as TablesInsert<'proposals'>['pricing'],
      })
      .select('*')
      .single()
    if (error || !created) {
      return { ok: false, error: error?.message ?? 'Could not create proposal' }
    }

    await writeAudit(ctx, {
      action: 'proposals.proposal.created',
      entityType: 'proposal',
      entityId: created.id,
      after: created,
    })
    await emitDomainEvent(ctx, {
      eventType: 'proposals.proposal.created',
      entityType: 'proposal',
      entityId: created.id,
      payload: { title: created.title, clientId: created.client_id },
    })
    revalidateProposals()
    return { ok: true, data: { id: created.id } }
  } catch (err) {
    return failure(err)
  }
}

/**
 * Edit a proposal — allowed ONLY while draft / internal_review. Once sent the
 * proposal is immutable. The pricing total is recomputed server-side.
 */
export async function updateProposal(
  input: z.input<typeof UpdateProposalInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = UpdateProposalInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid proposal' }
  }

  try {
    const ctx = await requireProposalManage()
    const { id, ...d } = parsed.data

    const before = await getProposalRow(ctx, id)
    if (!before) return { ok: false, error: 'Proposal not found' }
    if (!EDITABLE_STATUSES.has(before.status)) {
      return { ok: false, error: 'Only draft proposals can be edited. Sent proposals are locked.' }
    }

    const patch: TablesUpdate<'proposals'> = {}
    if (d.title !== undefined) patch.title = d.title
    if (d.clientId !== undefined) patch.client_id = d.clientId
    if (d.dealId !== undefined) patch.deal_id = d.dealId ?? null
    if (d.validUntil !== undefined) patch.valid_until = d.validUntil ?? null
    if (d.acceptMethod !== undefined) patch.accept_method = d.acceptMethod
    if (d.sections !== undefined)
      patch.sections = d.sections as TablesUpdate<'proposals'>['sections']
    if (d.pricing !== undefined) {
      patch.pricing = sealPricing(d.pricing) as TablesUpdate<'proposals'>['pricing']
    }

    const { data: after, error } = await ctx.supabase
      .from('proposals')
      .update(patch)
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .in('status', ['draft', 'internal_review'])
      .select('*')
      .single()
    if (error || !after) return { ok: false, error: error?.message ?? 'Could not update proposal' }

    await writeAudit(ctx, {
      action: 'proposals.proposal.updated',
      entityType: 'proposal',
      entityId: id,
      before,
      after,
    })
    revalidateProposals()
    return { ok: true, data: { id } }
  } catch (err) {
    return failure(err)
  }
}

/** draft → internal_review. A soft gate before the proposal leaves the building. */
export async function markInternalReview(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireProposalManage()

    const before = await getProposalRow(ctx, id)
    if (!before) return { ok: false, error: 'Proposal not found' }
    if (before.status !== 'draft') {
      return { ok: false, error: 'Only a draft can be sent to internal review.' }
    }

    const { error } = await ctx.supabase
      .from('proposals')
      .update({ status: 'internal_review' })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .eq('status', 'draft')
    if (error) return { ok: false, error: error.message }

    await writeAudit(ctx, {
      action: 'proposals.proposal.internal_review',
      entityType: 'proposal',
      entityId: id,
      before,
      after: { status: 'internal_review' },
    })
    revalidateProposals()
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

/**
 * draft / internal_review → sent. The public_token already exists (0009 default),
 * so the tokenized page is live the moment this returns. No real email in v1 —
 * the caller surfaces the shareable link. Emits proposals.proposal.sent.
 */
export async function sendProposal(id: string): Promise<ActionResult<{ token: string }>> {
  try {
    const ctx = await requireProposalManage()

    const before = await getProposalRow(ctx, id)
    if (!before) return { ok: false, error: 'Proposal not found' }
    if (!EDITABLE_STATUSES.has(before.status)) {
      return { ok: false, error: 'This proposal has already been sent.' }
    }

    const { data: after, error } = await ctx.supabase
      .from('proposals')
      .update({ status: 'sent' })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .in('status', ['draft', 'internal_review'])
      .select('*')
      .single()
    if (error || !after) return { ok: false, error: error?.message ?? 'Could not send proposal' }

    await writeAudit(ctx, {
      action: 'proposals.proposal.sent',
      entityType: 'proposal',
      entityId: id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: 'proposals.proposal.sent',
      entityType: 'proposal',
      entityId: id,
      payload: { title: after.title, clientId: after.client_id },
    })
    revalidateProposals()
    return { ok: true, data: { token: after.public_token } }
  } catch (err) {
    return failure(err)
  }
}

/** sent / viewed → expired (manual). Emits proposals.proposal.expired. */
export async function expireProposal(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireProposalManage()

    const before = await getProposalRow(ctx, id)
    if (!before) return { ok: false, error: 'Proposal not found' }
    if (before.status !== 'sent' && before.status !== 'viewed') {
      return { ok: false, error: 'Only a live (sent or viewed) proposal can be expired.' }
    }

    const { data: after, error } = await ctx.supabase
      .from('proposals')
      .update({ status: 'expired' })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .in('status', ['sent', 'viewed'])
      .select('*')
      .single()
    if (error || !after) return { ok: false, error: error?.message ?? 'Could not expire proposal' }

    await writeAudit(ctx, {
      action: 'proposals.proposal.expired',
      entityType: 'proposal',
      entityId: id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: 'proposals.proposal.expired',
      entityType: 'proposal',
      entityId: id,
      payload: { title: after.title },
    })
    revalidateProposals()
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}
