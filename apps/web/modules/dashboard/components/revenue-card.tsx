import { formatMoney } from '@aurexos/core'
import { BarChart, ChartContainer, DeltaBadge } from '@aurexos/ui/components/chart'
import type { RevenueSummary } from '../queries/get-dashboard'
import { METRIC_HUES } from './metric-meta'

/** Compact money for axis ticks: $1.2k / $3.4M (Charts.md §5). */
function compactMoney(minor: number): string {
  const dollars = minor / 100
  if (dollars >= 1_000_000) return `$${trimZero((dollars / 1_000_000).toFixed(1))}M`
  if (dollars >= 1_000) return `$${trimZero((dollars / 1_000).toFixed(1))}k`
  return `$${Math.round(dollars)}`
}

function trimZero(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value
}

function formatPct(pct: number): string {
  const rounded = Math.round(Math.abs(pct) * 10) / 10
  const digits = Number.isInteger(rounded) ? 0 : 1
  return `${pct >= 0 ? '+' : '−'}${rounded.toFixed(digits)}%`
}

/**
 * "Revenue overview" — paid invoices summed per month. With no paid
 * invoices yet it renders the designed empty state: chrome retained, a
 * quiet message in the plot area, and the first-invoice hint (Charts.md
 * §4, EmptyStates contract). No fake bars, ever.
 */
export function RevenueCard({ revenue }: { revenue: RevenueSummary }) {
  const empty = revenue.totalMinor === 0

  return (
    <ChartContainer
      title="Revenue overview"
      className="p-4"
      plotHeight={196}
      empty={empty}
      emptyMessage="No revenue yet — send your first invoice and paid months land here."
      summary={
        <>
          <span className="text-2xl font-bold text-foreground [font-variant-numeric:tabular-nums]">
            {formatMoney(revenue.thisMonthMinor)}
          </span>
          {revenue.deltaPct === null ? (
            <DeltaBadge value="—" trend="flat" tone="neutral" label="vs last month" />
          ) : (
            <DeltaBadge
              value={formatPct(revenue.deltaPct)}
              trend={revenue.trend}
              label="vs last month"
            />
          )}
        </>
      }
    >
      <BarChart
        data={revenue.byMonth.map((month) => ({
          label: month.label,
          value: month.totalMinor,
        }))}
        plotHeight={160}
        colorVar={METRIC_HUES.revenue}
        label={`Revenue by month, last 6 months, ${formatMoney(revenue.totalMinor)} total`}
        formatValue={(minor) => formatMoney(minor)}
        formatTick={compactMoney}
      />
    </ChartContainer>
  )
}
