// Pure date-range helpers for the calendar views. Safe to import from both
// server (page range computation) and client (grid rendering) — no I/O here.

import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

export type CalendarViewKind = 'month' | 'week'

/** Weeks start on Monday everywhere in the calendar (business calendar). */
export const WEEK_STARTS_ON = 1 as const

export interface CalendarRange {
  /** Inclusive start (00:00:00.000 local). */
  start: Date
  /** Inclusive end (23:59:59.999 local). */
  end: Date
}

/** The visible month grid: full weeks covering the anchor's calendar month. */
export function monthGridRange(anchor: Date): CalendarRange {
  return {
    start: startOfWeek(startOfMonth(anchor), { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(endOfMonth(anchor), { weekStartsOn: WEEK_STARTS_ON }),
  }
}

/** The week (Mon–Sun) containing the anchor. */
export function weekRange(anchor: Date): CalendarRange {
  return {
    start: startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON }),
  }
}

export function rangeFor(view: CalendarViewKind, anchor: Date): CalendarRange {
  return view === 'month' ? monthGridRange(anchor) : weekRange(anchor)
}

/** Move the anchor one period forward (+1) or back (-1) for the given view. */
export function shiftAnchor(view: CalendarViewKind, anchor: Date, direction: 1 | -1): Date {
  return view === 'month' ? addMonths(anchor, direction) : addWeeks(anchor, direction)
}

/** Every day of a range, oldest first — the cells of the grid. */
export function rangeDays(range: CalendarRange): Date[] {
  return eachDayOfInterval({ start: range.start, end: range.end })
}

/** Local-date bucket key (yyyy-MM-dd) for grouping items into day cells. */
export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Header label: "July 2026" (month) or "Jul 6 – 12, 2026" (week). */
export function rangeLabel(view: CalendarViewKind, anchor: Date): string {
  if (view === 'month') return format(anchor, 'MMMM yyyy')
  const { start, end } = weekRange(anchor)
  const sameMonth = start.getMonth() === end.getMonth()
  const startText = format(start, 'MMM d')
  const endText = sameMonth ? format(end, 'd') : format(end, 'MMM d')
  return `${startText} – ${endText}, ${format(end, 'yyyy')}`
}

/** Parse `?view=` — anything that isn't "week" is the month default. */
export function parseView(raw: string | undefined): CalendarViewKind {
  return raw === 'week' ? 'week' : 'month'
}

/** Parse `?date=yyyy-MM-dd` defensively — invalid or missing means today. */
export function parseAnchor(raw: string | undefined): Date {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = parseISO(raw)
    if (isValid(parsed)) return parsed
  }
  return new Date()
}

/** Canonical URL for a calendar state — navigation state survives refresh. */
export function calendarHref(view: CalendarViewKind, anchor: Date): string {
  return `/calendar?view=${view}&date=${format(anchor, 'yyyy-MM-dd')}`
}

/** Tomorrow-ish helper for upcoming windows. */
export function daysFromNow(days: number): Date {
  return addDays(new Date(), days)
}
