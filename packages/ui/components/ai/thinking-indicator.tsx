'use client'

import * as React from 'react'
import { Check, Loader2, X } from 'lucide-react'

import { cn } from '../../lib/utils'
import { useReducedMotion } from '../../hooks/use-reduced-motion'
import { Button } from '../button'
import { AurexGlyph } from './aurex-mark'

/**
 * Thinking / working indicator — docs/design/Components.md §6.5,
 * docs/design/ErrorStates.md §6.
 *
 * Honest visibility while Aurex works: a pulsing ✦ (static under reduced
 * motion) with the current step line, and a disclosed tool-step list where
 * every row names a real action in user vocabulary ("Searching invoices…
 * found 3", never "invoking tool: finance.query"). Per-step state icons:
 * running spinner 16px / done check / failed ✕. Calm, no theatrics — and
 * never a `progressbar` role: there is no fraction, and fake progress is
 * banned.
 */

export interface ThinkingStep {
  id: string
  /** User-vocabulary step line, e.g. "Searching invoices… found 3". */
  label: string
  state: 'running' | 'done' | 'failed'
}

export interface ThinkingIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Disclosed tool steps, in execution order. Empty = bare "Thinking…". */
  steps?: ThinkingStep[]
  /** Header line while no step info exists yet. @default 'Thinking…' */
  label?: string
  /** Elapsed-time caption for long runs (>10s), e.g. "24s". */
  elapsed?: string
  /** Renders a Stop button for long-running work. */
  onStop?: () => void
  /** Swap the stalled copy in (>30s): "Still working — Stop?". */
  stalled?: boolean
}

const stepIcons: Record<ThinkingStep['state'], React.ReactNode> = {
  running: (
    <Loader2
      className="h-4 w-4 animate-spin text-muted-foreground"
      aria-hidden="true"
    />
  ),
  done: <Check className="h-4 w-4 text-success" aria-hidden="true" />,
  failed: <X className="h-4 w-4 text-destructive" aria-hidden="true" />,
}

const stepStateText: Record<ThinkingStep['state'], string> = {
  running: 'in progress',
  done: 'done',
  failed: 'failed',
}

/**
 * Disclosed tool-step list with a pulsing ✦ header. Step changes are
 * announced politely via a single live region on the current step line —
 * batch upstream updates ≥3s apart (§6.5).
 */
const ThinkingIndicator = React.forwardRef<
  HTMLDivElement,
  ThinkingIndicatorProps
>(
  (
    {
      className,
      steps = [],
      label = 'Thinking…',
      elapsed,
      onStop,
      stalled = false,
      ...props
    },
    ref,
  ) => {
    const reducedMotion = useReducedMotion()
    const running = steps.find((step) => step.state === 'running')
    const headline = stalled
      ? 'Still working'
      : (running?.label ?? label)

    return (
      <div
        ref={ref}
        className={cn('text-sm', className)}
        {...props}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            style={{
              color: 'hsl(var(--accent-text))',
              animation: reducedMotion
                ? undefined
                : 'aurex-mark-pulse 1.2s ease-in-out infinite',
            }}
          >
            <AurexGlyph size={12} />
          </span>
          <span aria-live="polite" role="status" className="text-muted-foreground">
            {headline}
          </span>
          {elapsed ? (
            <span className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
              {elapsed}
            </span>
          ) : null}
          {onStop ? (
            <Button variant="ghost" size="sm" onClick={onStop}>
              Stop
            </Button>
          ) : null}
        </div>
        {steps.length > 0 ? (
          <ol className="mt-2 space-y-1.5" aria-label="Steps">
            {steps.map((step) => (
              <li key={step.id} className="flex items-center gap-2">
                {stepIcons[step.state]}
                <span
                  className={cn(
                    step.state === 'failed'
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                  <span className="sr-only">, {stepStateText[step.state]}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    )
  },
)
ThinkingIndicator.displayName = 'ThinkingIndicator'

export { ThinkingIndicator }
