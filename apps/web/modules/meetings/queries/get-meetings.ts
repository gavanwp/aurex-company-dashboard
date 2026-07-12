import 'server-only'

import { MeetingAttendeesSchema } from '@aurexos/core'
import type { Tables } from '@aurexos/db'
import type { WorkspaceContext } from '@/lib/workspace-context'
import { getClient } from '@/modules/clients'
import { getThreads } from '@/modules/email'
import type {
  ActionItemRow,
  AgendaItem,
  AttendeeRef,
  BriefActivityItem,
  BriefLastMeeting,
  BriefOpenTask,
  BriefRelationship,
  BriefUpcomingItem,
  DecisionRow,
  MeetingDetail,
  MeetingFormOptions,
  MeetingListRow,
  MeetingSummaryData,
  PreMeetingBrief,
} from '../types'

// The meetings module reads across other modules through their index.ts public
// surfaces where a query exists (clients.getClient, email.getThreads). Where no
// exported query fits a needed shape (per-meeting decisions/action items, the
// meeting list joins, tasks scoped to a client's projects), it does minimal
// workspace-scoped, RLS-backstopped direct reads — never importing another
// module's internals. Those direct reads are flagged inline below.

export interface GetMeetingsFilters {
  type?: string
  status?: string
}

function parseAttendees(value: unknown): AttendeeRef[] {
  const parsed = MeetingAttendeesSchema.safeParse(value)
  return parsed.success ? (parsed.data as AttendeeRef[]) : []
}

function parseAgenda(value: unknown): AgendaItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Record<string, unknown>
    if (typeof item.title !== 'string' || item.title.length === 0) return []
    return [
      {
        title: item.title,
        durationMinutes:
          typeof item.durationMinutes === 'number' ? item.durationMinutes : undefined,
        notes: typeof item.notes === 'string' ? item.notes : undefined,
        done: item.done === true,
      },
    ]
  })
}

/** The effective start time of a meeting: its own starts_at, else its event's. */
function effectiveStart(
  meeting: Pick<Tables<'meetings'>, 'starts_at'>,
  eventStart: string | null,
): string | null {
  return meeting.starts_at ?? eventStart ?? null
}

