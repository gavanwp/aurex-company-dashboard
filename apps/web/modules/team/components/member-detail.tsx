import Link from 'next/link'
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Clock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plane,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatMoney, initialsOf, type SkillLevel } from '@aurexos/core'
import { Avatar, AvatarFallback, AvatarImage } from '@aurexos/ui/components/avatar'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { cn } from '@aurexos/ui/lib/utils'
import { ROLE_LABELS } from './role-labels'
import { LeaveRequestForm } from './leave-request-form'
import {
  employmentLabel,
  formatDate,
  formatDateRange,
  leaveStatusLabel,
  leaveStatusVariant,
  leaveTypeLabel,
  skillLevelLabel,
  skillStrength,
  specializationLabel,
  tenureLabel,
} from '../lib/hr'
import type { MemberComp, MemberDetail } from '../types'

function SkillMeter({ level }: { level: SkillLevel }) {
  const strength = skillStrength(level)
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className={cn('h-1.5 w-4 rounded-full', n <= strength ? 'bg-primary' : 'bg-muted')}
        />
      ))}
    </span>
  )
}

function Facts({
  items,
}: {
  items: Array<{ icon: LucideIcon; label: string; value: React.ReactNode }>
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-2.5">
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="truncate text-sm font-medium text-foreground">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  )
}

function compValue(comp: MemberComp): string {
  if (comp.amountMinor == null) return 'Not set'
  const money = formatMoney(comp.amountMinor, comp.currency)
  const suffix = comp.period
    ? ` / ${comp.period === 'annual' ? 'yr' : comp.period === 'monthly' ? 'mo' : 'hr'}`
    : ''
  return `${money}${suffix}`
}

export interface MemberDetailViewProps {
  member: MemberDetail
  canManage: boolean
  todayISO: string
}

export function MemberDetailView({ member, canManage, todayISO }: MemberDetailViewProps) {
  const tenure = tenureLabel(member.startDate, todayISO)

  const facts: Array<{ icon: LucideIcon; label: string; value: React.ReactNode }> = [
    { icon: Mail, label: 'Email', value: member.email || '—' },
    { icon: Briefcase, label: 'Employment', value: employmentLabel(member.employmentType) },
    { icon: UserRound, label: 'Manager', value: member.managerName ?? '—' },
    {
      icon: CalendarDays,
      label: 'Start date',
      value: member.startDate ? formatDate(member.startDate) : '—',
    },
  ]
  if (member.phone) facts.push({ icon: Phone, label: 'Phone', value: member.phone })
  if (member.timezone) facts.push({ icon: Clock, label: 'Timezone', value: member.timezone })

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link href="/team">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Team
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="size-16">
            {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-[hsl(var(--accent-soft))] text-lg text-[hsl(var(--accent-text))]">
              {initialsOf(member.name) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {member.name}
              </h1>
              {member.onLeaveToday ? (
                <Badge variant="warning-soft" className="gap-1">
                  <Plane className="size-3" aria-hidden="true" />
                  On leave
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {member.title ?? specializationLabel(member.specialization)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="accent-soft">{ROLE_LABELS[member.role]}</Badge>
              {member.specialization ? (
                <Badge variant="outline">{specializationLabel(member.specialization)}</Badge>
              ) : null}
              {member.location ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" aria-hidden="true" />
                  {member.location}
                </span>
              ) : null}
              {tenure ? <span className="text-xs text-muted-foreground">· {tenure}</span> : null}
            </div>
          </div>
        </div>
        {canManage ? (
          <div className="flex shrink-0 items-center gap-2">
            <LeaveRequestForm
              onBehalfOf={{ userId: member.userId, name: member.name }}
              variant="outline"
            />
            <Button asChild size="sm">
              <Link href={`/team/${member.userId}/edit`}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit profile
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: details + skills */}
        <div className="space-y-6 lg:col-span-2">
          {member.bio ? (
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-2 text-sm font-semibold text-foreground">About</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {member.bio}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Details</h2>
              <Facts items={facts} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Skills</h2>
                {member.skills.length > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {member.skills.length} tagged
                  </span>
                ) : null}
              </div>
              {member.skills.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                  No skills tagged yet.
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                  {member.skills.map((s) => (
                    <li key={s.name} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-sm text-foreground">{s.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {skillLevelLabel(s.level)}
                        </span>
                        <SkillMeter level={s.level} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: capacity, comp, manager tree, leave */}
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-sm font-semibold text-foreground">Capacity</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold [font-variant-numeric:tabular-nums]">
                  {member.weeklyCapacityHours != null ? member.weeklyCapacityHours : '—'}
                </span>
                {member.weeklyCapacityHours != null ? (
                  <span className="text-sm text-muted-foreground">h / week</span>
                ) : null}
              </div>
              {member.comp ? (
                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">Compensation</p>
                  <p className="text-sm font-medium text-foreground [font-variant-numeric:tabular-nums]">
                    {compValue(member.comp)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Visible to Owner, HR and Finance.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {member.reports.length > 0 ? (
            <Card>
              <CardContent className="space-y-3 p-5">
                <h2 className="text-sm font-semibold text-foreground">
                  Direct reports
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {member.reports.length}
                  </span>
                </h2>
                <ul className="space-y-2">
                  {member.reports.map((r) => (
                    <li key={r.userId}>
                      <Link
                        href={`/team/${r.userId}`}
                        className="flex items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-accent/40"
                      >
                        <Avatar className="size-7">
                          {r.avatarUrl ? <AvatarImage src={r.avatarUrl} alt="" /> : null}
                          <AvatarFallback className="text-xs">
                            {initialsOf(r.name) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-foreground">{r.name}</span>
                          {r.title ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {r.title}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="text-sm font-semibold text-foreground">Leave history</h2>
              {member.leave.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">
                  No leave on record.
                </p>
              ) : (
                <ul className="space-y-2">
                  {member.leave.slice(0, 6).map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {leaveTypeLabel(l.type)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                          {formatDateRange(l.startDate, l.endDate)} · {l.days}
                          {l.days === 1 ? ' day' : ' days'}
                        </p>
                      </div>
                      <Badge variant={leaveStatusVariant(l.status)}>
                        {leaveStatusLabel(l.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
