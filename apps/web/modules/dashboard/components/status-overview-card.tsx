import Link from 'next/link'
import { Card } from '@aurexos/ui/components/card'
import { DonutChart, type DonutChartSegment } from '@aurexos/ui/components/chart'

export interface StatusOverviewSegment extends DonutChartSegment {
  /** Stable key for list rendering. */
  status: string
}

export interface StatusOverviewCardProps {
  /** Card title, e.g. "Projects overview". */
  title: string
  /** Caption under the donut's center total, e.g. "projects". */
  totalCaption: string
  /** Every status listed — zeros included. */
  segments: StatusOverviewSegment[]
  viewAllHref: string
  viewAllLabel: string
}

/**
 * Donut + legend widget (mockup second row). The legend lists every
 * status with count and share; the donut renders a quiet neutral ring at
 * zero total. Footer deep-links to the source module (DashboardRules.md
 * §6.3 — every stat clicks through to the view that produced it).
 */
export function StatusOverviewCard({
  title,
  totalCaption,
  segments,
  viewAllHref,
  viewAllLabel,
}: StatusOverviewCardProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  return (
    <Card className="flex flex-col p-4">
      <h3 className="text-[15px] font-semibold leading-[22px] text-foreground">{title}</h3>

      <div className="mt-4 flex flex-1 flex-wrap items-center gap-6">
        <DonutChart
          data={segments}
          size={144}
          thickness={14}
          label={`${title}: ${total} ${totalCaption} by status`}
          center={
            <>
              <span className="text-2xl font-bold text-foreground [font-variant-numeric:tabular-nums]">
                {total}
              </span>
              <span className="text-xs text-muted-foreground">{totalCaption}</span>
            </>
          }
        />

        <ul className="min-w-[10rem] flex-1 space-y-2" aria-hidden="true">
          {segments.map((segment) => (
            <li key={segment.status} className="flex items-center gap-2 text-sm">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: `hsl(var(${segment.colorVar}))` }}
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{segment.label}</span>
              <span className="font-medium text-foreground [font-variant-numeric:tabular-nums]">
                {segment.value}
              </span>
              <span className="w-12 text-right text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                {total > 0 ? `${((segment.value / total) * 100).toFixed(1)}%` : '0%'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 border-t pt-3">
        <Link
          href={viewAllHref}
          className="text-sm font-medium text-[hsl(var(--accent-text))] transition-colors hover:underline"
        >
          {viewAllLabel}
        </Link>
      </div>
    </Card>
  )
}
