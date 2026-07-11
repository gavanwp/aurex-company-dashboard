import 'server-only'

import { addDays, format, formatDistanceToNow, startOfMonth, subDays, subMonths } from 'date-fns'
import { TASK_STATUSES } from '@aurexos/core'
import type { ProjectStatusDb, TaskPriorityDb, TaskStatusDb } from '@aurexos/db'
import type { WorkspaceContext } from '@/lib/workspace-context'

/** Task statuses that count as "open" everywhere on the dashboard. */
const OPEN_TASK_STATUSES = TASK_STATUSES.filter(
  (status) => status !== 'done' && status !== 'canceled',
)

/** Invoice statuses that are outstanding (sent but not settled). */
const OUTSTANDING_INVOICE_STATUSES = ['sent', 'viewed', 'partial'] as const

/** Priority rank for "top open tasks" ordering — urgent first. */
const PRIORITY_RANK: Record<TaskPriorityDb, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
}

export interface DashboardTask {
  id: string
  title: string
  priority: TaskPriorityDb
  /** ISO date (yyyy-MM-dd) or null when the task has no due date. */
  dueDate: string | null
  projectName: string | null
  projectColor: string | null
}

export interface DashboardActivity {
  id: string
  /** Human sentence derived from the event type, e.g. "created a task". */
  sentence: string
  /** Dot-namespace of the event ("tasks", "crm", …) — drives the row icon. */
  source: string
  /** Relative time, e.g. "3 hours ago". */
  timeAgo: string
  actorName: string | null
  actorAvatarUrl: string | null
}

/**
 * A KPI with an honest comparison: `deltaPct` is null whenever the previous
 * period's base is zero — we render "—" instead of a fake percentage.
 */
export interface KpiStat {
  value: number
  deltaPct: number | null
  trend: 'up' | 'down' | 'flat'
  /** Monthly series for the sparkline, oldest → newest (real data only). */
  spark: number[]
}

export interface RevenueMonth {
  /** Bucket key, yyyy-MM. */
  key: string
  /** Tick label, e.g. "Feb". */
  label: string
  /** Sum of paid invoice totals in minor units. */
  totalMinor: number
}

export interface RevenueSummary {
  /** All-time paid revenue in minor units. */
  totalMinor: number
  /** Paid revenue this calendar month. */
  thisMonthMinor: number
  /** This month vs last month; null when last month is zero. */
  deltaPct: number | null
  trend: 'up' | 'down' | 'flat'
  /** Last six calendar months including the current one. */
  byMonth: RevenueMonth[]
}

export interface StatusCount<S extends string> {
  status: S
  count: number
}

export interface DashboardMeeting {
  id: string
  title: string
  /** ISO timestamp. */
  startsAt: string
  endsAt: string | null
  location: string | null
}

/** Real computed facts for the AI daily-summary card — zero rows are omitted upstream. */
export interface DailyBrief {
  tasksDueToday: number
  meetingsToday: number
  proposalsPending: number
  invoicesOverdue: number
  newLeadsThisWeek: number
}

export interface DashboardData {
  revenue: RevenueSummary
  activeProjects: KpiStat
  pendingTasks: KpiStat
  newLeads: KpiStat
  totalClients: KpiStat
  /** Every status listed, zeros included (donut legend contract). */
  projectStatusCounts: StatusCount<ProjectStatusDb>[]
  taskStatusCounts: StatusCount<TaskStatusDb>[]
  /** Top 5 open tasks by priority, then due date. */
  priorityTasks: DashboardTask[]
  /** Current user's next events. */
  meetings: DashboardMeeting[]
  brief: DailyBrief
  recentActivity: DashboardActivity[]
}

const EVENT_SENTENCES: Record<string, string> = {
  'workspace.created': 'created the workspace',
  'workspace.member.invited': 'invited a member',
  'workspace.member.removed': 'removed a member',
  'projects.project.created': 'created a project',
  'projects.project.updated': 'updated a project',
  'projects.project.deleted': 'deleted a project',
  'tasks.task.created': 'created a task',
  'tasks.task.updated': 'updated a task',
  'tasks.task.status_changed': 'changed a task status',
  'tasks.task.assigned': 'assigned a task',
  'tasks.task.deleted': 'deleted a task',
  'tasks.comment.created': 'commented on a task',
  'crm.client.created': 'added a client',
  'crm.client.updated': 'updated a client',
  'crm.client.deleted': 'removed a client',
  'crm.contact.created': 'added a contact',
  'crm.contact.updated': 'updated a contact',
  'crm.contact.deleted': 'removed a contact',
  'crm.deal.created': 'created a deal',
  'crm.deal.updated': 'updated a deal',
  'crm.deal.stage_changed': 'moved a deal',
  'crm.deal.deleted': 'removed a deal',
}

/** Fallback: 'billing.invoice.sent' → "invoice sent". */
function humanizeEventType(eventType: string): string {
  const parts = eventType.split('.')
  return (parts.length > 1 ? parts.slice(1) : parts).join(' ').replaceAll('_', ' ')
}

