# Responsive Rules

| | |
|---|---|
| **Document** | Responsive Rules — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [../11_Design_Principles.md](../11_Design_Principles.md) · [GridSystem.md](./GridSystem.md) · [SpacingSystem.md](./SpacingSystem.md) · [Typography.md](./Typography.md) · [AnimationSystem.md](./AnimationSystem.md) · [Accessibility.md](./Accessibility.md) |

This document owns **how surfaces adapt across viewports and input modes**. The breakpoint names, shell measurements, and grid live in [GridSystem.md](./GridSystem.md) — that document is the owner; this one applies its contract per surface and pins the touch, density, and PWA rules.

---

## 1. Responsive philosophy

**Mobile-first CSS, desktop-first priorities.** The honest framing:

- AurexOS is a dense professional tool where agency staff spend eight hours a day at a desk. The dense desktop experience is the design priority; mobile gets a **correct, legible adaptation — not a parallel design** ([GridSystem.md §2](./GridSystem.md)).
- Mobile's real jobs (per the architecture docs): **triage, approvals, capture, chat, and the Client Portal.** Marco approves a proposal from a train; Ava checks the dashboard between meetings; Cleo — the client — may *only* ever see the portal on a phone. Those flows are first-class on mobile. Gantt re-planning on a phone is not a goal.
- The law: **every surface must be USABLE on mobile, OPTIMIZED for desktop.** Usable means: readable, operable, nothing cut off, core actions reachable. It does not mean feature-identical density.
- CSS is authored mobile-first (`min-width` queries only) because that produces cleaner overrides — an authoring strategy, not a priority statement.
- One codebase, one component library, responsive at the component level. No `m.aurexos` fork, no "mobile version" of a component that drifts.

## 2. Breakpoint contract

Owned by [GridSystem.md §2](./GridSystem.md); restated here as the working reference. These seven names are the only breakpoints — feature-local media queries are a lint failure.

| Name | Min-width | Target | Shell behavior |
|---|---|---|---|
| `xs` | < 640px | Mobile | Sidebar hidden (overlay drawer); panel full-screen takeover; bottom-sheet actions |
| `sm` | 640px | Large phone / small tablet | Same as `xs` with more breathing room |
| `md` | 768px | Tablet | 64px icon rail (expandable overlay); panel overlays content |
| `lg` | 1024px | Laptop | 240px sidebar, collapsible to rail; panel overlays content |
| `xl` | 1280px | Desktop | 240px sidebar; panel docks — content reflows beside it |
| `2xl` | 1440px | Large desktop | Shipped container max — content centers |
| ultra-wide | ≥ 1920px | External monitors | Per-surface content caps engage ([GridSystem.md §6](./GridSystem.md)) |

Container rules: content centers at the `2xl` (1440px) max; reading surfaces cap at ~880px; forms at ~640px; full-bleed surfaces (tables, boards) run wide but respect the ultra-wide caps. Nothing ever stretches a text column across a 34-inch monitor.

## 3. Shell adaptation

- **Sidebar:** overlay drawer with scrim below `md` (opens with `slidePanel`, Esc/scrim-tap dismisses, focus-trapped like any overlay); 64px icon rail with tooltips at `md`; 240px expanded and collapsible to rail at `lg+`. The user's expand/collapse override persists per user across devices — the shell remembers, breakpoint changes don't stomp an explicit choice (the override applies within the range where that mode exists).
- **Top bar:** below `md`, view controls (density, grouping, filters, sort) collapse into a single "View" menu; **the primary action button never collapses** — "New task" stays visible at every width. Search collapses to an icon that opens the palette.
- **Right context panel:** full-screen sheet below `md` (y-slide, own header with back/close); overlay over content `md`–`lg`; docked 360px at `xl+` per [GridSystem.md §2](./GridSystem.md). One panel at a time at every width — panels replace, never stack.
- **Command palette:** centered floating surface at `md+`; **full-screen below `md`** with the input pinned top and the keyboard-safe result list below. The palette exists at every breakpoint — keyboard-first doesn't stop at the desk.

## 4. Per-surface adaptation table

The canonical adaptations. A new surface must map itself to one of these patterns or amend this table.

