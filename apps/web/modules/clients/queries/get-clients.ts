import 'server-only'

import type { WorkspaceContext } from '@/lib/workspace-context'
import type { ClientDetailData, ClientRow } from '../types'

/**
 * Clients with per-client rollups (active projects, open deals + pipeline
 * value) computed in JS from three parallel fetches — no N+1.
 */
export async function getClients(ctx: WorkspaceContext): Promise<ClientRow[]> {
  const [clientsRes, projectsRes, dealsRes] = await Promise.all([
    ctx.supabase
      .from('clients')
      .select('id, name, website, industry, status, notes')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    ctx.supabase
      .from('projects')
      .select('client_id, status')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null),
    ctx.supabase
      .from('crm_deals')
      .select('client_id, stage, value_cents')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null),
  ])

  const clients = clientsRes.data ?? []
  if (clients.length === 0) return []

  const activeProjectsByClient = new Map<string, number>()
  for (const project of projectsRes.data ?? []) {
    if (!project.client_id || project.status !== 'active') continue
    activeProjectsByClient.set(
      project.client_id,
      (activeProjectsByClient.get(project.client_id) ?? 0) + 1,
    )
  }

  const openDealsByClient = new Map<string, { count: number; valueCents: number }>()
  for (const deal of dealsRes.data ?? []) {
    if (!deal.client_id || deal.stage === 'won' || deal.stage === 'lost') continue
    const entry = openDealsByClient.get(deal.client_id) ?? { count: 0, valueCents: 0 }
    entry.count += 1
    entry.valueCents += deal.value_cents ?? 0
    openDealsByClient.set(deal.client_id, entry)
  }

  return clients.map((client) => {
    const openDeals = openDealsByClient.get(client.id)
    return {
      id: client.id,
      name: client.name,
      website: client.website,
      industry: client.industry,
      status: client.status,
      notes: client.notes,
      activeProjects: activeProjectsByClient.get(client.id) ?? 0,
      openDeals: openDeals?.count ?? 0,
      pipelineValueCents: openDeals?.valueCents ?? 0,
    }
  })
}

/** One client with its contacts, projects, and deals. Null when missing. */
export async function getClient(
  ctx: WorkspaceContext,
  clientId: string,
): Promise<ClientDetailData | null> {
  const { data: client } = await ctx.supabase
    .from('clients')
    .select('id, name, website, industry, status, notes')
    .eq('id', clientId)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!client) return null

  const [contactsRes, projectsRes, dealsRes] = await Promise.all([
    ctx.supabase
      .from('crm_contacts')
      .select('id, full_name, email, title')
      .eq('workspace_id', ctx.workspace.id)
      .eq('client_id', client.id)
      .is('deleted_at', null)
      .order('full_name', { ascending: true }),
    ctx.supabase
      .from('projects')
      .select('id, name, status, due_date')
      .eq('workspace_id', ctx.workspace.id)
      .eq('client_id', client.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    ctx.supabase
      .from('crm_deals')
      .select('id, title, stage, value_cents, currency')
      .eq('workspace_id', ctx.workspace.id)
      .eq('client_id', client.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  return {
    ...client,
    contacts: (contactsRes.data ?? []).map((c) => ({
      id: c.id,
      fullName: c.full_name,
      email: c.email,
      title: c.title,
    })),
    projects: (projectsRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      dueDate: p.due_date,
    })),
    deals: (dealsRes.data ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.stage,
      valueCents: d.value_cents,
      currency: d.currency,
    })),
  }
}
