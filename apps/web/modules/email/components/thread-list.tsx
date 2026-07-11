'use client'

import { formatDistanceToNowStrict } from 'date-fns'
import { Lock, Mail } from 'lucide-react'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { cn } from '@aurexos/ui/lib/utils'
import {
  participantSummary,
  THREAD_STATUS_BADGE_VARIANT,
  THREAD_STATUS_LABELS,
  type ThreadRow,
} from '../types'

function LinkedChips({ thread }: { thread: ThreadRow }) {
  const chips = [
    thread.clientName && { key: 'client', label: thread.clientName },
    thread.contactName && { key: 'contact', label: thread.contactName },
    thread.dealName && { key: 'deal', label: thread.dealName },
    thread.projectName && { key: 'project', label: thread.projectName },
  ].filter((c): c is { key: string; label: string } => !!c)
  if (chips.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="outline" className="max-w-[160px] truncate font-normal">
          {chip.label}
        </Badge>
      ))}
    </div>
  )
}

export interface ThreadListProps {
  threads: ThreadRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  onLogEmail: () => void
}

export function ThreadList({ threads, selectedId, onSelect, onLogEmail }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title="Log your first client email"
        description="Emails you log build a per-client communication timeline that the whole workspace can search — once you share them."
        action={<Button onClick={onLogEmail}>Log an email</Button>}
      />
    )
  }

  return (
    <ul className="divide-y rounded-lg border" role="list">
      {threads.map((thread) => (
        <li key={thread.id}>
          <button
            type="button"
            onClick={() => onSelect(thread.id)}
            className={cn(
              'w-full px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'first:rounded-t-lg last:rounded-b-lg',
              selectedId === thread.id && 'bg-muted',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                {thread.visibility === 'private' ? (
                  <Lock
                    className="h-3 w-3 shrink-0 text-muted-foreground"
                    aria-label="Private thread"
                  />
                ) : null}
                <span className="truncate">{thread.subject}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {thread.lastMessageAt
                  ? formatDistanceToNowStrict(new Date(thread.lastMessageAt), { addSuffix: true })
                  : '—'}
              </span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <span className="truncate text-xs text-muted-foreground">
                {participantSummary(thread.participants)}
              </span>
              <Badge variant={THREAD_STATUS_BADGE_VARIANT[thread.status]}>
                {THREAD_STATUS_LABELS[thread.status]}
              </Badge>
            </div>
            {thread.snippet ? (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{thread.snippet}</p>
            ) : null}
            <LinkedChips thread={thread} />
          </button>
        </li>
      ))}
    </ul>
  )
}