/** "—" over fake numbers: null when the comparison base is zero. */
function honestDelta(current: number, previous: number): Pick<KpiStat, 'deltaPct' | 'trend'> {
  if (previous === 0) return { deltaPct: null, trend: 'flat' }
  const pct = ((current - previous) / previous) * 100
  return { deltaPct: pct, trend: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' }
}

/** Buckets ISO timestamps into the trailing `months` calendar months. */
function monthlyBuckets(months: number, now: Date): { key: string; label: string }[] {
  return Array.from({ length: months }, (_, i) => {
    const month = subMonths(startOfMonth(now), months - 1 - i)
    return { key: format(month, 'yyyy-MM'), label: format(month, 'MMM') }
  })
}

function countByMonth(rows: { created_at: string }[], buckets: { key: string }[]): number[] {
  const counts = new Map(buckets.map((b) => [b.key, 0]))
  for (const row of rows) {
    const key = row.created_at.slice(0, 7)
    const current = counts.get(key)
    if (current !== undefined) counts.set(key, current + 1)
  }
  return buckets.map((b) => counts.get(b.key) ?? 0)
}

function countInWindow(rows: { created_at: string }[], fromIso: string, toIso: string): number {
  return rows.filter((row) => row.created_at >= fromIso && row.created_at < toIso).length
}

async function fetchPriorityTasks(ctx: WorkspaceContext): Promise<DashboardTask[]> {
  // Pull a bounded window of open tasks and rank in JS — priority is a text
  // enum, so SQL ordering would be alphabetical, not semantic.
  const { data: tasks } = await ctx.supabase
    .from('tasks')
    .select('id, title, priority, due_date, project_id')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .in('status', OPEN_TASK_STATUSES)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(100)
  if (!tasks || tasks.length === 0) return []

  const top = [...tasks]
    .sort((a, b) => {
      const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      if (rank !== 0) return rank
      if (a.due_date === b.due_date) return 0
      if (a.due_date === null) return 1
      if (b.due_date === null) return -1
      return a.due_date < b.due_date ? -1 : 1
    })
    .slice(0, 5)

  const projectIds = Array.from(
    new Set(top.map((t) => t.project_id).filter((id): id is string => id !== null)),
  )
  const projectById = new Map<string, { name: string; color: string | null }>()
  if (projectIds.length > 0) {
    const { data: projects } = await ctx.supabase
      .from('projects')
      .select('id, name, color')
      .eq('workspace_id', ctx.workspace.id)
      .in('id', projectIds)
    for (const project of projects ?? []) {
      projectById.set(project.id, { name: project.name, color: project.color })
    }
  }

  return top.map((task) => {
    const project = task.project_id ? projectById.get(task.project_id) : undefined
    return {
      id: task.id,
      title: task.title,
      priority: task.priority,
      dueDate: task.due_date,
      projectName: project?.name ?? null,
      projectColor: project?.color ?? null,
    }
  })
}

async function fetchRecentActivity(ctx: WorkspaceContext): Promise<DashboardActivity[]> {
  const { data: events } = await ctx.supabase
    .from('domain_events')
    .select('id, actor_id, event_type, created_at')
    .eq('workspace_id', ctx.workspace.id)
    .order('created_at', { ascending: false })
    .limit(10)
  if (!events || events.length === 0) return []

  const actorIds = Array.from(
    new Set(events.map((e) => e.actor_id).filter((id): id is string => id !== null)),
  )
  const profileById = new Map<string, { full_name: string | null; avatar_url: string | null }>()
  if (actorIds.length > 0) {
    const { data: profiles } = await ctx.supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', actorIds)
    for (const profile of profiles ?? []) {
      profileById.set(profile.id, { full_name: profile.full_name, avatar_url: profile.avatar_url })
    }
  }

  return events.map((event) => {
    const actor = event.actor_id ? profileById.get(event.actor_id) : undefined
    return {
      id: event.id,
      sentence: EVENT_SENTENCES[event.event_type] ?? humanizeEventType(event.event_type),
      source: event.event_type.split('.')[0] ?? 'workspace',
      timeAgo: formatDistanceToNow(new Date(event.created_at), { addSuffix: true }),
      actorName: actor?.full_name ?? null,
      actorAvatarUrl: actor?.avatar_url ?? null,
    }
  })
}

/**
 * All dashboard reads, in parallel, scoped to the current workspace.
 *
 * Distribution/sparkline reads fetch narrow columns (status/created_at) and
 * aggregate in JS — fine at Phase-1 workspace sizes (Supabase's 1000-row
 * default cap bounds the transfer); move to grouped SQL views when
 * workspaces outgrow it.
 */
export async function getDashboardData(ctx: WorkspaceContext): Promise<DashboardData> {
  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const last30Iso = subDays(now, 30).toISOString()
  const prev30Iso = subDays(now, 60).toISOString()
  const last7Iso = subDays(now, 7).toISOString()
  const nowIso = now.toISOString()
  const in14DaysIso = addDays(now, 14).toISOString()
  const buckets = monthlyBuckets(6, now)

  const [
    projectsRes,
    tasksRes,
    dealsRes,
    clientsRes,
    invoicesRes,
    eventsRes,
    proposalsPendingRes,
    priorityTasks,
    recentActivity,
  ] = await Promise.all([
    ctx.supabase
      .from('projects')
      .select('status, created_at')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null),
    ctx.supabase
      .from('tasks')
      .select('status, created_at, due_date')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null),
    ctx.supabase
      .from('crm_deals')
      .select('created_at')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null),
    ctx.supabase
      .from('clients')
      .select('created_at')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null),
    ctx.supabase
      .from('invoices')
      .select('status, total_minor, issue_date, due_date, created_at')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null),
    ctx.supabase
      .from('calendar_events')
      .select('id, title, starts_at, ends_at, location')
      .eq('workspace_id', ctx.workspace.id)
      .eq('user_id', ctx.userId)
      .is('deleted_at', null)
      .gte('starts_at', nowIso)
      .lte('starts_at', in14DaysIso)
      .order('starts_at', { ascending: true })
      .limit(20),
    ctx.supabase
      .from('proposals')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .in('status', ['sent', 'viewed']),
    fetchPriorityTasks(ctx),
    fetchRecentActivity(ctx),
  ])

  const projects = projectsRes.data ?? []
  const tasks = tasksRes.data ?? []
  const deals = dealsRes.data ?? []
  const clients = clientsRes.data ?? []
  const invoices = invoicesRes.data ?? []
  const events = eventsRes.data ?? []

  // ── Revenue: sum of paid invoices, bucketed by month ──────────────────────
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid')
  const paidMonthOf = (invoice: (typeof paidInvoices)[number]) =>
    (invoice.issue_date ?? invoice.created_at).slice(0, 7)
  const byMonth: RevenueMonth[] = buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    totalMinor: paidInvoices
      .filter((invoice) => paidMonthOf(invoice) === bucket.key)
      .reduce((sum, invoice) => sum + invoice.total_minor, 0),
  }))
  const totalMinor = paidInvoices.reduce((sum, invoice) => sum + invoice.total_minor, 0)
  const thisMonthMinor = byMonth[byMonth.length - 1]?.totalMinor ?? 0
  const lastMonthMinor = byMonth[byMonth.length - 2]?.totalMinor ?? 0
  const revenueDelta = honestDelta(thisMonthMinor, lastMonthMinor)

  // ── Status distributions — zero statuses stay listed ──────────────────────
  const projectStatusCounts: StatusCount<ProjectStatusDb>[] = (
    ['planning', 'active', 'on_hold', 'completed', 'archived'] satisfies ProjectStatusDb[]
  ).map((status) => ({
    status,
    count: projects.filter((p) => p.status === status).length,
  }))
  const taskStatusCounts: StatusCount<TaskStatusDb>[] = (
    ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'canceled'] satisfies TaskStatusDb[]
  ).map((status) => ({
    status,
    count: tasks.filter((t) => t.status === status).length,
  }))

  const openTaskSet = new Set<TaskStatusDb>(OPEN_TASK_STATUSES)
  const openTasks = tasks.filter((t) => openTaskSet.has(t.status))

  // ── KPI deltas: flow of new records, last 30 days vs the 30 before ────────
  const kpi = (rows: { created_at: string }[], value: number): KpiStat => ({
    value,
    ...honestDelta(
      countInWindow(rows, last30Iso, nowIso),
      countInWindow(rows, prev30Iso, last30Iso),
    ),
    spark: countByMonth(rows, buckets),
  })

  // ── Daily brief — real facts only ──────────────────────────────────────────
  const meetingsToday = events.filter((e) => e.starts_at.slice(0, 10) === today).length
  const outstandingSet = new Set<string>(OUTSTANDING_INVOICE_STATUSES)
  const invoicesOverdue = invoices.filter(
    (invoice) =>
      invoice.status === 'overdue' ||
      (outstandingSet.has(invoice.status) && invoice.due_date !== null && invoice.due_date < today),
  ).length

  return {
    revenue: {
      totalMinor,
      thisMonthMinor,
      deltaPct: revenueDelta.deltaPct,
      trend: revenueDelta.trend,
      byMonth,
    },
    activeProjects: kpi(projects, projects.filter((p) => p.status === 'active').length),
    pendingTasks: kpi(openTasks, openTasks.length),
    newLeads: kpi(deals, countInWindow(deals, last30Iso, nowIso)),
    totalClients: kpi(clients, clients.length),
    projectStatusCounts,
    taskStatusCounts,
    priorityTasks,
    meetings: events.slice(0, 5).map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      location: event.location,
    })),
    brief: {
      tasksDueToday: openTasks.filter((t) => t.due_date === today).length,
      meetingsToday,
      proposalsPending: proposalsPendingRes.count ?? 0,
      invoicesOverdue,
      newLeadsThisWeek: countInWindow(deals, last7Iso, nowIso),
    },
    recentActivity,
  }
}
