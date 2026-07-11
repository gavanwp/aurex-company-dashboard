// Plain data shapes shared between server queries and client components.
// No 'server-only' here — client components import these types.

import type { CalendarEventSource, MeetingType, TaskPriority, TaskStatus } from '@aurexos/core'

/**
 * The three projected layers of the calendar (06_Module_Breakdown.md §6):
 * native calendar events, task due dates, and meetings (via their linked
 * calendar event — meetings carry no time fields of their own in 0010).
 */
export type CalendarLayer = 'event' | 'task' | 'meeting'

/** A native (or synced/system) calendar_events row owned by the current user. */
export interface CalendarEventItem {
  layer: 'event'
  id: string
  title: string
  /** ISO timestamp. */
  startsAt: string
  endsAt: string | null
  allDay: boolean
  location: string | null
  source: CalendarEventSource
}

/** A task projected onto the calendar by its due date. */
export interface CalendarTaskItem {
  layer: 'task'
  id: string
  title: string
  /** ISO date (yyyy-MM-dd). */
  dueDate: string
  priority: TaskPriority
  status: TaskStatus
  projectId: string | null
  projectName: string | null
}

/** A meeting, timed through its linked calendar event. */
export interface CalendarMeetingItem {
  layer: 'meeting'
  id: string
  title: string
  /** ISO timestamp (from the linked calendar event). */
  startsAt: string
  endsAt: string | null
  allDay: boolean
  location: string | null
  meetingType: MeetingType
  projectId: string | null
  projectName: string | null
}

export type CalendarItem = CalendarEventItem | CalendarTaskItem | CalendarMeetingItem

/** The three layers for a fetched range, each independently renderable. */
export interface CalendarData {
  events: CalendarEventItem[]
  tasks: CalendarTaskItem[]
  meetings: CalendarMeetingItem[]
}

/** Flattened row for the "Upcoming" list (calendar right rail + dashboard card). */
export interface UpcomingItem {
  id: string
  layer: 'event' | 'meeting'
  title: string
  /** ISO timestamp. */
  startsAt: string
  endsAt: string | null
  allDay: boolean
  location: string | null
}
