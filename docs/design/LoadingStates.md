# Loading States

| | |
|---|---|
| **Document** | Loading State Specification — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [AnimationSystem.md](./AnimationSystem.md) · [EmptyStates.md](./EmptyStates.md) · [ErrorStates.md](./ErrorStates.md) · [Components.md](./Components.md) · [../11_Design_Principles.md](../11_Design_Principles.md) |

This document is the **target specification**. The shipped `packages/ui/components/skeleton.tsx` (`animate-pulse` block) is the structural anchor; the target binds it to content-shaped composition, the timing ladder, and the shimmer spec owned by [AnimationSystem.md](./AnimationSystem.md) §8.

---

## 1. Doctrine

Loading UI is **honesty about time**. The interface never pretends work finished that didn't, never shows progress it can't measure, and never leaves an interaction unacknowledged.

1. **Acknowledge everything within 100ms** ([../11_Design_Principles.md](../11_Design_Principles.md) §8.2). A state change, an optimistic render, or a skeleton — but always *something*. Dead air after a click is the fastest way to teach users the tool is slower than they are.
2. **Skeletons over spinners** (§8.4 of the bible). A spinner says "wait"; a skeleton says "here is the shape of what's coming". Spinners are permitted only at sub-element scale (§4).
3. **Never lie with fake progress.** No progress bars that ease to 90% and stall, no fabricated percentages, no "almost there…" theatrics. If duration is unknown, the indicator is honestly indeterminate ([../11_Design_Principles.md](../11_Design_Principles.md) §12.5).
4. **Zero layout shift.** When real content lands, nothing moves. Layout is reserved before data arrives — this is a merge requirement, not a preference.

## 2. The decision ladder

Expected duration picks the treatment. These thresholds are **pinned** — features do not invent their own.

| Band | Duration | Treatment |
|---|---|---|
| Instant | <100ms | Nothing. Render the result. Any indicator at this speed is flicker |
| Short | 100–300ms | Subtle only: inline button spinner if a button triggered it; otherwise nothing. Skeletons use the 150ms delay-in (§9) so sub-300ms loads never flash one |
| Medium | 300ms–2s | Content-shaped skeleton in the affected region (§3) |
| Long | 2–10s | Skeleton + one line of status text below or within the region, caption size, `--text-muted`: "Loading invoices…" — plain, present tense, no ellipsis animation |
| Very long | >10s | Determinate progress where measurable (§5); offer background-continue: "This may take a minute — we'll notify you when it's ready", with a toast on completion. The user is never held hostage by a long operation |

Duration bands are judged by **p75 expected latency**, not best case. A query that's usually 200ms but sometimes 3s gets the medium treatment with delay-in, not the instant one.

## 3. Skeleton system

### 3.1 Content-shaped law

A skeleton **matches the final layout exactly** — same grid, same dimensions, same rhythm. It is a wireframe of the truth, not a gray rectangle.

| Content | Skeleton shape |
|---|---|
| Text block | Lines at final line-height; last line ~60% width; heading lines at heading height |
| Avatar | Circle at exact avatar size (20/24/32px per [Components.md](./Components.md)) |
| Card | Card-radius block (8px) with internal header/body bones matching the card spec |
| Table | Header row + n body rows, **cells preserving real column widths**; row height matches density setting |
| Stat tile | Label line + oversized number line at numeral height |
| Chart | Full plot-area block + axis bones (baseline + left axis line); never a spinner in a chart slot |
| List row | Leading icon/avatar circle + primary line + shorter meta line |

Skeleton row count approximates expected content (default 5–8 rows), never a single lonely bar in a region that will hold twenty.

### 3.2 Motion & theming

- **Shimmer:** a subtle opacity pulse per [AnimationSystem.md](./AnimationSystem.md) §8 — **no gradient sweep**, no left-to-right shine. All skeletons on a surface pulse in phase; staggered pulsing reads as broken.
- **Theming:** neutral **step 3** base / **step 4** pulse peak in light; **D5** base / **D6** peak in dark. Radius follows the content it stands in for (6px controls, 8px cards).
- `prefers-reduced-motion`: pulse collapses to a static block ([../11_Design_Principles.md](../11_Design_Principles.md) §7).

### 3.3 Depth limit