| Surface | `xl+` (optimized) | `md`–`lg` | `< md` (usable) |
|---|---|---|---|
| **Dashboard** | 12-col widget grid ([GridSystem.md §4](./GridSystem.md)) | 6-col; widgets reflow | Single-column stack; **widget order = priority order** (attention strip first, then cash, then pipeline…); attention strip always on top |
| **Tables** | Full table, all columns, compact toggle | Horizontal scroll within container + sticky first column and header | **Card collapse**: each row becomes a card — pinned pattern: title line, two key fields, status badge, kebab. Column chooser irrelevant; sort/filter move to the View menu |
| **Kanban** | All columns visible, horizontal scroll if many | Horizontal scroll, column snap points | Horizontal scroll with **snap-per-column** + a column picker (segmented control) to jump; one column ≈ 85% viewport width |
| **Calendar** | Month/week grids | Week → **3-day view** | **Agenda list** (chronological); month grid available read-only as a mini-picker |
| **Charts** | Full detail | Fewer axis ticks; abbreviated labels | Simplify: min ticks, legend collapses to tap-to-toggle chips, min-height 160px so bars/lines stay readable; tooltips become tap-persistent |
| **Forms** | Single column, ~640px cap ([Forms.md](./Forms.md)) — already narrow | Same | Full-width controls; **sticky action bar at bottom** (safe-area aware, §9); field order unchanged |
| **Detail pages** | Header + content, 360 panel docked | Panel overlays on demand | Panel content (metadata, activity, comments) **inlines below the header** as stacked sections — same components, no panel chrome |
| **Documents editor** | Full toolbar, 68ch column | Toolbar groups collapse | Toolbar collapses to essentials + ⋯ overflow; a **selection toolbar** appears on text selection; 16px gutters |
| **Aurex chat** | Docked/overlay right panel | Overlay panel | **Full-screen sheet**; streaming, approval cards, and stop button identical — AI never loses capability on mobile (approvals are a core mobile job) |
| **Client Portal** | Same shell, client-scoped | Same | **Genuinely mobile-first** — clients ARE mobile. Portal surfaces (status, approvals, invoices, files) are designed at `xs` first and enhanced upward; portal ships nothing that isn't excellent on a phone |
| **Settings** | 3+9 split ([GridSystem.md §3](./GridSystem.md)) | Same within 880px column | Settings nav becomes a **select / drill-in list**; one section per screen, back returns to the list |

Universal rules:

- Stacking always follows DOM order; DOM order = visual order = tab order ([Accessibility.md §3](./Accessibility.md)).
- Nothing disappears silently: any control hidden at a small width has a home in the View menu, kebab, or palette. Feature loss by viewport is a bug; density loss is the design.
- Boards and tables never collapse *and* scroll simultaneously — one adaptation per surface per breakpoint.

## 5. Touch adaptations

- **Hover-revealed actions become persistently visible or menu-housed.** Pinned per pattern: table-row and card actions render a **kebab that is always visible below `md`** (not hover-gated — there is no hover). **No swipe gestures in v1** — not for delete, not for archive. Justification: swipe actions are undiscoverable, collide with horizontal-scroll surfaces (tables, kanban), have no keyboard/AT equivalent, and their platform conventions conflict (iOS mail vs Android). The kebab is boring and always works. Revisit post-v1 with usage data (§12).
- **Targets:** 32px minimum everywhere ([Accessibility.md §9](./Accessibility.md)); on touch viewports interactive rows/list items pad to ≥ 40px effective hit height; ≥ 8px between adjacent targets.
- **Drag on touch:** long-press **300ms** to lift (the [AnimationSystem.md §6](./AnimationSystem.md) lift), then drag; scroll and drag never fight — vertical pan scrolls, long-press drags. Every drag has a non-drag path (move-to menu) on all inputs.
- Tooltips (hover-only by nature) are never the sole carrier of information on touch — the information also exists as visible text, a label, or in the detail view.
- Context menus: long-press opens the same context menu right-click opens on desktop — one menu definition per surface.

## 6. Density × viewport

- The **compact density toggle is desktop-only**: available at `lg+`, persisted per user per surface ([11 §4.4](../11_Design_Principles.md)).
- **Below `lg`, density is always comfortable.** Compact rows exist to fit more on a large screen for a power user with a pointer; on touch they only shrink targets and legibility. The stored compact preference is retained but dormant below `lg` — it reactivates when the viewport grows.
- Touch targets never shrink with density anywhere (32px floor is density-independent).

## 7. Typography & spacing responsive deltas

Owned by [Typography.md §8](./Typography.md) and [SpacingSystem.md](./SpacingSystem.md); the complete delta list — nothing else responds to viewport:

| Token | ≥ `md` | < `md` |
|---|---|---|
| `display` | 30/36 | 26/32 |
| `title-1` | 24/32 | 22/28 |
| Page gutters | 24px | 16px |
| Grid gutter (column gap) | 16px | 12px |
| All other type tokens | unchanged | unchanged — `body` is 14px everywhere |
| Card padding | 16px | **16px — stays.** Shrinking card internals saves nothing and breaks rhythm |

The 4px grid holds at every width. Responsive is layout reflow, not a second spacing system.

## 8. Images & media

- All images ship as responsive images (`srcset`/`sizes` or the framework image component) with explicit width/height — zero layout shift ([11 §8.4](../11_Design_Principles.md)).
- **Avatar sizes are fixed** (16/20/24/32px per [Components.md](./Components.md)) — avatars are UI glyphs, not content; they do not scale with viewport.
- File previews and embeds letterbox within their container (`max-width: 100%`, preserved aspect ratio); the page never scrolls horizontally because of media.
- Charts are drawn vector (SVG/canvas) and redraw to container width — never scaled raster.

## 9. PWA & mobile-web specifics

PWA ships Phase 4–5 (PRD §2.2); these rules apply to mobile web from day one so the PWA is an install prompt, not a rework.

