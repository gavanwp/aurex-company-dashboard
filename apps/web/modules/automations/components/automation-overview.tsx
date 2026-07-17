import { Activity, CircleCheck, PauseCircle, Workflow } from 'lucide-react'
import { StatCard } from '@aurexos/ui/components/stat-card'
import type { AutomationOverview } from '../types'

export function AutomationOverviewPanel({ overview }: { overview: AutomationOverview }) {
  return (
    <div className="aurex-reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Automations"
        value={overview.total}
        icon={Workflow}
        iconTint="--chart-1"
        hint={overview.total === 1 ? 'built' : 'built'}
      />
      <StatCard
        label="Active"
        value={overview.active}
        icon={CircleCheck}
        iconTint="--chart-2"
        hint="running on events"
      />
      <StatCard
        label="Paused / draft"
        value={overview.paused + overview.draft}
        icon={PauseCircle}
        iconTint="--chart-3"
        hint={`${overview.draft} draft · ${overview.paused} paused`}
      />
      <StatCard
        label="Runs (30d)"
        value={overview.runsLast30d}
        icon={Activity}
        iconTint="--chart-4"
        hint={overview.failuresLast30d > 0 ? `${overview.failuresLast30d} failed` : 'no failures'}
      />
    </div>
  )
}
