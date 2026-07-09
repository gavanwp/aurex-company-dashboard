# Components — Design Specification

| | |
|---|---|
| **Document** | Component Design Specification — AurexOS |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [../11_Design_Principles.md](../11_Design_Principles.md) · [ComponentInventory.md](./ComponentInventory.md) · [Buttons.md](./Buttons.md) · [Forms.md](./Forms.md) · [Cards.md](./Cards.md) · [Navigation.md](./Navigation.md) · [Tables.md](./Tables.md) · [Charts.md](./Charts.md) · [Notifications.md](./Notifications.md) · [EmptyStates.md](./EmptyStates.md) |

This document specifies every AurexOS component that does **not** have a dedicated sibling spec. Buttons, form inputs, cards-as-surface, navigation, tables, charts, and notifications are owned by their sibling files (§7); this file cross-references them and never duplicates their depth. [../11_Design_Principles.md](../11_Design_Principles.md) is the governing authority — where this document is silent, the Design Principles decide.

---

## 1. Component doctrine

1. **Two layers.** The **shipped-primitive layer** lives in `packages/ui` — vendored shadcn/ui + Radix primitives, themed exclusively by semantic tokens. The **composed-pattern layer** (domain cards, AI surfaces, boards) is assembled from primitives, also in `packages/ui`. Apps compose; they never define. A component appearing twice inside `apps/*` is a lint failure — extract it (R-A4).
2. **State-completeness law.** Every interactive component ships with: default, hover, focus-visible, active, disabled, loading — plus empty and error where applicable. A PR missing states is incomplete, not "iterative." Focus is a 2px `--focus-ring` outline with 2px offset, always. Disabled is 0.5 opacity + `not-allowed` cursor + an explanatory tooltip when the reason is non-obvious. Loading is a width-stable inline spinner in controls; skeletons for surfaces.
3. **Composition over configuration.** Compound components (`<Kanban.Column>`, `<ApprovalCard.Diff>`) over 20-prop monoliths. New props require design review; new compound parts usually don't.
4. **Gallery requirement.** A gallery route documents every component, in every state, in both themes. Undocumented states do not exist. Gallery entry is a merge requirement for any new component or state (see [ComponentInventory.md](./ComponentInventory.md) §4).
5. **Shared constants.** Radii: 4px badges · 6px controls · 8px cards · 12px overlays. Control heights: sm 28 / md 32 / lg 36. Minimum pointer target 32×32px. Icons Lucide 16px (dense) / 20px (nav), icon-to-label gap 8px. Button/label type is body-strong (14/500); sentence case everywhere. Accent (Aurex Indigo, 231 48% 54%) only for primary actions, active nav, selection, focus, and Aurex identity. Status colors only for status. Two shadow levels; one overlay layer maximum.

---

## 2. Primitives & controls

Text inputs, textareas, labels, and validation live in [Forms.md](./Forms.md). Buttons live in [Buttons.md](./Buttons.md).

### 2.1 Select

- **Purpose:** choose one value from a closed list; the workhorse of filters and settings.
- **Anatomy:** trigger (value or placeholder, chevron-down 16px) → popover listbox (options, optional group labels, check on selected).
- **Variants:** default; with leading icon; combobox (type-to-filter, for lists > ~10 items — searchable input pinned atop the listbox).
- **Sizes:** sm 28 / md 32 / lg 36; listbox max-height 320px, scrolls internally.
- **States:** default, hover (border-strong), focus-visible, open (accent border), disabled, loading (spinner replaces chevron, width stable), error (danger border + inline message via Forms.md pattern).
- **Keyboard & a11y:** Space/Enter opens; arrows move; type-ahead; Esc closes and restores focus; Home/End jump. Radix `Select`/`Combobox` semantics; selected option announced.
- **Usage:** Don't use for ≤3 options — use Radio or segmented Tabs. Don't use native multi-select; multi-choice uses a checkbox listbox with Tag summary in the trigger.

### 2.2 Checkbox

- **Purpose:** independent on/off choices; bulk selection in tables and lists.
- **Anatomy:** 16px box (radius 4) + label; optional description line beneath.
- **Variants:** checked, unchecked, indeterminate (bulk-select parent).
- **States:** all six; checked/indeterminate fill = accent-solid with white glyph.
- **Keyboard & a11y:** Space toggles; label click toggles; label is the accessible name — never an unlabeled box. Indeterminate exposed via `aria-checked="mixed"`.
- **Usage:** Checkbox = independent facts; Switch = immediate effect. Never both patterns in the same group.

### 2.3 Switch

- **Purpose:** binary setting that takes effect immediately (autosave semantics — no Save button follows a switch).
- **Anatomy:** 32×18px track + 14px thumb; label left, switch right in settings rows.
- **States:** on (accent-solid track), off (neutral track), plus the standard set; loading = thumb spinner while the mutation is in flight, track keeps state optimistically.
- **Keyboard & a11y:** Space/Enter toggles; `role="switch"` with `aria-checked`; state change announced.
- **Usage:** If the change needs confirmation or a form submit, it's a Checkbox, not a Switch. Never use a Switch for destructive or billing-affecting actions.

### 2.4 Radio group

- **Purpose:** exactly one choice from 2–5 visible options.
- **Anatomy:** 16px circle + label (+ optional description); vertical stack, 12px gap. Card-radio variant: each option is a selectable bordered card (radius 8, accent border when selected) for plan/mode pickers.
- **States:** standard set; selected = accent dot.
- **Keyboard & a11y:** arrows move selection within the group (roving tabindex); Tab enters/exits the group once.
- **Usage:** >5 options → Select. No pre-selected option when the choice has consequences (billing, deletion scope).

### 2.5 Slider

- **Purpose:** approximate numeric selection where the shape of the range matters (opacity, capacity thresholds, budget bands).
- **Anatomy:** 4px track (filled portion accent) + 16px thumb + optional value label above thumb on drag; optional min/max caption row.
- **Variants:** single, range (two thumbs), stepped (with tick marks).
- **States:** standard set; focus ring on the thumb.
- **Keyboard & a11y:** arrows ±1 step, PageUp/Down ±10, Home/End to bounds; `aria-valuetext` gives a human value ("40 hours").
- **Usage:** Exact values need a paired numeric input (Forms.md). Never use a slider for money entry.

### 2.6 Date picker

