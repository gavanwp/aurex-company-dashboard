# Component Inventory & Status Ledger

| | |
|---|---|
| **Document** | Component Inventory & Status Ledger — AurexOS |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [../11_Design_Principles.md](../11_Design_Principles.md) · [Components.md](./Components.md) · [Buttons.md](./Buttons.md) · [Forms.md](./Forms.md) · [Cards.md](./Cards.md) · [Navigation.md](./Navigation.md) · [Tables.md](./Tables.md) · [Charts.md](./Charts.md) · [Notifications.md](./Notifications.md) · [EmptyStates.md](./EmptyStates.md) |

This ledger is the single source of truth for what exists, what is specified, and what is still owed. A component not listed here does not exist; a status wrong here is a documentation bug with the same severity as a code bug.

---

## 1. How to read this ledger

**Tiers**

| Tier | Meaning |
|---|---|
| **Primitive** | Vendored shadcn/ui + Radix, token-themed, in `packages/ui/components` |
| **Composed** | Assembled from primitives; still generic (kanban, comments, palette) |
| **Domain** | Business-shaped compositions (project card, invoice row) |
| **AI** | Aurex surfaces governed by the AI UX laws (Design Principles §9) |

**Status**

| Status | Meaning |
|---|---|
| **Shipped** | In `packages/ui` today, both themes, states complete, gallery entry exists |
| **Specified** | Design spec approved in a `docs/design` file; not yet in `packages/ui` |
| **Planned (Phase N)** | Owed by roadmap Phase N; spec may still be partial |

**Phase** maps to [../10_Roadmap.md](../10_Roadmap.md): 0 Foundation · 1 Internal MVP · 2 Agency Operations · 3 AI Layer · 4 Client Portal & Polish · 5 Commercial SaaS. "Phase needed" = the first phase that cannot ship its P0 gate without the component.

As of this version, **26 primitives are shipped** in `packages/ui` (25 components + 1 hook), matching the actual contents of `packages/ui/components` and `packages/ui/hooks`.

---

## 2. Full inventory

### 2.1 Primitives