async function nameMap(
  ctx: WorkspaceContext,
  table: 'clients' | 'projects' | 'crm_deals',
  nameColumn: 'name' | 'title',
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

/** Resolve a meeting's client id directly or via its project/deal (single hop). */
async function resolveClientId(
  ctx: WorkspaceContext,
  meeting: Pick<Tables<'meetings'>, 'client_id' | 'project_id' | 'deal_id'>,
): Promise<string | null> {
  if (meeting.client_id) return meeting.client_id
  if (meeting.project_id) {
    const { data } = await ctx.supabase
      .from('projects')
      .select('client_id')
      .eq('id', meeting.project_id)
      .eq('workspace_id', ctx.workspace.id)
      .maybeSingle()
    if (data?.client_id) return data.client_id
  }
  if (meeting.deal_id) {
    const { data } = await ctx.supabase
      .from('crm_deals')
      .select('client_id')
      .eq('id', meeting.deal_id)
      .eq('workspace_id', ctx.workspace.id)
      .maybeSingle()
    if (data?.client_id) return data.client_id
  }
  return null
}

/**
 * List meetings (workspace-scoped, not deleted) with client/project/deal names,
 * agenda/decision/action-item counts, and effective timing resolved from the
 * linked calendar event when the meeting carries no starts_at of its own.
 */
export async function getMeetings(
  ctx: WorkspaceContext,
  filters?: GetMeetingsFilters,
): Promise<MeetingListRow[]> {
  let query = ctx.supabase
    .from('meetings')
    .select(
      'id, title, type, status, project_id, deal_id, client_id, calendar_event_id, attendees, agenda, starts_at, ends_at, location, created_at',
    )
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(500)

  if (filters?.type && filters.type !== 'all') {
    query = query.eq('type', filters.type as Tables<'meetings'>['type'])
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status as Tables<'meetings'>['status'])
  }

  const { data: meetings } = await query
  if (!meetings || meetings.length === 0) return []

  const eventIds = meetings
    .map((m) => m.calendar_event_id)
    .filter((id): id is string => id !== null)
  const clientIds = [...new Set(meetings.map((m) => m.client_id).filter((v): v is string => !!v))]
  const projectIds = [...new Set(meetings.map((m) => m.project_id).filter((v): v is string => !!v))]
  const dealIds = [...new Set(meetings.map((m) => m.deal_id).filter((v): v is string => !!v))]
  const meetingIds = meetings.map((m) => m.id)

  const [eventsRes, clientNames, projectRows, dealNames, decisionCounts, actionCounts] =
    await Promise.all([
      eventIds.length > 0
        ? ctx.supabase
            .from('calendar_events')
            .select('id, starts_at, ends_at, location')
            .eq('workspace_id', ctx.workspace.id)
            .in('id', eventIds)
        : Promise.resolve({
            data: [] as {
              id: string
              starts_at: string
              ends_at: string | null
              location: string | null
            }[],
          }),
      nameMap(ctx, 'clients', 'name', clientIds),
      // projects carry the name AND client_id (to backfill client through project)
      projectIds.length > 0
        ? ctx.supabase
            .from('projects')
            .select('id, name, client_id')
            .eq('workspace_id', ctx.workspace.id)
            .in('id', projectIds)
        : Promise.resolve({ data: [] as { id: string; name: string; client_id: string | null }[] }),
      nameMap(ctx, 'crm_deals', 'title', dealIds),
      ctx.supabase
        .from('meeting_decisions')
        .select('meeting_id')
        .eq('workspace_id', ctx.workspace.id)
        .is('deleted_at', null)
        .in('meeting_id', meetingIds),
      ctx.supabase
        .from('meeting_action_items')
        .select('meeting_id')
        .eq('workspace_id', ctx.workspace.id)
        .is('deleted_at', null)
        .in('meeting_id', meetingIds),
    ])

  const eventById = new Map((eventsRes.data ?? []).map((e) => [e.id, e]))
  const projectById = new Map(
    (
      (projectRows as { data: { id: string; name: string; client_id: string | null }[] }).data ?? []
    ).map((p) => [p.id, p]),
  )
  const countBy = (rows: { meeting_id: string }[] | null): Map<string, number> => {
    const m = new Map<string, number>()
    for (const r of rows ?? []) m.set(r.meeting_id, (m.get(r.meeting_id) ?? 0) + 1)
    return m
  }
  const decisionCountBy = countBy(decisionCounts.data)
  const actionCountBy = countBy(actionCounts.data)

  // A meeting's client name comes from client_id, else the linked project's client.
  const backfillClientIds = [
    ...new Set(
      meetings.flatMap((m) => {
        if (m.client_id) return []
        const project = m.project_id ? projectById.get(m.project_id) : undefined
        return project?.client_id ? [project.client_id] : []
      }),
    ),
  ].filter((id) => !clientNames.has(id))
  const backfillNames = await nameMap(ctx, 'clients', 'name', backfillClientIds)
  for (const [id, name] of backfillNames) clientNames.set(id, name)

  return meetings.map((m) => {
    const event = m.calendar_event_id ? eventById.get(m.calendar_event_id) : undefined
    const project = m.project_id ? projectById.get(m.project_id) : undefined
    const clientId = m.client_id ?? project?.client_id ?? null
    return {
      id: m.id,
      title: m.title,
      type: m.type,
      status: m.status,
      startsAt: effectiveStart(m, event?.starts_at ?? null),
      endsAt: m.ends_at ?? event?.ends_at ?? null,
      location: m.location ?? event?.location ?? null,
      clientId,
      clientName: clientId ? (clientNames.get(clientId) ?? null) : null,
      projectId: m.project_id,
      projectName: project?.name ?? null,
      dealId: m.deal_id,
      dealName: m.deal_id ? (dealNames.get(m.deal_id) ?? null) : null,
      attendees: parseAttendees(m.attendees),
      agendaCount: parseAgenda(m.agenda).length,
      decisionCount: decisionCountBy.get(m.id) ?? 0,
      actionItemCount: actionCountBy.get(m.id) ?? 0,
      createdAt: m.created_at,
    }
  })
}