- **The shell paints instantly, always.** Sidebar, top bar, page header, and toolbars are never skeletons — they render from local state. Skeletons live only in **content regions**.
- Each module ships a route-level `loading.tsx` whose skeleton mirrors that module's real layout. A generic shared "page skeleton" is banned — it guarantees layout shift.
- Nested regions load independently: a dashboard's tiles, chart, and activity feed each own their skeleton; one slow widget never skeletonizes its neighbors.

## 4. Spinners

There is **one spinner**: a 16px (dense UI) or 20px (nav/larger controls) circular stroke, one full rotation per **600ms**, linear, `currentColor`. No variants, no dots, no bouncing bars — motion detail in [AnimationSystem.md](./AnimationSystem.md).

| Context | Allowed? |
|---|---|
| Button in flight — button **keeps its width**, spinner renders inline beside the (retained) label | Yes |
| Inline async validation at a field's trailing edge ([Forms.md](./Forms.md) §6.4) | Yes |
| Sub-element refresh (a single stat tile refetching, search input while querying) | Yes |
| Full page, after the shell has painted | **Never** — use skeletons |
| Empty content regions while loading | **Never** — use skeletons |
| Inside charts, tables, or cards as the loading treatment | **Never** — use content-shaped skeletons |

A disabled-while-loading button keeps its label ("Sending…" is acceptable as a label swap; width still never changes).

## 5. Progress indicators

| Indicator | Spec | Use |
|---|---|---|
| Determinate bar | 4px height, `--accent-solid` on `--bg-raised` track, radius-full; percentage label optional at caption size | Uploads, imports, exports — **real percentages only**, derived from bytes/rows processed. Never animated past truth |
| Indeterminate bar | 2px bar pinned to the top edge of the affected **region** (not the viewport), looping slide | Background refresh of already-visible data (§8) — signals "updating" without disturbing content |
| Step progress | "Step n of m" + labeled steps; current step highlighted, completed steps checked | Wizards, imports with phases, agent plans (§7.3) |

**File-upload row** (composes with [Forms.md](./Forms.md) §5): per file — 16px type icon, name (middle-truncated), size, then by state: determinate bar while uploading → "Scanning…" badge while AV-scan is pending (file not linkable until clean) → success check, or inline danger caption + per-row Retry ghost button on failure. Multiple files never share one aggregate bar without per-row detail.

## 6. Optimistic UI

The standard pattern for high-frequency mutations (tasks, statuses, comments, reorderings), via the one shared TanStack Query mutation wrapper ([../11_Design_Principles.md](../11_Design_Principles.md) §8.3):

1. **Apply locally, instantly.** The UI reflects the change the moment the user acts.
2. **Pending affordance — pinned: no visual change for sub-second confirms.** An optimistic item looks *final*, not tentative. Only if the server hasn't confirmed after **1 second** does a subtle pending style apply (70% opacity on the affected element, no spinner). Justification: the entire value of optimism is that the action *feels done*; a ghosted row on every keystroke-fast mutation re-introduces the waiting it was meant to remove, and trains users to distrust their own completed actions. Sub-second failures are rare enough that rollback (step 4) covers them honestly.
3. **Reconcile silently.** Server response replaces local state with no visible transition when they match (the common case).
4. **Rollback loudly but gracefully.** On failure: revert the local change, then an undo-style toast — "Couldn't move the task — check your connection." with a **Retry** action. The toast explains and offers recovery; the reverted state is never left unexplained. (Error anatomy: [ErrorStates.md](./ErrorStates.md) §2.)

**Never optimistic:** money movements, anything destructive/irreversible, and outbound sends (email, portal publishes, invoices). These show honest in-flight states and confirm on server truth only.

**Multi-client conflicts:** realtime reconciliation wins. If another client's change lands mid-flight, the server result is authoritative; the local change is re-applied on top when compatible, or surfaced inline when not ("This task was moved by {name} while you edited it") — never silently dropped.

## 7. AI loading

Aurex working looks like a colleague working — visible steps, no theatrics.