- **Safe-area insets:** the shell, sticky action bars, bottom sheets, and toasts respect `env(safe-area-inset-*)` — nothing hides behind notches or home indicators.
- **Viewport meta:** `width=device-width, initial-scale=1, viewport-fit=cover`. **No `maximum-scale`, no `user-scalable=no`** — pinch zoom is an accessibility right ([Accessibility.md §10](./Accessibility.md)).
- **Input zoom prevention — the documented exception to the 14px law:** iOS Safari auto-zooms any focused input under 16px. Therefore **text inputs render at 16px on touch viewports** (< `lg` coarse-pointer), while the rest of the UI stays on the 14px body token. This is a deliberate, documented exception to [Typography.md](./Typography.md)'s fixed scale — an input that triggers a viewport jump is worse than an input 2px larger. Labels, helper text, and table text are unaffected.
- **Offline tolerance:** connectivity loss shows the standard offline state and preserves in-progress input; queued mutations reconcile on reconnect ([ErrorStates.md](./ErrorStates.md) owns the states). The app shell never white-screens on a dropped connection.
- Browser chrome height changes (URL bar collapse) must not jump content: dynamic viewport units (`dvh`) for full-height surfaces, never `100vh`.
- No orientation lock, in the manifest or otherwise ([Accessibility.md §2](./Accessibility.md)).

## 10. Testing matrix

Every phase gate ([10_Roadmap.md §9](../10_Roadmap.md)) verifies the phase's surfaces across:

| Class | Viewports | What's verified |
|---|---|---|
| Mobile | 320×568 (floor), 375×812, 414×896 | Mobile jobs (triage/approvals/capture/chat/portal) fully operable; no horizontal body scroll at 320 ([Accessibility.md §10](./Accessibility.md)); safe areas |
| Tablet | 768×1024 (portrait + landscape) | Rail shell; panel overlay; table scroll mode |
| Laptop | 1280×800, 1440×900 | Docked panel; full sidebar; compact density |
| Desktop | 1920×1080 | Ultra-wide caps engage; no stretched columns |
| Modes | Each class × light/dark × 200% zoom; mobile × touch emulation; 400% reflow spot-check | Themes, zoom, reflow, touch targets |

- Playwright runs the responsive suite at 375, 768, and 1440 minimum per feature; the full matrix runs at phase gates.
- Real-device pass (one iOS Safari, one Android Chrome) per phase gate for the mobile-job flows and the portal — emulators lie about safe areas, keyboards, and zoom.

## 11. Do / Don't

| # | Do | Don't |
|---|---|---|
| 1 | Author CSS mobile-first with the seven named breakpoints | Write feature-local `@media (min-width: 900px)` queries |
| 2 | Design mobile as triage/approvals/capture/chat/portal done excellently | Cram the full desktop density onto a phone — or ship a broken afterthought |
| 3 | Collapse tables to the pinned card pattern below `md` | Shrink a 9-column table until cells are unreadable |
| 4 | Keep the primary action visible at every width | Bury "New task" in an overflow menu on mobile |
| 5 | Make hover-revealed actions a visible kebab below `md` | Rely on hover — or introduce swipe gestures in v1 |
| 6 | Keep stacked order = DOM order = tab order | Visually reorder sections in ways that break reading order |
| 7 | Render inputs at 16px on touch to prevent iOS zoom | Set `user-scalable=no` to "fix" input zoom |
| 8 | Respect safe-area insets on sticky bars, sheets, and toasts | Pin an action bar under the home indicator |
| 9 | Keep the compact toggle desktop-only; comfortable below `lg` | Let compact density shrink touch targets on tablets |
| 10 | Give every hidden control a home (View menu, kebab, palette) | Silently drop functionality at small widths |
| 11 | Use `dvh` and reserved layout for full-height mobile surfaces | Use `100vh` and let the URL bar cause jumps |
| 12 | Design the portal at `xs` first — clients are on phones | Treat the portal as a desktop app clients happen to open on mobile |
| 13 | Test on real devices at each phase gate | Trust emulators for safe areas, keyboards, and zoom |

## 12. Open questions

| # | Question | Owner | Target |
|---|---|---|---|
| 1 | Swipe gestures post-v1: revisit swipe-to-approve on mobile approval queues once usage data shows whether the kebab path is a friction point | Chief Product Designer | Phase 4 review |
| 2 | Bottom tab bar for mobile (`xs`/`sm`): does the drawer suffice for the five mobile jobs, or do triage/approvals/chat earn persistent bottom-nav slots? Prototype during Portal work | Chief Product Designer | Phase 3 |
| 3 | Timeline/Gantt view below `md`: read-only horizontal scroll vs. redirect to list view — decide when Timeline ships | Chief Product Designer | Phase 2 (Projects timeline) |
| 4 | PWA offline scope: which mobile jobs get true offline queues (capture and approvals are candidates) vs. read-only cache | Founding CTO | Phase 4 (PWA) |
| 5 | Keyboard-attached hardware on tablets (iPad + keyboard): does `md` deserve the desktop shortcut surface by input detection rather than width? | Chief Product Designer | Phase 4 |
