'use client'

import * as React from 'react'

import { cn } from '../../lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'

/**
 * ✦ Aurex attribution mark — docs/design/Components.md §6.12,
 * docs/11_Design_Principles.md §9.
 *
 * The permanent, universal marker of AI work — the only emoji-like glyph
 * permitted in the UI, drawn as an inline SVG four-point star (never a text
 * emoji glyph). Rendered in `--accent-text` at 12/16px, optically aligned
 * to adjacent text. Small and calm: attribution, not branding. It never
 * appears on human-only work, and no AI work ships without it.
 *
 * When provenance props are given, the mark becomes a keyboard-openable
 * trigger revealing: when, from what instruction, approved by whom. The
 * glyph itself is `aria-hidden`; the information is exposed as text.
 */

/** Four-point star path for a 16×16 viewBox — gentle concave curves. */
const STAR_PATH =
  'M8 0.5 C8.6 4.4 11.6 7.4 15.5 8 C11.6 8.6 8.6 11.6 8 15.5 C7.4 11.6 4.4 8.6 0.5 8 C4.4 7.4 7.4 4.4 8 0.5 Z'

interface AurexGlyphProps extends React.SVGAttributes<SVGSVGElement> {
  size: 12 | 16
}

const AurexGlyph = ({ size, className, ...props }: AurexGlyphProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
    className={cn('shrink-0', className)}
    {...props}
  >
    <path d={STAR_PATH} />
  </svg>
)

export interface AurexMarkProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** Glyph size in px. @default 12 */
  size?: 12 | 16
  /**
   * Accessible name. "Created with Aurex" for AI-created work;
   * use "AI-assisted" for modified-not-created artifacts.
   * @default 'Created with Aurex'
   */
  label?: string
  /** Provenance: when the artifact was produced (absolute timestamp text). */
  when?: string
  /** Provenance: the prompt or automation that produced it. */
  instruction?: string
  /** Provenance: approver name + time, or the auto-approval policy line. */
  approver?: string
  /** Extra provenance content appended inside the hover card. */
  detail?: React.ReactNode
}

/**
 * The ✦ attribution mark. Renders as a static inline glyph, or — when any
 * provenance (`when` / `instruction` / `approver` / `detail`) is provided —
 * as a button opening a provenance popover on click/Enter.
 */
const AurexMark = React.forwardRef<HTMLElement, AurexMarkProps>(
  (
    {
      className,
      size = 12,
      label = 'Created with Aurex',
      when,
      instruction,
      approver,
      detail,
      ...props
    },
    ref,
  ) => {
    const hasProvenance = Boolean(when ?? instruction ?? approver ?? detail)
    const markClasses = cn(
      'inline-flex items-center align-baseline',
      className,
    )
    const color = { color: 'hsl(var(--accent-text))' }

    if (!hasProvenance) {
      return (
        <span
          ref={ref as React.Ref<HTMLSpanElement>}
          role="img"
          aria-label={label}
          className={markClasses}
          style={color}
          {...props}
        >
          <AurexGlyph size={size} />
        </span>
      )
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            ref={ref as React.Ref<HTMLButtonElement>}
            type="button"
            aria-label={label}
            className={cn(
              markClasses,
              'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
            style={color}
            {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          >
            <AurexGlyph size={size} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-2 text-xs">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <span style={color}>
              <AurexGlyph size={12} />
            </span>
            {label}
          </p>
          <dl className="space-y-1.5">
            {when ? (
              <div>
                <dt className="text-muted-foreground">When</dt>
                <dd className="text-foreground">{when}</dd>
              </div>
            ) : null}
            {instruction ? (
              <div>
                <dt className="text-muted-foreground">From instruction</dt>
                <dd className="line-clamp-3 text-foreground">{instruction}</dd>
              </div>
            ) : null}
            {approver ? (
              <div>
                <dt className="text-muted-foreground">Approved by</dt>
                <dd className="text-foreground">{approver}</dd>
              </div>
            ) : null}
          </dl>
          {detail}
        </PopoverContent>
      </Popover>
    )
  },
)
AurexMark.displayName = 'AurexMark'

export { AurexMark, AurexGlyph }
