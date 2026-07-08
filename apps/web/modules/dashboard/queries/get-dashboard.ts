import 'server-only'

import { addDays, format, formatDistanceToNow, startOfMonth } from 'date-fns'
import { DEAL_STAGES, TASK_STATUSES } from '@aurexos/core'
import type { TaskPriorityDb } from '@aurexos/db'
import type { WorkspaceContext } from '@/lib/workspace-context'

/** Task statuses that count as "open" everywhere on the dashboard. */
const OPEN_TASK_STATUSES = TASK_STATUSES.filter(
  (status) => status !== 'done' && status !== 'canceled',
)

/** Deal stages still in play — everything that is neither won nor lost. */
const OPEN_DEAL_STAGES = DEAL_STAGES.filter((stage) => stage !== 'won' && stage !== 'lost')

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
  /** Relative time, e.g. "3 hours ago". */
  timeAgo: string
  actorName: string | null
  actorAvatarUrl: string | null
}

export interface DashboardData {
  activeProjects: number
  openTasks: number
  dueThisWeek: number
  overdue: number
  /** Sum of value_cents across deals whose stage is neither won nor lost. */
  pipelineValue: number
  /** Sum of value_cents across deals won (updated) this calendar month. */
  wonThisMonth: number
  myTasks: DashboardTask[]
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

function sumCents(rows: { value_cents: number | null }[] | null): number {
  return (rows ?? []).reduce((total, row) => total + (row.value_cents ?? 0), 0)
}

async function fetchMyTasks(ctx: WorkspaceContext): Promise<DashboardTask[]> {
  const { data: tasks } = await ctx.supabase
    .from('tasks')
    .select('id, title, priority, due_date, project_id')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .eq('assignee_id', ctx.userId)
    .in('status', OPEN_TASK_STATUSES)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(8)
  if (!tasks || tasks.length === 0) return []

  const projectIds = Array.from(
    new Set(tasks.map((t) => t.project_id).filter((id): id is string => id !== null)),
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

  return tasks.map((task) => {
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
      timeAgo: formatDistanceToNow(new Date(event.created_at), { addSuffix: true }),
      actorName: actor?.full_name ?? null,
      actorAvatarUrl: actor?.avatar_url ?? null,
    }
  })
}

/** All dashboard reads, in parallel, scoped to the current workspace. */
export async function getDashboardData(ctx: WorkspaceContext): Promise<DashboardData> {
  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const weekEnd = format(addDays(now, 7), 'yyyy-MM-dd')
  const monthStart = startOfMonth(now).toISOString()

  const [
    activeProjectsRes,
    openTasksRes,
    dueThisWeekRes,
    overdueRes,
    openDealsRes,
    wonDealsRes,
    myTasks,
    recentActivity,
  ] = await Promise.all([
    ctx.supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .eq('status', 'active'),
    ctx.supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .in('status', OPEN_TASK_STATUSES),
    ctx.supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .in('status', OPEN_TASK_STATUSES)
      .gte('due_date', today)
      .lte('due_date', weekEnd),
    ctx.supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .in('status', OPEN_TASK_STATUSES)
      .lt('due_date', today),
    ctx.supabase
      .from('crm_deals')
      .select('value_cents')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .in('stage', OPEN_DEAL_STAGES),
    ctx.supabase
      .from('crm_deals')
      .select('value_cents')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .eq('stage', 'won')
      .gte('updated_at', monthStart),
    fetchMyTasks(ctx),
    fetchRecentActivity(ctx),
  ])

  return {
    activeProjects: activeProjectsRes.count ?? 0,
    openTasks: openTasksRes.count ?? 0,
    dueThisWeek: dueThisWeekRes.count ?? 0,
    overdue: overdueRes.count ?? 0,
    pipelineValue: sumCents(openDealsRes.data),
    wonThisMonth: sumCents(wonDealsRes.data),
    myTasks,
    recentActivity,
  }
}
