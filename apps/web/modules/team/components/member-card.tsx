import Link from 'next/link'
import { MapPin, Plane } from 'lucide-react'
import { initialsOf } from '@aurexos/core'
import { Avatar, AvatarFallback, AvatarImage } from '@aurexos/ui/components/avatar'
import { Badge } from '@aurexos/ui/components/badge'
import { Card } from '@aurexos/ui/components/card'
import { cn } from '@aurexos/ui/lib/utils'
import { ROLE_LABELS } from './role-labels'
import { specializationLabel } from '../lib/hr'
import type { DirectoryMember } from '../types'

/** Up to three skill chips; a +N pill stands in for the rest. */
function SkillChips({ member }: { member: DirectoryMember }) {
  if (member.skills.length === 0) return null
  const shown = member.skills.slice(0, 3)
  const extra = member.skills.length - shown.length
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((s) => (
        <span
          key={s.name}
          className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
        >
          {s.name}
        </span>
      ))}
      {extra > 0 ? (
        <span className="rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </div>
  )
}

export interface MemberCardProps {
  member: DirectoryMember
}

/** A person in the directory grid — border-first, hover-interactive, links to the profile. */
export function MemberCard({ member }: MemberCardProps) {
  return (
    <Link href={`/team/${member.userId}`} className="group block">
      <Card interactive className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-11">
            {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-[hsl(var(--accent-soft))] text-[hsl(var(--accent-text))]">
              {initialsOf(member.name) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-semibold text-foreground">{member.name}</p>
              {member.onLeaveToday ? (
                <Plane
                  className="size-3.5 shrink-0 text-[hsl(var(--warning-text))]"
                  aria-label="On leave today"
                />
              ) : null}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {member.title ?? specializationLabel(member.specialization)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="accent-soft">{ROLE_LABELS[member.role]}</Badge>
          {member.specialization ? (
            <Badge variant="outline">{specializationLabel(member.specialization)}</Badge>
          ) : null}
        </div>

        <SkillChips member={member} />

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1">
            {member.location ? (
              <>
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{member.location}</span>
              </>
            ) : (
              <span className="truncate">{member.email}</span>
            )}
          </span>
          {member.weeklyCapacityHours != null ? (
            <span
              className={cn('shrink-0 [font-variant-numeric:tabular-nums]')}
              title="Weekly capacity"
            >
              {member.weeklyCapacityHours}h/wk
            </span>
          ) : null}
        </div>
      </Card>
    </Link>
  )
}
