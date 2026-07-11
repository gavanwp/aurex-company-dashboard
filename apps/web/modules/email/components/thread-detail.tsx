'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Link2, Lock, MailOpen, Users } from 'lucide-react'
import { toast } from 'sonner'
import { EMAIL_THREAD_STATUSES } from '@aurexos/core'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { Separator } from '@aurexos/ui/components/separator'
import { Textarea } from '@aurexos/ui/components/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@aurexos/ui/components/tooltip'
import { cn } from '@aurexos/ui/lib/utils'
import { saveDraft, shareThread, updateThreadStatus } from '../actions/email'
import {
  participantSummary,
  THREAD_STATUS_LABELS,
  type EmailLinkOptions,
  type MessageRow,
  type ThreadDetail as ThreadDetailData,
} from '../types'
import { LinkThreadDialog } from './link-thread-dialog'

function MessageBubble({ message }: { message: MessageRow }) {
  const outbound = message.direction === 'outbound'
  const timestamp = message.sentAt ?? message.createdAt
  return (
    <div className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg border px-3.5 py-2.5',
          outbound ? 'bg-primary/5' : 'bg-muted/60',
        )}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate font-medium text-foreground">{message.fromAddress}</span>
          <span className="shrink-0">{format(new Date(timestamp), 'd MMM yyyy, HH:mm')}</span>
          {message.isDraft ? <Badge variant="warning-soft">Draft</Badge> : null}
        </div>
        {message.toAddresses.length > 0 ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            To {message.toAddresses.join(', ')}
            {message.ccAddresses.length > 0 ? ` · Cc ${message.ccAddresses.join(', ')}` : ''}
          </p>
        ) : null}
        {/* v1 renders body_text only; sanitized HTML rendering arrives with sync. */}
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
          {message.bodyText ?? ''}
        </p>
      </div>
    </div>
  )
}

function ComposeBox({ threadId }: { threadId: string }) {
  const [body, setBody] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  async function onSaveDraft() {
    if (body.trim().length === 0) {
      toast.error('Write something first')
      return
    }
    setSaving(true)
    const result = await saveDraft({ threadId, bodyText: body })
    setSaving(false)
    if (result.ok) {
      toast.success('Draft saved')
      setBody('')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply… drafts are kept on the thread until sending is available."
      />
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onSaveDraft} disabled={saving}>
          Save draft
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Disabled buttons swallow pointer events; the wrapper keeps the tooltip alive. */}
              <span className="inline-flex" tabIndex={0}>
                <Button disabled>Send</Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Connect a mailbox to send — coming soon</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

export interface ThreadDetailProps {
  thread: ThreadDetailData | null
  options: EmailLinkOptions
}

export function ThreadDetail({ thread, options }: ThreadDetailProps) {
  const [linkOpen, setLinkOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  if (!thread) {
    return (
      <EmptyState
        icon={MailOpen}
        title="No thread selected"
        description="Pick a conversation on the left to read the timeline, save a draft, or link it to a client."
        className="min-h-[420px]"
      />
    )
  }

  async function onStatusChange(status: string) {
    if (!thread) return
    const parsed = EMAIL_THREAD_STATUSES.find((s) => s === status)
    if (!parsed || parsed === thread.status) return
    const result = await updateThreadStatus({ id: thread.id, status: parsed })
    if (result.ok) toast.success(`Thread marked ${THREAD_STATUS_LABELS[parsed].toLowerCase()}`)
    else toast.error(result.error)
  }

  async function onToggleShare() {
    if (!thread) return
    setBusy(true)
    const next = thread.visibility === 'private' ? 'workspace' : 'private'
    const result = await shareThread({ id: thread.id, visibility: next })
    setBusy(false)
    if (result.ok) {
      toast.success(
        next === 'workspace' ? 'Thread shared with the workspace' : 'Thread is private again',
      )
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-base font-semibold text-foreground">{thread.subject}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {participantSummary(thread.participants)}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {thread.visibility === 'private' ? (
              <Badge variant="secondary">
                <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
                Private
              </Badge>
            ) : (
              <Badge variant="accent-soft">
                <Users className="mr-1 h-3 w-3" aria-hidden="true" />
                Shared with workspace
              </Badge>
            )}
            {[thread.clientName, thread.contactName, thread.dealName, thread.projectName]
              .filter((name): name is string => !!name)
              .map((name) => (
                <Badge key={name} variant="outline" className="max-w-[160px] truncate font-normal">
                  {name}
                </Badge>
              ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select value={thread.status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_THREAD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {THREAD_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
            <Link2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Link
          </Button>
          {thread.isOwned ? (
            <Button variant="outline" size="sm" onClick={onToggleShare} disabled={busy}>
              {thread.visibility === 'private' ? 'Share to workspace' : 'Make private'}
            </Button>
          ) : null}
        </div>
      </div>

      <Separator />

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {thread.messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages on this thread yet.
          </p>
        ) : (
          thread.messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>

      <Separator />

      <ComposeBox threadId={thread.id} />

      <LinkThreadDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        thread={thread}
        options={options}
      />
    </div>
  )
}
