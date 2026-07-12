'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowUpRight,
  Ban,
  Building2,
  CalendarClock,
  Check,
  CircleDot,
  Clock,
  ListChecks,
  ListTodo,
  MapPin,
  Pencil,
  Play,
  Plus,
  ScrollText,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@aurexos/ui/components/avatar'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { Input } from '@aurexos/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { Separator } from '@aurexos/ui/components/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@aurexos/ui/components/tabs'
import { Textarea } from '@aurexos/ui/components/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@aurexos/ui/components/tooltip'
import { cn } from '@aurexos/ui/lib/utils'
import {
  addActionItem,
  addDecision,
  cancelMeeting,
  completeMeeting,
  convertActionItemToTask,
  removeActionItem,
  removeDecision,
  saveNotes,
  startMeeting,
  toggleAgendaItem,
} from '../actions/meeting-actions'
import { formatDate, formatMeetingTime, initials } from '../lib/format'
import { PreMeetingBriefPanel } from './pre-meeting-brief'
import {
  ACTION_ITEM_STATUS_META,
  MEETING_STATUS_META,
  MEETING_TYPE_META,
  type ActionItemRow,
  type MeetingDetail,
  type MeetingMemberOption,
  type PreMeetingBrief,
} from '../types'

const NONE = 'none'

function useAction(after?: () => void) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const run = React.useCallback(
    async (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) => {
      setPending(true)
      try {
        const result = await fn()
        if (result.ok) {
          if (success) toast.success(success)
          after?.()
          router.refresh()
        } else {
          toast.error(result.error ?? 'Something went wrong')
        }
        return result.ok
      } finally {
        setPending(false)
      }
    },
    [after, router],
  )
  return { pending, run }
}

// ── Notes editor with autosave + visible save state ──────────────────────────

function NotesEditor({ meetingId, initial }: { meetingId: string; initial: string }) {
  const [value, setValue] = React.useState(initial)
  const [state, setState] = React.useState<'idle' | 'saving' | 'saved'>('idle')
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = React.useRef(initial)

  const flush = React.useCallback(
    async (next: string) => {
      if (next === lastSaved.current) return
      setState('saving')
      const result = await saveNotes({ id: meetingId, notes: next })
      if (result.ok) {
        lastSaved.current = next
        setState('saved')
      } else {
        setState('idle')
        toast.error(result.error)
      }
    },
    [meetingId],
  )

  function onChange(next: string) {
    setValue(next)
    setState('idle')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(next), 800)
  }

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Notes</h3>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : ''}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => void flush(value)}
        placeholder="Capture the conversation as it happens…"
        className="min-h-[220px] resize-y"
      />
    </div>
  )
}

// ── Quick-add decision ───────────────────────────────────────────────────────

function QuickAddDecision({ meetingId }: { meetingId: string }) {
  const { pending, run } = useAction()
  const [statement, setStatement] = React.useState('')
  const [decidedBy, setDecidedBy] = React.useState('')

  async function submit() {
    if (!statement.trim()) return
    const ok = await run(
      () =>
        addDecision({
          meetingId,
          statement: statement.trim(),
          decidedBy: decidedBy.trim() || null,
        }),
      'Decision recorded',
    )
    if (ok) {
      setStatement('')
      setDecidedBy('')
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <Input
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
        }}
        placeholder="We decided to…"
        aria-label="Decision statement"
      />
      <div className="flex items-center gap-2">
        <Input
          value={decidedBy}
          onChange={(e) => setDecidedBy(e.target.value)}
          placeholder="Decided by (optional)"
          aria-label="Decided by"
          className="h-8 text-sm"
        />
        <Button size="sm" disabled={pending || !statement.trim()} onClick={() => void submit()}>
          <Plus className="mr-1.5 size-4" />
          Add
        </Button>
      </div>
    </div>
  )
}

// ── Quick-add action item ────────────────────────────────────────────────────

