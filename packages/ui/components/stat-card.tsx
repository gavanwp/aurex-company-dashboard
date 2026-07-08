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
  /** Optional Lucide icon shown in the top-right corner. */
  icon?: LucideIcon
}

const deltaTrendClasses: Record<
  NonNullable<StatCardProps['deltaTrend']>,
  string
> = {
  up: 'text-success',
  down: 'text-destructive',
  neutral: 'text-muted-foreground',
}

/**
 * Dashboard stat tile built on Card: label, value, and an optional
 * delta + hint row. Status is never conveyed by color alone — pair the
 * delta sign ("+"/"−") with the trend color.
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
      ...props
    },
    ref,
  ) => (
    <Card ref={ref} className={cn('p-6', className)} {...props}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <Icon
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground [font-variant-numeric:tabular-nums]">
        {value}
      </div>
      {delta || hint ? (
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
    </Card>
  ),
)
StatCard.displayName = 'StatCard'

export { StatCard }
