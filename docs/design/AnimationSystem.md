# Animation System

|              |                                                                                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Document** | Animation System — AurexOS Design System                                                                                                                                                                     |
| **Status**   | Approved — Living Document                                                                                                                                                                                   |
| **Version**  | 1.0                                                                                                                                                                                                          |
| **Date**     | 2026-07-08                                                                                                                                                                                                   |
| **Owner**    | Chief Product Designer, AurexDesigns                                                                                                                                                                         |
| **Related**  | [../11_Design_Principles.md](../11_Design_Principles.md) · [DesignTokens.md](./DesignTokens.md) · [Components.md](./Components.md) · [Accessibility.md](./Accessibility.md) · [Elevation.md](./Elevation.md) |

> **Amended by [ADR-0007](../adr/0007_Motion_Forward_Dashboard.md) (2026-07-15):** the product adopted a **motion-forward** profile — page-entrance motion, staggered grid reveal, card hover-lift, stat count-ups, shimmer skeletons — implemented CSS-first (`aurex-*` utilities in `globals.css`). Where this document's §3 (no load animation), §4 (no hover lift), §5 (instant routes), and §13-Q1 (no count-up) conflict with that profile, **ADR-0007 governs**. The reduced-motion contract (§10), transform/opacity-only performance law (§11), and one-accent/AA visual rules are unchanged and still binding.

This document owns **motion choreography**: the shared variant library, per-pattern rules, and performance law. Motion token values are registered in [DesignTokens.md §9](./DesignTokens.md); the reduced-motion global rule ships in `packages/ui/styles/globals.css`. All motion is implemented with **Framer Motion only**, wrapped in shared variants in `packages/ui/motion` — ad-hoc keyframes or per-feature transition values are a lint failure ([11 §7](../11_Design_Principles.md)).

---

## 1. Motion philosophy

**Motion is information.** Every animation in AurexOS answers exactly one of three questions:

| Question                                      | Motion's job                                | Example                                                                      |
| --------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| **Origin** — where did this come from?        | Surface enters from its trigger or edge     | Popover scales from its trigger corner; drawer slides from the right edge    |
| **Relationship** — what is this connected to? | Continuity between states of the same thing | Sidebar label crossfades into icon rail; tab underline slides to the new tab |
| **Confirmation** — did that work?             | A brief, singular acknowledgment            | Check morph on save; toast slides in once                                    |

If an animation answers none of these, it does not exist. Decorative motion, looping ambience, attention-seeking bounces, and celebration confetti are banned outright.

**Restraint is the premium signal.** Linear, Stripe, and Apple feel expensive because their motion is nearly invisible — short, physical, and consistent. The test for every animation:

> **If a user notices the animation itself — rather than the information it carries — it is too much.** Shorten it, reduce it, or delete it.

Corollaries:

- Speed is the personality ([11 §1](../11_Design_Principles.md)). When in doubt between two durations, pick the shorter. When in doubt between animating and not animating, don't.
- Motion never blocks input. Every transition is interruptible; users can act mid-animation and the animation yields.
- One system. The same pattern (menu, panel, dialog) moves identically in every module, both themes, forever.

## 2. Motion tokens

Token values are owned by the [DesignTokens.md §9](./DesignTokens.md) registry — this table is a working reference, not a second source of truth.

| Token           | Value                                 | Role                                                                              |
| --------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| `duration-fast` | 150ms                                 | Micro-interactions: hover transitions, toggles, menus, tabs, toasts, check morphs |
| `duration-base` | 200ms                                 | Surface transitions: panels, drawers, dialogs, collapse/expand, sidebar width     |
| `duration-slow` | 250ms                                 | Absolute maximum, large surfaces only — requires design sign-off to use           |
| `ease-enter`    | `cubic-bezier(0, 0, 0.2, 1)`          | Everything entering (ease-out — fast start, gentle landing)                       |
| `ease-exit`     | `cubic-bezier(0.4, 0, 1, 1)`          | Everything exiting (ease-in — exits get out of the way)                           |
| `spring-drag`   | stiffness ≈ 500, damping ≈ 40, mass 1 | **The one spring.** Drag-and-drop only (§6). No other spring configs exist        |

Rules:

- These six tokens are the entire motion vocabulary. A seventh requires amending the registry.
- No linear easing for movement (linear is for the spinner rotation and shimmer only). No bounce/overshoot easings anywhere.
- Enter and exit are asymmetric by design: exits use `ease-exit` and may run at ~80% of the enter duration — dismissal should feel immediate.

