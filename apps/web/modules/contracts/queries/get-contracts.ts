import 'server-only'

import type { ContractStatus, ContractType } from '@aurexos/core'
import type { Tables } from '@aurexos/db'
import type { WorkspaceContext } from '@/lib/workspace-context'
import { daysUntil, isExpiringSoon } from '../lib/lifecycle'
import { parseSigner, toSectionViews } from '../lib/sections'
import type {
  ContractDetail,
  ContractFormOptions,
  ContractListRow,
  ObligationRow,
  RenewalRadar,
  RenewalRadarItem,
} from '../types'

// RLS (0009) scopes every contract row to workspace members; queries add only
// workspace scoping + soft-delete filters and derive display-only fields
// (expiring flags, day countdowns) from the lifecycle helpers.

type ContractRow = Tables<'contracts'>

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

async function namesById(
  ctx: WorkspaceContext,
  table: 'clients' | 'projects' | 'proposals',
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

export interface GetContractsFilters {
  status?: ContractStatus
  type?: ContractType
  search?: string
}

export async function getContracts(
  ctx: WorkspaceContext,
  filters: GetContractsFilters = {},
): Promise<ContractListRow[]> {
  let query = ctx.supabase
    .from('contracts')
    .select('*')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.type) query = query.eq('type', filters.type)
  if (filters.search) query = query.ilike('title', `%${filters.search}%`)

  const { data: raw } = await query
  const rows = (raw ?? []) as ContractRow[]
  if (rows.length === 0) return []

  const clientNames = await namesById(
    ctx,
    'clients',
    'name',
    rows.map((r) => r.client_id).filter((id): id is string => !!id),
  )

  const today = todayISO()
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    status: r.status,
    clientId: r.client_id,
    clientName: r.client_id ? (clientNames.get(r.client_id) ?? null) : null,
    valueMinor: r.value_minor,
    currency: r.currency,
    effectiveDate: r.effective_date,
    endDate: r.end_date,
    autoRenew: r.auto_renew,
    isExpiringSoon: isExpiringSoon(r.status, r.end_date, today),
    daysToEnd: daysUntil(r.end_date, today),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

// ── One contract ──────────────────────────────────────────────────────────────

export async function getContract(
  ctx: WorkspaceContext,
  contractId: string,
): Promise<ContractDetail | null> {
  const { data: raw } = await ctx.supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!raw) return null
  const c = raw as ContractRow

  const [clientNames, projectNames, proposalNames, obligations] = await Promise.all([
    c.client_id ? namesById(ctx, 'clients', 'name', [c.client_id]) : emptyMap(),
    c.project_id ? namesById(ctx, 'projects', 'name', [c.project_id]) : emptyMap(),
    c.proposal_id ? namesById(ctx, 'proposals', 'title', [c.proposal_id]) : emptyMap(),
    getObligations(ctx, c.id),
  ])

  const today = todayISO()
  return {
    id: c.id,
    title: c.title,
    type: c.type,
    status: c.status,
    clientId: c.client_id,
    clientName: c.client_id ? (clientNames.get(c.client_id) ?? null) : null,
    projectId: c.project_id,
    projectName: c.project_id ? (projectNames.get(c.project_id) ?? null) : null,
    proposalId: c.proposal_id,
    proposalTitle: c.proposal_id ? (proposalNames.get(c.proposal_id) ?? null) : null,
    effectiveDate: c.effective_date,
    endDate: c.end_date,
    autoRenew: c.auto_renew,
    valueMinor: c.value_minor,
    currency: c.currency,
    body: toSectionViews(c.body),
    version: c.version,
    publicToken: c.public_token,
    sentAt: c.sent_at,
    signedAt: c.signed_at,
    signer: parseSigner(c.signer),
    obligations,
    daysToEnd: daysUntil(c.end_date, today),
    isExpiringSoon: isExpiringSoon(c.status, c.end_date, today),
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }
}

function emptyMap(): Promise<Map<string, string>> {
  return Promise.resolve(new Map<string, string>())
}

// ── Obligations ────────────────────────────────────────────────────────────────

/**
 * Obligations for a contract, with the converted-task link derived from
 * domain_events (mirrors the proposals convert idempotency pattern — no extra
 * column on contract_obligations). due_rule's kind + dueDate are surfaced.
 */
