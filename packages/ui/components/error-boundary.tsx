'use client'

import * as React from 'react'
import { AlertCircle } from 'lucide-react'

import { cn } from '../lib/utils'
import { Button } from './button'

/**
 * Error boundary — docs/design/ErrorStates.md.
 *
 * Renders the region error band (§2) or the full-page failure layout (§3)
 * when a subtree throws. Follows the voice law: what failed, why when
 * known, what to do next — calm colleague copy, no raw codes as user copy
 * (R-Q6). Every recovery is one affordance away: Retry resets the boundary
 * and re-renders the children. Unexpected errors show a subtle reference id
 * (caption, muted, monospace) for support threads.
 */

export interface ErrorBoundaryProps {
  children: React.ReactNode
  /**
   * "region": in-region error band filling the widget/table/chart slot —
   * one failed region never escalates to a page failure.
   * "page": content-region failure layout; the shell stays alive.
   * @default 'region'
   */
  variant?: 'region' | 'page'
  /** What failed, ≤6 words, sentence case, no terminal period. */
  title?: string
  /** One–two sentences: why (when known) and what to do. */
  description?: string
  /**
   * Support reference id shown as a caption below the recovery actions
   * ("Reference: AX-4F2K9"). Provide from your error-capture pipeline —
   * unexpected errors only; validation/permission errors carry none.
   */
  referenceId?: string | ((error: Error) => string | undefined)
  /** Capture hook — wire to Sentry. An error UI that renders uncaptured is a bug (§9). */
  onError?: (error: Error, info: React.ErrorInfo) => void
  /** Called after the boundary resets (Retry). Use to refetch the region's data. */
  onReset?: () => void
  /** Full custom fallback; receives the error and the reset function. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode
  className?: string
}

interface ErrorBoundaryState {
  error: Error | null
}

const defaultCopy: Record<
  NonNullable<ErrorBoundaryProps['variant']>,
  { title: string; description: string }
> = {
  region: {
    title: "Couldn't load this",
    description: 'The data didn’t come back in time. Retrying usually fixes it.',
  },
  page: {
    title: 'Something broke on our side',
    description:
      'Your data is safe — this is a problem in the app, not your work. Retrying usually fixes it.',
  },
}

/**
 * Class error boundary with the ErrorStates.md region-error-band fallback.
 * Retry resets the boundary; the region keeps its reserved size — no
 * layout shift on failure.
 */
class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.props.onError?.(error, info)
  }

  reset = (): void => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  override render(): React.ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    const {
      variant = 'region',
      title,
      description,
      referenceId,
      fallback,
      className,
    } = this.props

    if (fallback) return fallback(error, this.reset)

    const copy = defaultCopy[variant]
    const resolvedReference =
      typeof referenceId === 'function' ? referenceId(error) : referenceId

    const reference = resolvedReference ? (
      <p className="text-xs text-muted-foreground">
        Reference: <span className="font-mono">{resolvedReference}</span>
      </p>
    ) : null

    if (variant === 'page') {
      return (
        <div
          role="alert"
          className={cn(
            'flex min-h-[320px] flex-col items-center justify-center p-8 text-center',
            className,
          )}
        >
          <div className="max-w-sm">
            <AlertCircle
              className="mx-auto h-5 w-5 text-destructive"
              aria-hidden="true"
            />
            <h2 className="mt-3 text-sm font-semibold text-foreground">
              {title ?? copy.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {description ?? copy.description}
            </p>
            <div className="mt-4">
              <Button onClick={this.reset}>Retry</Button>
            </div>
            {reference ? <div className="mt-3">{reference}</div> : null}
          </div>
        </div>
      )
    }

    return (
      <div
        role="alert"
        className={cn(
          'flex h-full min-h-[120px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-6 text-center',
          className,
        )}
      >
        <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
        <p className="mt-1 text-sm font-medium text-foreground">
          {title ?? copy.title}
        </p>
        <p className="text-sm text-muted-foreground">
          {description ?? copy.description}
        </p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={this.reset}>
          Retry
        </Button>
        {reference}
      </div>
    )
  }
}

export { ErrorBoundary }