function QuickAddActionItem({
  meetingId,
  members,
}: {
  meetingId: string
  members: MeetingMemberOption[]
}) {
  const { pending, run } = useAction()
  const [description, setDescription] = React.useState('')
  const [assignee, setAssignee] = React.useState(NONE)
  const [due, setDue] = React.useState('')

  async function submit() {
    if (!description.trim()) return
    const ok = await run(
      () =>
        addActionItem({
          meetingId,
          description: description.trim(),
          assigneeUserId: assignee === NONE ? null : assignee,
          dueDate: due || null,
        }),
      'Action item added',
    )
    if (ok) {
      setDescription('')
      setAssignee(NONE)
      setDue('')
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
        }}
        placeholder="Someone will…"
        aria-label="Action item description"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="h-8 w-[10rem] text-sm">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Unassigned</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.fullName ?? m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-label="Due date"
          className="h-8 w-[9.5rem] text-sm"
        />
        <Button size="sm" disabled={pending || !description.trim()} onClick={() => void submit()}>
          <Plus className="mr-1.5 size-4" />
          Add
        </Button>
      </div>
    </div>
  )
}

// ── Action item row ──────────────────────────────────────────────────────────

function ActionItemLine({ item, canManage }: { item: ActionItemRow; canManage: boolean }) {
  const { pending, run } = useAction()
  const meta = ACTION_ITEM_STATUS_META[item.status]

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <ListTodo className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-foreground">{item.description}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{item.assigneeName ?? 'Unassigned'}</span>
            {item.dueDate ? <span>· due {formatDate(item.dueDate)}</span> : null}
            <Badge variant={meta.variant} className="ml-1">
              {meta.label}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {item.status === 'converted' && item.taskId ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/tasks?task=${item.taskId}`}>
              View task
              <ArrowUpRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        ) : canManage ? (
          <>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                void run(() => convertActionItemToTask(item.id), 'Converted to a task')
              }
            >
              <Check className="mr-1.5 size-4" />
              Convert to task
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove action item"
              disabled={pending}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => void run(() => removeActionItem(item.id))}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}

// ── Agenda checklist (live mode) ─────────────────────────────────────────────

function AgendaChecklist({
  meeting,
  interactive,
}: {
  meeting: MeetingDetail
  interactive: boolean
}) {
  const { pending, run } = useAction()
  if (meeting.agenda.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
        No agenda for this meeting.
      </p>
    )
  }
  return (
    <div className="space-y-1.5">
      {meeting.agenda.map((item, index) => (
        <button
          key={`${item.title}-${index}`}
          type="button"
          disabled={!interactive || pending}
          onClick={() =>
            void run(() => toggleAgendaItem({ id: meeting.id, index, done: !item.done }))
          }
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left transition-colors',
            interactive ? 'hover:bg-accent/40' : 'cursor-default',
            item.done ? 'bg-muted/40' : '',
          )}
        >
          <span
            className={cn(
              'flex size-4 shrink-0 items-center justify-center rounded-full border',
              item.done
                ? 'border-transparent bg-[hsl(var(--success-text))] text-background'
                : 'border-muted-foreground/40',
            )}
          >
            {item.done ? <Check className="size-3" /> : null}
          </span>
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-sm',
              item.done ? 'text-muted-foreground line-through' : 'text-foreground',
            )}
          >
            {item.title}
          </span>
          {item.durationMinutes ? (
            <span className="shrink-0 text-xs text-muted-foreground">{item.durationMinutes}m</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

// ── Header + lifecycle actions ───────────────────────────────────────────────

function LifecycleActions({ meeting, canManage }: { meeting: MeetingDetail; canManage: boolean }) {
  const { pending, run } = useAction()
  if (!canManage) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/meetings/${meeting.id}/edit`}>
          <Pencil className="mr-1.5 size-4" />
          Edit
        </Link>
      </Button>
      {meeting.status === 'scheduled' ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => void run(() => startMeeting(meeting.id), 'Meeting started')}
        >
          <Play className="mr-1.5 size-4" />
          Start meeting
        </Button>
      ) : null}
      {meeting.status === 'in_progress' ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => void run(() => completeMeeting(meeting.id), 'Meeting completed')}
        >
          <Check className="mr-1.5 size-4" />
          Complete
        </Button>
      ) : null}
      {meeting.status !== 'cancelled' && meeting.status !== 'completed' ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          className="text-muted-foreground hover:text-destructive"
          onClick={() => void run(() => cancelMeeting(meeting.id), 'Meeting cancelled')}
        >
          <Ban className="mr-1.5 size-4" />
          Cancel
        </Button>
      ) : null}
    </div>
  )
}

