'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowUpRight, Clock, MapPin, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import { Popover, PopoverContent, PopoverTrigger } from '@aurexos/ui/components/popover'
import { cn } from '@aurexos/ui/lib/utils'
import type { CalendarEventItem, CalendarItem } from '../types'
import { CALENDAR_LAYER_META } from './calendar-meta'
import { EventDialog } from './event-dialog'

/** "9:00 AM" start (chips) — all-day items show no time. */
function chipTime(item: CalendarItem): string | null {
  if (item.layer === 'task') return null
  if (item.allDay) return null
  return format(new Date(item.startsAt), 'h:mm a')
}

/** Full time sentence for the detail popover. */
function detailTime(item: CalendarItem): string {
  if (item.layer === 'task') {
    return `Due ${format(new Date(`${item.dueDate}T00:00:00`), 'EEE, MMM d')}`
  }
  const start = new Date(item.startsAt)
  const day = format(start, 'EEE, MMM d')
  if (item.allDay) return `${day} · All day`
  const startText = format(start, 'h:mm a')
  if (!item.endsAt) return `${day} · ${startText}`
  return `${day} · ${startText} – ${format(new Date(item.endsAt), 'h:mm a')}`
}

export interface EventChipProps {
  item: CalendarItem
  /** Show the start time inside the chip (week view rows). */
  showTime?: boolean
  /** Hide edit/delete for read-only roles. */
  readOnly?: boolean
  /** Optimistic delete handler supplied by the view (native events only). */
  onDelete?: (event: CalendarEventItem) => void
  className?: string
}

/**
 * One calendar item as a colored chip; clicking opens the detail popover with
 * layer, time, source-entity link, and (for native events) edit/delete.
 * Layer is always icon + label, never color alone.
 */
export function EventChip({
  item,
  showTime = false,
  readOnly = false,
  onDelete,
  className,
}: EventChipProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const meta = CALENDAR_LAYER_META[item.layer]
  const Icon = meta.icon
  const time = chipTime(item)
  const done = item.layer === 'task' && item.status === 'done'
  const editable = !readOnly && item.layer === 'event' && item.source === 'native'

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full min-w-0 items-center gap-1 rounded px-1.5 py-0.5 text-left text-xs font-medium',
              'transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              meta.chipClassName,
              className,
            )}
          >
            <Icon className="size-3 shrink-0" aria-hidden="true" />
            <span className="sr-only">{meta.label}: </span>
            {showTime && time && <span className="shrink-0 tabular-nums opacity-80">{time}</span>}
            <span className={cn('truncate', done && 'line-through opacity-70')}>{item.title}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-3">
          <div className="space-y-2">
            <div
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
                meta.chipClassName,
              )}
            >
              <Icon className="size-3" aria-hidden="true" />
              {meta.label}
            </div>
            <p className={cn('text-sm font-semibold text-foreground', done && 'line-through')}>
              {item.title}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
              <Clock className="size-3.5 shrink-0" aria-hidden="true" />
              {detailTime(item)}
            </p>
            {item.layer !== 'task' && item.location && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.location}</span>
              </p>
            )}
            {item.layer === 'task' && item.projectName && (
              <p className="text-xs text-muted-foreground">Project: {item.projectName}</p>
            )}
            {item.layer === 'meeting' && item.projectName && (
              <p className="text-xs text-muted-foreground">Project: {item.projectName}</p>
            )}

            {/* Source-entity links for projected layers. */}
            {item.layer === 'task' && (
              <Link
                href="/tasks"
                className="inline-flex min-h-8 items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open in tasks
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}
            {item.layer === 'meeting' && item.projectId && (
              <Link
                href={`/projects/${item.projectId}`}
                className="inline-flex min-h-8 items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open project
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}

            {editable && (
              <div className="flex items-center gap-2 border-t pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setPopoverOpen(false)
                    setEditOpen(true)
                  }}
                >
                  <Pencil />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    setPopoverOpen(false)
                    if (item.layer === 'event') onDelete?.(item)
                  }}
                >
                  <Trash2 />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {editable && item.layer === 'event' && (
        <EventDialog event={item} open={editOpen} onOpenChange={setEditOpen} />
      )}
    </>
  )
}
