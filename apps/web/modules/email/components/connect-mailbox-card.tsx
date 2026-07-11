'use client'

import * as React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@aurexos/ui/components/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@aurexos/ui/components/tooltip'
import { disconnectMailbox, syncMailboxNow } from '../actions/email'
import type { MailboxConnectionRow } from '../types'

const CONNECT_HREF = '/api/integrations/gmail/connect'

const PRIVACY_COPY =
  'Connecting Gmail syncs client conversations into AurexOS automatically — threads link themselves to clients, deals and projects. Your mailbox stays private by default; you choose which threads the workspace sees.'

function CardShell({
  badge,
  title,
  children,
  actions,
  tone = 'default',
}: {
  badge?: React.ReactNode
  title: string
  children: React.ReactNode
  actions: React.ReactNode
  tone?: 'default' | 'danger'
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            {tone === 'danger' ? (
              <TriangleAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
            ) : (
              <Inbox className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              {badge}
            </div>
            <div className="max-w-xl text-sm text-muted-foreground">{children}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </CardContent>
    </Card>
  )
}

/** (a) No Google OAuth app configured for this deployment. */
function UnconfiguredCard() {
  return (
    <CardShell
      title="Connect your mailbox"
      badge={<Badge variant="info-soft">Coming soon</Badge>}
      actions={
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Disabled buttons swallow pointer events; the wrapper keeps the tooltip alive. */}
              <span className="inline-flex" tabIndex={0}>
                <Button disabled>Connect Gmail</Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Requires Google OAuth setup — see docs</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      }
    >
      {PRIVACY_COPY} Until then, log emails manually to build the client timeline.
    </CardShell>
  )
}

/** (b) Configured, no live connection — the real connect flow. */
function ConnectCard() {
  return (
    <CardShell
      title="Connect your mailbox"
      actions={
        <Button asChild>
          <a href={CONNECT_HREF}>Connect Gmail</a>
        </Button>
      }
    >
      {PRIVACY_COPY}
    </CardShell>
  )
}

/** (c) Connected (or in an error state needing reconnect). */
function ConnectedCard({ connection }: { connection: MailboxConnectionRow }) {
  const [isPending, startTransition] = React.useTransition()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const isError = connection.status === 'error'

  function handleSync() {
    startTransition(async () => {
      const result = await syncMailboxNow(connection.id)
      if (result.ok) {
        const { threadsImported, messagesImported } = result.data
        toast.success(
          messagesImported > 0
            ? `Synced ${messagesImported} message${messagesImported === 1 ? '' : 's'} across ${threadsImported} thread${threadsImported === 1 ? '' : 's'}.`
            : 'Already up to date.',
        )
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectMailbox(connection.id)
      if (result.ok) {
        toast.success('Mailbox disconnected. Synced threads stay on the timeline.')
        setConfirmOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  const lastSynced = connection.lastSyncedAt
    ? `Last synced ${formatDistanceToNow(new Date(connection.lastSyncedAt), { addSuffix: true })}`
    : 'Not synced yet'

  return (
    <>
      <CardShell
        title={connection.address}
        tone={isError ? 'danger' : 'default'}
        badge={
          isError ? (
            <Badge variant="destructive-soft">Reconnect needed</Badge>
          ) : (
            <Badge variant="success-soft">Connected</Badge>
          )
        }
        actions={
          <>
            {isError ? (
              <Button asChild variant="secondary">
                <a href={CONNECT_HREF}>Reconnect</a>
              </Button>
            ) : (
              <Button variant="secondary" onClick={handleSync} disabled={isPending}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Sync now
              </Button>
            )}
            <Button variant="ghost" onClick={() => setConfirmOpen(true)} disabled={isPending}>
              Disconnect
            </Button>
          </>
        }
      >
        {isError
          ? 'Gmail authorization expired — reconnect to resume syncing. Threads already synced stay on the timeline.'
          : `Gmail is syncing client conversations. ${lastSynced}.`}
      </CardShell>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect this mailbox?</DialogTitle>
            <DialogDescription>
              AurexOS stops syncing {connection.address} and forgets its credentials. Conversations
              already on the timeline stay. You can reconnect anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisconnect} disabled={isPending}>
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export interface ConnectMailboxCardProps {
  /** Whether the Google OAuth app is configured for this deployment. */
  configured: boolean
  /** The viewer's Gmail connection, if any. */
  connection: MailboxConnectionRow | null
}

/**
 * Three states: unconfigured (coming soon), configured-but-unconnected (live
 * connect), and connected (sync now / disconnect, with an error/reconnect
 * variant). Manual logging remains available in every state.
 */
export function ConnectMailboxCard({ configured, connection }: ConnectMailboxCardProps) {
  if (!configured) return <UnconfiguredCard />
  if (connection && connection.status !== 'disconnected') {
    return <ConnectedCard connection={connection} />
  }
  return <ConnectCard />
}