async function getDecisions(ctx: WorkspaceContext, meetingId: string): Promise<DecisionRow[]> {
  const { data } = await ctx.supabase
    .from('meeting_decisions')
    .select('id, meeting_id, statement, decided_by, context, created_at')
    .eq('workspace_id', ctx.workspace.id)
    .eq('meeting_id', meetingId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  return (data ?? []).map((d) => ({
    id: d.id,
    meetingId: d.meeting_id,
    statement: d.statement,
    decidedBy: d.decided_by,
    context: d.context,
    createdAt: d.created_at,
  }))
}

async function getActionItems(
  ctx: WorkspaceContext,
  meetingId: string,
  options?: { openOnly?: boolean },
): Promise<ActionItemRow[]> {
  let query = ctx.supabase
    .from('meeting_action_items')
    .select('id, meeting_id, description, assignee_user_id, due_date, status, task_id, created_at')
    .eq('workspace_id', ctx.workspace.id)
    .eq('meeting_id', meetingId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (options?.openOnly) query = query.in('status', ['proposed', 'accepted'])

  const { data } = await query
  if (!data || data.length === 0) return []

  const assigneeIds = [
    ...new Set(data.map((a) => a.assignee_user_id).filter((v): v is string => !!v)),
  ]
  const nameById = new Map<string, string>()
  if (assigneeIds.length > 0) {
    const { data: profiles } = await ctx.supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', assigneeIds)
    for (const p of profiles ?? []) nameById.set(p.id, p.full_name ?? p.email)
  }

  return data.map((a) => ({
    id: a.id,
    meetingId: a.meeting_id,
    description: a.description,
    assigneeUserId: a.assignee_user_id,
    assigneeName: a.assignee_user_id ? (nameById.get(a.assignee_user_id) ?? null) : null,
    dueDate: a.due_date,
    status: a.status,
    taskId: a.task_id,
    createdAt: a.created_at,
  }))
}

/** One meeting with agenda, notes, decisions, action items, and summary (if any). */
export async function getMeeting(
  ctx: WorkspaceContext,
  meetingId: string,
): Promise<MeetingDetail | null> {
  const { data: meeting } = await ctx.supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!meeting) return null

  const [event, clientId, project, dealName, decisions, actionItems, summaryRes] =
    await Promise.all([
      meeting.calendar_event_id
        ? ctx.supabase
            .from('calendar_events')
            .select('starts_at, ends_at, location')
            .eq('id', meeting.calendar_event_id)
            .eq('workspace_id', ctx.workspace.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      resolveClientId(ctx, meeting),
      meeting.project_id
        ? ctx.supabase
            .from('projects')
            .select('id, name')
            .eq('id', meeting.project_id)
            .eq('workspace_id', ctx.workspace.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      meeting.deal_id
        ? nameMap(ctx, 'crm_deals', 'title', [meeting.deal_id])
        : Promise.resolve(new Map<string, string>()),
      getDecisions(ctx, meetingId),
      getActionItems(ctx, meetingId),
      ctx.supabase
        .from('meeting_summaries')
        .select('id, tldr, decisions, action_items, client_safe_variant, model')
        .eq('workspace_id', ctx.workspace.id)
        .eq('meeting_id', meetingId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  const clientName = clientId
    ? ((await nameMap(ctx, 'clients', 'name', [clientId])).get(clientId) ?? null)
    : null

  const summary: MeetingSummaryData | null = summaryRes.data
    ? {
        id: summaryRes.data.id,
        tldr: summaryRes.data.tldr,
        decisions: Array.isArray(summaryRes.data.decisions) ? summaryRes.data.decisions : [],
        actionItems: Array.isArray(summaryRes.data.action_items)
          ? summaryRes.data.action_items
          : [],
        clientSafeVariant: summaryRes.data.client_safe_variant,
        model: summaryRes.data.model,
      }
    : null

  const eventData = event.data as {
    starts_at: string
    ends_at: string | null
    location: string | null
  } | null

  return {
    id: meeting.id,
    title: meeting.title,
    type: meeting.type,
    status: meeting.status,
    startsAt: meeting.starts_at ?? eventData?.starts_at ?? null,
    endsAt: meeting.ends_at ?? eventData?.ends_at ?? null,
    location: meeting.location ?? eventData?.location ?? null,
    notes: meeting.notes,
    calendarEventId: meeting.calendar_event_id,
    clientId,
    clientName,
    projectId: meeting.project_id,
    projectName: (project.data as { id: string; name: string } | null)?.name ?? null,
    dealId: meeting.deal_id,
    dealName: meeting.deal_id ? (dealName.get(meeting.deal_id) ?? null) : null,
    attendees: parseAttendees(meeting.attendees),
    agenda: parseAgenda(meeting.agenda),
    decisions,
    actionItems,
    summary,
    createdAt: meeting.created_at,
    updatedAt: meeting.updated_at,
  }
}

/** Options for the create/edit form: clients, projects, deals, members, contacts. */
export async function getMeetingFormOptions(ctx: WorkspaceContext): Promise<MeetingFormOptions> {
  const [clientsRes, projectsRes, dealsRes, membersRes, contactsRes] = await Promise.all([
    ctx.supabase
      .from('clients')
      .select('id, name')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    ctx.supabase
      .from('projects')
      .select('id, name')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    ctx.supabase
      .from('crm_deals')
      .select('id, title')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    ctx.supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', ctx.workspace.id)
      .order('created_at', { ascending: true }),
    ctx.supabase
      .from('crm_contacts')
      .select('id, full_name, email, client_id')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('full_name', { ascending: true }),
  ])

  const memberIds = (membersRes.data ?? []).map((m) => m.user_id)
  const profileById = new Map<
    string,
    { id: string; full_name: string | null; email: string; avatar_url: string | null }
  >()
  if (memberIds.length > 0) {
    const { data: profiles } = await ctx.supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', memberIds)
    for (const p of profiles ?? []) profileById.set(p.id, p)
  }

  return {
    clients: (clientsRes.data ?? []).map((c) => ({ id: c.id, name: c.name })),
    projects: (projectsRes.data ?? []).map((p) => ({ id: p.id, name: p.name })),
    deals: (dealsRes.data ?? []).map((d) => ({ id: d.id, name: d.title })),
    members: memberIds.flatMap((id) => {
      const p = profileById.get(id)
      if (!p) return []
      return [{ id: p.id, fullName: p.full_name, email: p.email, avatarUrl: p.avatar_url }]
    }),
    contacts: (contactsRes.data ?? []).map((c) => ({
      id: c.id,
      fullName: c.full_name,
      email: c.email,
      clientId: c.client_id,
    })),
  }
}

/** Workspace-wide decision register, newest first, searchable by q (ilike). */
export async function getDecisionLog(ctx: WorkspaceContext, q?: string): Promise<DecisionRow[]> {
  let query = ctx.supabase
    .from('meeting_decisions')
    .select('id, meeting_id, statement, decided_by, context, created_at')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(300)

  const term = q?.trim()
  if (term) {
    const safe = term.replace(/[%_]/g, (m) => `\\${m}`)
    query = query.or(`statement.ilike.%${safe}%,context.ilike.%${safe}%,decided_by.ilike.%${safe}%`)
  }

  const { data } = await query
  if (!data || data.length === 0) return []

  const meetingIds = [...new Set(data.map((d) => d.meeting_id))]
  const titleById = new Map<string, string>()
  if (meetingIds.length > 0) {
    const { data: meetings } = await ctx.supabase
      .from('meetings')
      .select('id, title')
      .eq('workspace_id', ctx.workspace.id)
      .in('id', meetingIds)
    for (const m of meetings ?? []) titleById.set(m.id, m.title)
  }

  return data.map((d) => ({
    id: d.id,
    meetingId: d.meeting_id,
    statement: d.statement,
    decidedBy: d.decided_by,
    context: d.context,
    createdAt: d.created_at,
    meetingTitle: titleById.get(d.meeting_id) ?? 'Meeting',
  }))
}

/** Meeting ids that reference a client directly or through its projects/deals. */
async function meetingIdsForClient(ctx: WorkspaceContext, clientId: string): Promise<string[]> {
  const [projectsRes, dealsRes] = await Promise.all([
    ctx.supabase
      .from('projects')
      .select('id')
      .eq('workspace_id', ctx.workspace.id)
      .eq('client_id', clientId)
      .is('deleted_at', null),
    ctx.supabase
      .from('crm_deals')
      .select('id')
      .eq('workspace_id', ctx.workspace.id)
      .eq('client_id', clientId)
      .is('deleted_at', null),
  ])
  const projectIds = (projectsRes.data ?? []).map((p) => p.id)
  const dealIds = (dealsRes.data ?? []).map((d) => d.id)

  const filters = [`client_id.eq.${clientId}`]
  if (projectIds.length > 0) filters.push(`project_id.in.(${projectIds.join(',')})`)
  if (dealIds.length > 0) filters.push(`deal_id.in.(${dealIds.join(',')})`)

  const { data } = await ctx.supabase
    .from('meetings')
    .select('id')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .or(filters.join(','))
  return (data ?? []).map((m) => m.id)
}

/** All meetings for a client (direct link or via its projects/deals), newest first. */
export async function getClientMeetingTimeline(
  ctx: WorkspaceContext,
  clientId: string,
): Promise<MeetingListRow[]> {
  const ids = await meetingIdsForClient(ctx, clientId)
  if (ids.length === 0) return []
  const all = await getMeetings(ctx)
  const idSet = new Set(ids)
  return all
    .filter((m) => idSet.has(m.id))
    .sort((a, b) => {
      const sa = a.startsAt ?? a.createdAt
      const sb = b.startsAt ?? b.createdAt
      return sa < sb ? 1 : sa > sb ? -1 : 0
    })
}

// ── The pre-meeting brief (the extraordinary feature) ────────────────────────

/**
 * Assemble a read-only relationship brief for a meeting from real workspace data
 * across modules — "walk in already knowing everything". Nothing is invented:
 *  • relationship summary  — client (status), deal (stage + value), project (status)
 *  • last meeting          — the previous meeting with this client, its decisions
 *                            and its still-open action items
 *  • open tasks            — the client's open tasks (across its projects), by due
 *  • recent activity       — recent email thread subjects (email module) and the
 *                            latest domain events for the client (fallback signal)
 *  • upcoming              — other upcoming meetings tied to the same relationship
 *
 * Every section may be empty; the panel renders honest empty states. Data comes
 * through other modules' exported queries (clients.getClient, email.getThreads)
 * where one fits, and minimal workspace-scoped direct reads otherwise.
 */
export async function getPreMeetingBrief(
  ctx: WorkspaceContext,
  meetingId: string,
): Promise<PreMeetingBrief> {
  const empty: PreMeetingBrief = {
    meetingId,
    hasContext: false,
    relationships: [],
    lastMeeting: null,
    openTasks: [],
    recentActivity: [],
    upcoming: [],
  }

  const { data: meeting } = await ctx.supabase
    .from('meetings')
    .select('id, client_id, project_id, deal_id')
    .eq('id', meetingId)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!meeting) return empty

  const clientId = await resolveClientId(ctx, meeting)
  if (!clientId && !meeting.project_id && !meeting.deal_id) return empty

  const relationships: BriefRelationship[] = []

  // ── Relationship summary ────────────────────────────────────────────────
  if (clientId) {
    const client = await getClient(ctx, clientId)
    if (client) {
      relationships.push({
        kind: 'client',
        id: client.id,
        name: client.name,
        status: client.status,
        valueCents: null,
        currency: null,
        href: `/clients/${client.id}`,
      })
    }
  }
  if (meeting.deal_id) {
    const { data: deal } = await ctx.supabase
      .from('crm_deals')
      .select('id, title, stage, value_cents, currency')
      .eq('id', meeting.deal_id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (deal) {
      relationships.push({
        kind: 'deal',
        id: deal.id,
        name: deal.title,
        status: deal.stage,
        valueCents: deal.value_cents,
        currency: deal.currency,
        href: `/crm?tab=deals`,
      })
    }
  }
  if (meeting.project_id) {
    const { data: project } = await ctx.supabase
      .from('projects')
      .select('id, name, status')
      .eq('id', meeting.project_id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (project) {
      relationships.push({
        kind: 'project',
        id: project.id,
        name: project.name,
        status: project.status,
        valueCents: null,
        currency: null,
        href: `/projects/${project.id}`,
      })
    }
  }

  // ── Last meeting with this client (decisions + open action items) ─────────
  let lastMeeting: BriefLastMeeting | null = null
  if (clientId) {
    const relatedIds = (await meetingIdsForClient(ctx, clientId)).filter((id) => id !== meetingId)
    if (relatedIds.length > 0) {
      const { data: prior } = await ctx.supabase
        .from('meetings')
        .select('id, title, starts_at, created_at')
        .eq('workspace_id', ctx.workspace.id)
        .in('id', relatedIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (prior) {
        const [decisions, openActionItems] = await Promise.all([
          getDecisions(ctx, prior.id),
          getActionItems(ctx, prior.id, { openOnly: true }),
        ])
        lastMeeting = {
          id: prior.id,
          title: prior.title,
          when: prior.starts_at ?? prior.created_at,
          decisions,
          openActionItems,
          href: `/meetings/${prior.id}`,
        }
      }
    }
  }

  // ── Client's open tasks (across its projects), soonest due first ──────────
  const openTasks: BriefOpenTask[] = []
  if (clientId) {
    const { data: clientProjects } = await ctx.supabase
      .from('projects')
      .select('id')
      .eq('workspace_id', ctx.workspace.id)
      .eq('client_id', clientId)
      .is('deleted_at', null)
    const projectIds = (clientProjects ?? []).map((p) => p.id)
    if (meeting.project_id && !projectIds.includes(meeting.project_id)) {
      projectIds.push(meeting.project_id)
    }
    if (projectIds.length > 0) {
      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, assignee_id')
        .eq('workspace_id', ctx.workspace.id)
        .in('project_id', projectIds)
        .is('deleted_at', null)
        .not('status', 'in', '(done,canceled)')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(6)
      const assigneeIds = [
        ...new Set((tasks ?? []).map((t) => t.assignee_id).filter((v): v is string => !!v)),
      ]
      const assigneeName = new Map<string, string>()
      if (assigneeIds.length > 0) {
        const { data: profiles } = await ctx.supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', assigneeIds)
        for (const p of profiles ?? []) assigneeName.set(p.id, p.full_name ?? p.email)
      }
      for (const t of tasks ?? []) {
        openTasks.push({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.due_date,
          assigneeName: t.assignee_id ? (assigneeName.get(t.assignee_id) ?? null) : null,
        })
      }
    }
  }

  // ── Recent activity: email threads (module query) + domain events fallback ─
  const recentActivity: BriefActivityItem[] = []
  if (clientId) {
    try {
      const threads = await getThreads(ctx, { clientId })
      for (const t of threads.slice(0, 4)) {
        recentActivity.push({
          kind: 'email',
          id: t.id,
          label: t.subject,
          when: t.lastMessageAt,
          href: `/email?thread=${t.id}`,
        })
      }
    } catch {
      // Email visibility is RLS-gated (private threads); a failure here is not fatal.
    }
    if (recentActivity.length === 0) {
      const { data: events } = await ctx.supabase
        .from('domain_events')
        .select('id, event_type, created_at')
        .eq('workspace_id', ctx.workspace.id)
        .eq('entity_type', 'client')
        .eq('entity_id', clientId)
        .order('created_at', { ascending: false })
        .limit(4)
      for (const e of events ?? []) {
        recentActivity.push({
          kind: 'event',
          id: e.id,
          label: e.event_type.replace(/[._]/g, ' '),
          when: e.created_at,
          href: null,
        })
      }
    }
  }

  // ── Upcoming related meetings (same relationship, still ahead) ────────────
  const upcoming: BriefUpcomingItem[] = []
  {
    const relatedIds = clientId
      ? (await meetingIdsForClient(ctx, clientId)).filter((id) => id !== meetingId)
      : []
    if (relatedIds.length > 0) {
      const nowIso = new Date().toISOString()
      const { data: futureMeetings } = await ctx.supabase
        .from('meetings')
        .select('id, title, starts_at')
        .eq('workspace_id', ctx.workspace.id)
        .in('id', relatedIds)
        .is('deleted_at', null)
        .not('starts_at', 'is', null)
        .gte('starts_at', nowIso)
        .order('starts_at', { ascending: true })
        .limit(4)
      for (const m of futureMeetings ?? []) {
        if (!m.starts_at) continue
        upcoming.push({
          id: m.id,
          title: m.title,
          startsAt: m.starts_at,
          href: `/meetings/${m.id}`,
        })
      }
    }
  }

  const hasContext =
    relationships.length > 0 ||
    lastMeeting !== null ||
    openTasks.length > 0 ||
    recentActivity.length > 0 ||
    upcoming.length > 0

  return { meetingId, hasContext, relationships, lastMeeting, openTasks, recentActivity, upcoming }
}

// ── Dashboard / calendar reuse ───────────────────────────────────────────────

export interface UpcomingMeetingRow {
  id: string
  title: string
  type: MeetingListRow['type']
  status: MeetingListRow['status']
  startsAt: string
  clientName: string | null
}

/**
 * Next upcoming, non-cancelled meetings with an effective start time — exported
 * for the dashboard / calendar rail. Timed via starts_at or the linked event.
 */
export async function getUpcomingMeetings(
  ctx: WorkspaceContext,
  limit = 5,
): Promise<UpcomingMeetingRow[]> {
  const rows = await getMeetings(ctx)
  const nowIso = new Date().toISOString()
  return rows
    .flatMap((m) =>
      m.status !== 'cancelled' && m.startsAt !== null && m.startsAt >= nowIso
        ? [{ ...m, startsAt: m.startsAt }]
        : [],
    )
    .sort((a, b) => (a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0))
    .slice(0, limit)
    .map((m) => ({
      id: m.id,
      title: m.title,
      type: m.type,
      status: m.status,
      startsAt: m.startsAt,
      clientName: m.clientName,
    }))
}