- **Purpose:** dates and date ranges — due dates, invoice terms, report windows.
- **Anatomy:** trigger (calendar icon 16px + formatted date, control-height) → popover (radius 12): preset column ("Today", "Tomorrow", "Next week", "In 30 days"; ranges: "This month", "Last 30 days", "This quarter") + month grid + footer with manual text entry.
- **Variants:** single date; range (two months side by side, hover paints the prospective span); with time (time Select appended).
- **States:** standard set; disabled dates (before-min, blackout) at 0.5 opacity with tooltip reason; error per Forms.md.
- **Keyboard & a11y:** grid is arrow-navigable (←→ day, ↑↓ week, PageUp/Down month, Shift+PageUp/Down year); Enter selects; Esc closes; typed entry accepts natural formats ("jul 21", "21/7"). Grid uses `role="grid"`, selected/ today states announced.
- **Usage:** Presets first — most picks are relative, not calendrical. Display dates per §11 of the Design Principles: relative for recent, absolute on hover.

### 2.7 File upload

- **Purpose:** attach files to entities (tasks, invoices as receipts, portal deliverables).
- **Anatomy:** drag-drop zone (dashed border-subtle, radius 8, upload-cloud icon 20px, "Drop files or **browse**" one-liner, accepted types + max size caption) → per-file row (type icon, name, size, progress bar, cancel ×).
- **States:** default; drag-over (accent border + accent-soft fill); uploading (determinate progress per file); **AV-scan pending** ("Scanning…" caption + indeterminate bar — file is not linkable or portal-visible until clean); success (check, row settles into attachment list); error (danger border on the row, specific reason — "Too large (max 25 MB)" — with Retry). Blocked-by-scan shows a danger row with "Blocked by virus scan" and a remove-only affordance.
- **Keyboard & a11y:** zone is a button (Enter/Space opens file dialog); every file row's cancel/retry/remove is focusable; progress announced via live region at sensible intervals, not per-percent.
- **Usage:** Never fake progress. Never let a not-yet-scanned file reach the Client Portal.

### 2.8 Avatar (+ stack)

- **Purpose:** person and workspace identity.
- **Anatomy:** image or initials (two letters, deterministic neutral background per user) in a circle; optional status dot (bottom-right, 3:1 boundary contrast).
- **Variants:** person (circle), workspace/client (radius 6 square); **stack**: overlapping −8px, max 4 visible + "+N" overflow chip that opens a popover listing everyone.
- **Sizes:** 20 (dense rows), 24 (default), 32 (headers), 64 (profile).
- **States:** loading skeleton circle; broken image falls back to initials — never a broken-image glyph.
- **Keyboard & a11y:** informational avatars are decorative with adjacent text name; interactive avatars (stack overflow, assignee pickers) are buttons with names as accessible labels + tooltip.
- **Usage:** Never truncate a stack silently — the "+N" chip is mandatory. Aurex is never rendered as a person avatar; its identity is the ✦ mark (§6.12).

### 2.9 Badge

- **Purpose:** short status or count labels ("Paid", "Overdue", "3").
- **Anatomy:** caption text (12/400, sentence case; tiny ALL-CAPS allowed only here) in a radius-4 pill, 2px/6px padding; optional 12px leading icon or dot.
- **Variants:** neutral, accent (selection/identity only), success, warning, danger, info — soft background + status text color; solid variant reserved for counts on nav.
- **States:** static — badges are never interactive. If it needs a click, it's a Tag or a filter chip.
- **A11y:** status never by color alone — the label or icon carries the meaning.
- **Usage:** One badge per row cell. Badges describe state; they don't exhort ("New!" marketing badges are banned).

### 2.10 Tag (removable)

- **Purpose:** user-applied labels and multi-select tokens (skills, project labels, filter chips).
- **Anatomy:** small text (13/400) + optional color dot + remove × (16px hit area padded to 24px) in a radius-4 chip.
- **States:** default, hover (background step), focus-visible, disabled; removing animates out at 150ms.
- **Keyboard & a11y:** in token inputs, Backspace removes the last tag, arrows traverse, Delete removes focused; remove buttons labeled "Remove {tag}".
- **Usage:** Tag colors come from the categorical data-viz ramp, not from free hex pickers. Max ~3 visible tags in dense rows; overflow "+N" popover.

### 2.11 Tooltip

