'use client'

import { useMediaQuery } from './use-media-query'

/**
 * Whether the user prefers reduced motion (AnimationSystem.md,
 * DesignTokens.md §9). Returns `false` on the server and during the first
 * client render, then tracks `(prefers-reduced-motion: reduce)`.
 *
 * The global CSS collapse in styles/globals.css already neutralizes CSS
 * animations; use this hook when a component needs to branch behavior
 * (e.g. skip an animated caret, snap instead of spring).
 *
 * @example const reducedMotion = useReducedMotion()
 */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
