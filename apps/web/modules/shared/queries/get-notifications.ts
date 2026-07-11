import 'server-only'

import { formatDistanceToNowStrict } from 'date-fns'
import type { WorkspaceContext } from '@/lib/workspace-context'

export interface ShellNotification {
  id: string
  type: string
  title: string
  body: string | null
  /** Relative time, e.g. "2h". */
  timeAgo: string
  /** Absolute timestamp (ISO) for hover detail. */
  createdAt: string
  unread: boolean
}

export interface ShellNotifications {
  items: ShellNotification[]
  unreadCount: number
}

/**
 * Minimal shell read for the top-bar bell: the latest 20 notifications for
 * the current user plus the unread count (notifications table, migration
 * 0005). Mutations (mark read, preferences) arrive with the full
 * notification center — this powers the drawer only.
 */
export async function getShellNotifications(ctx: WorkspaceContext): Promise<ShellNotifications> {
  const [listRes, unreadRes] = await Promise.all([
    ctx.supabase
      .from('notifications')
      .select('id, type, title, body, read_at, created_at')
      .eq('workspace_id', ctx.workspace.id)
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(20),
    ctx.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspace.id)
      .eq('user_id', ctx.userId)
      .is('read_at', null),
  ])

  return {
    items: (listRes.data ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      timeAgo: formatDistanceToNowStrict(new Date(n.created_at)),
      createdAt: n.created_at,
      unread: n.read_at === null,
    })),
    unreadCount: unreadRes.count ?? 0,
  }
}
