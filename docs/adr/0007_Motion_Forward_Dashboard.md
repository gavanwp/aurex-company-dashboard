# ADR 0007 — Motion-forward dashboard (amends AnimationSystem.md)

|                          |                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Status**               | Accepted                                                                                                                    |
| **Date**                 | 2026-07-15                                                                                                                  |
| **Deciders**             | Founding CTO / Owner                                                                                                        |
| **Supersedes (in part)** | `docs/design/AnimationSystem.md` §3 (no load animation), §4 (no hover lift), §5 (instant routes), §13-Q1 (no stat count-up) |

## Context

`AnimationSystem.md` codifies a deliberately minimal, "invisible motion" philosophy
(Linear/Stripe restraint). The product owner has decided the app should instead
present a **more overtly animated, professional-dashboard feel** — entrance motion
on page load, staggered reveal of grids, hover elevation on cards, animated stat
count-ups, and a per-navigation content transition.

This is a product/brand decision the owner is entitled to make (12_Project_Rules
§10). It changes what four rules mandate, so it is recorded here rather than left
as silent drift.

## Decision

Adopt a motion-forward layer, implemented **CSS-first** so it composes with the
RSC architecture (no client-ifying pages; `packages/ai`/RSC pages stay server —
consistent with PROJECT_STATE §8 keeping framer-motion unused):

1. **Page entrance** — an `(os)/template.tsx` wraps every route's content and
   re-runs a short fade-and-rise on each navigation (`aurex-page-enter`).
2. **Staggered reveal** — grids/lists opt in via `.aurex-reveal`; direct children
   rise in sequence (capped delay, first ~12 items).
3. **Hover elevation** — `Card interactive` gains a 2px lift + soft shadow on hover.
4. **Stat count-ups** — numeric `StatCard` values animate 0→value once on mount
   (`AnimatedNumber`).
5. **Shimmer skeletons** — loading blocks sweep instead of a flat pulse.

## Constraints kept (non-negotiable)

- **Reduced motion still wins.** The global `prefers-reduced-motion` collapse in
  `globals.css` zeroes every animation; `AnimatedNumber` snaps to its final value.
  Content is always present at the animation's end-state, never gated behind it.
- **Transform + opacity only** (60fps; no layout animation). Count-up is the one
  JS-driven value, rAF-based and interruptible.
- **One accent, border-first, WCAG AA, sentence case** — unchanged. This ADR adds
  motion; it does not touch the color/type/elevation systems.
- **No looping/ambient/attention motion.** Entrances play once; nothing pulses for
  attention (the single sanctioned approval-badge pulse is unaffected).

## Consequences

- `AnimationSystem.md` is now read together with this ADR; where they conflict on
  the five items above, this ADR governs. The lint rule banning ad-hoc keyframes
  is relaxed for the shared `aurex-*` utilities in `globals.css` (still centralized,
  still one source).
- Motion is centralized in `globals.css` + a few shared components, so it stays a
  single system and remains tunable/reversible from one place.
