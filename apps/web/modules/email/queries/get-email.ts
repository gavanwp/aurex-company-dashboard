import 'server-only'

import {
  EmailAddressListSchema,
  EmailParticipantsSchema,
  type EmailThreadStatus,
} from '@aurexos/core'
import type { Tables } from '@aurexos/db'
import type { WorkspaceContext } from '@/lib/workspace-context'
import type {
  EmailLinkOptions,
  MailboxConnectionRow,
  MessageRow,
  ThreadDetail,
  ThreadRow,
} from '../types'

// RLS is the visibility engine here (0012): private threads only reach the
// mailbox owner, workspace-shared threads reach every member. Queries never
// re-implement that filter — they only add workspace scoping + soft-delete.

function parseParticipants(value: unknown) {
  const parsed = EmailParticipantsSchema.safeParse(value)
  return parsed.success ? parsed.data : []
}

function parseAddresses(value: unknown): string[] {
  const parsed = EmailAddressListSchema.safeParse(value)
  return parsed.success ? parsed.data : []
}

async function namesById(
  ctx: WorkspaceContext,
  table: 'clients' | 'crm_contacts' | 'projects' | 'crm_deals',
  nameColumn: 'name' | 'full_name' | 'title',
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (ids.length === 0) return map
  const { data } = await ctx.supabase
    .from(table)
    .select(`id, ${nameColumn}`)
    .eq('workspace_id', ctx.workspace.id)
    .in('id', ids)
  for (const row of (data ?? []) as unknown as Array<Record<string, string | null>>) {
    const id = row.id
    if (id) map.set(id, row[nameColumn] ?? '')
  }
  return map
}

/** Ids of mailbox connections the viewer owns (RLS returns own rows only). */
async function ownedConnectionIds(ctx: WorkspaceContext): Promise<Set<string>> {
  const { data } = await ctx.supabase
    .from('mailbox_connections')
    .select('id')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
  return new Set((data ?? []).map((c) => c.id))
}

interface LinkedNameMaps {
  clients: Map<string, string>
  contacts: Map<string, string>
  projects: Map<string, string>
  deals: Map<string, string>
}

async function linkedNames(
  ctx: WorkspaceContext,
  threads: Array<Tables<'email_threads'>>,
): Promise<LinkedNameMaps> {
  const unique = (key: 'client_id' | 'contact_id' | 'project_id' | 'deal_id') => [
    ...new Set(threads.map((t) => t[key]).filter((v): v is string => !!v)),
  ]
  const [clients, contacts, projects, deals] = await Promise.all([
    namesById(ctx, 'clients', 'name', unique('client_id')),
    namesById(ctx, 'crm_contacts', 'full_name', unique('contact_id')),
    namesById(ctx, 'projects', 'name', unique('project_id')),
    namesById(ctx, 'crm_deals', 'title', unique('deal_id')),
  ])
  return { clients, contacts, projects, deals }
}

function toThreadRow(
  t: Tables<'email_threads'>,
  names: LinkedNameMaps,
  owned: Set<string>,
): ThreadRow {
  return {
    id: t.id,
    subject: t.subject,
    snippet: t.snippet,
    participants: parseParticipants(t.participants),
    lastMessageAt: t.last_message_at,
    messageCount: t.message_count,
    status: t.status,
    visibility: t.visibility,
    isOwned: t.mailbox_connection_id != null && owned.has(t.mailbox_connection_id),
    clientId: t.client_id,
    clientName: t.client_id ? (names.clients.get(t.client_id) ?? null) : null,
    contactId: t.contact_id,
    contactName: t.contact_id ? (names.contacts.get(t.contact_id) ?? null) : null,
    projectId: t.project_id,
    projectName: t.project_id ? (names.projects.get(t.project_id) ?? null) : null,
    dealId: t.deal_id,
    dealName: t.deal_id ? (names.deals.get(t.deal_id) ?? null) : null,
  }
}

export interface GetThreadsFilters {
  status?: EmailThreadStatus
  clientId?: string
}

export async function getThreads(
  ctx: WorkspaceContext,
  filters: GetThreadsFilters = {},
): Promise<ThreadRow[]> {
  let query = ctx.supabase
    .from('email_threads')
    .select('*')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('last_message_at', { ascending: false, nullsFirst: false })
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.clientId) query = query.eq('client_id', filters.clientId)

  const { data: threads } = await query
  if (!threads || threads.length === 0) return []

  const [names, owned] = await Promise.all([linkedNames(ctx, threads), ownedConnectionIds(ctx)])
  return threads.map((t) => toThreadRow(t, names, owned))
}

export async function getThread(
  ctx: WorkspaceContext,
  threadId: string,
): Promise<ThreadDetail | null> {
  const { data: thread } = await ctx.supabase
    .from('email_threads')
    .select('*')
    .eq('id', threadId)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!thread) return null

  const [{ data: messages }, names, owned] = await Promise.all([
    ctx.supabase
      .from('email_messages')
      .select('*')
      .eq('thread_id', thread.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('sent_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    linkedNames(ctx, [thread]),
    ownedConnectionIds(ctx),
  ])

  const rows: MessageRow[] = (messages ?? []).map((m) => ({
    id: m.id,
    direction: m.direction,
    fromAddress: m.from_address,
    toAddresses: parseAddresses(m.to_addresses),
    ccAddresses: parseAddresses(m.cc_addresses),
    subject: m.subject,
    bodyText: m.body_text,
    sentAt: m.sent_at,
    isDraft: m.is_draft,
    createdAt: m.created_at,
  }))

  return { ...toThreadRow(thread, names, owned), messages: rows }
}

/** The viewer's mailbox connections (RLS: owner-only rows). */
export async function getMailboxConnections(
  ctx: WorkspaceContext,
): Promise<MailboxConnectionRow[]> {
  const { data } = await ctx.supabase
    .from('mailbox_connections')
    .select('id, provider, address, display_name, status, last_synced_at')
    .eq('workspace_id', ctx.workspace.id)
    .eq('user_id', ctx.userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  return (data ?? []).map((c) => ({
    id: c.id,
    provider: c.provider,
    address: c.address,
    displayName: c.display_name,
    status: c.status,
    lastSyncedAt: c.last_synced_at,
  }))
}

/** Options for the client/contact/project/deal pickers in linking UIs. */
export async function getEmailLinkOptions(ctx: WorkspaceContext): Promise<EmailLinkOptions> {
  const [clients, contacts, projects, deals] = await Promise.all([
    ctx.supabase
      .from('clients')
      .select('id, name')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('name'),
    ctx.supabase
      .from('crm_contacts')
      .select('id, full_name')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('full_name'),
    ctx.supabase
      .from('projects')
      .select('id, name')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('name'),
    ctx.supabase
      .from('crm_deals')
      .select('id, title')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('title'),
  ])
  return {
    clients: clients.data ?? [],
    contacts: (contacts.data ?? []).map((c) => ({ id: c.id, name: c.full_name })),
    projects: projects.data ?? [],
    deals: (deals.data ?? []).map((d) => ({ id: d.id, name: d.title })),
  }
}
