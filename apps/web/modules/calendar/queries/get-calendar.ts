import 'server-only'

import type { WorkspaceContext } from '@/lib/workspace-context'
import { daysFromNow } from '../lib/range'
import type {
  CalendarData,
  CalendarEventItem,
  CalendarMeetingItem,
  CalendarTaskItem,
  UpcomingItem,
} from '../types'

/** Task statuses that never render on the calendar. */
const HIDDEN_TASK_STATUSES = ['canceled'] as const

interface MeetingLayerResult {
  meetings: CalendarMeetingItem[]
  /** calendar_events ids consumed by meetings — excluded from the event layer. */
  claimedEventIds: Set<string>
}

/**
 * Meetings carry no time columns in 0010 — their calendar placement comes from
 * the linked calendar_events row. Fetch workspace meetings, then resolve their
 * events inside the range. Meetings without a calendar event (or whose event
 * falls outside the range) don't appear — honest, not guessed.
 */
async function fetchMeetingLayer(
  ctx: WorkspaceContext,
  rangeStartIso: string,
  rangeEndIso: string,
): Promise<MeetingLayerResult> {
  const { data: meetings } = await ctx.supabase
    .from('meetings')
    .select('id, title, type, status, project_id, calendar_event_id')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .not('calendar_event_id', 'is', null)
    .limit(500)
  if (!meetings || meetings.length === 0) return { meetings: [], claimedEventIds: new Set() }

  const eventIds = meetings
    .map((m) => m.calendar_event_id)
    .filter((id): id is string => id !== null)

  const { data: events } = await ctx.supabase
    .from('calendar_events')
    .select('id, title, starts_at, ends_at, all_day, location')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .in('id', eventIds)
    .gte('starts_at', rangeStartIso)
    .lte('starts_at', rangeEndIso)
  const eventById = new Map((events ?? []).map((e) => [e.id, e]))

  const projectIds = [
    ...new Set(meetings.map((m) => m.project_id).filter((id): id is string => id !== null)),
  ]
  const projectById = new Map<string, string>()
  if (projectIds.length > 0) {
    const { data: projects } = await ctx.supabase
      .from('projects')
      .select('id, name')
      .eq('workspace_id', ctx.workspace.id)
      .in('id', projectIds)
    for (const project of projects ?? []) projectById.set(project.id, project.name)
  }

  const claimedEventIds = new Set<string>()
  const items: CalendarMeetingItem[] = []
  for (const meeting of meetings) {
    const event = meeting.calendar_event_id ? eventById.get(meeting.calendar_event_id) : undefined
    if (!event) continue
    claimedEventIds.add(event.id)
    items.push({
      layer: 'meeting',
      id: meeting.id,
      title: meeting.title,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      allDay: event.all_day,
      location: event.location,
      meetingType: meeting.type,
      projectId: meeting.project_id,
      projectName: meeting.project_id ? (projectById.get(meeting.project_id) ?? null) : null,
    })
  }
  items.sort((a, b) => (a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0))
  return { meetings: items, claimedEventIds }
}

async function fetchTaskLayer(
  ctx: WorkspaceContext,
  rangeStartIso: string,
  rangeEndIso: string,
): Promise<CalendarTaskItem[]> {
  // due_date is a plain date column — compare against the range's date part.
  const startDate = rangeStartIso.slice(0, 10)
  const endDate = rangeEndIso.slice(0, 10)

  const { data: tasks } = await ctx.supabase
    .from('tasks')
    .select('id, title, priority, status, due_date, project_id')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .not('due_date', 'is', null)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date', { ascending: true })
    .limit(500)
  if (!tasks || tasks.length === 0) return []

  const projectIds = [
    ...new Set(tasks.map((t) => t.project_id).filter((id): id is string => id !== null)),
  ]
  const projectById = new Map<string, string>()
  if (projectIds.length > 0) {
    const { data: projects } = await ctx.supabase
      .from('projects')
      .select('id, name')
      .eq('workspace_id', ctx.workspace.id)
      .in('id', projectIds)
    for (const project of projects ?? []) projectById.set(project.id, project.name)
  }

  return tasks.flatMap((task) => {
    if (task.due_date === null) return []
    if ((HIDDEN_TASK_STATUSES as readonly string[]).includes(task.status)) return []
    return [
      {
        layer: 'task' as const,
        id: task.id,
        title: task.title,
        dueDate: task.due_date,
        priority: task.priority,
        status: task.status,
        projectId: task.project_id,
        projectName: task.project_id ? (projectById.get(task.project_id) ?? null) : null,
      },
    ]
  })
}

