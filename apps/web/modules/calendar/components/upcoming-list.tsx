// Presentational "Upcoming" list — no hooks, safe to render from server
// components (calendar right rail) and inside the dashboard meetings card.

import { format, isToday, isTomorrow } from 'date-fns'
import { CalendarClock } from 'lucide-react'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { cn } from '@aurexos/ui/lib/utils'
import type { UpcomingItem } from '../types'
import { CALENDAR_LAYER_META } from './calendar-meta'

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'EEE, MMM d')
}

function timeText(item: UpcomingItem): string {
  if (item.allDay) return 'All day'
  const startText = format(new Date(item.startsAt), 'h:mm a')
  if (!item.endsAt) return startText
  return `${startText} – ${format(new Date(item.endsAt), 'h:mm a')}`
}

export interface UpcomingListProps {
  /** Pre-sorted by startsAt ascending (getUpcomingItems guarantees this). */
  items: UpcomingItem[]
  /** Compact rows without day grouping (dashboard card). */
  compact?: boolean
  className?: string
}

/** Next events and meetings grouped by day; each row carries its layer icon. */
export function UpcomingList({ items, compact = false, className }: UpcomingListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nothing scheduled"
        description="Events and meetings in the next two weeks will show up here."
        className={cn('min-h-[160px] p-6', className)}
      />
    )
  }

  if (compact) {
    return (
      <ul className={cn('divide-y divide-border/60', className)}>
        {items.map((item) => (
          <UpcomingRow key={`${item.layer}-${item.id}`} item={item} showDay />
        ))}
      </ul>
    )
  }

  const groups: { label: string; items: UpcomingItem[] }[] = []
  for (const item of items) {
    const label = dayLabel(new Date(item.startsAt))
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {groups.map((group) => (
        <section key={group.label}>
          <h4 className="mb-1 text-xs font-medium text-muted-foreground">{group.label}</h4>
          <ul className="divide-y divide-border/60">
            {group.items.map((item) => (
              <UpcomingRow key={`${item.layer}-${item.id}`} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function UpcomingRow({ item, showDay = false }: { item: UpcomingItem; showDay?: boolean }) {
  const meta = CALENDAR_LAYER_META[item.layer]
  const Icon = meta.icon
  const start = new Date(item.startsAt)
  return (
    <li className="flex items-start gap-3 py-2.5">
      <Icon className={cn('mt-0.5 size-4 shrink-0', meta.iconClassName)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          <span className="sr-only">{meta.label}: </span>
          {item.title}
        </p>
        <p className="truncate text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
          {showDay ? `${dayLabel(start)} · ` : ''}
          {timeText(item)}
          {item.location ? ` · ${item.location}` : ''}
        </p>
      </div>
    </li>
  )
}
