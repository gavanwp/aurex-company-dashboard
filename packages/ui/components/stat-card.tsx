import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '../lib/utils'
import { Card } from './card'

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Short metric label, e.g. "Monthly recurring revenue". */
  label: string
  /** The headline figure. Rendered with tabular numerals. */
  value: React.ReactNode
  /** Change indicator, e.g. "+12.4%". */
  delta?: string
  /** Colors the delta: up = success, down = destructive, neutral = muted. */
  deltaTrend?: 'up' | 'down' | 'neutral'
  /** Supporting context, e.g. "vs last month". */
  hint?: string
  /** Optional Lucide icon shown in the top-right corner (or in the chip). */
  icon?: LucideIcon
  /**
   * Metric hue as a CSS variable name (e.g. `--chart-2`). When set, the icon
   * renders in a soft tinted chip — bg `hsl(var(--chart-n) / 0.12)`, icon
   * `hsl(var(--chart-n))` — per ColorSystem.md §7 (module hues: icon tints
   * only, never solid surfaces).
   */
  iconTint?: string
  /**
   * Rich delta row (e.g. a DeltaBadge with arrow + label). Takes precedence
   * over `delta`/`hint` — deltas are never color-only (Charts.md §5).
   */
  deltaSlot?: React.ReactNode
  /**
   * Sparkline slot rendered under the delta row (Charts.md §8: trend
   * context only — the value is the primary read).
   */
  sparkline?: React.ReactNode
}

const deltaTrendClasses: Record<NonNullable<StatCardProps['deltaTrend']>, string> = {
  up: 'text-success',
  down: 'text-destructive',
  neutral: 'text-muted-foreground',
}

/**
 * Dashboard stat tile built on Card: tinted icon chip + label, value,
 * delta row, and an optional sparkline (Components.md §4.8). Status is
 * never conveyed by color alone — pair the delta sign with its label.
 */
const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      label,
      value,
      delta,
      deltaTrend = 'neutral',
      hint,
      icon: Icon,
      iconTint,
      deltaSlot,
      sparkline,
      ...props
    },
    ref,
  ) => (
    <Card ref={ref} className={cn('p-4', className)} {...props}>
      <div className="flex items-center gap-2.5">
        {Icon ? (
          iconTint ? (
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-md"
              style={{
                backgroundColor: `hsl(var(${iconTint}) / 0.12)`,
                color: `hsl(var(${iconTint}))`,
              }}
              aria-hidden="true"
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
          ) : null
        ) : null}
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && !iconTint ? (
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : null}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-foreground [font-variant-numeric:tabular-nums]">
        {value}
      </div>
      {deltaSlot ? (
        <div className="mt-1">{deltaSlot}</div>
      ) : delta || hint ? (
        <p className="mt-1 flex items-baseline gap-1 text-xs">
          {delta ? (
            <span
              className={cn(
                'font-medium [font-variant-numeric:tabular-nums]',
                deltaTrendClasses[deltaTrend],
              )}
            >
              {delta}
            </span>
          ) : null}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </p>
      ) : null}
      {sparkline ? <div className="mt-3">{sparkline}</div> : null}
    </Card>
  ),
)
StatCard.displayName = 'StatCard'

export { StatCard }
