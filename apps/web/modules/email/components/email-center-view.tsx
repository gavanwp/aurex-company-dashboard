'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { Tabs, TabsList, TabsTrigger } from '@aurexos/ui/components/tabs'
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
}

export function EmailCenterView({
  threads,
  selected,
  connections,
  options,
  statusTab,
}: EmailCenterViewProps) {
  const router = useRouter()
  const [logOpen, setLogOpen] = React.useState(false)

  const hasOauthMailbox = connections.some((c) => c.provider !== 'manual')

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

      {hasOauthMailbox ? null : <ConnectMailboxCard />}

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
