'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarClock, ListChecks, Plus, ScrollText, Users } from 'lucide-react'
import { Avatar, AvatarFallback } from '@aurexos/ui/components/avatar'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { Tabs, TabsList, TabsTrigger } from '@aurexos/ui/components/tabs'
import { cn } from '@aurexos/ui/lib/utils'
import { formatMeetingTime, initials } from '../lib/format'
import {
  isMeetingTypeTab,
  MEETING_STATUS_META,
  MEETING_TYPE_META,
  MEETING_TYPE_TABS,
  type MeetingListRow,
  type MeetingTypeTab,
} from '../types'

const TAB_LABELS: Record<MeetingTypeTab, string> = {
  all: 'All',
  internal: 'Internal',
  client: 'Client',
  sales: 'Sales',
  standup: 'Standup',
}

function AttendeeStack({ attendees }: { attendees: MeetingListRow['attendees'] }) {
  if (attendees.length === 0) return null
  const shown = attendees.slice(0, 4)
  const extra = attendees.length - shown.length
  return (
    <div className="flex items-center">
      <div className="flex -space-x-1.5">
        {shown.map((a, i) => (
          <Avatar
            key={`${a.id ?? a.email ?? a.name ?? 'a'}-${i}`}
            className="size-6 border border-background"
          >
            <AvatarFallback className="text-[10px]">{initials(a.name, a.email)}</AvatarFallback>
          </Avatar>
        ))}
      </div>
      {extra > 0 ? <span className="ml-1.5 text-xs text-muted-foreground">+{extra}</span> : null}
    </div>
  )
}

function MeetingCard({ meeting }: { meeting: MeetingListRow }) {
  const typeMeta = MEETING_TYPE_META[meeting.type]
  const statusMeta = MEETING_STATUS_META[meeting.status]
  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="block rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium text-foreground">{meeting.title}</h3>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="size-3.5 shrink-0" />
            {formatMeetingTime(meeting.startsAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
        {meeting.clientName ? (
          <Badge variant="outline" className="max-w-[12rem] truncate">
            {meeting.clientName}
          </Badge>
        ) : null}
        {meeting.projectName ? (
          <Badge variant="outline" className="max-w-[12rem] truncate">
            {meeting.projectName}
          </Badge>
        ) : null}
        {meeting.dealName ? (
          <Badge variant="outline" className="max-w-[12rem] truncate">
            {meeting.dealName}
          </Badge>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {meeting.agendaCount > 0 ? (
            <span className="flex items-center gap-1">
              <ScrollText className="size-3.5" />
              {meeting.agendaCount} agenda
            </span>
          ) : null}
          {meeting.decisionCount > 0 ? (
            <span className="flex items-center gap-1">
              <ListChecks className="size-3.5" />
              {meeting.decisionCount} decisions
            </span>
          ) : null}
          {meeting.actionItemCount > 0 ? (
            <span className="flex items-center gap-1">
              <ListChecks className="size-3.5" />
              {meeting.actionItemCount} actions
            </span>
          ) : null}
        </div>
        <AttendeeStack attendees={meeting.attendees} />
      </div>
    </Link>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  )
}

export interface MeetingsListProps {
  meetings: MeetingListRow[]
  typeTab: MeetingTypeTab
  canManage: boolean
}

export function MeetingsList({ meetings, typeTab, canManage }: MeetingsListProps) {
  const router = useRouter()
  const nowIso = React.useMemo(() => new Date().toISOString(), [])

  const { upcoming, past } = React.useMemo(() => {
    const up: MeetingListRow[] = []
    const pa: MeetingListRow[] = []
    for (const m of meetings) {
      const isPast =
        m.status === 'completed' ||
        m.status === 'cancelled' ||
        (m.startsAt !== null && m.startsAt < nowIso)
      if (isPast) pa.push(m)
      else up.push(m)
    }
    // Upcoming: soonest first (untimed drafts after timed). Past: most recent first.
    up.sort((a, b) => {
      if (a.startsAt === null) return b.startsAt === null ? 0 : 1
      if (b.startsAt === null) return -1
      return a.startsAt < b.startsAt ? -1 : 1
    })
    pa.sort((a, b) => {
      const sa = a.startsAt ?? a.createdAt
      const sb = b.startsAt ?? b.createdAt
      return sa < sb ? 1 : -1
    })
    return { upcoming: up, past: pa }
  }, [meetings, nowIso])

  function navigate(tab: MeetingTypeTab) {
    const params = new URLSearchParams()
    if (tab !== 'all') params.set('type', tab)
    const qs = params.toString()
    router.replace(qs ? `/meetings?${qs}` : '/meetings', { scroll: false })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meetings"
        description="Every conversation, with the full relationship in the room."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/meetings/decisions">
                <ScrollText className="mr-1.5 size-4" />
                Decision log
              </Link>
            </Button>
            {canManage ? (
              <Button asChild>
                <Link href="/meetings/new">
                  <Plus className="mr-1.5 size-4" />
                  New meeting
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <Tabs value={typeTab} onValueChange={(v) => navigate(isMeetingTypeTab(v) ? v : 'all')}>
        <TabsList>
          {MEETING_TYPE_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {TAB_LABELS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {meetings.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={typeTab === 'all' ? 'No meetings yet' : 'No meetings of this type'}
          description={
            typeTab === 'all'
              ? 'Schedule your first meeting and walk in already knowing everything about the relationship.'
              : 'Try a different type, or schedule a new meeting.'
          }
          action={
            canManage && typeTab === 'all' ? (
              <Button asChild size="sm">
                <Link href="/meetings/new">
                  <Plus className="mr-1.5 size-4" />
                  New meeting
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className={cn('space-y-8')}>
          {upcoming.length > 0 ? (
            <Section title="Upcoming" count={upcoming.length}>
              {upcoming.map((m) => (
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </Section>
          ) : null}
          {past.length > 0 ? (
            <Section title="Past" count={past.length}>
              {past.map((m) => (
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </Section>
          ) : null}
          {upcoming.length === 0 && past.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nothing here"
              description="No meetings match this view."
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
