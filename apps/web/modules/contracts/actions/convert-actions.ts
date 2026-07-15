'use server'

import { z } from 'zod'
import type { TablesInsert } from '@aurexos/db'
import { getProposal } from '@/modules/proposals'
import { emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import { toSectionRecords } from '../lib/sections'
import type { ContractSectionView } from '../types'
import { failure, requireContractManage, revalidateContracts } from './contracts-access'

// CROSS-MODULE NOTE
// The proposal→contract handoff is initiated HERE (the proposals module owns the
// accept→invoice/project/deal convert; drafting a contract from an accepted
// proposal is a contracts concern). This action consumes the proposals module
// only through its public surface (getProposal via index.ts) — it never reaches
// into proposal internals — then performs a workspace-scoped, RLS-backstopped
// insert into contracts. Idempotent: a second call returns the contract the
// first one drafted (keyed on contracts.proposal_id).

const idSchema = z.string().uuid()

export interface FromProposalResult {
  contractId: string
  alreadyDrafted: boolean
}

/**
 * Draft a contract from an ACCEPTED proposal, prefilling the client, value and a
 * clause body derived from the proposal's sections. Starts in 'draft' so the
 * team can finalize legal terms before sending for signature.
 */
export async function createContractFromProposal(
  proposalId: string,
): Promise<ActionResult<FromProposalResult>> {
  try {
    if (!idSchema.safeParse(proposalId).success) {
      return { ok: false, error: 'Invalid proposal id' }
    }
    const ctx = await requireContractManage()

    const proposal = await getProposal(ctx, proposalId)
    if (!proposal) return { ok: false, error: 'Proposal not found' }
    if (proposal.status !== 'accepted') {
      return { ok: false, error: 'Only an accepted proposal can be turned into a contract.' }
    }

    // Idempotency: reuse an existing contract already drafted from this proposal.
    const { data: existing } = await ctx.supabase
      .from('contracts')
      .select('id')
      .eq('workspace_id', ctx.workspace.id)
      .eq('proposal_id', proposalId)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()
    if (existing) {
      return { ok: true, data: { contractId: existing.id, alreadyDrafted: true } }
    }

    // Build a clause body from the proposal: a parties clause, the narrative
    // sections (scope/approach/terms → clauses), and a fees clause from pricing.
    const body: ContractSectionView[] = []
    body.push({
      id: crypto.randomUUID(),
      type: 'parties',
      title: 'Parties',
      body: 'This Agreement is entered into as of {{effective_date}} between {{workspace_name}} ("Provider") and {{client_name}} ("Client"), and sets out the terms for the engagement described below.',
    })
    for (const section of proposal.sections) {
      if (section.type === 'cover' || section.type === 'pricing') continue
      if (!section.body?.trim()) continue
      const type =
        section.type === 'scope' ? 'scope' : section.type === 'terms' ? 'general' : 'custom'
      body.push({
        id: crypto.randomUUID(),
        type,
        title: section.title,
        body: section.body,
      })
    }
    body.push({
      id: crypto.randomUUID(),
      type: 'fees',
      title: 'Fees',
      body: 'The total value of this engagement is {{value}}, invoiced in accordance with the agreed schedule.',
    })

    const { data: created, error } = await ctx.supabase
      .from('contracts')
      .insert({
        workspace_id: ctx.workspace.id,
        type: 'sow',
        client_id: proposal.clientId,
        proposal_id: proposalId,
        title: proposal.title,
        status: 'draft',
        currency: proposal.pricing.currency,
        value_minor: proposal.pricing.totalMinor,
        body: toSectionRecords(body) as TablesInsert<'contracts'>['body'],
      })
      .select('id, title, client_id, type')
      .single()
    if (error || !created) {
      return { ok: false, error: error?.message ?? 'Could not draft contract' }
    }

    await writeAudit(ctx, {
      action: 'contracts.contract.created',
      entityType: 'contract',
      entityId: created.id,
      after: { title: created.title, source: 'proposal', proposalId },
    })
    await emitDomainEvent(ctx, {
      eventType: 'contracts.contract.created',
      entityType: 'contract',
      entityId: created.id,
      payload: {
        title: created.title,
        type: created.type,
        clientId: created.client_id,
        proposalId,
      },
    })

    revalidateContracts()
    return { ok: true, data: { contractId: created.id, alreadyDrafted: false } }
  } catch (err) {
    return failure(err)
  }
}