| Component | Tier | Status | Owning spec | Phase | Notes |
|---|---|---|---|---|---|
| Button | Primitive | Shipped | [Buttons.md](./Buttons.md) | 0 | `button.tsx` |
| Input | Primitive | Shipped | [Forms.md](./Forms.md) | 0 | `input.tsx` |
| Textarea | Primitive | Shipped | [Forms.md](./Forms.md) | 0 | `textarea.tsx` |
| Label | Primitive | Shipped | [Forms.md](./Forms.md) | 0 | `label.tsx` |
| Select | Primitive | Shipped | [Components.md](./Components.md) §2.1 | 0 | `select.tsx`; combobox variant not yet shipped |
| Checkbox | Primitive | Shipped | [Components.md](./Components.md) §2.2 | 0 | `checkbox.tsx` |
| Badge | Primitive | Shipped | [Components.md](./Components.md) §2.9 | 0 | `badge.tsx` |
| Avatar | Primitive | Shipped | [Components.md](./Components.md) §2.8 | 0 | `avatar.tsx`; stack variant needs gallery audit |
| Tooltip | Primitive | Shipped | [Components.md](./Components.md) §2.11 | 0 | `tooltip.tsx` |
| Kbd | Primitive | Shipped | [Components.md](./Components.md) §2.12 | 0 | `kbd.tsx` |
| Separator | Primitive | Shipped | [Components.md](./Components.md) §2.13 | 0 | `separator.tsx` |
| Skeleton | Primitive | Shipped | [Components.md](./Components.md) §2.14 | 0 | `skeleton.tsx` |
| Card | Primitive | Shipped | [Cards.md](./Cards.md) | 0 | `card.tsx` — surface primitive |
| Table | Primitive | Shipped | [Tables.md](./Tables.md) | 0 | `table.tsx` — semantic table primitive |
| Tabs | Primitive | Shipped | [Components.md](./Components.md) §4.1 | 0 | `tabs.tsx` |
| Dialog | Primitive | Shipped | [Components.md](./Components.md) §3.1 | 0 | `dialog.tsx`; destructive variant needs typed-name confirm |
| Sheet | Primitive | Shipped | [Components.md](./Components.md) §3.2 | 0 | `sheet.tsx` |
| Popover | Primitive | Shipped | [Components.md](./Components.md) §3.3 | 0 | `popover.tsx` |
| Dropdown menu | Primitive | Shipped | [Components.md](./Components.md) §3.4 | 0 | `dropdown-menu.tsx`; shortcut column present |
| Command | Primitive | Shipped | [Components.md](./Components.md) §3.6 | 1 | `command.tsx` — cmdk base; full ⌘K palette is composed (below) |
| Sonner (toast) | Primitive | Shipped | [Components.md](./Components.md) §3.7 | 0 | `sonner.tsx`; undo pattern is composed usage |
| Scroll area | Primitive | Shipped | — (internal utility) | 0 | `scroll-area.tsx` |
| Empty state | Primitive | Shipped | [EmptyStates.md](./EmptyStates.md) | 0 | `empty-state.tsx` — structural skeleton |
| Page header | Primitive | Shipped | [Navigation.md](./Navigation.md) | 0 | `page-header.tsx` |
| Stat card | Primitive | Shipped | [Components.md](./Components.md) §4.8 | 1 | `stat-card.tsx`; sparkline slot pending Charts.md |
| useMediaQuery (hook) | Primitive | Shipped | — (internal utility) | 0 | `hooks/use-media-query.ts` |
| Switch | Primitive | Specified | [Components.md](./Components.md) §2.3 | 1 | Needed for settings surfaces |
| Radio group | Primitive | Specified | [Components.md](./Components.md) §2.4 | 1 | Incl. card-radio variant |
| Slider | Primitive | Specified | [Components.md](./Components.md) §2.5 | 2 | Capacity/threshold settings |
| Date picker | Primitive | Specified | [Components.md](./Components.md) §2.6 | 1 | Due dates are Phase 1 P0; range variant Phase 2 (reports) |
| File upload | Primitive | Specified | [Components.md](./Components.md) §2.7 | 1 | AV-scan pending state required before portal use (4) |
| Tag (removable) | Primitive | Specified | [Components.md](./Components.md) §2.10 | 1 | Labels on tasks/deals |
| Progress bar | Primitive | Specified | [Components.md](./Components.md) §2.15 | 1 | Project progress, uploads |
| Spinner | Primitive | Specified | [Components.md](./Components.md) §2.16 | 1 | Currently ad-hoc inside button; extract |
| Context menu | Primitive | Specified | [Components.md](./Components.md) §3.5 | 1 | Boards/tables right-click parity |
| Accordion | Primitive | Specified | [Components.md](./Components.md) §4.2 | 2 | Settings groups, long forms |
| Combobox | Primitive | Specified | [Components.md](./Components.md) §2.1 | 1 | Type-to-filter Select; assignee/client pickers |
| Calendar grid (month primitive) | Primitive | Specified | [Components.md](./Components.md) §2.6 | 1 | Shared by date picker + Calendar views |
| Breadcrumbs | Primitive | Planned (1) | [Navigation.md](./Navigation.md) | 1 | Entity hierarchy paths |
| Toggle group (segmented) | Primitive | Planned (1) | [Components.md](./Components.md) §4.1 | 1 | View switchers (board/list/calendar) |

### 2.2 Composed patterns

