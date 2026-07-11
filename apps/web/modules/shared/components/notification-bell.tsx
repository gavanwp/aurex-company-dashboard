'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import {
  NotificationBadge,
  NotificationDayGroup,
  NotificationDrawer,
  NotificationEmptyState,
  NotificationRow,
  type NotificationFilter,
} from '@aurexos/ui/components/notification-drawer'
import type { ShellNotifications } from '../queries/get-notifications'

/**
 * Top-bar bell + notification drawer, fed by the minimal shell query
 * (latest 20 + unread count). Read-only for now: mark-read mutations land
 * with the full notification center.
 */
export function NotificationBell({ notifications }: { notifications: ShellNotifications }) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<NotificationFilter>('all')

  const visible = notifications.items.filter((item) => {
    if (filter === 'unread') return item.unread
    if (filter === 'mentions') return item.type.includes('mention')
    if (filter === 'approvals') return item.type.includes('approval')
    return true
  })

  return (
    <NotificationDrawer
      open={open}
      onOpenChange={setOpen}
      filter={filter}
      onFilterChange={setFilter}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            notifications.unreadCount > 0
              ? `Notifications, ${notifications.unreadCount} unread`
              : 'Notifications'
          }
        >
          <Bell className="size-4" aria-hidden="true" />
          <NotificationBadge
            count={notifications.unreadCount}
            className="absolute -right-0.5 -top-0.5"
          />
        </Button>
      }
    >
      {visible.length === 0 ? (
        <NotificationEmptyState />
      ) : (
        <NotificationDayGroup label="Latest">
          {visible.map((item) => (
            <NotificationRow
              key={item.id}
              time={item.timeAgo}
              timeTitle={new Date(item.createdAt).toLocaleString()}
              unread={item.unread}
            >
              <span className="font-medium">{item.title}</span>
              {item.body ? <span className="block text-muted-foreground">{item.body}</span> : null}
            </NotificationRow>
          ))}
        </NotificationDayGroup>
      )}
    </NotificationDrawer>
  )
}
