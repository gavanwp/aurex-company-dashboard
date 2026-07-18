import { KeyRound, MailWarning, ShieldAlert, ShieldCheck } from 'lucide-react'
import { initialsOf } from '@aurexos/core'
import { Avatar, AvatarFallback } from '@aurexos/ui/components/avatar'
import { Badge } from '@aurexos/ui/components/badge'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { StatCard } from '@aurexos/ui/components/stat-card'
import type { SecurityMember, SecurityOverview } from '../queries/get-security-overview'

function MemberList({
  title,
  hint,
  members,
  emptyLabel,
  tone,
}: {
  title: string
  hint: string
  members: SecurityMember[]
  emptyLabel: string
  tone: 'warning' | 'muted'
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {title}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {members.length}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        {members.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">{initialsOf(m.name) || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm text-foreground">{m.name}</span>
                </span>
                <Badge variant={tone === 'warning' ? 'warning-soft' : 'secondary'}>
                  {m.roleName}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function SecurityCenter({ overview }: { overview: SecurityOverview }) {
  const mfaTrend =
    overview.mfaCoveragePct >= 80 ? 'up' : overview.mfaCoveragePct >= 40 ? 'neutral' : 'down'
  return (
    <div className="space-y-8">
      <div className="aurex-reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="MFA coverage"
          value={`${overview.mfaCoveragePct}%`}
          icon={ShieldCheck}
          iconTint="--chart-2"
          delta={`${overview.mfaEnrolled}/${overview.headcount}`}
          deltaTrend={mfaTrend}
          hint="members enrolled"
        />
        <StatCard
          label="Administrative accounts"
          value={overview.administrativeAccounts.length}
          icon={ShieldAlert}
          iconTint="--chart-3"
          hint="elevated access"
        />
        <StatCard
          label="Active API keys"
          value={overview.activeApiKeys}
          icon={KeyRound}
          iconTint="--chart-1"
          hint="org-wide"
        />
        <StatCard
          label="Failed sign-ins (30d)"
          value={overview.failedSignins30d}
          icon={MailWarning}
          iconTint="--chart-5"
          hint={
            overview.pendingInvitations > 0
              ? `${overview.pendingInvitations} pending invites`
              : 'no pending invites'
          }
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <MemberList
          title="Members without MFA"
          hint="Ask these people to enable two-factor authentication."
          members={overview.membersWithoutMfa}
          emptyLabel="Everyone has MFA enabled."
          tone="warning"
        />
        <MemberList
          title="Administrative accounts"
          hint="Roles flagged administrative — review at each access review."
          members={overview.administrativeAccounts}
          emptyLabel="No administrative roles assigned."
          tone="muted"
        />
      </div>
    </div>
  )
}
