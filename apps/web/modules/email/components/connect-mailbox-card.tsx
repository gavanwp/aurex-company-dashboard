'use client'

import { Inbox } from 'lucide-react'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@aurexos/ui/components/tooltip'

/*
 * Gmail connect-flow seam (built with the sync worker, not in v1):
 *
 * 1. OAuth consent — "Connect Gmail" starts the Google OAuth code flow with
 *    minimum scopes (gmail.readonly + gmail.send), per register S4.
 * 2. Callback — a server-only route handler exchanges the code for tokens;
 *    tokens never touch the client or logs.
 * 3. Token encrypt — the token bundle is app-layer encrypted with the key from
 *    the platform secret store (SecurityArchitecture.md §4.3) before insert.
 * 4. mailbox_connections row — provider 'gmail', status 'connected',
 *    sharing_policy 'private' (privacy default), oauth_token_ciphertext set.
 * 5. Sync worker job — a backfill + incremental sync job is enqueued (jobs
 *    table, 0011); it maintains sync_cursor / last_synced_at and ingests
 *    threads/messages with sanitized bodies.
 *
 * Until the founder-side Google Cloud project exists, the button stays
 * disabled and manual logging is the ingestion path.
 */
export function ConnectMailboxCard() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Connect your mailbox</h3>
              <Badge variant="info-soft">Coming soon</Badge>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">
              Connecting Gmail syncs client conversations into AurexOS automatically — threads link
              themselves to clients, deals and projects. Your mailbox stays private by default; you
              choose which threads the workspace sees. Until then, log emails manually to build the
              client timeline.
            </p>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Disabled buttons swallow pointer events; the wrapper keeps the tooltip alive. */}
              <span className="inline-flex shrink-0" tabIndex={0}>
                <Button disabled>Connect Gmail</Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Requires Google OAuth setup — see docs</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
