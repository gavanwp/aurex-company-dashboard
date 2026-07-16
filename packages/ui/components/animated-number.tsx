'use client'

import * as React from 'react'

export interface AnimatedNumberProps {
  /** Target value; the display counts up from 0 to this once on mount. */
  value: number
  /** Format the (possibly fractional mid-animation) value for display. */
  format?: (value: number) => string
  /** Count-up duration in ms. */
  durationMs?: number
  className?: string
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * One-time count-up for stat tiles (ADR-0007). rAF-driven, interruptible, and
 * reduced-motion aware — it snaps to the final value when motion is reduced, so
 * the number is always correct and never gated behind the animation.
 */
export function AnimatedNumber({
  value,
  format,
  durationMs = 900,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = React.useState(value)
  const isInt = Number.isInteger(value)

  React.useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value)
      return
    }
    let raf = 0
    let startTs = 0
    const from = 0
    const tick = (now: number) => {
      if (!startTs) startTs = now
      const t = Math.min(1, (now - startTs) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplay(from + (value - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else setDisplay(value)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])

  const current = isInt ? Math.round(display) : display
  const text = format ? format(current) : current.toLocaleString()
  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  )
}