1. **Thinking indicator.** Disclosed tool-use steps as calm rows in the response area: "Searching invoices… found 3", "Reading project brief…" — each row caption-size with a leading 16px spinner that becomes a check on completion. No pulsing orbs, no "AI is thinking ✨", no spinner theatrics.
2. **Streaming.** Layout reserved before tokens arrive (the response container takes its space immediately); steady token flow with no artificial typewriter throttling ([../11_Design_Principles.md](../11_Design_Principles.md) §7); a **Stop button is always visible** while streaming; partial content is real content — everything already rendered is selectable, copyable, and usable mid-stream.
3. **Long agent runs.** A plan card with step states (pending / running / done / failed / awaiting approval). The **pause-for-approval state** is visually distinct (accent border, Approve/Edit/Dismiss per the approval-card spec) — a paused plan must never read as a stuck one. Runs longer than the very-long band offer "Continue in background"; completion notifies via toast + notification entry.
4. **Digest & report generation** is always background: request → "I'll notify you when it's ready" → notification with a link. No held-open modal waiting on a report.

## 8. Route & navigation loading

- **Route transitions are instant.** Navigation swaps the content region immediately: cached data renders at once; uncached routes render their `loading.tsx` skeleton. The shell never blanks, the sidebar never flickers.
- **Prefetch on hover/focus** of nav items and entity links is the standing expectation — most navigations should land on the instant band of the ladder.
- **Stale-while-revalidate presentation:** when cached data exists, show it immediately with the 2px indeterminate region bar (§5) during revalidation. Updated data replaces content in place — no skeleton over data we already have. Skeletons are for *absence*, never for *staleness*.

## 9. Perceived performance rules

Three pinned timings that keep loading invisible at the edges (motion values live in [AnimationSystem.md](./AnimationSystem.md)):

| Rule | Value | Why |
|---|---|---|
| Delay-in | Skeletons appear only after **150ms** | Sub-150ms loads render as instant; no flash-of-skeleton on fast responses |
| Minimum display | Once shown, a skeleton persists ≥**300ms** | A skeleton that blinks for 40ms reads as a glitch; brief persistence reads as intent |
| Crossfade | Skeleton → content in a **150ms** opacity crossfade | Hard swap is jarring; anything slower feels like the *transition* is loading |

Net effect: loads <150ms show nothing; loads of 150–450ms show a calm ~300ms skeleton; longer loads resolve the moment data lands plus 150ms of fade. Combined with zero layout shift, content always *arrives* — it never *pops*.

## 10. Do / don't

| # | Do | Don't |
|---|---|---|
| 1 | Acknowledge every interaction within 100ms | Leave dead air between click and response |
| 2 | Build skeletons that mirror the final layout exactly | Ship generic gray boxes or a shared page skeleton |
| 3 | Preserve table column widths in skeleton rows | Let columns reflow when data lands |
| 4 | Keep button width constant with an inline spinner | Collapse a button to a spinner-only circle |
| 5 | Use the 150ms delay-in / 300ms minimum-display pair | Flash skeletons on fast loads |
| 6 | Show real percentages, or an honest indeterminate bar | Animate fake progress toward 90% |
| 7 | Render optimistic changes as final; pend only after 1s | Ghost every optimistic mutation instantly |
| 8 | Show cached data + thin refresh bar while revalidating | Skeleton over data the user already had |
| 9 | Disclose Aurex tool steps as calm labeled rows | Pulse an orb and call it "thinking" |
| 10 | Offer background-continue for >10s work | Trap users in a modal watching a long job |

## 11. Open questions

| # | Question | Leaning | Owner |
|---|---|---|---|
| 1 | Should the 1s optimistic-pending threshold adapt to measured connection quality? | Fixed 1s for v1; revisit with RUM data | Design eng |
| 2 | Skeleton composition API — per-module handwritten skeletons vs. a `<Skeleton.Table columns={…}>` kit in `packages/ui`? | Kit for table/list/card primitives; handwritten for bespoke layouts | Design eng |
| 3 | Does the indeterminate region bar appear for background *polling* refreshes, or only user-triggered ones? | User-triggered and focus-refetch only; silent for interval polling | CPD |
| 4 | Very-long band notification channel — toast only, or toast + notification-center entry always? | Both, since the user may navigate away | CPD |
| 5 | Should streaming AI responses reserve estimated height, or grow with a bottom-anchored container? | Grow with reserved minimum; measure jank in Phase 3 | Design eng + AI lead |