export async function getObligations(
  ctx: WorkspaceContext,
  contractId: string,
): Promise<ObligationRow[]> {
  const { data: raw } = await ctx.supabase
    .from('contract_obligations')
    .select('*')
    .eq('workspace_id', ctx.workspace.id)
    .eq('contract_id', contractId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  const rows = (raw ?? []) as Tables<'contract_obligations'>[]
  if (rows.length === 0) return []

  // Converted-task links: read the conversion events for these obligations.
  const { data: events } = await ctx.supabase
    .from('domain_events')
    .select('entity_id, payload')
    .eq('workspace_id', ctx.workspace.id)
    .eq('event_type', 'contracts.obligation.converted')
    .in(
      'entity_id',
      rows.map((r) => r.id),
    )
  const taskByObligation = new Map<string, string>()
  for (const ev of events ?? []) {
    const payload = ev.payload as { taskId?: unknown } | null
    if (ev.entity_id && payload && typeof payload.taskId === 'string') {
      taskByObligation.set(ev.entity_id, payload.taskId)
    }
  }

  const ownerNames = await profileNames(
    ctx,
    rows.map((r) => r.owner_user_id).filter((id): id is string => !!id),
  )

  return rows.map((r) => {
    const rule = (r.due_rule ?? {}) as { kind?: unknown; dueDate?: unknown }
    return {
      id: r.id,
      contractId: r.contract_id,
      description: r.description,
      dueKind: rule.kind === 'once' || rule.kind === 'recurring' ? rule.kind : null,
      dueDate: typeof rule.dueDate === 'string' ? rule.dueDate : null,
      ownerUserId: r.owner_user_id,
      ownerName: r.owner_user_id ? (ownerNames.get(r.owner_user_id) ?? null) : null,
      sourceClause: r.source_clause,
      taskId: taskByObligation.get(r.id) ?? null,
      createdAt: r.created_at,
    }
  })
}

async function profileNames(ctx: WorkspaceContext, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return map
  const { data } = await ctx.supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', unique)
  for (const row of data ?? []) {
    map.set(row.id, row.full_name ?? row.email ?? '')
  }
  return map
}

// ── Form pickers ────────────────────────────────────────────────────────────

export async function getContractFormOptions(ctx: WorkspaceContext): Promise<ContractFormOptions> {
  const [clients, projects, proposalsRaw] = await Promise.all([
    ctx.supabase
      .from('clients')
      .select('id, name')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('name'),
    ctx.supabase
      .from('projects')
      .select('id, name')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    ctx.supabase
      .from('proposals')
      .select('id, title, client_id')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false }),
  ])

  const clientRows = clients.data ?? []
  const clientNameById = new Map(clientRows.map((c) => [c.id, c.name]))

  return {
    clients: clientRows,
    projects: projects.data ?? [],
    proposals: (proposalsRaw.data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      clientId: p.client_id,
      clientName: clientNameById.get(p.client_id) ?? null,
    })),
  }
}

// ── Member options (obligation owners) ──────────────────────────────────────

export interface ContractMemberOption {
  id: string
  name: string
}

/** Workspace members, for assigning an obligation owner. */
export async function getContractMemberOptions(
  ctx: WorkspaceContext,
): Promise<ContractMemberOption[]> {
  const { data: members } = await ctx.supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', ctx.workspace.id)
  const ids = (members ?? []).map((m) => m.user_id)
  if (ids.length === 0) return []
  const names = await profileNames(ctx, ids)
  return ids
    .map((id) => ({ id, name: names.get(id) ?? '' }))
    .filter((m) => m.name)
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ── Renewal radar (the flagship lifecycle command center) ────────────────────

const LIVE_STATUSES: ReadonlySet<ContractStatus> = new Set(['signed', 'active', 'expiring'])

function toRadarItem(r: ContractRow, clientName: string | null, today: string): RenewalRadarItem {
  return {
    id: r.id,
    title: r.title,
    clientName,
    status: r.status,
    endDate: r.end_date,
    daysToEnd: daysUntil(r.end_date, today),
    valueMinor: r.value_minor,
    currency: r.currency,
    autoRenew: r.auto_renew,
  }
}

/**
 * The renewal radar: every non-deleted contract, grouped by lifecycle. Surfaces
 * what needs attention — contracts expiring in 30 / 60 / 90 days, auto-renew
 * contracts up for a renewal decision, the active book of business (count +
 * value), and recently signed momentum. This is the finance AR-aging analog for
 * contract lifecycle.
 */
export async function getRenewalRadar(ctx: WorkspaceContext): Promise<RenewalRadar> {
  const { data: raw } = await ctx.supabase
    .from('contracts')
    .select('*')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
  const rows = (raw ?? []) as ContractRow[]

  const clientNames = await namesById(
    ctx,
    'clients',
    'name',
    rows.map((r) => r.client_id).filter((id): id is string => !!id),
  )
  const nameFor = (r: ContractRow) => (r.client_id ? (clientNames.get(r.client_id) ?? null) : null)

  const today = todayISO()
  const nowMs = Date.parse(`${today}T00:00:00Z`)

  const expiring30: RenewalRadarItem[] = []
  const expiring60: RenewalRadarItem[] = []
  const expiring90: RenewalRadarItem[] = []
  const upForRenewal: RenewalRadarItem[] = []
  const recentlySigned: RenewalRadarItem[] = []
  let activeCount = 0
  let activeValueMinor = 0
  const currencyTally = new Map<string, number>()

  for (const r of rows) {
    const live = LIVE_STATUSES.has(r.status)
    if (live) {
      activeCount += 1
      activeValueMinor += r.value_minor ?? 0
      currencyTally.set(r.currency, (currencyTally.get(r.currency) ?? 0) + 1)
    }

    const days = daysUntil(r.end_date, today)
    if (live && days !== null && days >= 0) {
      const item = toRadarItem(r, nameFor(r), today)
      if (days <= 30) expiring30.push(item)
      else if (days <= 60) expiring60.push(item)
      else if (days <= 90) expiring90.push(item)
      if (r.auto_renew && days <= 90) upForRenewal.push(item)
    }

    if (r.signed_at) {
      const signedMs = Date.parse(r.signed_at)
      if (!Number.isNaN(signedMs) && nowMs - signedMs <= 30 * 86_400_000) {
        recentlySigned.push(toRadarItem(r, nameFor(r), today))
      }
    }
  }

  const byDays = (a: RenewalRadarItem, b: RenewalRadarItem) =>
    (a.daysToEnd ?? Infinity) - (b.daysToEnd ?? Infinity)
  expiring30.sort(byDays)
  expiring60.sort(byDays)
  expiring90.sort(byDays)
  upForRenewal.sort(byDays)

  // Dominant currency of the active book (falls back to USD).
  let currency = 'USD'
  let top = 0
  for (const [cur, n] of currencyTally) {
    if (n > top) {
      top = n
      currency = cur
    }
  }

  return {
    expiring30,
    expiring60,
    expiring90,
    upForRenewal,
    recentlySigned,
    activeCount,
    activeValueMinor,
    currency,
  }
}
