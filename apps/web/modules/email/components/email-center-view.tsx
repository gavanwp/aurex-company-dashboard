'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { Tabs, TabsList, TabsTrigger } from '@aurexos/ui/components/tabs'
import { cn } from '@aurexos/ui/lib/utils'
import {
  isEmailStatusTab,
  type EmailLinkOptions,
  type EmailStatusTab,
  type MailboxConnectionRow,
  type ThreadDetail as ThreadDetailData,
  type ThreadRow,
} from '../types'
import { ConnectMailboxCard } from './connect-mailbox-card'
import { LogEmailDialog } from './log-email-dialog'
import { ThreadDetail } from './thread-detail'
import { ThreadList } from './thread-list'

export interface EmailCenterViewProps {
  threads: ThreadRow[]
  selected: ThreadDetailData | null
  connections: MailboxConnectionRow[]
  options: EmailLinkOptions
  statusTab: EmailStatusTab
  /** Whether the Google OAuth app is configured for this deployment. */
  gmailConfigured: boolean
  /** Post-redirect notice from the OAuth callback (success or human error). */
  notice: { tone: 'success' | 'error'; message: string } | null
}

export function EmailCenterView({
  threads,
  selected,
  connections,
  options,
  statusTab,
  gmailConfigured,
  notice,
}: EmailCenterViewProps) {
  const router = useRouter()
  const [logOpen, setLogOpen] = React.useState(false)

  const gmailConnection = connections.find((c) => c.provider === 'gmail') ?? null

  function navigate(tab: EmailStatusTab, threadId: string | null) {
    const params = new URLSearchParams()
    if (tab !== 'all') params.set('status', tab)
    if (threadId) params.set('thread', threadId)
    const qs = params.toString()
    router.replace(qs ? `/email?${qs}` : '/email', { scroll: false })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email"
        description="Client conversations on one timeline — logged today, synced tomorrow."
        actions={
          <Button onClick={() => setLogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Log email
          </Button>
        }
      />

      {notice ? (
        <div
          role="status"
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            notice.tone === 'success'
              ? 'border-success/30 bg-success/10 text-foreground'
              : 'border-destructive/30 bg-destructive/10 text-foreground',
          )}
        >
          {notice.message}
        </div>
      ) : null}

      <ConnectMailboxCard configured={gmailConfigured} connection={gmailConnection} />

      <Tabs
        value={statusTab}
        onValueChange={(value) =>
          navigate(isEmailStatusTab(value) ? value : 'all', selected?.id ?? null)
        }
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="waiting">Waiting</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ThreadList
          threads={threads}
          selectedId={selected?.id ?? null}
          onSelect={(id) => navigate(statusTab, id)}
          onLogEmail={() => setLogOpen(true)}
        />
        <Card>
          <CardContent className="p-5">
            <ThreadDetail thread={selected} options={options} />
          </CardContent>
        </Card>
      </div>

      {/* Header CTA always starts a new thread; logging into an existing one
          happens from the thread you are viewing (future refinement). */}
      <LogEmailDialog open={logOpen} onOpenChange={setLogOpen} options={options} threadId={null} />
    </div>
  )
}