## 3. The shared variant library

`packages/ui/motion` exports the canonical variants below. Features compose these; they never define their own. A new variant is a design-system change reviewed like an API change.

| Variant      | Duration       | Choreography                                                                                                   | Used by                                                         |
| ------------ | -------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `fade`       | 150ms          | Opacity 0 → 1                                                                                                  | Tooltips, ghost text appearance, crossfades                     |
| `fadeScale`  | 150ms          | Opacity 0 → 1 + scale 0.98 → 1, **transform-origin set from the trigger side**                                 | Menus, popovers, dropdowns, date pickers, hover cards           |
| `slidePanel` | 200ms          | X-translate from the owning edge (right panel: +24px → 0) + fade                                               | Right context panel, drawers, mobile sheets (y-translate)       |
| `dialog`     | 200ms          | Opacity 0 → 1 + scale 0.97 → 1 from center; scrim fades in parallel                                            | Dialogs, confirmation modals                                    |
| `palette`    | 150ms          | Opacity + scale 0.98 → 1 from top-center. **No bounce, no slide-down theatrics** — the palette is a speed tool | Cmd+K command palette                                           |
| `collapse`   | 200ms          | Height animates between 0 and measured auto height + content fade                                              | Accordions, expandable rows, disclosure sections, filter panels |
| `listItem`   | 150ms per item | Enter: fade + 4px y-translate; exit: fade. Stagger ≤ **30ms** between items, capped at the first 5 items       | Rows/cards added or removed **by user action only**             |
| `checkMorph` | 150ms          | Icon path draws/morphs to checkmark, once                                                                      | Save confirmations, task completion, approval confirmations     |

Variant law:

- **`fadeScale` origin is never center for triggered surfaces.** A menu opened from a button grows from that button's corner — that's the origin information (§1). Radix's positioning data supplies the origin; the variant consumes it.
- **`listItem` stagger never runs on initial page load.** Initial data renders instantly (skeletons already did the waiting — animating arrival after a skeleton is animating twice). Stagger exists only to show cause and effect when the _user_ adds, removes, or reorders items. A page that "builds itself" row by row is a demo gimmick, not a work tool.
- **`collapse` measures, then animates.** Height is read from the DOM and animated to the pixel value — no `max-height: 9999px` hacks, no easing distortion.
- Exit variants always render — surfaces never pop out of existence while their scrim fades. Use Framer's presence handling via the shared wrappers.

## 4. Interaction motion

| Interaction                 | Rule                                                                                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hover**                   | 150ms transition on **color, background-color, and border-color only**. No scale, no lift, no shadow growth on hover — the sole exception is the kanban drag lift (§6), which is a grab, not a hover |
| **Press / active**          | Instant state change — zero transition. No scale-down "squish" gimmick. Pressing must read as _the tool responded_, not _the tool performed_                                                         |
| **Focus**                   | The focus ring appears **instantly** — never faded in, never animated. Focus is a functional state, not a moment ([Accessibility.md §4](./Accessibility.md))                                         |
| **Toggle / switch**         | 150ms thumb travel with `ease-enter`; track color transitions in parallel. No overshoot                                                                                                              |
| **Checkbox / radio**        | Instant fill; `checkMorph` draws the check within 150ms                                                                                                                                              |
| **Selection (rows, cards)** | Background color transition 150ms; no movement                                                                                                                                                       |

## 5. Navigation & page transitions

- **Route changes are instant.** No page-level fade, slide, or crossfade choreography — perceived response must stay under 100–150ms ([11 §8.2](../11_Design_Principles.md)), and skeletons do the perceptual work of loading, shaped like the destination. A page transition animation is time stolen from the user, every navigation, forever.
- **Right panel / drawers:** `slidePanel`, 200ms. Opening and closing never shifts focus-owning content mid-interaction; at `xl+` the docked panel reflows content with the same 200ms width transition.
- **Sidebar collapse (240px ↔ 64px rail):** 200ms width transition; labels crossfade out (`fade`) as icons remain fixed in place — icons must not travel, or the rail feels like a different component.
- **Tab switches:** content swaps instantly; the active-tab underline slides to its new position in 150ms — that slide is the relationship signal, the only motion a tab change gets.
- **Command palette:** `palette` variant in, `fade` out. Results list updates instantly with no per-keystroke animation.

## 6. Drag & drop

