'use client'

import * as React from 'react'

import { cn } from '../../lib/utils'
import { useReducedMotion } from '../../hooks/use-reduced-motion'

/**
 * Streaming response text — docs/design/Components.md §6.6,
 * docs/design/Accessibility.md §11.
 *
 * Renders streamed AI text with layout reserved before tokens arrive
 * (min-height — the thread never jumps), a subtle ≤1Hz caret pulse while
 * streaming (static under prefers-reduced-motion), and buffered
 * `aria-live="polite"` announcements: the live region receives
 * paragraph-level chunks on a debounce, never per-token spam. Completion
 * is announced once ("Aurex finished responding").
 *
 * This is the design-system surface only — token transport, stop control,
 * and citations are wired by the consumer (Phase 3).
 */

export interface StreamingTextProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** The text received so far. */
  text: string
  /** Whether tokens are still arriving — shows the caret, defers final announce. */
  streaming?: boolean
  /** Reserved layout height in px so the thread never jumps. @default 48 */
  minHeight?: number
  /** Debounce for live-region paragraph announcements, ms. @default 800 */
  announceDelay?: number
  /** Sentence announced once when the stream completes. Pass '' to skip. */
  completionAnnouncement?: string
}

/** Index just past the last completed paragraph (…\n\n) in `text`. */
function completedBoundary(text: string): number {
  const i = text.lastIndexOf('\n\n')
  return i === -1 ? 0 : i + 2
}

/**
 * Streamed text block with reserved layout, pulsing caret, and a buffered
 * screen-reader live region announcing paragraph-level chunks.
 */
const StreamingText = React.forwardRef<HTMLDivElement, StreamingTextProps>(
  (
    {
      className,
      text,
      streaming = false,
      minHeight = 48,
      announceDelay = 800,
      completionAnnouncement = 'Aurex finished responding',
      ...props
    },
    ref,
  ) => {
    const reducedMotion = useReducedMotion()
    const [announced, setAnnounced] = React.useState('')
    const announcedUpTo = React.useRef(0)
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    // Buffered announcements: flush completed paragraphs on a debounce
    // while streaming; flush the remainder + completion note when done.
    React.useEffect(() => {
      if (timer.current) clearTimeout(timer.current)

      if (!streaming) {
        const rest = text.slice(announcedUpTo.current).trim()
        announcedUpTo.current = text.length
        const parts = [rest, completionAnnouncement].filter(Boolean)
        if (parts.length > 0) setAnnounced(parts.join('. '))
        return
      }

      const boundary = completedBoundary(text)
      if (boundary <= announcedUpTo.current) return

      timer.current = setTimeout(() => {
        const chunk = text.slice(announcedUpTo.current, boundary).trim()
        announcedUpTo.current = boundary
        if (chunk) setAnnounced(chunk)
      }, announceDelay)

      return () => {
        if (timer.current) clearTimeout(timer.current)
      }
    }, [text, streaming, announceDelay, completionAnnouncement])

    return (
      <div
        ref={ref}
        className={cn(
          'whitespace-pre-wrap text-sm leading-relaxed text-foreground',
          className,
        )}
        style={{ minHeight }}
        {...props}
      >
        {text}
        {streaming ? (
          <span
            aria-hidden="true"
            className="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 rounded-full bg-current"
            style={
              reducedMotion
                ? undefined
                : { animation: 'aurex-caret-pulse 1.2s ease-in-out infinite' }
            }
          />
        ) : null}
        {/* Buffered live region — paragraph chunks, never per-token. */}
        <span aria-live="polite" role="status" className="sr-only">
          {announced}
        </span>
      </div>
    )
  },
)
StreamingText.displayName = 'StreamingText'

export { StreamingText }
