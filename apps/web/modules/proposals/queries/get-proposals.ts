import 'server-only'

import { ProposalPricingSchema, type ProposalStatus } from '@aurexos/core'
import type { Tables } from '@aurexos/db'
import type { WorkspaceContext } from '@/lib/workspace-context'
import { toPricingView } from '../lib/pricing'
import { parseAcceptedBy, toSectionViews } from '../lib/sections'
import type {
  ProposalDetail,
  ProposalFormOptions,
  ProposalListRow,
  ProposalViewAnalytics,
} from '../types'

// RLS (0009) scopes every proposal row to workspace members; queries add only
// workspace scoping + soft-delete filters and derive display-only fields
// (view analytics). Money truth lives in the pricing jsonb, recomputed to a view
// by toPricingView — never trusted as a stored total.

// The generated db types predate 0013's acceptance columns; a narrow local
// extension keeps the read typed without regenerating packages/db.
type ProposalRow = Tables<'proposals'> & {
  accepted_at?: string | null
  accepted_by?: unknown
}

function parsePricing(value: unknown) {
  const parsed = ProposalPricingSchema.safeParse(value ?? {})
  return toPricingView(parsed.success ? parsed.data : {})
}

async function namesById(
  ctx: WorkspaceContext,
  table: 'clients' | 'crm_deals',
  nameColumn: 'name' | 'title',
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return map
  const { data } = await ctx.supabase
    .from(table)
    .select(`id, ${nameColumn}`)
    .eq('workspace_id', ctx.workspace.id)
    .in('id', unique)
  for (const row of (data ?? []) as unknown as Array<Record<string, string | null>>) {
    if (row.id) map.set(row.id, row[nameColumn] ?? '')
  }
  return map
}

// ── List ─────────────────────────────────────────────────────────────────────

export interface GetProposalsFilters {
  status?: ProposalStatus
  search?: string
}

export async function getProposals(
  ctx: WorkspaceContext,
  filters: GetProposalsFilters = {},
): Promise<ProposalListRow[]> {
  let query = ctx.supabase
    .from('proposals')
    .select('*')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.search) query = query.ilike('title', `%${filters.search}%`)

  const { data: proposalsRaw } = await query
  const proposals = (proposalsRaw ?? []) as ProposalRow[]
  if (proposals.length === 0) return []

  // View analytics for every listed proposal, aggregated in one pass.
  const proposalIds = proposals.map((p) => p.id)
  const { data: views } = await ctx.supabase
    .from('proposal_views')
    .select('proposal_id, viewed_at')
    .eq('workspace_id', ctx.workspace.id)
    .in('proposal_id', proposalIds)

  const viewCount = new Map<string, number>()
  const lastViewed = new Map<string, string>()
  for (const view of views ?? []) {
    viewCount.set(view.proposal_id, (viewCount.get(view.proposal_id) ?? 0) + 1)
    const prev = lastViewed.get(view.proposal_id)
    if (!prev || view.viewed_at > prev) lastViewed.set(view.proposal_id, view.viewed_at)
  }

  const [clientNames, dealNames] = await Promise.all([
    namesById(
      ctx,
      'clients',
      'name',
      proposals.map((p) => p.client_id),
    ),
    namesById(
      ctx,
      'crm_deals',
      'title',
      proposals.map((p) => p.deal_id).filter((id): id is string => !!id),
    ),
  ])

  return proposals.map((p) => {
    const pricing = parsePricing(p.pricing)
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      clientId: p.client_id,
      clientName: clientNames.get(p.client_id) ?? null,
      dealId: p.deal_id,
      dealTitle: p.deal_id ? (dealNames.get(p.deal_id) ?? null) : null,
      currency: pricing.currency,
      totalMinor: pricing.totalMinor,
      validUntil: p.valid_until,
      viewCount: viewCount.get(p.id) ?? 0,
      lastViewedAt: lastViewed.get(p.id) ?? null,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }
  })
}

// ── One proposal ──────────────────────────────────────────────────────────────

export async function getProposal(
  ctx: WorkspaceContext,
  proposalId: string,
): Promise<ProposalDetail | null> {
  const { data: raw } = await ctx.supabase
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!raw) return null
  const proposal = raw as ProposalRow

  const [{ data: views }, clientNames, dealNames, convertedInvoiceId] = await Promise.all([
    ctx.supabase
      .from('proposal_views')
      .select('viewer_token, viewed_at')
      .eq('workspace_id', ctx.workspace.id)
      .eq('proposal_id', proposal.id)
      .order('viewed_at', { ascending: false }),
    namesById(ctx, 'clients', 'name', [proposal.client_id]),
    proposal.deal_id
      ? namesById(ctx, 'crm_deals', 'title', [proposal.deal_id])
      : Promise.resolve(new Map<string, string>()),
    findConvertedInvoiceId(ctx, proposal.id),
  ])

  const viewRows = views ?? []
  const analytics: ProposalViewAnalytics = {
    viewCount: viewRows.length,
    uniqueViewers: new Set(viewRows.map((v) => v.viewer_token)).size,
    lastViewedAt: viewRows[0]?.viewed_at ?? null,
  }

  return {
    id: proposal.id,
    title: proposal.title,
    status: proposal.status,
    clientId: proposal.client_id,
    clientName: clientNames.get(proposal.client_id) ?? null,
    dealId: proposal.deal_id,
    dealTitle: proposal.deal_id ? (dealNames.get(proposal.deal_id) ?? null) : null,
    acceptMethod: proposal.accept_method,
    validUntil: proposal.valid_until,
    publicToken: proposal.public_token,
    version: proposal.version,
    sections: toSectionViews(proposal.sections),
    pricing: parsePricing(proposal.pricing),
    analytics,
    acceptedAt: proposal.accepted_at ?? null,
    acceptedBy: parseAcceptedBy(proposal.accepted_by),
    convertedInvoiceId,
    createdAt: proposal.created_at,
    updatedAt: proposal.updated_at,
  }
}

/** The invoice a prior convert produced for this proposal, if any (idempotency). */
async function findConvertedInvoiceId(
  ctx: WorkspaceContext,
  proposalId: string,
): Promise<string | null> {
  const { data } = await ctx.supabase
    .from('domain_events')
    .select('entity_id')
    .eq('workspace_id', ctx.workspace.id)
    .eq('event_type', 'finance.invoice.created')
    .eq('payload->>proposalId', proposalId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.entity_id ?? null
}

// ── Form pickers ──────────────────────────────────────────────────────────────

export async function getProposalFormOptions(ctx: WorkspaceContext): Promise<ProposalFormOptions> {
  const [clients, deals] = await Promise.all([
    ctx.supabase
      .from('clients')
      .select('id, name')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('name'),
    ctx.supabase
      .from('crm_deals')
      .select('id, title, client_id')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .not('stage', 'in', '("won","lost")')
      .order('created_at', { ascending: false }),
  ])
  return {
    clients: clients.data ?? [],
    deals: (deals.data ?? []).map((d) => ({ id: d.id, title: d.title, clientId: d.client_id })),
  }
}