- **Purpose:** names for icon-only controls; explanations for disabled or truncated things.
- **Anatomy:** radius-6 dark surface, caption text, max-width 280px, 8px offset from trigger; optional Kbd shortcut suffix.
- **States:** shows on hover (500ms delay, instant when moving within a group) and on keyboard focus — always both.
- **Keyboard & a11y:** Esc dismisses; content mirrored to `aria-label`/`aria-describedby`; never contains interactive elements (that's a Popover).
- **Usage:** Tooltips explain, never contain actions or critical info that touch users can't reach. Every icon-only button has one (mandated by Design Principles §6.3).

### 2.12 Kbd

- **Purpose:** render keyboard shortcuts ("⌘K", "G then P") in menus, tooltips, palette, and the `?` overlay.
- **Anatomy:** each key a radius-4 bordered chip, Geist Mono 12px, 2px/5px padding; sequence keys joined by "then", chords by "+" glyph-free adjacency (⌘K not ⌘+K).
- **A11y:** wrapped with `aria-label` spelling keys out ("Command K"). Platform-aware: ⌘ on macOS, Ctrl elsewhere — never both shown.
- **Usage:** Only for real, registered shortcuts (shortcut registry is the source of truth). Never decorative.

### 2.13 Separator

- **Purpose:** semantic division in menus, panels, toolbars.
- **Anatomy:** 1px border-subtle line, horizontal or vertical; optional inline label variant ("or", date group headers) with 8px gaps.
- **A11y:** `role="separator"` with orientation; decorative when purely visual.
- **Usage:** Prefer spacing over lines — a separator is the tool of last resort after whitespace has failed.

### 2.14 Skeleton

- **Purpose:** content-shaped loading placeholders for surfaces (Design Principles §8.4).
- **Anatomy:** neutral step-3 blocks matching the final layout's text lines, avatars, and cards; subtle 1.5s shimmer, disabled under `prefers-reduced-motion`.
- **Usage:** Skeletons must match the loaded layout exactly — zero shift when data lands. Never skeleton the app shell; never show a skeleton longer than ~10s without an error path.

### 2.15 Progress bar

- **Purpose:** honest progress for uploads, imports, exports, project completion.
- **Anatomy:** 4px (inline) or 6px (surface) track, radius-full; fill = accent-solid; optional label + percentage (tabular numerals) right-aligned above.
- **Variants:** determinate (real fraction only); indeterminate (sliding band — only when the total is genuinely unknown, e.g. AV scan); project-health variant may use status colors (fill = success/warning/danger by health).
- **States:** in-progress, complete (brief check morph, 150ms), error (danger fill segment + inline message).
- **A11y:** `role="progressbar"` with `aria-valuenow/min/max`; indeterminate omits `valuenow`; completion announced.
- **Usage:** No fake progress, ever (anti-pattern §12.5). Determinate whenever a real fraction exists.

### 2.16 Spinner

- **Purpose:** sub-element busyness — a button in flight, a chevron slot while options load.
- **Anatomy:** Lucide loader, 16px in controls / 20px standalone, currentColor, 0.8s rotation (reduced-motion: static icon with pulsing opacity).
- **Usage:** Never full-page after shell paint; never for surfaces (use Skeleton); in buttons the spinner is inline with the label and the button keeps its width.

---

## 3. Overlays

One overlay layer maximum, always. Nested flows use panels or full pages, never modal-on-modal. Every overlay: Esc dismisses, focus is trapped and restored on close, radius 12, the higher of the two shadow levels.

### 3.1 Dialog / Modal

- **Purpose:** focused tasks that must interrupt — create-entity forms, destructive confirmation, unavoidable decisions.
- **Anatomy:** overlay scrim → panel: header (title-2 + optional description + close ×) / body / footer (actions right-aligned, primary rightmost).
- **Variants:** **default**; **destructive** — danger-styled confirm button, never default-focused; irreversible acts additionally require typing the entity name to enable the confirm (Design Principles §8.6 — reversible actions get undo toasts instead, not dialogs).
- **Sizes:** sm 400 / md 560 (default) / lg 720; height content-driven, body scrolls past 80vh.
- **States:** open/close at 250ms max ease-out/in; loading footer = primary button spinner (width-stable); form errors inline per Forms.md.
- **Keyboard & a11y:** focus trap; initial focus on first field (never on a destructive button); Esc + scrim click close (scrim click disabled when the form is dirty — show "Discard changes?" inline in the same dialog, not a second overlay); `aria-modal`, labelled by the title.
- **Usage:** If the flow has more than ~2 steps or benefits from context behind it, use a Drawer or a page. Never open a dialog from a dialog.

### 3.2 Drawer / Sheet

- **Purpose:** edge-anchored *transient* workspace — entity quick-view/edit, filters, multi-field creation with context visible behind.
- **Anatomy:** right-anchored panel (480px default, 640px wide variant), header (entity title + actions + close), scrollable body, optional sticky footer.
- **Semantics vs. context panel:** the Sheet is an *overlay* — modal, scrimmed, dismissed on Esc, one at a time. The persistent right **context panel** (Design Principles §4.2, and §6.7 here for its Aurex form) is part of the shell layout — non-modal, no scrim, replaces rather than stacks. Never implement one as the other: transient tasks → Sheet; ambient context → panel.
- **States:** slide-in 200ms from its edge; loading = body skeleton; dirty-close guard as in dialogs.
- **Keyboard & a11y:** focus trap + restore; Esc closes; header title is the accessible name.
- **Usage:** Bottom sheets only on touch/mobile layouts. Don't put destructive confirmation in a sheet — that's a Dialog.

### 3.3 Popover

- **Purpose:** small anchored surfaces with interactive content — date grids, assignee pickers, avatar-stack overflow, filter builders.
- **Anatomy:** radius-12 raised surface, 8px offset, collision-aware placement; no arrow (calmer, Linear-style).
- **States:** open 200ms; closes on Esc, outside click, or anchor toggle.
- **Keyboard & a11y:** focus moves in on open and restores on close; if it contains a single control, focus it directly.
- **Usage:** A popover opening a popover is a design failure — inline the second step or promote to Sheet.

### 3.4 Dropdown menu

- **Purpose:** actions on the thing the trigger belongs to ("…" overflow, header actions).
- **Anatomy:** items = 16px icon + label + **shortcut column** (Kbd, right-aligned, muted) in a 32px-high row; groups with Separator; destructive items in danger text, always in the last group.
- **Variants:** with submenus (one level max, 8px overlap); checkbox items; radio groups (view options).
- **States:** item hover/active = neutral step background (accent only for checked state); disabled items with tooltip reason.
- **Keyboard & a11y:** arrows navigate, type-ahead, Enter activates, Esc closes, → opens submenu, ← returns; Radix menu semantics.
- **Usage:** ≤ ~9 items; more means the design needs grouping or a palette action. Menus contain actions — navigation belongs to nav (Navigation.md).

### 3.5 Context menu

- **Purpose:** right-click accelerator on rows, cards, canvas items — power-user parity with the "…" menu.
- **Anatomy/behavior:** identical to Dropdown menu, positioned at pointer; opened via right-click or the keyboard Menu key / Shift+F10.
- **Usage:** Context menus are duplicates, never the only path — every action must also exist on a visible affordance or the palette.

### 3.6 Command palette (⌘K) — flagship surface

- **Purpose:** the front door of AurexOS: navigation, actions, entity search, and Aurex in one keystroke. A primary interface, not a shortcut gimmick — every feature registers its nav target and primary actions here as definition-of-done.
- **Anatomy:**

```
┌──────────────────────────────────────────────┐
│ ◇  Type a command or ask Aurex…         Esc  │  input row
├──────────────────────────────────────────────┤
│ RECENT / results grouped by intent           │
│  ▸ Go to  · Projects › Meridian redesign     │
│  ▸ Action · Create invoice…            ⌘I    │
│  ▸ ✦ Ask  · "which invoices are overdue?"    │
├──────────────────────────────────────────────┤
│ ↑↓ navigate · ↵ open · Tab complete          │  footer hints
└──────────────────────────────────────────────┘
```

- **Three intents, one input:**
  - **Find** — fuzzy, permission-aware entity + navigation search (projects, tasks, invoices, contacts, docs, settings pages). Results show entity icon, name, breadcrumb-style context (client › project), and status badge where meaningful.
  - **Do** — registered actions ("Create invoice", "Assign to…", "Toggle theme"), context-aware: actions for the current view rank first; parameterized actions open their form inline in the palette body (single step) or hand off to a Dialog (multi-field).
  - **Ask** — anything that isn't a confident Find/Do match routes to Aurex: the query line becomes an "✦ Ask Aurex: '…'" row (always present as the last result, never auto-executed). Selecting it streams the answer in the palette body (§6.6 rules apply: stop button, citations, reserved layout) with "Continue in panel" to hand off to the conversation panel.
- **Result grouping & ranking:** Recent (empty query) → best-match group headers ("Go to", "Actions", "Ask Aurex") — never interleaved. Frecency-ranked within groups; exact prefix beats fuzzy. Max ~8 visible per group with "More…" expansion.
- **Modes:** typing `>` forces Do; `?` forces Ask; `#` scopes to the current entity. Backspace on an empty scoped input clears the scope.
- **Sizes/placement:** 640px wide, top-aligned at 20vh, radius 12, max-height 60vh, opens ≤ 250ms.
- **States:** empty (recents + suggested actions), typing (instant local results < 100ms, async results appended without reflow above the cursor row), no-results (offers "Ask Aurex" + "Search docs"), loading rows are skeleton lines, error inline with retry.
- **Keyboard & a11y:** ⌘K/Ctrl+K opens anywhere (also closes); ↑↓ move, ↵ activates, ⌘↵ opens in background/new context, Tab completes the highlighted result into the input, Esc clears query first then closes. `role="dialog"` + listbox with `aria-activedescendant`; group labels announced; result count changes announced politely.
- **Usage:** The palette never shows marketing or upsell rows. Ask results are attributed ✦ like all AI output. Palette actions with side effects still respect approval-card rules (§6.4) — the palette is a router, not a bypass.

### 3.7 Toast (Sonner)

- **Purpose:** confirm outcomes and offer undo — the exhaust of optimistic UI.
- **Anatomy:** bottom-right, radius-12, icon + one-line message + optional single action button; stacks max 3 (older collapse behind), 5s auto-dismiss, pause on hover/focus.
- **Variants:** neutral confirm ("Invoice sent"), **undo** ("Task deleted — Undo" with a 5s countdown; undo restores state and confirms "Restored"), success/info status.
- **What toasts never carry:** errors that require action (those render inline at the failure point), destructive confirmations, Aurex proactive suggestions (quiet-by-default), or any content that must be read to proceed. Actionable content never auto-dismisses.
- **Keyboard & a11y:** hotkey (F8) focuses the toast region; action buttons tabbable; announced via polite live region; undo also available as ⌘Z where the surface supports it.
- **Usage:** One toast per user action — batch bulk results ("12 tasks archived — Undo"). See [Notifications.md](./Notifications.md) for the notification center; toasts are ephemeral, notifications are durable.

---

## 4. Content & data display

Tables and data grids are owned by [Tables.md](./Tables.md); charts by [Charts.md](./Charts.md).

### 4.1 Tabs

- **Purpose:** peer views over one entity (Overview / Tasks / Files / Activity).
- **Anatomy:** underline style — labels (body-strong) with a 2px accent underline on the active tab; optional count badge per tab; content region below.
- **Variants:** underline (page-level, default); segmented control (small mode switches inside cards — filled background pill on active); vertical (settings pages).
- **States:** active, hover, focus-visible, disabled (tooltip why); lazy-loaded panels show skeletons.
- **Keyboard & a11y:** ←→ move focus (automatic activation for local content; manual + Enter when switching triggers a fetch); Radix tabs semantics; selection persisted in the URL (`?tab=`) — everything is a link.
- **Usage:** ≤ 6 tabs; beyond that the IA is wrong. Tabs never hide the primary action of the page.

### 4.2 Accordion

- **Purpose:** progressive disclosure of secondary content (FAQ blocks, advanced settings groups, long forms' optional sections).
- **Anatomy:** trigger row (title-3 + chevron rotating 90°) / content region; 1px separators between items.
- **Variants:** single-open (default) or multiple; ghost (no border) inside panels.
- **States:** open/closed at 200ms height ease; disabled items with reason tooltip.
- **Keyboard & a11y:** Enter/Space toggles; ↑↓ move between headers; headers are real buttons inside heading elements; expanded state announced.
- **Usage:** Never hide required fields or the primary action in an accordion. Not for navigation — that's Navigation.md's tree.

### 4.3 Timeline

- **Purpose:** chronological history on an entity — the activity-feed variant renders inside detail panels.
- **Anatomy:** vertical rail (2px border-subtle) with 8px node dots; each entry: actor avatar (20px) + event sentence ("Priya moved this to **In review**") + relative timestamp (absolute on hover); day separators with sticky date labels.
- **Variants:** activity feed (events only); mixed (events + comments interleaved, comments render as full Comment components §4.4); milestone timeline (project view — larger nodes, status-colored for done/at-risk).
- **States:** loading = 3 skeleton entries; empty = quiet one-liner, not a full empty-state card; incremental "Show earlier activity" loads upward without scroll jump.
- **Keyboard & a11y:** a list semantically (`<ol>`); entries with actions (linkable entities) keyboard-reachable; timestamps carry full datetime.
- **Usage:** Event sentences are human, not log lines — never "status_changed: 2→3". AI actions in the timeline carry the ✦ mark (§6.12).

### 4.4 Comments (threaded)

- **Purpose:** discussion on any entity; the collaboration primitive.
- **Anatomy:** comment = avatar + author (body-strong) + relative time + ✦ mark if AI-drafted + body (rich text, @mentions rendered as accent-soft entity chips) + action row on hover (React, Reply, ···). Thread = root + indented replies (one level, 24px indent); "N replies" collapses long threads. Composer at bottom: autogrowing textarea, @ triggers a mention popover (arrow-navigable), ⌘↵ submits.
- **Variants:** resolvable threads (docs, deliverables): root gains a Resolve button; resolved threads collapse to a single muted line ("Resolved by Dana · 3 comments") with expand; portal-visible comments carry a "Visible to client" badge.
- **States:** posting is optimistic (comment renders immediately, muted until confirmed; failure = inline retry on the comment, not a toast-error); editing inline with Save/Cancel + "(edited)" suffix; deleted = "Comment deleted" tombstone if it has replies.
- **Keyboard & a11y:** composer reachable by `c` on supported surfaces; mention popover fully arrow-navigable; new comments announced politely; Esc cancels edit.
- **Usage:** One reply depth only — deeper nesting becomes a new thread. @mention triggers a notification (Notifications.md); never auto-@ people.

### 4.5 Activity feed (event-rendered, coalesced)

- **Purpose:** workspace- and dashboard-level "what happened" streams built from the domain event stream.
- **Anatomy:** Timeline (§4.3) entries rendered from typed events; each row: actor (or ✦ Aurex) + verb phrase + entity link + time.
- **Coalescing:** consecutive events by the same actor on the same entity within 10 minutes collapse into one row ("Dana updated 4 fields on *Meridian homepage*") expandable in place. Bulk operations always coalesce ("Marco moved 12 tasks to Done").
- **States:** live entries slide in at top (150ms, suppressed under reduced motion); "New activity" pill instead of auto-scroll when the user has scrolled down; empty state teaches what will appear here.
- **Usage:** Feeds are permission-aware — a user never sees an event about an entity they can't open. Every entity mention is a canonical link.

### 4.6 Calendar (month / week / day)

- **Purpose:** meetings, deadlines, and scheduling across modules.
- **Anatomy:** header (view switcher Tabs, today button, ← → period nav, date title) + grid. **Month:** 7-col grid, day cells with up to 3 event chips + "+N more" popover. **Week/Day:** time-gutter rows (Geist Mono labels), positioned event blocks, current-time indicator line (accent).
- **Event chip:** 24px row — category color dot (categorical ramp) + title + time (tabular); portal/client-visible events carry a subtle client marker; AI-scheduled events carry ✦.
- **Drag interactions:** drag to move (snaps to 15-min increments), drag edges to resize, drag on empty grid to create; all with spring physics per the motion doctrine, live time tooltip while dragging, undo toast after drop. Money-adjacent or attendee-notifying moves are never optimistic — they confirm via approval where AI-initiated.
- **States:** loading = grid with skeleton chips; conflict = overlapping blocks share width side-by-side; declined events at 0.5 opacity strikethrough.
- **Keyboard & a11y:** grid arrow-navigation between days/slots, Enter creates/opens, ⌘←→ switch period, M/W/D switch views; drag operations all have keyboard equivalents (open → edit time); date grid semantics announced.
- **Usage:** Never hide events silently — overflow always gets "+N more". Timezone is always visible when it differs from the viewer's.

### 4.7 Kanban board & Kanban card

- **Purpose:** the Phase-1 heart of tasks and CRM pipeline.
- **Board anatomy:** horizontal scroll of columns (280px each); column header: name (body-strong) + count badge + WIP hint + "···" menu + "+" quick-add; column body is a virtualized vertical list; board toolbar above (filters, saved views, density toggle).
- **WIP hints:** columns may declare a soft WIP limit; at limit the count badge turns warning ("6/5") with a tooltip — a hint, never a hard block.
- **Drag physics:** spring-tuned (one shared config from `packages/ui/motion`); lifted card scales 1.02 with shadow level 2 and 2° tilt; drop targets show an insertion placeholder of exact card height; auto-scroll near edges; drop settles in ≤200ms. Reduced motion: no tilt/spring, instant snap with fade.
- **Card anatomy (top → bottom):** title (body, 2-line clamp) → meta row (identifier in Geist Mono, due date — danger when overdue, priority icon) → footer: label Tags (max 3 + "+N") left, assignee Avatar stack right; optional cover slot; **client-visible marker** (small globe icon + tooltip "Visible in client portal") top-right when applicable; ✦ mark when AI-created.
- **States:** hover (raise to border-strong + shadow 1), focus-visible ring, selected (accent border, multi-select with Shift/⌘), dragging, drop-committing (optimistic — rollback with toast on failure), loading column = 3 skeleton cards, empty column = quiet dashed drop hint.
- **Keyboard & a11y:** cards focusable in DOM order; Space lifts / arrows move between positions and columns / Space drops / Esc cancels (announced move: "Task moved to In review, position 2"); Linear-style single keys on the focused card (`a` assign, `d` due, `p` priority); board changes announced politely.
- **Usage:** A card shows at most: title, 3 meta items, 3 labels, assignees. More belongs in the detail Sheet. Column count > 7 is an IA smell.

### 4.8 Stat / Statistics card

- **Purpose:** single-metric tiles on dashboards ("MRR", "Overdue invoices").
- **Anatomy:** label (caption, muted) → value (24–30px, **700 weight, tabular numerals** — the only 700 in the system) → delta row: arrow ▲▼ + percentage + comparison label ("vs last month") → optional **sparkline slot** (per [Charts.md](./Charts.md), no axes) → optional footer link.
- **Variants:** with sparkline; with progress (goal completion bar); compact (label + value only, dashboard dense grids).
- **Delta semantics:** color follows *meaning*, not direction — cost going down is success-green. Direction arrow + label always accompany color (never color alone).
- **States:** loading skeleton (label line + value block); empty ("No data yet" + why); error (inline retry, never a broken number); value changes animate with a 150ms tween, suppressed under reduced motion.
- **Keyboard & a11y:** whole card is a link when it drills down; value + delta read as one sentence ("MRR forty-two thousand, up 8% vs last month").
- **Usage:** Never show a delta without its comparison label. Money always carries currency code/symbol.

### 4.9 Empty state pattern

Owned in depth by [EmptyStates.md](./EmptyStates.md); the contract in brief: every list, table, and board has a designed empty state — icon/illustration (subtle, from the neutral ramp), what this is, why it's useful (one sentence), one primary CTA, and optionally an "✦ Ask Aurex to set this up" secondary action. Filtered-empty ("No results for these filters") is a distinct, lighter variant with "Clear filters". The `empty-state` primitive in `packages/ui` implements the skeleton; each module supplies content.

### 4.10 Pagination & infinite scroll doctrine

- **Purpose:** navigate large collections predictably.
- **Doctrine:** finite, referenceable collections (invoices, audit log) use **pagination** — page numbers are shareable URLs. Streams (activity, notifications, comments) use **infinite scroll** with an explicit "Load more" fallback button (never scroll-only). **Any list that can exceed ~100 rows is virtualized** — boards, tables, feeds — with stable scroll restoration and correct scrollbar sizing.
- **Anatomy (pagination):** "1 2 … 9" page buttons + prev/next; page size Select (25/50/100, persisted per user); result count caption left ("128 invoices"), tabular numerals.
- **States:** current page = accent-soft; disabled prev/next at bounds; loading swaps table body to skeleton rows without layout shift.
- **Keyboard & a11y:** all controls buttons/links; `aria-current="page"`; infinite-scroll loads announced ("20 more items loaded"); focus never lost when rows append.
- **Usage:** Never mix both patterns in one surface. Never auto-load past 3 infinite batches without an explicit "Load more" interaction.

---

## 5. Domain cards (composed patterns)

Composed from primitives, living in `packages/ui`, themed per [Cards.md](./Cards.md) surface rules (radius 8, border-first depth, hover raise). Every domain card: whole card is a canonical link (⌘-click works), skeleton variant matches layout exactly, ✦ mark when AI-created/modified.

### 5.1 Project card

- **Anatomy:** header — project name (title-3) + **health dot** (success/warning/danger + label on hover: "At risk — 3 overdue tasks"; never color alone) → client name (small, muted, linked) → **progress bar** (§2.15, tasks done/total, tabular fraction) → **next milestone** row (flag icon + name + due date, danger when overdue) → footer: team Avatar stack + activity recency ("Updated 2h ago").
- **Never shows:** budget/margin figures (Finance surfaces only, permission-gated), internal risk notes, client-contact personal data.
- **Usage:** Health is computed, not hand-set — the dot always has an explanation on hover. Card grid: 3-up default, compact list variant for dashboards.

### 5.2 Lead / CRM pipeline card

- **Anatomy (kanban-card specialization):** company/lead name (body-strong) + contact person (small, muted) → **value** (Geist Mono tabular, currency) → meta row: **stage-age** ("12d in Proposal") + **rot indicator** — clock icon that escalates neutral → warning (>14d) → danger (>30d) with tooltip ("No activity for 18 days") → **next action** line (calendar icon + "Follow-up call · Thu") or a danger "No next step" flag → footer: owner avatar + source Tag.
- **Never shows:** internal scoring rationale in raw form, other clients' names in comparisons, margin assumptions.
- **Usage:** "No next step" is deliberately loud — an empty next action is the pipeline's biggest smell. Rot thresholds are workspace-configurable but default on.

### 5.3 Client card

- **Anatomy:** client logo Avatar (square) + name (title-3) + relationship health dot → active engagements line ("2 projects · 1 proposal") → financial pulse (permission-gated: outstanding balance, tabular) → primary contact (avatar + name + role) → footer: last touchpoint ("Meeting · 4d ago") + portal status Badge ("Portal active").
- **Never shows:** churn-risk scores to non-managers; anything from other workspaces.
- **Usage:** The card is a summary, not a CRM record — three facts maximum per section, details in the client page.

### 5.4 Invoice row / card

- **Anatomy (row, the default in Finance tables):** invoice number (Geist Mono) → client (linked) → issue/due dates → **status chip** → **amount right-aligned, tabular numerals, currency code**. Card variant (dashboard) adds a due-in caption and pay-progress for partials.
- **Status chip lifecycle:** `draft` (neutral) → `sent` (info) → `viewed` (info, eye icon) → `paid` (success) → `overdue` (danger; replaces `sent/viewed` once past due). Auxiliary: `partially paid` (warning), `void` (neutral, strikethrough number). One chip, one truth — never two status chips on one invoice.
- **Never shows:** cost/margin internals on any surface the client-portal shares; other clients' invoices in any aggregate a client could see.
- **Usage:** Amounts are never optimistic — money mutations confirm on server truth (Design Principles §8.3). Overdue rows may tint the due date, not the whole row.

### 5.5 Deliverable / Approval card (Client Portal)

- **Anatomy:** deliverable title (title-3) + version Badge ("v3") → preview thumbnail slot → status chip (`awaiting review` info / `changes requested` warning / `approved` success) → description (client-written-quality copy, ≤2 lines) → action row (portal side): **Approve** (primary) + **Request changes** (secondary, opens comment composer); agency side shows the client's state read-only + internal notes *outside* the card.
- **Never shows (hard law):** internal fields of any kind — assignees, internal comments, hours, cost, task links, ✦ AI-internal provenance detail beyond the attribution mark itself. The portal card is a different composition, not a filtered agency card — there is no prop that "hides" internal data; portal cards simply cannot receive it.
- **States:** approval is *not* optimistic; approved state is permanent and celebrated quietly (check morph, no confetti).
- **Usage:** One primary action per card. Approval requests expire visibly if a newer version supersedes them.

### 5.6 Meeting card

- **Anatomy:** time block (start–end, tabular; relative "in 25 min" when close) → title (body-strong) → attendee Avatar stack (+ external-attendee marker) → location/link row (video icon + "Join" button appears 10 min before) → footer: linked entity chip (project/client) + agenda/AI-brief indicator ("✦ Brief ready").
- **Never shows:** other meetings' details in shared views beyond busy/free; AI pre-meeting brief content on the card itself (link only).
- **Usage:** "Join" is the only primary action and only near start time. Past meetings swap actions for "Notes · Recording · ✦ Summary".

---

## 6. AI components

The canonical implementations of the AI UX laws ([../11_Design_Principles.md](../11_Design_Principles.md) §9). Shared laws: every AI artifact carries the ✦ mark (§6.12); every side-effecting action passes through an Approval card (§6.4) — no silent execution; suggestions never auto-commit; streaming reserves layout; Aurex is quiet by default — no popups, no upsell toasts, proactive output only in designated digest surfaces.

### 6.1 AI Chat Window (conversation panel)

- **Purpose:** the dockable conversation with Aurex — an OS surface in the shell's right panel (360px), never a floating support bubble.
- **Anatomy:** **header** — ✦ + "Aurex" + **context chip** showing what the conversation is anchored to ("◈ Meridian redesign", removable ×, click to change scope) + ··· menu (history, full-screen, clear) → **thread** — user messages right-aligned neutral; Aurex messages left with ✦, streamed (§6.6), containing prose, citation chips, Tool cards (§6.10), and Approval cards (§6.4) inline → **composer** (§6.2) pinned bottom.
- **Full-screen mode:** promotes to an ~880px centered column with the Conversation History sidebar (§6.9) on the left; same thread, same anchors — a layout change, not a different product.
- **States:** empty (scoped suggestion prompts: "Summarize this project's week", never generic "How can I help?"); Aurex thinking (§6.5); disconnected (inline banner + retry); history loading skeleton.
- **Keyboard & a11y:** global shortcut opens/focuses the panel; Esc returns focus to the page (panel persists); thread is a log live-region with buffered announcements; every citation and card keyboard-reachable.
- **Usage:** One conversation panel; it replaces the context panel content when opened (panels replace, never stack). The panel never opens itself.

### 6.2 Prompt Box / Composer

- **Purpose:** where users talk to Aurex — panel, full-screen, and palette Ask share this component.
- **Anatomy:** autogrowing textarea (1→6 lines) → **context-anchor rail** above the input: attached entities as chips ("◈ INV-0142" ×), files, selections — anchors are explicit and removable, and everything Aurex sees is inspectable via the Context Panel (§6.7) → footer row: attach button, **slash-command** trigger (`/` opens a command popover: /summarize, /draft, /create-task — arrow-navigable, Tab completes), send button (↵; ⇧↵ newline).
- **Model-agnostic by design:** end users never see a model picker — the workspace's AI governance settings decide model tiers per task class. An **admin-only Model/Tier Selector** lives in Settings → AI governance (Radio-card group per action class: quality tier / balanced / economy, plus provider opt-outs and budgets) — never in the composer.
- **States:** default, focused, streaming-in-progress (send becomes **Stop**), over-budget (disabled with tooltip: "Workspace AI budget reached — ask an admin", quiet, no upsell), attachment-uploading (send disabled until scanned §2.7).
- **Keyboard & a11y:** ↵ send / ⇧↵ newline / Esc clears or exits; `@` mentions entities (same popover as comments); composer labeled "Message Aurex"; slash popover fully keyboard-operable.
- **Usage:** The composer never pre-fills marketing prompts. Draft text persists per anchor scope across navigation.

### 6.3 AI Suggestions (ghost text + suggestion chips)

- **Purpose:** inline, ignorable intelligence in editors and composers.
- **Ghost text:** completion rendered in `--text-muted` after the caret; **Tab accepts**, **Esc dismisses**, any other keystroke ignores and continues typing. Never auto-commits, frequency-capped so writing never feels contested; disappears while the user is actively typing (300ms idle before re-offering). Exposed to screen readers as a *suggestion* announcement ("Suggestion available: …, press Tab to accept") — never as document content.
- **Suggestion chips:** small ✦-marked action chips under a field or above the composer ("✦ Draft reply", "✦ Summarize thread") — radius 4, neutral surface, accent on hover; click inserts a *draft* (visibly editable, never sent). Max 3 chips; they never animate to attract attention.
- **States:** available, accepted (ghost text solidifies with a 150ms color transition), dismissed (that suggestion never re-offers verbatim in the session).
- **Usage:** Ghost text appears only in fields the user is already editing. Chips appear only where the action is contextually obvious — no "did you know" chips.

### 6.4 AI Action / Approval Card — canonical spec

- **Purpose:** the mandatory gate for every side-effecting AI action (outbound sends, mutations, portal publishes, anything destructive). There is no silent execution path.
- **Anatomy (top → bottom):**
  1. **Header:** ✦ + proposal verb phrase, plain language ("Send payment reminder to Meridian Co.").
  2. **Affected entities list:** each as an entity chip (icon + name, canonical link) — every record that will be touched, explicitly ("Invoice INV-0142 · Contact: Sara Lin").
  3. **Diff / preview block:** the exact artifact — email body preview, field-level diff (old → new, danger/success text treatment), or created-entity preview. Scrollable within the card, expandable to a Sheet for long content.
  4. **Cost line:** where relevant — money ("Will apply a $120 credit"), quota, or send-count — tabular numerals, never hidden.
  5. **Action row:** **Approve** (primary) · **Edit** (secondary — opens the draft for modification; approving an edited draft re-renders the card with the edited content) · **Dismiss** (ghost). Approve is never default-focused; there is no "always approve" checkbox on the card (autonomy is set in AI governance settings, per action class, by admins).
- **States:** pending (default); **editing**; approved (collapses to a receipt line: "✓ Approved by Dana · Sent 14:02" — becomes a Tool card §6.10 in history); dismissed (collapsed, reason optional); **expired** — proposals invalidated by newer data (the invoice was paid meanwhile) gray out with "This proposal expired — the invoice was paid" and only a Dismiss affordance; **failed** (approved but execution failed: inline error + retry, never a toast-error).
- **Keyboard & a11y:** the card is a focus group; A/E/D do not shortcut (deliberately — approval requires explicit Tab+Enter); all content readable before the actions in DOM order; state changes announced.
- **Usage:** One proposal per card — batches render as a list of cards with a summary header, individually approvable. The card text states *what will happen*, never "I suggest maybe…" hedging.

### 6.5 Thinking / Working indicator

- **Purpose:** honest visibility while Aurex works — disclosed tool steps, no fake progress.
- **Anatomy:** ✦ with a subtle 1.2s opacity pulse (static under reduced motion) + current step line in muted text, updated as real steps occur: "Searching invoices…" → "Searching invoices… found 3" → "Drafting reply…". Completed steps collapse into a disclosure ("3 steps ▸") expandable to the Tool card list (§6.10).
- **States:** thinking (no step info yet — pulse + "Thinking…"), working (named steps), long-running (>10s adds elapsed time + Stop button), stalled (>30s: "Still working — Stop?").
- **A11y:** step changes announced politely, batched ≥3s apart; never a `progressbar` role (there is no fraction — no fake progress, ever).
- **Usage:** Step lines name real actions in user vocabulary ("Searching invoices", not "invoking tool: finance.query"). Never a spinner alone for multi-second AI work.

### 6.6 Streaming Response

- **Purpose:** Aurex's answers arrive as motion that never lies about layout.
- **Anatomy & behavior:** response region **reserves layout** before tokens arrive (min-height block; the thread never jumps); steady token flow at network rate — no artificial typewriter throttling; **Stop button** visible for the entire stream (stopping keeps partial output, marked "Stopped"); **citation chips** render inline as sources resolve — small chips (entity icon + name) linking to the actual record, numbered when >3 with a Sources footer row.
- **States:** streaming, stopped (partial + "Stopped" caption), complete (action row fades in: copy, retry, "Continue in panel" where applicable), error mid-stream (partial output kept + inline error with retry).
- **A11y:** **buffered screen-reader announcements** — the live region receives sentence-level chunks, not per-token spam; completion announced ("Aurex finished responding"); Stop is keyboard-reachable during the stream.
- **Usage:** Citations link to records the user can open (permission-aware); an uncitable claim is presented as unverified. Low-confidence answers are labeled drafts — "wrong-but-confident" is the one unforgivable behavior.

### 6.7 Context Panel ("what Aurex sees")

- **Purpose:** transparency surface — exactly what context is anchored to the current conversation.
- **Anatomy:** disclosure section within the chat panel ("Context ▸ 4 items"): list of anchored entities, each row = entity chip + **provenance badge** ("Open view" / "You attached" / "Retrieved — KB article", with retrieval trust level: published-KB sources rank highest and say so) + remove × for user-attached items.
- **States:** empty ("Aurex only sees what's listed here"), item-limit reached (oldest auto-anchor drops with notice).
- **A11y:** a list; every remove button labeled; changes announced.
- **Usage:** Nothing enters Aurex's context invisibly — if it isn't in this panel, Aurex doesn't have it. Retrieved sources always show *why* they were retrieved on hover.

### 6.8 Memory Viewer

- **Purpose:** user-visible, user-editable record of what Aurex remembers ("no spooky memory").
- **Anatomy:** Settings → Aurex → Memory: list of memory items, each row = the remembered statement in plain language ("Prefers weekly status drafts on Fridays") + source line (when learned, from what interaction — linked) + scope Badge (personal / workspace) + **delete** affordance (immediate, undo toast) + edit (inline).
- **States:** empty ("Aurex hasn't saved any memories yet — it will ask before saving new ones"), item pending confirmation (Aurex proposes a memory via an Approval-style inline card — memories are never saved silently).
- **Usage:** Memory items are sentences, not key-value pairs. Deleting is instant and honored everywhere — no "it may take a while" hedging.

### 6.9 Prompt / Conversation History

- **Purpose:** durable, navigable record of every Aurex conversation per workspace.
- **Anatomy:** sidebar (full-screen mode) or panel-header menu: conversations grouped by recency (Today / This week / Earlier), each row = auto-title + anchor chip ("◈ Meridian") + time; **pinning** (pin icon, pinned group on top); **per-entity anchors** — an entity page's Aurex panel filters history to conversations anchored to that entity by default ("All conversations" toggle).
- **States:** search-within-history (filter input, instant), empty, loading skeleton rows.
- **Keyboard & a11y:** listbox navigation; rename inline (F2/click title); delete with undo toast.
- **Usage:** History is per-workspace and permission-scoped. Conversations are never silently deleted or truncated.

### 6.10 AI Tool Cards (tool-call receipts)

- **Purpose:** the permanent receipt of what a tool call actually did — the audit trail's UI face.
- **Anatomy:** compact card in the thread: tool verb + target ("Created task") → **inputs digest** — one muted line summarizing key inputs ("'Send homepage v2' · assigned Dana · due Fri") → **outcome** — success check + result summary + **canonical link** to the created/affected record; failures show the specific error + whether anything was changed.
- **States:** running (folded into the Working indicator §6.5), succeeded, failed, undone (where the action was reversed — shows by whom).
- **A11y:** a labeled group; the outcome link is the primary focusable.
- **Usage:** Every tool call gets a receipt — including reads when they inform a cited answer (collapsed under the steps disclosure). Receipts are immutable; corrections are new events.

### 6.11 Agent Status (multi-step plan progress)

- **Purpose:** visibility and control over multi-step Aurex jobs (scheduled work, "draft weekly client updates" runs).
- **Anatomy:** **plan preview** first — before execution, the full step list renders as an Approval card variant (steps enumerated, affected scope, cost estimate) requiring approval to start → during execution, a status card: step list with per-step states — done ✓ / active (pulse + step line) / pending (muted) / **paused-for-approval** (amber, embeds the Approval card for that step inline) / failed (danger + retry/skip choice) → footer: elapsed time, Stop.
- **States:** awaiting-start-approval, running, paused-for-approval (job halts until the human decides — no timeout-auto-approve), completed (receipt summary + links to everything produced), stopped, failed.
- **A11y:** step list is an ordered list with state in text; pause events announced assertively (they need attention); all controls keyboard-operable.
- **Usage:** No step with side effects executes without its approval gate unless the workspace autonomy ladder explicitly allows that action class. Progress is step-count-honest — never a percentage invented from nothing.

### 6.12 ✦ Attribution mark

- **Purpose:** the permanent, universal marker of AI work — the only emoji-like glyph permitted in the UI.
- **Placement:** inline before "Aurex" in chat; top-right corner slot on cards/blocks AI created or modified; inline suffix on timeline/feed entries; a column marker in tables; in audit log rows. Rendered in `--accent-text` at 12–14px, optically aligned to the cap height of adjacent text.
- **Hover / focus detail (popover):** **when** (absolute timestamp), **from what instruction** (the prompt or automation that produced it, truncated with expand), **approved by whom** (approver name + time, or "auto-approved per workspace policy — {class}"). For modified-not-created artifacts, it names what changed.
- **Persistence:** attribution is permanent — surviving edits (becomes "AI-assisted, edited by Dana"), copies, and exports. It is stored data, not decoration; removing it is not a UI option.
- **A11y:** never bare — accessible name "Created by Aurex" / "AI-assisted"; the detail popover is keyboard-openable.
- **Usage:** The mark is small and calm — attribution, not branding. It never appears on human-only work, and no AI work ships without it (anti-pattern §12.6: no mystery AI).

---

## 7. Cross-references — sibling deep specs

| Domain | Owned by | This document's boundary |
|---|---|---|
| Buttons (all variants, icon buttons, button groups) | [Buttons.md](./Buttons.md) | Referenced in overlay footers, approval cards |
| Text inputs, textareas, field layout, validation, form patterns | [Forms.md](./Forms.md) | Controls in §2 reference its error/label patterns |
| Card surface rules (radius, borders, hover, grid layouts) | [Cards.md](./Cards.md) | §5 domain cards compose on its surface contract |
| Sidebar, workspace switcher, breadcrumbs, page header, tabs-as-nav | [Navigation.md](./Navigation.md) | §4.1 Tabs covers content tabs only |
| Data tables, column config, sorting, bulk actions, density | [Tables.md](./Tables.md) | §4.10 pagination doctrine applies to its tables |
| All charts, sparklines, categorical ramp usage | [Charts.md](./Charts.md) | §4.8 stat card consumes its sparkline |
| Notification center, notification rows, batching, quiet hours | [Notifications.md](./Notifications.md) | §3.7 toasts are ephemeral-only |
| Empty state content patterns per module | [EmptyStates.md](./EmptyStates.md) | §4.9 defines only the structural contract |
| Master inventory, status ledger, contribution workflow | [ComponentInventory.md](./ComponentInventory.md) | Status of every component specified here |

---

## 8. Open questions

1. **Palette Ask latency budget** — does Ask-in-palette stream inline for all queries, or hand off to the panel beyond a token-length threshold? Needs Phase 3 telemetry.
2. **Kanban swimlanes** — grouped horizontal lanes (by assignee/epic) are requested; interaction model with virtualization unresolved. Target decision before Phase 1 exit.
3. **Approval card batching ceiling** — max cards per Aurex message before we require a summarized batch-approval pattern; proposal: 5.
4. **Portal theming** — do client-portal domain cards accept per-agency accent overrides in Phase 5 white-labeling, and does the ✦ mark remain Aurex-branded there? Owner: Chief Product Designer + PM.
5. **Comment reactions set** — full emoji picker conflicts with the no-emoji-iconography rule; proposal: a curated 6-reaction set rendered as Lucide icons. Needs design review.
6. **Memory Viewer scope** — whether workspace-scoped memories are editable by all members or admins only. Owner: AI governance spec (Phase 3).
