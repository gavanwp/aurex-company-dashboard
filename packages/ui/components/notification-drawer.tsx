'use client'

import * as React from 'react'
import { Inbox, Mail, MailOpen } from 'lucide-react'

import { cn } from '../lib/utils'
import { Button } from './button'
import { EmptyState } from './empty-state'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'
import { Tabs, TabsList, TabsTrigger } from './tabs'

/**
 * Notification center — docs/design/Notifications.md §3 (inbox), §5
 * (badges & indicators).
 *
 * The in-app inbox: filter tabs (All · Unread · Mentions · Approvals —
 * exactly four), day-grouped rows, per-row hover actions (mark read/
 * unread), persistent inline actions for safe atomic operations, and the
 * 99+-capped unread badge. Seen ≠ read: opening the panel clears the
 * sidebar count; the unread dot tracks read.
 *
 * Iron law: data arrives via props and callbacks — packages/ui never
 * imports db or fetches. The engine (coalescing, priority, channels) lives
 * in NotificationsArchitecture.md; this is its UI face.
 */

/* -------------------------------------------------------------------------
 * NotificationBadge — unseen count, capped at 99+
 * ---------------------------------------------------------------------- */

export interface NotificationBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** Unseen count. Renders nothing at 0 — no ambient glowing dots (§5). */
  count: number
}

/**
 * Numeric unseen-count badge for the sidebar bell, capped at 99+
 * (Notifications.md §5). Accessible name reads the real quantity
 * ("Notifications, 12 unseen"; the cap reads "more than 99").
 */
const NotificationBadge = React.forwardRef<
  HTMLSpanElement,
  NotificationBadgeProps
>(({ className, count, ...props }, ref) => {
  if (count <= 0) return null
  const display = count > 99 ? '99+' : String(count)
  const spoken =
    count > 99 ? 'more than 99 unseen' : `${count} unseen`

  return (
    <span
      ref={ref}
      aria-label={`Notifications, ${spoken}`}
      className={cn(
        'inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-primary-foreground',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="text-xs font-medium leading-none [font-variant-numeric:tabular-nums]"
      >
        {display}
      </span>
    </span>
  )
})
NotificationBadge.displayName = 'NotificationBadge'

/* -------------------------------------------------------------------------
 * NotificationDrawer — the panel, built on Sheet
 * ---------------------------------------------------------------------- */

export type NotificationFilter = 'all' | 'unread' | 'mentions' | 'approvals'

const filterTabs: ReadonlyArray<{ value: NotificationFilter; label: string }> =
  [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'mentions', label: 'Mentions' },
    { value: 'approvals', label: 'Approvals' },
  ]

export interface NotificationDrawerProps {
  open?: boolean
  /** Also the moment to mark items *seen* (clears the bell count — §3.3). */
  onOpenChange?: (open: boolean) => void
  /** The sidebar bell (or any trigger). Optional when controlled. */
  trigger?: React.ReactNode
  /** Active filter tab. Exactly four exist (§3.1). */
  filter: NotificationFilter
  onFilterChange: (filter: NotificationFilter) => void
  /** Global "Mark all read" — never confirmed; it is reversible (§3.4). */
  onMarkAllRead?: () => void
  /** Day groups (NotificationDayGroup) or an empty state. */
  children: React.ReactNode
}

/**
 * Right-anchored notification panel (360px context-panel width) with the
 * four filter tabs. Heavy triage belongs to the full-page /inbox view;
 * this is the bell's panel.
 */
const NotificationDrawer = ({
  open,
  onOpenChange,
  trigger,
  filter,
  onFilterChange,
  onMarkAllRead,
  children,
}: NotificationDrawerProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
    <SheetContent
      side="right"
      className="flex w-full flex-col gap-0 p-0 sm:max-w-sm"
    >
      <SheetHeader className="shrink-0 border-b px-4 pb-3 pt-4 text-left sm:text-left">
        <div className="flex items-center justify-between gap-2 pr-8">
          <SheetTitle className="text-sm font-semibold">
            Notifications
          </SheetTitle>
          {onMarkAllRead ? (
            <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
              Mark all read
            </Button>
          ) : null}
        </div>
        <SheetDescription className="sr-only">
          Your notifications, grouped by day. Filter by unread, mentions, or
          approvals.
        </SheetDescription>
        <Tabs
          value={filter}
          onValueChange={(value) => onFilterChange(value as NotificationFilter)}
        >
          <TabsList className="h-8 w-full">
            {filterTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 px-2 text-xs"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </SheetContent>
  </Sheet>
)
NotificationDrawer.displayName = 'NotificationDrawer'

/* -------------------------------------------------------------------------
 * NotificationDayGroup — "Today" / "Yesterday" / date groups
 * ---------------------------------------------------------------------- */

export interface NotificationDayGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Group label: "Today", "Yesterday", then dates (§3.1). */
  label: string
  /** Per-group mark-all-read (§3.4) — reversible, never confirmed. */
  onMarkAllRead?: () => void
}

const NotificationDayGroup = React.forwardRef<
  HTMLDivElement,
  NotificationDayGroupProps
>(({ className, label, onMarkAllRead, children, ...props }, ref) => (
  <div ref={ref} className={cn('py-2', className)} {...props}>
    <div className="group/day flex items-center justify-between gap-2 px-4 py-1">
      <h3 className="text-xs font-medium text-muted-foreground">{label}</h3>
      {onMarkAllRead ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs opacity-0 focus-visible:opacity-100 group-hover/day:opacity-100"
          onClick={onMarkAllRead}
        >
          Mark all read
        </Button>
      ) : null}
    </div>
    <ul className="flex flex-col">{children}</ul>
  </div>
))
NotificationDayGroup.displayName = 'NotificationDayGroup'