export interface MeetingDetailViewProps {
  meeting: MeetingDetail
  brief: PreMeetingBrief
  members: MeetingMemberOption[]
  canManage: boolean
}

export function MeetingDetailView({ meeting, brief, members, canManage }: MeetingDetailViewProps) {
  const typeMeta = MEETING_TYPE_META[meeting.type]
  const statusMeta = MEETING_STATUS_META[meeting.status]
  const isLive = meeting.status === 'in_progress'
  const [tab, setTab] = React.useState(isLive ? 'live' : 'overview')

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <Link
            href="/meetings"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Meetings
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {meeting.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  {formatMeetingTime(meeting.startsAt)}
                </span>
                {meeting.location ? (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {meeting.location}
                  </span>
                ) : null}
              </div>
            </div>
            <LifecycleActions meeting={meeting} canManage={canManage} />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="live">
              <CircleDot
                className={cn('mr-1.5 size-3.5', isLive ? 'text-[hsl(var(--warning-text))]' : '')}
              />
              Live mode
            </TabsTrigger>
            <TabsTrigger value="decisions">Decisions</TabsTrigger>
            <TabsTrigger value="actions">Action items</TabsTrigger>
            <TabsTrigger value="brief">Brief</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <Card>
                  <CardContent className="space-y-3 p-5">
                    <h3 className="text-sm font-semibold text-foreground">Agenda</h3>
                    <AgendaChecklist meeting={meeting} interactive={false} />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardContent className="space-y-4 p-5">
                    <div className="space-y-2">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Building2 className="size-4 text-muted-foreground" />
                        Relationship
                      </h3>
                      <div className="space-y-1.5 text-sm">
                        {meeting.clientName ? (
                          <p className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Client</span>
                            <Link
                              href={meeting.clientId ? `/clients/${meeting.clientId}` : '#'}
                              className="truncate font-medium text-foreground hover:underline"
                            >
                              {meeting.clientName}
                            </Link>
                          </p>
                        ) : null}
                        {meeting.projectName ? (
                          <p className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Project</span>
                            <Link
                              href={meeting.projectId ? `/projects/${meeting.projectId}` : '#'}
                              className="truncate font-medium text-foreground hover:underline"
                            >
                              {meeting.projectName}
                            </Link>
                          </p>
                        ) : null}
                        {meeting.dealName ? (
                          <p className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Deal</span>
                            <span className="truncate font-medium text-foreground">
                              {meeting.dealName}
                            </span>
                          </p>
                        ) : null}
                        {!meeting.clientName && !meeting.projectName && !meeting.dealName ? (
                          <p className="text-muted-foreground">No linked relationship.</p>
                        ) : null}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Users className="size-4 text-muted-foreground" />
                        Attendees
                      </h3>
                      {meeting.attendees.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No attendees added.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {meeting.attendees.map((a, i) => (
                            <div
                              key={`${a.id ?? a.email ?? a.name ?? 'a'}-${i}`}
                              className="flex items-center gap-2"
                            >
                              <Avatar className="size-6">
                                <AvatarFallback className="text-[10px]">
                                  {initials(a.name, a.email)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="min-w-0 truncate text-sm text-foreground">
                                {a.name ?? a.email ?? 'Guest'}
                              </span>
                              <Badge variant="outline" className="ml-auto text-[10px] capitalize">
                                {a.kind}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Live mode */}
          <TabsContent value="live" className="mt-4">
            {meeting.status === 'scheduled' ? (
              <Card className="mb-4 border-dashed">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <p className="text-sm text-muted-foreground">
                    This meeting hasn’t started. Start it to run live — you can still take notes and
                    capture decisions now.
                  </p>
                  {canManage ? <StartInline meetingId={meeting.id} /> : null}
                </CardContent>
              </Card>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <Card>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center gap-2">
                      <ScrollText className="size-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">Agenda</h3>
                    </div>
                    <AgendaChecklist meeting={meeting} interactive={canManage} />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <NotesEditor meetingId={meeting.id} initial={meeting.notes ?? ''} />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center gap-2">
                      <ListChecks className="size-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">Decisions</h3>
                    </div>
                    {canManage ? <QuickAddDecision meetingId={meeting.id} /> : null}
                    <div className="space-y-1.5">
                      {meeting.decisions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No decisions captured yet.</p>
                      ) : (
                        meeting.decisions.map((d) => (
                          <div key={d.id} className="flex items-start gap-2 text-sm">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--success-text))]" />
                            <span className="text-foreground">{d.statement}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center gap-2">
                      <ListTodo className="size-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">Action items</h3>
                    </div>
                    {canManage ? (
                      <QuickAddActionItem meetingId={meeting.id} members={members} />
                    ) : null}
                    <div className="space-y-1.5">
                      {meeting.actionItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No action items yet.</p>
                      ) : (
                        meeting.actionItems.map((a) => (
                          <div key={a.id} className="flex items-start gap-2 text-sm">
                            <ListTodo className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 text-foreground">{a.description}</span>
                            <Badge variant={ACTION_ITEM_STATUS_META[a.status].variant}>
                              {ACTION_ITEM_STATUS_META[a.status].label}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Decisions */}
          <TabsContent value="decisions" className="mt-4">
            <Card>
              <CardContent className="space-y-4 p-5">
                {canManage ? <QuickAddDecision meetingId={meeting.id} /> : null}
                {meeting.decisions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No decisions recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {meeting.decisions.map((d) => (
                      <DecisionCard
                        key={d.id}
                        id={d.id}
                        statement={d.statement}
                        context={d.context}
                        decidedBy={d.decidedBy}
                        canManage={canManage}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Action items */}
          <TabsContent value="actions" className="mt-4">
            <Card>
              <CardContent className="space-y-4 p-5">
                {canManage ? <QuickAddActionItem meetingId={meeting.id} members={members} /> : null}
                {meeting.actionItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No action items yet. Capture what needs to happen next.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {meeting.actionItems.map((a) => (
                      <ActionItemLine key={a.id} item={a} canManage={canManage} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brief */}
          <TabsContent value="brief" className="mt-4">
            <PreMeetingBriefPanel brief={brief} />
          </TabsContent>

          {/* Summary (Phase-3 AI seam) */}
          <TabsContent value="summary" className="mt-4">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Summary</h3>
                    <p className="text-sm text-muted-foreground">
                      A recap, decisions and action items — with a client-safe variant to share.
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button size="sm" disabled>
                          <Sparkles className="mr-1.5 size-4" />
                          Summarize with Aurex
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Aurex summaries arrive in Phase 3</TooltipContent>
                  </Tooltip>
                </div>

                {meeting.summary?.tldr ? (
                  <div className="space-y-2 rounded-md border p-4">
                    <p className="text-sm text-foreground">{meeting.summary.tldr}</p>
                    {meeting.summary.model ? (
                      <p className="text-xs text-muted-foreground">
                        Model: {meeting.summary.model}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed p-6 text-center">
                    <Sparkles className="mx-auto size-5 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium text-foreground">No summary yet</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                      Transcript upload and AI summaries (recap, decisions, action items and a
                      client-safe variant) arrive in Phase 3. Until then, your decisions and action
                      items above are the durable record.
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                  <Clock className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Phase 3 seam: recording and transcript upload feed the AI summarizer, which
                    writes to meeting_summaries. The table and this tab are already wired for it.
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}

function StartInline({ meetingId }: { meetingId: string }) {
  const { pending, run } = useAction()
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => void run(() => startMeeting(meetingId), 'Meeting started')}
    >
      <Play className="mr-1.5 size-4" />
      Start meeting
    </Button>
  )
}

function DecisionCard({
  id,
  statement,
  context,
  decidedBy,
  canManage,
}: {
  id: string
  statement: string
  context: string | null
  decidedBy: string | null
  canManage: boolean
}) {
  const { pending, run } = useAction()
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <Check className="mt-0.5 size-4 shrink-0 text-[hsl(var(--success-text))]" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-foreground">{statement}</p>
          {context ? <p className="text-sm text-muted-foreground">{context}</p> : null}
          {decidedBy ? (
            <p className="text-xs text-muted-foreground">Decided by {decidedBy}</p>
          ) : null}
        </div>
      </div>
      {canManage ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove decision"
          disabled={pending}
          className="text-muted-foreground hover:text-destructive"
          onClick={() => void run(() => removeDecision(id))}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}
