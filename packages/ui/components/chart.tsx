import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react'

import { cn } from '../lib/utils'
import { Button } from './button'
import { Skeleton } from './skeleton'

/**
 * Token-driven chart primitives — docs/design/Charts.md.
 *
 * These are the micro-visualization and chart-chrome primitives (§4, §8):
 * container anatomy, sparklines, progress bars/rings, delta badges, and
 * health dots. They deliberately ship without a charting library.
 *
 * Full cartesian charts (Recharts/visx-class line, bar, area, donut) land
 * with the Analytics module and MUST consume the same `--chart-1..6` tokens
 * via {@link chartSeriesColor} — a hardcoded hex in a chart is a lint
 * failure (Charts.md §1.3). Series-to-hue assignment rules live in
 * Charts.md §2.1 and are enforced at the metric registry, not here.
 */

/**
 * Returns the CSS color for a categorical series by zero-based index,
 * cycling through the six ramp tokens (`--chart-1` … `--chart-6`).
 *
 * More than six series is a design smell — aggregate into a neutral
 * "Other" instead of extending the ramp (Charts.md §2.2).
 */
export function chartSeriesColor(index: number): string {
  const step = ((Math.trunc(Math.abs(index)) % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6
  return `hsl(var(--chart-${step}))`
}

/* -------------------------------------------------------------------------
 * ChartContainer — the chart anatomy shell (Charts.md §4)
 * ---------------------------------------------------------------------- */

export interface ChartContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** title-3, phrased as the subject of the chart's one question. */
  title: string
  /** Optional info tooltip slot (metric definition + source), rendered after the title. */
  info?: React.ReactNode
  /** Optional timeframe/legend slot, rendered top-right. */
  timeframe?: React.ReactNode
  /** Optional value-summary row (700 tabular numerals + DeltaBadge). */
  summary?: React.ReactNode
  /** Loading: renders a chart-shaped skeleton in the plot region — zero layout shift. */
  loading?: boolean
  /** Empty: renders a quiet plot-area message, chrome retained (EmptyStates.md). */
  empty?: boolean
  /** Copy for the empty plot region. */
  emptyMessage?: string
  /** Error: what failed, in colleague voice — renders the inline retry band. */
  error?: string | null
  /** Refetches the region only (ErrorStates.md §2 region error band). */
  onRetry?: () => void
  /** Reserved plot height in px, held across loading/empty/error. @default 192 */
  plotHeight?: number
}

/**
 * Chart chrome per Charts.md §4: title-3 + optional info tooltip, top-right
 * timeframe/legend slot, optional value summary, and a plot region with
 * designed loading / empty / error states. Never a spinner in a plot area.
 */
const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  (
    {
      className,
      title,
      info,
      timeframe,
      summary,
      loading = false,
      empty = false,
      emptyMessage = 'No data for this period',
      error,
      onRetry,
      plotHeight = 192,
      children,
      ...props
    },
    ref,
  ) => {
    let plot: React.ReactNode = children
    if (loading) {
      plot = (
        <div
          className="flex h-full flex-col justify-end gap-2"
          aria-hidden="true"
        >
          <Skeleton className="h-2/3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      )
    } else if (error) {
      plot = (
        <div
          role="alert"
          className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center"
        >
          <AlertCircle
            className="h-5 w-5 text-destructive"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">{error}</p>
          {onRetry ? (
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      )
    } else if (empty) {
      plot = (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-4">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )
    }

    return (
      <figure
        ref={ref}
        className={cn(
          'rounded-lg border bg-card p-6 text-card-foreground',
          className,
        )}
        {...props}
      >
        <figcaption className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {title}
            </span>
            {info}
          </div>
          {timeframe ? (
            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              {timeframe}
            </div>
          ) : null}
        </figcaption>
        {summary ? (
          <div className="mt-1 flex items-baseline gap-2">{summary}</div>
        ) : null}
        <div className="mt-4" style={{ height: plotHeight }}>
          {plot}
        </div>
      </figure>
    )
  },
)
ChartContainer.displayName = 'ChartContainer'

/* -------------------------------------------------------------------------
 * Sparkline — stat-tile micro trend (Charts.md §8)
 * ---------------------------------------------------------------------- */

export interface SparklineProps extends React.SVGAttributes<SVGSVGElement> {
  /** Series values in order. Fewer than 2 points renders nothing. */
  data: number[]
  /** Rendered width in px (the viewBox scales to fit). @default 120 */
  width?: number
  /** Rendered height in px. @default 32 */
  height?: number
  /** Line weight in px. @default 1.5 */
  strokeWidth?: number
  /**
   * Concise text alternative ("Revenue, trending up 12%"). Without it the
   * sparkline is decorative and hidden from assistive tech — the adjacent
   * stat value must carry the read (Charts.md §10).
   */
  label?: string
}

/**
 * Inline SVG polyline sparkline (Charts.md §8): 1.5px line, no axes, no
 * gridlines, no tooltip; last point dotted. Stroke is `currentColor` — set
 * the metric's registered hue on the parent (e.g. via chartSeriesColor).
 * Trend context only; the number next to it is the primary read.
 */
const Sparkline = React.forwardRef<SVGSVGElement, SparklineProps>(
  (
    {
      className,
      data,
      width = 120,
      height = 32,
      strokeWidth = 1.5,
      label,
      ...props
    },
    ref,
  ) => {
    if (data.length < 2) return null

    const pad = strokeWidth + 1.5
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const stepX = (width - pad * 2) / (data.length - 1)
    const points = data.map((value, i) => {
      const x = pad + i * stepX
      const y = pad + (1 - (value - min) / range) * (height - pad * 2)
      return [x, y] as const
    })
    const last = points[points.length - 1] as readonly [number, number]

    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={cn('shrink-0', className)}
        {...props}
      >
        <polyline
          points={points.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={last[0]} cy={last[1]} r={strokeWidth + 0.5} fill="currentColor" />
      </svg>
    )
  },
)
Sparkline.displayName = 'Sparkline'

/* -------------------------------------------------------------------------
 * ProgressBar — honest progress (Charts.md §8, LoadingStates.md §5,
 * Components.md §2.15)
 * ---------------------------------------------------------------------- */

const progressBarVariants = cva('relative w-full overflow-hidden rounded-full bg-muted', {
  variants: {
    size: {
      inline: 'h-1',
      surface: 'h-1.5',
    },
    tone: {
      accent: '[&>[data-fill]]:bg-primary',
      success: '[&>[data-fill]]:bg-success',
      warning: '[&>[data-fill]]:bg-warning',
      danger: '[&>[data-fill]]:bg-destructive',
    },
  },
  defaultVariants: {
    size: 'inline',
    tone: 'accent',
  },
})

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressBarVariants> {
  /**
   * Real fraction 0–100. Omit for an honestly indeterminate sliding band —
   * only when the total is genuinely unknown (LoadingStates.md: never fake
   * progress). Values >100 cap the fill; state the overflow in text.
   */
  value?: number
  /** Optional label rendered above with the percentage (tabular numerals). */
  label?: string
  /** Accessible name when no visible label is given. */
  'aria-label'?: string
}

/**
 * Determinate/indeterminate progress bar (Charts.md §8): 4px inline / 6px
 * surface track on `bg-muted`, fill in the metric hue; label + percentage
 * adjacent and tabular. Indeterminate omits `aria-valuenow`.
 */
const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    { className, size, tone, value, label, 'aria-label': ariaLabel, ...props },
    ref,
  ) => {
    const determinate = typeof value === 'number'
    const clamped = determinate ? Math.max(0, Math.min(100, value)) : 0

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {label ? (
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{label}</span>
            {determinate ? (
              <span className="font-medium text-foreground [font-variant-numeric:tabular-nums]">
                {Math.round(clamped)}%
              </span>
            ) : null}
          </div>
        ) : null}
        <div
          role="progressbar"
          aria-label={label ?? ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={determinate ? Math.round(clamped) : undefined}
          className={progressBarVariants({ size, tone })}
        >
          {determinate ? (
            <div
              data-fill
              className="h-full rounded-full transition-[width] duration-200 ease-out"
              style={{ width: `${clamped}%` }}
            />
          ) : (
            <div
              data-fill
              className="h-full w-1/3 rounded-full"
              style={{
                animation:
                  'aurex-progress-indeterminate 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              }}
            />
          )}
        </div>
      </div>
    )
  },
)
ProgressBar.displayName = 'ProgressBar'

/* -------------------------------------------------------------------------
 * ProgressRing — circular progress where geometry earns space (Charts.md §8)
 * ---------------------------------------------------------------------- */

export interface ProgressRingProps
  extends Omit<React.SVGAttributes<SVGSVGElement>, 'children'> {
  /** Real fraction 0–100. Overflow caps at the full ring. */
  value: number
  /** Outer size in px. @default 32 */
  size?: number
  /** Ring stroke width in px. @default 3 */
  strokeWidth?: number
  /** Accessible name, e.g. "Tasks complete". */
  label?: string
  /** Center content; defaults to the rounded percentage. Pass `null` to hide. */
  center?: React.ReactNode
}

/**
 * 32px progress ring (Charts.md §8) — same honesty rules as bars; the
 * center shows the value. Rings only where circular geometry earns the
 * space (avatars, compact tiles).
 */
const ProgressRing = React.forwardRef<SVGSVGElement, ProgressRingProps>(
  (
    { className, value, size = 32, strokeWidth = 3, label, center, ...props },
    ref,
  ) => {
    const clamped = Math.max(0, Math.min(100, value))
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - clamped / 100)

    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        className={cn('shrink-0', className)}
        {...props}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc starts at 12 o'clock via SVG-native rotation. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dashoffset] duration-200 ease-out"
        />
        {center === null ? null : (
          <text
            x="50%"
            y="50%"
            dominantBaseline="central"
            textAnchor="middle"
            className="fill-foreground font-medium [font-variant-numeric:tabular-nums]"
            style={{ fontSize: size / 3.2 }}
            aria-hidden="true"
          >
            {center ?? `${Math.round(clamped)}`}
          </text>
        )}
      </svg>
    )
  },
)
ProgressRing.displayName = 'ProgressRing'

/* -------------------------------------------------------------------------
 * DeltaBadge — arrow + sign + color + label, never color alone
 * (Charts.md §5 deltas, Components.md §4.8)
 * ---------------------------------------------------------------------- */

export interface DeltaBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Formatted delta including its sign, e.g. "+12%" / "−4.2%". */
  value: string
  /** Direction of the change — drives the arrow, not the color. */
  trend: 'up' | 'down' | 'flat'
  /**
   * Whether the change is good/bad/neutral — drives the color. "Up is good"
   * is never assumed: a cost going down is `trend="down" tone="positive"`.
   * @default derived from trend (up→positive, down→negative, flat→neutral)
   */
  tone?: 'positive' | 'negative' | 'neutral'
  /** Comparison label — mandatory context, e.g. "vs last period". */
  label: string
}

const deltaToneClasses: Record<
  NonNullable<DeltaBadgeProps['tone']>,
  string
> = {
  positive: 'text-success',
  negative: 'text-destructive',
  neutral: 'text-muted-foreground',
}

const deltaTrendIcons = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
} as const