| Component | Tier | Status | Owning spec | Phase | Notes |
|---|---|---|---|---|---|
| Command palette (⌘K, Find/Do/Ask) | Composed | Specified | [Components.md](./Components.md) §3.6 | 1 | Flagship; Ask intent activates Phase 3 |
| Form field (label+control+error) | Composed | Specified | [Forms.md](./Forms.md) | 1 | The one blessed field layout |
| Data table (toolbar, sort, bulk, density) | Composed | Specified | [Tables.md](./Tables.md) | 1 | Composes `table.tsx`; virtualized >100 rows |
| Filter bar + saved views | Composed | Planned (1) | [Tables.md](./Tables.md) | 1 | Saved views are Phase 1 P1 |
| Kanban board | Composed | Specified | [Components.md](./Components.md) §4.7 | 1 | Tasks + CRM pipeline; virtualized columns |
| Kanban card | Composed | Specified | [Components.md](./Components.md) §4.7 | 1 | Base for Lead card |
| Timeline / activity variant | Composed | Specified | [Components.md](./Components.md) §4.3 | 1 | Entity detail panels |
| Activity feed (coalesced) | Composed | Specified | [Components.md](./Components.md) §4.5 | 1 | Dashboard + workspace feed |
| Comments (threaded, @mentions, resolve) | Composed | Specified | [Components.md](./Components.md) §4.4 | 1 | Resolve variant Phase 2 (docs) |
| Pagination | Composed | Specified | [Components.md](./Components.md) §4.10 | 1 | Finite collections only |
| Virtualized list/infinite scroll | Composed | Specified | [Components.md](./Components.md) §4.10 | 1 | Mandatory >100 rows |
| Undo toast pattern | Composed | Specified | [Components.md](./Components.md) §3.7 | 1 | 5s undo; wraps Sonner |
| Destructive confirm dialog (typed-name) | Composed | Specified | [Components.md](./Components.md) §3.1 | 1 | Irreversible acts only |
| Calendar (month/week/day views) | Composed | Specified | [Components.md](./Components.md) §4.6 | 2 | Meetings/scheduling module |
| Rich text editor (mentions, ghost-text slot) | Composed | Planned (2) | [Forms.md](./Forms.md) | 2 | Documents/KB substrate; ghost-text slot wired Phase 3 |
| Notification center | Composed | Planned (1) | [Notifications.md](./Notifications.md) | 1 | Rows, batching, quiet hours |
| Shortcut help overlay (?) | Composed | Planned (1) | [Navigation.md](./Navigation.md) | 1 | Reads shortcut registry |
| Sidebar / workspace switcher / icon rail | Composed | Shipped (shell) | [Navigation.md](./Navigation.md) | 0 | Lives in app shell; audit against Navigation.md |
| Context panel (persistent right panel) | Composed | Planned (1) | [Navigation.md](./Navigation.md) | 1 | Non-modal; hosts entity detail + Aurex (3) |
| Charts suite (line, bar, donut, sparkline) | Composed | Planned (2) | [Charts.md](./Charts.md) | 2 | Categorical ramp from tokens |
| Gallery route | Composed | Planned (0→) | [ComponentInventory.md](./ComponentInventory.md) §4 | 0 | Continuous obligation — every component, every state, both themes |

### 2.3 Domain components

| Component | Tier | Status | Owning spec | Phase | Notes |
|---|---|---|---|---|---|
| Project card | Domain | Specified | [Components.md](./Components.md) §5.1 | 1 | Health dot, progress, milestone, team stack |
| Task row / task detail sheet | Domain | Planned (1) | [Tables.md](./Tables.md) / [Cards.md](./Cards.md) | 1 | List twin of Kanban card |
| Lead / CRM pipeline card | Domain | Specified | [Components.md](./Components.md) §5.2 | 1 | Value, stage age, rot, next action |
| Client card | Domain | Specified | [Components.md](./Components.md) §5.3 | 1 | CRM-lite |
| Invoice row / card + status chip lifecycle | Domain | Specified | [Components.md](./Components.md) §5.4 | 2 | draft→sent→viewed→paid→overdue; money never optimistic |
| Proposal card | Domain | Planned (2) | [Cards.md](./Cards.md) | 2 | Proposals module |
| Expense row | Domain | Planned (2) | [Tables.md](./Tables.md) | 2 | Finance |
| Meeting card | Domain | Specified | [Components.md](./Components.md) §5.6 | 2 | Join affordance, ✦ brief indicator |
| Email thread view | Domain | Planned (2) | [Cards.md](./Cards.md) | 2 | Email module |
| Deliverable / approval card (portal) | Domain | Specified | [Components.md](./Components.md) §5.5 | 4 | Hard law: no internal fields, separate composition |
| Portal navigation shell | Domain | Planned (4) | [Navigation.md](./Navigation.md) | 4 | Same system, client-scoped |
| Team member / capacity row | Domain | Planned (2) | [Tables.md](./Tables.md) | 2 | Team & HR |
| Automation step card | Domain | Planned (3) | [Cards.md](./Cards.md) | 3 | Automation Studio |
| Billing / plan card | Domain | Planned (5) | [Cards.md](./Cards.md) | 5 | Commercial SaaS |
| Dashboard briefing block | Domain | Planned (3) | [Cards.md](./Cards.md) | 3 | Aurex daily digest surface (quiet-by-default home) |

