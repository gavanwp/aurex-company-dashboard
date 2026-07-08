import 'server-only'

import { DEAL_STAGES } from '@aurexos/core'
import type { WorkspaceContext } from '@/lib/workspace-context'
import type { ClientOption, ContactRow, DealRow, PipelineSummary } from '../types'

async function clientNamesById(
  ctx: WorkspaceContext,
  clientIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (clientIds.length === 0) return map
  const { data } = await ctx.supabase
    .from('clients')
    .select('id, name')
    .eq('workspace_id', ctx.workspace.id)
    .in('id', clientIds)
  for (const client of data ?? []) map.set(client.id, client.name)
  return map
}

export async function getDeals(ctx: WorkspaceContext): Promise<DealRow[]> {
  const { data: deals } = await ctx.supabase
    .from('crm_deals')
    .select(
      'id, title, stage, value_cents, currency, probability, expected_close_date, source, client_id, contact_id, created_at',
    )
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (!deals || deals.length === 0) return []

  const clientIds = [...new Set(deals.map((d) => d.client_id).filter((v): v is string => !!v))]
  const contactIds = [...new Set(deals.map((d) => d.contact_id).filter((v): v is string => !!v))]

  const [clientNameById, contactNameById] = await Promise.all([
    clientNamesById(ctx, clientIds),
    (async () => {
      const map = new Map<string, string>()
      if (contactIds.length === 0) return map
      const { data } = await ctx.supabase
        .from('crm_contacts')
        .select('id, full_name')
        .eq('workspace_id', ctx.workspace.id)
        .in('id', contactIds)
      for (const contact of data ?? []) map.set(contact.id, contact.full_name)
      return map
    })(),
  ])

  return deals.map((d) => ({
    id: d.id,
    title: d.title,
    stage: d.stage,
    valueCents: d.value_cents,
    currency: d.currency,
    probability: d.probability,
    expectedCloseDate: d.expected_close_date,
    source: d.source,
    clientId: d.client_id,
    clientName: d.client_id ? (clientNameById.get(d.client_id) ?? null) : null,
    contactId: d.contact_id,
    contactName: d.contact_id ? (contactNameById.get(d.contact_id) ?? null) : null,
    createdAt: d.created_at,
  }))
}

export async function getContacts(ctx: WorkspaceContext): Promise<ContactRow[]> {
  const { data: contacts } = await ctx.supabase
    .from('crm_contacts')
    .select('id, full_name, email, phone, title, client_id')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('full_name', { ascending: true })
  if (!contacts || contacts.length === 0) return []

  const clientIds = [...new Set(contacts.map((c) => c.client_id).filter((v): v is string => !!v))]
  const clientNameById = await clientNamesById(ctx, clientIds)

  return contacts.map((c) => ({
    id: c.id,
    fullName: c.full_name,
    email: c.email,
    phone: c.phone,
    title: c.title,
    clientId: c.client_id,
    clientName: c.client_id ? (clientNameById.get(c.client_id) ?? null) : null,
  }))
}

/** Options for the client <Select> in deal/contact dialogs. */
export async function getClientOptions(ctx: WorkspaceContext): Promise<ClientOption[]> {
  const { data } = await ctx.supabase
    .from('clients')
    .select('id, name')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('name', { ascending: true })
  return data ?? []
}

/** Per-stage totals computed in JS from the single deals fetch — no extra query. */
export function getPipelineSummary(deals: DealRow[]): PipelineSummary {
  const stages = DEAL_STAGES.map((stage) => {
    const inStage = deals.filter((d) => d.stage === stage)
    return {
      stage,
      count: inStage.length,
      valueCents: inStage.reduce((sum, d) => sum + (d.valueCents ?? 0), 0),
    }
  })

  const open = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost')
  const won = deals.filter((d) => d.stage === 'won')

  return {
    stages,
    openCount: open.length,
    openValueCents: open.reduce((sum, d) => sum + (d.valueCents ?? 0), 0),
    weightedValueCents: Math.round(
      open.reduce((sum, d) => sum + ((d.valueCents ?? 0) * (d.probability ?? 0)) / 100, 0),
    ),
    wonCount: won.length,
    wonValueCents: won.reduce((sum, d) => sum + (d.valueCents ?? 0), 0),
  }
}
