import { Building2, CircleDollarSign, FolderKanban, ListTodo, UserPlus } from 'lucide-react'
import { formatMoney } from '@aurexos/core'
import { DeltaBadge, Sparkline } from '@aurexos/ui/components/chart'
import { StatCard } from '@aurexos/ui/components/stat-card'
import type { DashboardData, KpiStat } from '../queries/get-dashboard'
import { METRIC_HUES } from './metric-meta'

/** "+12.4%" / "−4%" — one decimal max (Charts.md §5). */
function formatPct(pct: number): string {
  const rounded = Math.round(Math.abs(pct) * 10) / 10
  const digits = Number.isInteger(rounded) ? 0 : 1
  return `${pct >= 0 ? '+' : '−'}${rounded.toFixed(digits)}%`
}

function KpiDelta({ stat, label }: { stat: Pick<KpiStat, 'deltaPct' | 'trend'>; label: string }) {
  // Never a fake percentage: a zero base renders an honest "—".
  if (stat.deltaPct === null) {
    return <DeltaBadge value="—" trend="flat" tone="neutral" label={label} />
  }
  return <DeltaBadge value={formatPct(stat.deltaPct)} trend={stat.trend} label={label} />
}

function KpiSparkline({ data, hue, label }: { data: number[]; hue: string; label: string }) {
  return (
    <span className="block" style={{ color: `hsl(var(${hue}))` }}>
      <Sparkline
        data={data}
        width={120}
        height={32}
        label={label}
        className="h-8 w-full"
        preserveAspectRatio="none"
      />
    </span>
  )
}

/**
 * The five KPI tiles. Four per row standard; five-across engages only at
 * ultra-wide (DashboardRules.md §3.1). Every number is computed from the
 * workspace's records.
 */
export function KpiRow({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 min-[1920px]:grid-cols-5">
      <StatCard
        label="Total revenue"
        value={formatMoney(data.revenue.totalMinor)}
        icon={CircleDollarSign}
        iconTint={METRIC_HUES.revenue}
        deltaSlot={<KpiDelta stat={data.revenue} label="vs last month" />}
        sparkline={
          <KpiSparkline
            data={data.revenue.byMonth.map((m) => m.totalMinor)}
            hue={METRIC_HUES.revenue}
            label="Paid revenue by month, last 6 months"
          />
        }
      />
      <StatCard
        label="Active projects"
        value={data.activeProjects.value}
        icon={FolderKanban}
        iconTint={METRIC_HUES.activeProjects}
        deltaSlot={<KpiDelta stat={data.activeProjects} label="new vs prior 30d" />}
        sparkline={
          <KpiSparkline
            data={data.activeProjects.spark}
            hue={METRIC_HUES.activeProjects}
            label="Projects created by month, last 6 months"
          />
        }
      />
      <StatCard
        label="Pending tasks"
        value={data.pendingTasks.value}
        icon={ListTodo}
        iconTint={METRIC_HUES.pendingTasks}
        deltaSlot={<KpiDelta stat={data.pendingTasks} label="created vs prior 30d" />}
        sparkline={
          <KpiSparkline
            data={data.pendingTasks.spark}
            hue={METRIC_HUES.pendingTasks}
            label="Open tasks created by month, last 6 months"
          />
        }
      />
      <StatCard
        label="New leads"
        value={data.newLeads.value}
        icon={UserPlus}
        iconTint={METRIC_HUES.newLeads}
        deltaSlot={<KpiDelta stat={data.newLeads} label="vs prior 30d" />}
        sparkline={
          <KpiSparkline
            data={data.newLeads.spark}
            hue={METRIC_HUES.newLeads}
            label="Deals created by month, last 6 months"
          />
        }
      />
      <StatCard
        label="Total clients"
        value={data.totalClients.value}
        icon={Building2}
        iconTint={METRIC_HUES.totalClients}
        deltaSlot={<KpiDelta stat={data.totalClients} label="added vs prior 30d" />}
        sparkline={
          <KpiSparkline
            data={data.totalClients.spark}
            hue={METRIC_HUES.totalClients}
            label="Clients added by month, last 6 months"
          />
        }
      />
    </div>
  )
}