### 2.4 AI components

| Component | Tier | Status | Owning spec | Phase | Notes |
|---|---|---|---|---|---|
| AI Chat Window (panel + full-screen) | AI | Specified | [Components.md](./Components.md) §6.1 | 3 | OS surface, never a bubble |
| Prompt box / composer | AI | Specified | [Components.md](./Components.md) §6.2 | 3 | Context anchors, slash commands; no end-user model picker |
| Model/tier selector (admin settings) | AI | Specified | [Components.md](./Components.md) §6.2 | 3 | AI governance settings only |
| Ghost-text suggestions | AI | Specified | [Components.md](./Components.md) §6.3 | 3 | Tab accepts, Esc dismisses, never auto-commit |
| Suggestion chips | AI | Specified | [Components.md](./Components.md) §6.3 | 3 | Max 3, never attention-seeking |
| AI Action / Approval card | AI | Specified | [Components.md](./Components.md) §6.4 | 3 | Canonical; P0 gate for Phase 3 |
| Thinking / working indicator | AI | Specified | [Components.md](./Components.md) §6.5 | 3 | Disclosed steps, no fake progress |
| Streaming response | AI | Specified | [Components.md](./Components.md) §6.6 | 3 | Reserved layout, stop, citations, buffered SR |
| Citation chip | AI | Specified | [Components.md](./Components.md) §6.6 | 3 | Links to actual records, permission-aware |
| Context panel ("what Aurex sees") | AI | Specified | [Components.md](./Components.md) §6.7 | 3 | Provenance/trust badges |
| Memory viewer | AI | Specified | [Components.md](./Components.md) §6.8 | 3 | Visible, editable, deletable |
| Conversation history sidebar | AI | Specified | [Components.md](./Components.md) §6.9 | 3 | Pinning, per-entity anchors |
| AI tool cards (receipts) | AI | Specified | [Components.md](./Components.md) §6.10 | 3 | Inputs digest → outcome + link; audit-trail face |
| Agent status (multi-step plans) | AI | Specified | [Components.md](./Components.md) §6.11 | 3 | Plan preview → step states → paused-for-approval |
| ✦ Attribution mark | AI | Specified | [Components.md](./Components.md) §6.12 | 3 | Permanent; the only emoji-like glyph |
| Palette Ask intent | AI | Specified | [Components.md](./Components.md) §3.6 | 3 | Rides on shipped `command.tsx` |
| Client-scoped portal Aurex | AI | Planned (4) | [Components.md](./Components.md) §6.1 | 4 | P2; permission-boundary-scoped |

---

## 3. Gap analysis — specified but not shipped, by phase

**Phase 1 (blocking Internal MVP):**
Switch · Radio group · Date picker · Tag · Progress bar · Spinner · Combobox · Context menu · Toggle group · Breadcrumbs · Calendar grid primitive · File upload · Command palette composition · Form field · Data table composition · Filter bar + saved views · Kanban board + card · Timeline · Activity feed · Comments · Pagination · Virtualized list · Undo toast pattern · Destructive confirm dialog · Notification center · Shortcut overlay · Context panel · Project card · Task row · Lead card · Client card · Stat-card sparkline slot.

**Phase 2:** Slider · Accordion · Calendar views · Rich text editor · Charts suite · Invoice row + status chips · Proposal card · Expense row · Meeting card · Email thread · Team/capacity row.

**Phase 3 (the AI suite — all P0 unless noted):** every row of §2.4 except portal Aurex; plus Automation step card and Dashboard briefing block. The Approval card, ✦ mark, tool receipts, and streaming response are Phase 3 gate items — Aurex cannot go live without them (R-AI3).