/* -------------------------------------------------------------------------
 * NotificationRow — one rendered sentence
 * ---------------------------------------------------------------------- */

export interface NotificationRowProps
  extends Omit<React.LiHTMLAttributes<HTMLLIElement>, 'onClick'> {
  /** 16px module/source icon slot, tinted text-muted (§3.1). */
  sourceIcon?: React.ReactNode
  /** 20px actor avatar slot; pass an ✦ AurexMark for AI actors. */
  avatar?: React.ReactNode
  /**
   * The rendered sentence — actor in body-strong, entity names as real
   * links ("Priya completed 6 tasks in Meridian"). Passed as children.
   */
  children: React.ReactNode
  /** Relative time, e.g. "2h". */
  time: string
  /** Absolute datetime for hover/title and assistive tech. */
  timeTitle?: string
  /** Read-state: unread rows show the 6px accent dot (§3.3). */
  unread?: boolean
  /** Deep link to the exact entity + mark read (§3.2). */
  onOpen?: () => void
  /** Hover-revealed action (icon button with tooltip upstream). */
  onMarkRead?: () => void
  /** Hover-revealed action. */
  onMarkUnread?: () => void
  /**
   * Persistent inline action slot for safe, atomic actions — "Approve" on
   * expense approvals, "Acknowledge" on incidents (§3.2). An inline
   * approval is a real approval: full action spine, fully audited.
   */
  inlineAction?: React.ReactNode
}

/**
 * Inbox row (Notifications.md §3.1–3.2): source icon + actor avatar +
 * sentence + relative time + unread dot; mark read/unread revealed on
 * hover/focus. Clicking the row deep-links and marks read.
 */
const NotificationRow = React.forwardRef<HTMLLIElement, NotificationRowProps>(
  (
    {
      className,
      sourceIcon,
      avatar,
      children,
      time,
      timeTitle,
      unread = false,
      onOpen,
      onMarkRead,
      onMarkUnread,
      inlineAction,
      ...props
    },
    ref,
  ) => (
    <li
      ref={ref}
      className={cn(
        'group/row relative flex items-start gap-2 px-4 py-2.5 transition-colors hover:bg-muted/50 focus-within:bg-muted/50',
        className,
      )}
      {...props}
    >
      {sourceIcon ? (
        <span
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:h-4 [&_svg]:w-4"
          aria-hidden="true"
        >
          {sourceIcon}
        </span>
      ) : null}
      {avatar ? <span className="mt-0.5 shrink-0">{avatar}</span> : null}
      <div className="min-w-0 flex-1">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="block w-full rounded-sm text-left text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {children}
          </button>
        ) : (
          <div className="text-sm text-foreground">{children}</div>
        )}
        {inlineAction ? (
          <div className="mt-1.5 flex items-center gap-2">{inlineAction}</div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Hover-revealed mark read/unread (also focus-visible) */}
        {unread && onMarkRead ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100"
            aria-label="Mark as read"
            onClick={onMarkRead}
          >
            <MailOpen aria-hidden="true" />
          </Button>
        ) : null}
        {!unread && onMarkUnread ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100"
            aria-label="Mark as unread"
            onClick={onMarkUnread}
          >
            <Mail aria-hidden="true" />
          </Button>
        ) : null}
        <span
          className="text-xs text-muted-foreground"
          title={timeTitle}
        >
          {time}
        </span>
        {unread ? (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
            role="img"
            aria-label="Unread"
          />
        ) : (
          <span className="h-1.5 w-1.5 shrink-0" aria-hidden="true" />
        )}
      </div>
    </li>
  ),
)
NotificationRow.displayName = 'NotificationRow'

/* -------------------------------------------------------------------------
 * NotificationEmptyState — inbox zero
 * ---------------------------------------------------------------------- */

export interface NotificationEmptyStateProps {
  /** @default "You're all caught up" */
  title?: string
  /** @default 'New mentions, assignments, and approvals will appear here.' */
  description?: string
  className?: string
}

/** Inbox-zero empty state composed on the EmptyState primitive. */
const NotificationEmptyState = ({
  title = "You're all caught up",
  description = 'New mentions, assignments, and approvals will appear here.',
  className,
}: NotificationEmptyStateProps) => (
  <EmptyState
    icon={Inbox}
    title={title}
    description={description}
    className={cn('m-4 min-h-[200px]', className)}
  />
)
NotificationEmptyState.displayName = 'NotificationEmptyState'

export {
  NotificationBadge,
  NotificationDrawer,
  NotificationDayGroup,
  NotificationRow,
  NotificationEmptyState,
}
