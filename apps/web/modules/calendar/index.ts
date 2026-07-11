// Public surface of modules/calendar (13_Folder_Structure.md §3) — the ONLY
// file other modules and routes may import from this module.

export { CalendarView } from './components/calendar-view'
export type { CalendarViewProps } from './components/calendar-view'
export { EventDialog } from './components/event-dialog'
export type { EventDialogProps } from './components/event-dialog'
export { UpcomingList } from './components/upcoming-list'
export type { UpcomingListProps } from './components/upcoming-list'
export { getCalendarData, getUpcomingItems, hasAnyCalendarItems } from './queries/get-calendar'
export { calendarHref, parseAnchor, parseView, rangeFor, type CalendarViewKind } from './lib/range'
export type {
  CalendarData,
  CalendarEventItem,
  CalendarItem,
  CalendarLayer,
  CalendarMeetingItem,
  CalendarTaskItem,
  UpcomingItem,
} from './types'