/**
 * Delta indicator per Charts.md §5.4: direction encoded four ways —
 * arrow + sign + color + label. Color follows meaning (tone), never
 * direction; the comparison label is never omitted.
 */
const DeltaBadge = React.forwardRef<HTMLSpanElement, DeltaBadgeProps>(
  ({ className, value, trend, tone, label, ...props }, ref) => {
    const resolvedTone =
      tone ??
      (trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : 'neutral')
    const Arrow = deltaTrendIcons[trend]

    return (
      <span
        ref={ref}
        className={cn('inline-flex items-baseline gap-1 text-xs', className)}
        {...props}
      >
        <span
          className={cn(
            'inline-flex items-center gap-0.5 font-medium [font-variant-numeric:tabular-nums]',
            deltaToneClasses[resolvedTone],
          )}
        >
          <Arrow className="h-3 w-3 self-center" aria-hidden="true" />
          {value}
        </span>
        <span className="text-muted-foreground">{label}</span>
      </span>
    )
  },
)
DeltaBadge.displayName = 'DeltaBadge'

/* -------------------------------------------------------------------------
 * HealthDot — status dot, never color alone (Charts.md §8)
 * ---------------------------------------------------------------------- */

const healthDotVariants = cva('inline-block h-2 w-2 shrink-0 rounded-full', {
  variants: {
    status: {
      success: 'bg-success',
      warning: 'bg-warning',
      danger: 'bg-destructive',
      neutral: 'bg-muted-foreground',
    },
  },
  defaultVariants: {
    status: 'neutral',
  },
})

export interface HealthDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof healthDotVariants> {
  /**
   * Required — a bare colored dot is a color-only signal and banned
   * (Charts.md §8, 11_Design_Principles.md §5). Rendered next to the dot;
   * pass `labelHidden` to keep it screen-reader-only in ultra-dense rows.
   */
  label: string
  /** Visually hide the label (it remains the accessible name). */
  labelHidden?: boolean
}

/**
 * 8px health/status dot with a mandatory label (Charts.md §8). Status is
 * carried by the text; the color is reinforcement, never the message.
 */
const HealthDot = React.forwardRef<HTMLSpanElement, HealthDotProps>(
  ({ className, status, label, labelHidden = false, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('inline-flex items-center gap-1.5 text-xs', className)}
      {...props}
    >
      <span className={healthDotVariants({ status })} aria-hidden="true" />
      <span className={cn(labelHidden ? 'sr-only' : 'text-muted-foreground')}>
        {label}
      </span>
    </span>
  ),
)
HealthDot.displayName = 'HealthDot'

export {
  ChartContainer,
  Sparkline,
  ProgressBar,
  progressBarVariants,
  ProgressRing,
  DeltaBadge,
  HealthDot,
  healthDotVariants,
}
