import { CalendarOff, Clock, Hourglass, Users } from 'lucide-react'
import { Badge } from '@aurexos/ui/components/badge'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { StatCard } from '@aurexos/ui/components/stat-card'
import { specializationLabel } from '../lib/hr'
import type { TeamOverview } from '../types'

export interface TeamOverviewPanelProps {
  overview: TeamOverview
}

/**
 * The people snapshot: headcount, who is out today, leave awaiting a decision,
 * and the team's average weekly capacity — with a specialization mix strip.
 * The Team analog of Finance's cash snapshot / Contracts' renewal radar.
 */
export function TeamOverviewPanel({ overview }: TeamOverviewPanelProps) {
  const profiledHint =
    overview.headcount > 0
      ? `${overview.profiledCount} of ${overview.headcount} profiled`
      : undefined

  return (
    <div className="space-y-4">
      <div className="aurex-reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Headcount"
          value={overview.headcount}
          icon={Users}
          iconTint="--chart-1"
          hint={profiledHint}
        />
        <StatCard
          label="Out today"
          value={overview.onLeaveToday}
          icon={CalendarOff}
          iconTint="--chart-4"
          hint={overview.onLeaveToday === 1 ? 'person on leave' : 'people on leave'}
        />
        <StatCard
          label="Leave to review"
          value={overview.pendingLeave}
          icon={Hourglass}
          iconTint="--chart-5"
          hint={overview.pendingLeave === 1 ? 'request pending' : 'requests pending'}
        />
        <StatCard
          label="Avg weekly capacity"
          value={overview.avgWeeklyCapacity != null ? `${overview.avgWeeklyCapacity}h` : '—'}
          icon={Clock}
          iconTint="--chart-2"
          hint={
            overview.avgWeeklyCapacity != null
              ? 'across profiled members'
              : 'set capacity on profiles'
          }
        />
      </div>

      {overview.specializationCounts.length > 0 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Specializations</span>
            {overview.specializationCounts.map(({ specialization, count }) => (
              <Badge key={specialization} variant="secondary" className="gap-1.5">
                {specializationLabel(specialization)}
                <span className="text-muted-foreground [font-variant-numeric:tabular-nums]">
                  {count}
                </span>
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