The one place motion gets physical — because the user's hand is literally in it.

- **The one spring:** `spring-drag` (stiffness ≈ 500, damping ≈ 40, mass 1) is defined once in `packages/ui/motion` and reused by every draggable surface — kanban boards, list reordering, dashboard widget arrangement, calendar event dragging. A second spring config is a lint failure.
- **Lift:** on grab, the item gets `shadow-1` ([Elevation.md](./Elevation.md)), a 2° tilt, and 1.02 scale — enough to read "in hand," not a hovering UFO. Siblings make room with the same spring.
- **Drop:** the item settles into its slot on the spring — one settle, no secondary bounce. The drop target's highlight clears instantly.
- **Auto-scroll:** dragging within ~48px of a scroll container edge scrolls it, with speed proportional to edge proximity.
- **Keyboard equivalence (mandatory):** `Space` lifts the focused item (same lift styling), arrow keys move it between positions/columns with position announced via live region, `Space` drops, `Esc` cancels and returns it. The keyboard path is the acceptance test for every DnD surface ([Accessibility.md §3](./Accessibility.md)).
- **Touch:** long-press 300ms to lift ([ResponsiveRules.md §5](./ResponsiveRules.md)).

## 7. AI motion

Aurex is the calm layer ([11 §9](../11_Design_Principles.md)). Its motion must read as _competent colleague working_, never as _product performing intelligence_.

- **Streaming text:** tokens render at their natural arrival rate — no artificial typewriter throttle, no per-character animation. Layout is reserved before streaming begins so content never jumps or pushes the viewport. A caret indicates the stream is live: a subtle opacity pulse at ≤ 1Hz, nothing faster.
- **Thinking / tool-use indicator:** disclosed steps ("Searching invoices… found 3") appear as calm list rows using `listItem` — no spinner theatrics, no shimmering "thinking" orbs, no pulsing gradients. The information _is_ the animation.
- **Approval cards:** enter with `fadeScale`, exactly like any other surface. **No attention bounce, no glow, no pulse** — an AI proposal earns attention through placement and content, not motion. Motion begging for approval undermines trust in the approval.
- **Ghost text:** appears with `fade` (150ms), disappears instantly on dismissal. It never types itself out.
- **The ✦ Aurex mark never animates.** Not on arrival, not on hover, not while streaming. It is an attribution stamp, not a mascot.

## 8. Loading motion

- **Skeletons:** the only permitted skeleton animation is a subtle opacity pulse, **0.5 → 0.8, 1.5s, linear, alternating**. No sweeping gradient shimmer — sweep gradients read as busy and cost paint time on long tables. Skeletons in one viewport pulse in phase (one shared timeline), never independently.
- **Spinner:** exactly one spinner exists — a stroke arc at 16px (dense UI) or 20px (nav-level), rotating at **600ms per revolution, linear**. It appears only for sub-element loading (a button in flight); never full-page after the shell has painted ([11 §8.4](../11_Design_Principles.md)).
- **Progress bars:** width transitions 200ms `ease-enter` between real values. No fake progress, no indeterminate barber-pole — if progress is unknowable, use the spinner or a skeleton.
- **Button loading:** the button keeps its width; label and inline spinner crossfade in 150ms.

## 9. Notification motion

- **Toasts:** enter with a 150ms slide + fade from the nearest screen edge (8px travel); exit with fade. **No bounce, no spring.** Stacked toasts (max 3) reflow with a 150ms position transition.
- **Badge count changes:** the number updates instantly — **no pulse, no pop, no scale-up by default.** Exception, exactly one: an **approval-request arrival** may pulse the badge **once** (a single 150ms scale to 1.1 and back), because a pending approval is the one notification class where missing it blocks Aurex and teammates. It never repeats, never loops, never applies to any other notification type.
- **Inline saving states** ("Saved just now"): text crossfades in 150ms. No spinner for autosave under 500ms — flashing a spinner for a fast save creates anxiety about a non-event.

## 10. Reduced motion

`prefers-reduced-motion: reduce` is honored **at the wrapper level** in `packages/ui/motion` — features cannot forget it — with the global CSS collapse in `packages/ui/styles/globals.css` as the shipped backstop (animations and transitions forced to 0.01ms).

The contract:

