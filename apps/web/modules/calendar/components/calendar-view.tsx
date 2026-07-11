'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, isSameDay, isSameMonth, parseISO } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@aurexos/ui/components/button'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { Popover, PopoverContent, PopoverTrigger } from '@aurexos/ui/components/popover'
import { Tabs, TabsList, TabsTrigger } from '@aurexos/ui/components/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@aurexos/ui/components/tooltip'
import { cn } from '@aurexos/ui/lib/utils'
import { deleteEvent } from '../actions/calendar-actions'
import {
  calendarHref,
  dayKey,
  rangeDays,
  rangeFor,
  rangeLabel,
  shiftAnchor,
  type CalendarViewKind,
} from '../lib/range'
import type { CalendarData, CalendarEventItem, CalendarItem } from '../types'
import { EventChip } from './event-chip'
import { EventDialog } from './event-dialog'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Chips visible per month-grid cell before collapsing into "+N more". */
const MONTH_CELL_LIMIT = 3

/** Sort within a day: all-day/tasks first, then by start time. */
function itemSortKey(item: CalendarItem): string {
  if (item.layer === 'task') return `0-${item.title}`
  if (item.allDay) return `0-${item.title}`
  return `1-${item.startsAt}`
}

function itemDayKey(item: CalendarItem): string {
  if (item.layer === 'task') return item.dueDate
  return dayKey(new Date(item.startsAt))
}

/** True when the key event originated inside a field or dialog — don't hijack. */
function isTypingContext(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]') !== null
  )
}

export interface CalendarViewProps {
  view: CalendarViewKind
  /** Anchor date, yyyy-MM-dd. */
  anchor: string
  data: CalendarData
  /** Read-only roles never see create/edit/delete affordances. */
  readOnly?: boolean
  /** False only when the workspace has never had any calendar data (first-use). */
  hasAnyItems?: boolean
}

/**
 * Month grid + week list. Keyboard-first (11_Design_Principles.md §8):
 * `t` jumps to today, arrow keys move one period. Week view is deliberately a
 * stacked per-day list, not a time grid — honest v1.
 */
export function CalendarView({
  view,
  anchor,
  data,
  readOnly = false,
  hasAnyItems = true,
}: CalendarViewProps) {
  const router = useRouter()
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set())

  const anchorDate = useMemo(() => parseISO(anchor), [anchor])
  const range = useMemo(() => rangeFor(view, anchorDate), [view, anchorDate])
  const days = useMemo(() => rangeDays(range), [range])
  const today = new Date()

  const itemsByDay = useMemo(() => {
    const all: CalendarItem[] = [
      ...data.events.filter((event) => !removedIds.has(event.id)),
      ...data.tasks,
      ...data.meetings,
    ]
    const map = new Map<string, CalendarItem[]>()
    for (const item of all) {
      const key = itemDayKey(item)
      const bucket = map.get(key)
      if (bucket) bucket.push(item)
      else map.set(key, [item])
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => itemSortKey(a).localeCompare(itemSortKey(b)))
    }
    return map
  }, [data, removedIds])

  function navigate(nextView: CalendarViewKind, nextAnchor: Date): void {
    router.push(calendarHref(nextView, nextAnchor))
  }

  // Keyboard shortcuts: t → today, ← / → → previous / next period.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      if (isTypingContext(e.target)) return
      if (e.key === 't') {
        e.preventDefault()
        navigate(view, new Date())
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        navigate(view, shiftAnchor(view, anchorDate, -1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        navigate(view, shiftAnchor(view, anchorDate, 1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [view, anchor])

  // Optimistic delete: remove locally, roll back with a toast on failure.
  async function handleDelete(event: CalendarEventItem): Promise<void> {
    const snapshot = removedIds
    setRemovedIds(new Set([...snapshot, event.id]))
    const result = await deleteEvent(event.id)
    if (!result.ok) {
      setRemovedIds(snapshot)
      toast.error(result.error)
    } else {
      toast.success('Event deleted')
      router.refresh()
    }
  }

  const isEmpty = !hasAnyItems && itemsByDay.size === 0

  return (
    <div className="space-y-4">
      {/* Toolbar: period label, today/prev/next, view switcher. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-40 text-lg font-semibold tracking-tight text-foreground">
          {rangeLabel(view, anchorDate)}
        </h2>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => navigate(view, new Date())}
              >
                Today
              </Button>
            </TooltipTrigger>
            <TooltipContent>Press t</TooltipContent>
          </Tooltip>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={view === 'month' ? 'Previous month' : 'Previous week'}
              onClick={() => navigate(view, shiftAnchor(view, anchorDate, -1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={view === 'month' ? 'Next month' : 'Next week'}
              onClick={() => navigate(view, shiftAnchor(view, anchorDate, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
          <Tabs
            value={view}
            onValueChange={(value) => navigate(value === 'week' ? 'week' : 'month', anchorDate)}
          >
            <TabsList className="h-8">
              <TabsTrigger value="month" className="text-xs">
                Month
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs">
                Week
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={CalendarDays}
          title="Your calendar is empty"
          description="Create an event or connect Google Calendar (coming soon) — meetings, deadlines, and events all land here."
          action={
            readOnly ? undefined : <EventDialog defaultDate={format(anchorDate, 'yyyy-MM-dd')} />
          }
          className="min-h-[420px]"
        />
      ) : view === 'month' ? (
        renderMonthGrid()
      ) : (
        renderWeekList()
      )}
    </div>
  )

  function renderMonthGrid() {
    return (
      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const key = dayKey(day)
            const items = itemsByDay.get(key) ?? []
            const overflow = items.length - MONTH_CELL_LIMIT
            const inMonth = isSameMonth(day, anchorDate)
            const isToday = isSameDay(day, today)
            return (
              <div
                key={key}
                className={cn(
                  'min-h-28 border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0',
                  index >= days.length - 7 && 'border-b-0',
                  !inMonth && 'bg-muted/30',
                )}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
                      isToday
                        ? 'bg-primary font-semibold text-primary-foreground'
                        : inMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {items.slice(0, MONTH_CELL_LIMIT).map((item) => (
                    <EventChip
                      key={`${item.layer}-${item.id}`}
                      item={item}
                      readOnly={readOnly}
                      onDelete={handleDelete}
                    />
                  ))}
                  {overflow > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full rounded px-1.5 py-0.5 text-left text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          +{overflow} more
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-72 p-2">
                        <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                          {format(day, 'EEEE, MMM d')}
                        </p>
                        <div className="space-y-1">
                          {items.map((item) => (
                            <EventChip
                              key={`${item.layer}-${item.id}`}
                              item={item}
                              showTime
                              readOnly={readOnly}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderWeekList() {
    return (
      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = dayKey(day)
            const items = itemsByDay.get(key) ?? []
            const isToday = isSameDay(day, today)
            return (
              <div key={key} className="min-h-64 border-r last:border-r-0">
                <div
                  className={cn(
                    'flex items-center gap-1.5 border-b px-2 py-1.5',
                    isToday ? 'bg-primary/5' : 'bg-muted/50',
                  )}
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {format(day, 'EEE')}
                  </span>
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
                      isToday
                        ? 'bg-primary font-semibold text-primary-foreground'
                        : 'text-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1 p-1.5">
                  {items.map((item) => (
                    <EventChip
                      key={`${item.layer}-${item.id}`}
                      item={item}
                      showTime
                      readOnly={readOnly}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
}
