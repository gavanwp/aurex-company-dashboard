'use client'

import Link from 'next/link'
import {
  Activity,
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  ListTodo,
  Mail,
  ScrollText,
  Sparkles,
} from 'lucide-react'
import { formatMoney } from '@aurexos/core'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { cn } from '@aurexos/ui/lib/utils'
import { formatDate, formatMeetingTime, formatWhen } from '../lib/format'
import type { BriefRelationship, DecisionRow, PreMeetingBrief } from '../types'

const REL_ICON = {
  client: Building2,
  deal: Briefcase,
  project: ScrollText,
} as const

const PRIORITY_FALLBACK = { label: '', className: 'text-muted-foreground' }
const PRIORITY_META: Record<string, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'text-destructive' },
  high: { label: 'High', className: 'text-destructive' },
  medium: { label: 'Medium', className: 'text-muted-foreground' },
  low: { label: 'Low', className: 'text-muted-foreground' },
  none: PRIORITY_FALLBACK,
}

function BriefSection({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof Building2
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

function RelationshipCard({ rel }: { rel: BriefRelationship }) {
  const Icon = REL_ICON[rel.kind]
  return (
    <Link
      href={rel.href}
      className="group flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2.5 transition-colors hover:border-foreground/20 hover:bg-accent/40"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{rel.name}</p>
          <p className="text-xs capitalize text-muted-foreground">
            {rel.kind}
            {rel.status ? ` · ${rel.status.replace(/_/g, ' ')}` : ''}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {rel.valueCents !== null ? (
          <span className="text-sm font-medium [font-variant-numeric:tabular-nums]">
            {formatMoney(rel.valueCents, rel.currency ?? 'USD')}
          </span>
        ) : null}
        <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  )
}

function DecisionLine({ decision }: { decision: DecisionRow }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--success-text))]" />
      <div className="min-w-0">
        <p className="text-foreground">{decision.statement}</p>
        {decision.decidedBy ? (
          <p className="text-xs text-muted-foreground">Decided by {decision.decidedBy}</p>
        ) : null}
      </div>
    </div>
  )
}

export interface PreMeetingBriefPanelProps {
  brief: PreMeetingBrief
  className?: string
}

/**
 * The pre-meeting brief — a read-only context stack assembled from real data
 * across Clients, CRM, Projects, Tasks, Email and Meetings. Walk in already
 * knowing everything: who they are, what was last decided, what's still open,
 * and what's coming next. Every section degrades to an honest empty state.
 */
export function PreMeetingBriefPanel({ brief, className }: PreMeetingBriefPanelProps) {
  if (!brief.hasContext) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted">
            <Sparkles className="size-5 text-muted-foreground" />
          </span>
          <h3 className="text-sm font-semibold text-foreground">No relationship context yet</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Link this meeting to a client, deal or project and the brief will assemble the last
            decisions, open work and recent activity automatically.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="flex items-center gap-2 border-b bg-muted/40 px-5 py-3">
        <Sparkles className="size-4 text-[hsl(var(--accent-text))]" />
        <div>
          <p className="text-sm font-semibold text-foreground">Pre-meeting brief</p>
          <p className="text-xs text-muted-foreground">
            Everything we know, assembled from your workspace.
          </p>
        </div>
      </div>

      <CardContent className="space-y-6 p-5">
        {/* Relationship summary */}
        {brief.relationships.length > 0 ? (
          <BriefSection icon={Building2} title="Relationship">
            <div className="space-y-2">
              {brief.relationships.map((rel) => (
                <RelationshipCard key={`${rel.kind}-${rel.id}`} rel={rel} />
              ))}
            </div>
          </BriefSection>
        ) : null}

        {/* Last meeting */}
        {brief.lastMeeting ? (
          <BriefSection
            icon={ScrollText}
            title="Last meeting"
            hint={formatMeetingTime(brief.lastMeeting.when)}
          >
            <div className="space-y-3 rounded-md border bg-card p-3">
              <Link
                href={brief.lastMeeting.href}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
              >
                {brief.lastMeeting.title}
                <ArrowUpRight className="size-3.5 text-muted-foreground" />
              </Link>

              {brief.lastMeeting.decisions.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Decisions
                  </p>
                  {brief.lastMeeting.decisions.slice(0, 4).map((d) => (
                    <DecisionLine key={d.id} decision={d} />
                  ))}
                </div>
              ) : null}

              {brief.lastMeeting.openActionItems.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Still open
                  </p>
                  {brief.lastMeeting.openActionItems.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-start gap-2 text-sm">
                      <ListTodo className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-foreground">{a.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.assigneeName ?? 'Unassigned'}
                          {a.dueDate ? ` · due ${formatDate(a.dueDate)}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {brief.lastMeeting.decisions.length === 0 &&
              brief.lastMeeting.openActionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No decisions or open items recorded last time.
                </p>
              ) : null}
            </div>
          </BriefSection>
        ) : null}

        {/* Open tasks */}
        {brief.openTasks.length > 0 ? (
          <BriefSection icon={ListTodo} title="Open tasks" hint={`${brief.openTasks.length}`}>
            <div className="divide-y rounded-md border">
              {brief.openTasks.map((t) => {
                const p = PRIORITY_META[t.priority] ?? PRIORITY_FALLBACK
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.assigneeName ?? 'Unassigned'}
                        {t.dueDate ? ` · due ${formatDate(t.dueDate)}` : ''}
                      </p>
                    </div>
                    {p.label ? (
                      <span className={cn('shrink-0 text-xs font-medium', p.className)}>
                        {p.label}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </BriefSection>
        ) : null}

        {/* Recent activity */}
        {brief.recentActivity.length > 0 ? (
          <BriefSection icon={Activity} title="Recent activity">
            <div className="space-y-1.5">
              {brief.recentActivity.map((a) => {
                const Icon = a.kind === 'email' ? Mail : Activity
                const inner = (
                  <div className="flex items-center gap-2.5">
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {a.label}
                    </span>
                    {a.when ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatWhen(a.when)}
                      </span>
                    ) : null}
                  </div>
                )
                return a.href ? (
                  <Link
                    key={a.id}
                    href={a.href}
                    className="block rounded-md px-2 py-1.5 transition-colors hover:bg-accent/40"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={a.id} className="rounded-md px-2 py-1.5">
                    {inner}
                  </div>
                )
              })}
            </div>
          </BriefSection>
        ) : null}

        {/* Upcoming */}
        {brief.upcoming.length > 0 ? (
          <BriefSection icon={CalendarClock} title="Also coming up">
            <div className="space-y-1.5">
              {brief.upcoming.map((u) => (
                <Link
                  key={u.id}
                  href={u.href ?? '#'}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/40"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{u.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatMeetingTime(u.startsAt)}
                  </span>
                </Link>
              ))}
            </div>
          </BriefSection>
        ) : null}
      </CardContent>
    </Card>
  )
}