| Under reduced motion | Behavior                                                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Remains**          | Opacity fades at ≤ 100ms — enough to prevent jarring pops, never enough to be _motion_                                                                                                                                         |
| **Dies**             | All transforms (translate, scale, tilt), springs, stagger, collapse height animation (snaps open/closed), skeleton pulse (static block), caret pulse (static caret), tab underline slide (jumps), toast slide (fades in place) |
| **Never existed**    | Parallax, autoplay, scroll-driven animation — banned regardless of preference                                                                                                                                                  |

- Drag-and-drop remains fully functional under reduced motion: lift styling applies instantly, items reposition without the spring. Function is never reduced — only motion.
- **Testing requirement:** every Playwright suite that exercises an animated surface runs once with `reducedMotion: 'reduce'` emulated; a component that breaks (unmeasured heights, orphaned exit states, invisible content) fails CI. Reduced-motion is a first-class state, not a degraded one.

## 11. Performance rules

- **Transform and opacity only.** No animation of layout properties (width/height/top/left/margin/padding) except the two sanctioned cases: `collapse` (measured height) and sidebar/panel width (shell-level, one element). Everything else composites.
- Animated elements get `will-change` only for the duration of the animation — the shared wrappers manage it; sprinkling `will-change` in feature code is a lint failure.
- **60fps is the budget.** An animation that drops frames on a mid-tier laptop with a 5,000-row workspace open is a bug, not a polish item.
- **No animation on more than 20 simultaneous elements.** Stagger caps at the first 5 items (§3); bulk operations (multi-select delete of 50 rows) animate the container change once, not each row.
- Long lists and boards use `content-visibility: auto` / virtualization ([Components.md](./Components.md)); off-screen items never animate — presence animations attach only to on-screen elements.
- Scrims fade opacity on a solid layer — no animated `backdrop-filter` blur (compositor-hostile).

## 12. Do / Don't

| #   | Do                                                                           | Don't                                                                         |
| --- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | Use the shared variants from `packages/ui/motion` for every animation        | Write feature-local keyframes, transition values, or inline Framer configs    |
| 2   | Scale menus/popovers from their trigger origin                               | Grow every surface from center regardless of what opened it                   |
| 3   | Keep route changes instant and let skeletons carry loading                   | Choreograph page fades or slide transitions between routes                    |
| 4   | Transition hover with color/border only, 150ms                               | Scale, lift, or shadow-grow on hover                                          |
| 5   | Use the one `spring-drag` config for all drag physics                        | Tune a "better" spring per board or per feature                               |
| 6   | Stagger list items ≤ 30ms, only on user-initiated changes                    | Stagger-animate initial page loads or data refreshes                          |
| 7   | Let streaming text flow at natural token rate with reserved layout           | Add typewriter throttles, per-character effects, or layout that grows jumpily |
| 8   | Enter approval cards with the standard `fadeScale`                           | Bounce, glow, or pulse AI surfaces to demand attention                        |
| 9   | Pulse a badge once, only for approval-request arrival                        | Loop pulses, animate count-ups, or pulse any other badge                      |
| 10  | Show focus rings instantly                                                   | Fade or animate focus indication in                                           |
| 11  | Collapse to ≤ 100ms opacity fades under reduced motion, at the wrapper level | Rely on each feature remembering to check the media query                     |
| 12  | Animate transform/opacity; measure heights for `collapse`                    | Animate layout properties or `max-height` hacks                               |
| 13  | Keep every transition interruptible                                          | Lock input, queue clicks, or disable UI "until the animation finishes"        |
| 14  | Delete an animation when unsure it earns its place                           | Add motion because a surface "feels static"                                   |

## 13. Open questions

| #   | Question                                                                                                                                                                                                      | Owner                  | Target                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------- |
| 1   | Number ticker for stat tiles (animated count-up on dashboard load): currently banned under §3's no-load-animation rule — is there a case for a one-time 200ms settle on _changed_ values during live refresh? | Chief Product Designer | Phase 2 (Dashboard live data) |
| 2   | View transitions API as a future substrate for the shared variants (progressive enhancement) — evaluate once browser support and Framer interop mature                                                        | Founding CTO           | Phase 4 re-evaluation         |
| 3   | Calendar drag (event resize/move) — confirm `spring-drag` feels right for time-grid snapping or whether snap-to-slot should suppress the spring settle                                                        | Chief Product Designer | Phase 2 (Calendar)            |
| 4   | Whether portal (client-facing) surfaces need a _more_ conservative motion profile than the app (clients are infrequent users; motion familiarity is lower)                                                    | Chief Product Designer | Phase 3 (Portal)              |