**Phase 4:** Deliverable/approval card · Portal shell · Client-scoped Aurex (P2).

**Phase 5:** Billing/plan card · white-label theming questions (see §6).

The Phase 1 list is long but shallow — mostly Radix vendoring plus tokens. The gallery route must land with the first Phase 1 batch, not after it.

---

## 4. Contribution workflow — how a component enters the system

A new component (or a new variant/state of an existing one) follows this pipeline. No step is skippable; the PR template mirrors it.

1. **Design spec first.** A section in the owning `docs/design` file (or an amendment PR to it), covering Purpose / Anatomy / Variants / Sizes / States / Keyboard & a11y / Usage rules. No spec, no code.
2. **Tokens only.** Implementation references semantic tokens exclusively. A raw hex/px value is a lint failure. New tokens require a token-layer PR reviewed as a design decision.
3. **Both themes.** Light and dark ship together; a component wrong in one theme is a bug, not a follow-up.
4. **All states.** default, hover, focus-visible, active, disabled, loading — plus empty/error where applicable. Focus = 2px ring, 2px offset. Width-stable loading in controls.
5. **Gallery entry.** Every variant × state × theme rendered on the gallery route. Undocumented states don't exist.
6. **A11y pass.** Keyboard walk-through of every interaction; axe checks green in both themes; screen-reader announcement review for async/streaming behavior; 32px minimum targets verified.
7. **Inventory row.** This document gains (or updates) the component's row — tier, status, owning spec, phase — in the same PR.

**PR checklist (copy into description):**

```
[ ] Spec section exists and is linked
[ ] Semantic tokens only (lint green)
[ ] Light + dark verified
[ ] All interactive states implemented
[ ] Gallery entries for every variant/state/theme
[ ] Keyboard + axe + SR pass
[ ] ComponentInventory.md row added/updated
[ ] Second-use check: extracted to packages/ui if used twice (R-A4)
```

Design review is part of code review for any PR touching UI (R-Q3). Deviations from the Design Principles require a written exception in the PR.

---

## 5. Deprecation policy

1. **Deprecation is a design decision** — proposed in an inventory PR that marks the row **Deprecated (replaced by X)** with a migration note. Silent deletion is prohibited.
2. **Grace window:** one phase. The deprecated component remains in `packages/ui` with a lint warning on new usage; existing usages get a tracked migration task per module.
3. **Gallery honesty:** deprecated components stay in the gallery under a "Deprecated" section with a pointer to their replacement, until removal.
4. **Removal** requires zero usages (verified by lint), a changelog entry, and deletion of the inventory row's status to **Removed (vN)** — rows are never deleted, so the ledger stays a history.
5. **Props deprecate the same way** — a compound part or prop being replaced follows the same mark → migrate → remove cycle.
6. Visual-language changes never enter via one component "trying something new" — they go through tokens and design review (anti-pattern §12.10).

---

## 6. Open questions

1. **Gallery tooling** — bespoke route vs. Storybook proper. Bespoke keeps it in-app and token-true; Storybook gives interaction tests for free. Decide before the Phase 1 component batch. Owner: Founding CTO + Chief Product Designer.
2. **Combobox vs. Select split** — one component with a `searchable` mode or two exports? Leaning two (different keyboard contracts). Decide at implementation.
3. **Icon-rail state of shipped shell components** — sidebar/page-header shipped before Navigation.md; both need a compliance audit and possible re-spec. Owner: Navigation.md author.
4. **Chart library commitment** — affects whether the Charts suite rows are Composed (our code) or Primitive (vendored). Owner: Charts.md author.
5. **White-label impact (Phase 5)** — per-agency accent tokens would touch every "accent only for Aurex identity" rule; needs a dedicated RFC before any Phase 5 work.
6. **Hook inventory** — only `use-media-query` ships today; motion, shortcut-registry, and optimistic-mutation hooks will need their own ledger section once `packages/ui/motion` lands. Placeholder owner: Design System Engineer.