/**
 * The three projected calendar layers for a range (06_Module_Breakdown.md §6):
 * the current user's native calendar events, workspace tasks by due date, and
 * workspace meetings timed through their linked calendar event. Events claimed
 * by a meeting render once, as the meeting — never twice.
 */
export async function getCalendarData(
  ctx: WorkspaceContext,
  rangeStartIso: string,
  rangeEndIso: string,
): Promise<CalendarData> {
  const [eventsRes, tasks, meetingLayer] = await Promise.all([
    ctx.supabase
      .from('calendar_events')
      .select('id, title, starts_at, ends_at, all_day, location, source')
      .eq('workspace_id', ctx.workspace.id)
      .eq('user_id', ctx.userId)
      .is('deleted_at', null)
      .gte('starts_at', rangeStartIso)
      .lte('starts_at', rangeEndIso)
      .order('starts_at', { ascending: true })
      .limit(500),
    fetchTaskLayer(ctx, rangeStartIso, rangeEndIso),
    fetchMeetingLayer(ctx, rangeStartIso, rangeEndIso),
  ])

  const events: CalendarEventItem[] = (eventsRes.data ?? [])
    .filter((event) => !meetingLayer.claimedEventIds.has(event.id))
    .map((event) => ({
      layer: 'event',
      id: event.id,
      title: event.title,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      allDay: event.all_day,
      location: event.location,
      source: event.source,
    }))

  return { events, tasks, meetings: meetingLayer.meetings }
}

/**
 * Next events + meetings for the "Upcoming" list (right rail and the
 * dashboard meetings card), merged and sorted by start time.
 */
export async function getUpcomingItems(
  ctx: WorkspaceContext,
  options?: { days?: number; limit?: number },
): Promise<UpcomingItem[]> {
  const nowIso = new Date().toISOString()
  const endIso = daysFromNow(options?.days ?? 14).toISOString()
  const { events, meetings } = await getCalendarData(ctx, nowIso, endIso)

  const items: UpcomingItem[] = [
    ...events.map((event) => ({
      id: event.id,
      layer: 'event' as const,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      allDay: event.allDay,
      location: event.location,
    })),
    ...meetings.map((meeting) => ({
      id: meeting.id,
      layer: 'meeting' as const,
      title: meeting.title,
      startsAt: meeting.startsAt,
      endsAt: meeting.endsAt,
      allDay: meeting.allDay,
      location: meeting.location,
    })),
  ].sort((a, b) => (a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0))

  return options?.limit !== undefined ? items.slice(0, options.limit) : items
}

/**
 * First-use detector: has this workspace ever had anything the calendar could
 * show? Distinguishes the first-use empty state from an empty period
 * (EmptyStates.md §2 — showing first-use when data merely falls outside the
 * visible range is a design defect).
 */
export async function hasAnyCalendarItems(ctx: WorkspaceContext): Promise<boolean> {
  const [eventsRes, tasksRes] = await Promise.all([
    ctx.supabase
      .from('calendar_events')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null),
    ctx.supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .not('due_date', 'is', null),
  ])
  return (eventsRes.count ?? 0) > 0 || (tasksRes.count ?? 0) > 0
}
