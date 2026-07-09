# Tables — AurexOS Design System

| | |
|---|---|
| **Document** | Tables — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [Components.md](./Components.md) · [Navigation.md](./Navigation.md) · [EmptyStates.md](./EmptyStates.md) · [ColorSystem.md](./ColorSystem.md) · [../11_Design_Principles.md](../11_Design_Principles.md) |

This document is the binding specification for every data table in AurexOS — projects, tasks, invoices, contacts, reports, portal lists. It elaborates [11_Design_Principles.md](../11_Design_Principles.md) §3 (tabular numerals), §4.4 (density), §8 (interaction), and §10 (accessibility). The shipped primitive is `packages/ui/components/table.tsx`; features compose it, never fork it.

---

## 1. Table doctrine

1. **Tables are the workhorse of an ops OS.** An agency team spends more hours in tables than in any other surface. A 5% improvement in table scanability is worth more than any hero screen.
2. **Density + scanability + keyboard beat decoration.** Every pixel of a table row either carries information or is deliberate breathing room. Zebra striping, heavy borders, and cell backgrounds are decoration — we use whitespace, alignment, and a single hover step instead.
3. **Real table semantics always** ([11 §10](../11_Design_Principles.md)). `<table>`, `<thead>`, `<th scope>`, `<tbody>` — never div-grids pretending. Virtualization keeps semantics (see §10).
4. **A table is a view of entities, not a spreadsheet.** Rows open records; cells quick-edit only where speed matters (§4.6). Full editing lives on the entity surface.
5. **One table system.** Every table in the app and portal derives from the same anatomy below. A feature that needs "a special table" needs a design review, not a fork.

## 2. Anatomy

```
┌────────────────────────────────────────────────────────────────┐
│ ⌕ Search   [Filter +] [chips…]     [List|Board] [⚙ cols] [≡ ⇵] │ ← toolbar
├────────────────────────────────────────────────────────────────┤
│ ☐ │ Name ↓        │ Status   │ Assignee │ Due     │  Amount │ ⋯│ ← header (sticky)
├────────────────────────────────────────────────────────────────┤
│ ☐ │ Website reb…  │ ● Active │ ◉ Sara   │ 2d      │ 4,200.00│ ⋯│ ← row 44/36px
│ ☐ │ Brand refresh │ ● Review │ ◉ Marco  │ Jul 14  │ 1,850.00│ ⋯│
├────────────────────────────────────────────────────────────────┤
│   │ 24 items      │          │          │  Total: │ 6,050.00│  │ ← footer (aggregates)
└────────────────────────────────────────────────────────────────┘
```

| Part | Spec |
|---|---|
| Toolbar | 48px band: search input, filter button + chips (§5), view switcher (segmented, [Navigation.md](./Navigation.md) §6), column config, density toggle. Replaced by the bulk bar during selection (§4.4). |
| Header row | `small` 13px / 500, muted text, 40px height, **sticky** under the surface header. Sortable columns show a chevron on hover and a persistent chevron when sorted. |
| Rows | **44px comfortable / 36px compact** — both on the 4px grid. Bottom `border-subtle` only; no vertical cell borders. |
| Cells | 12px horizontal padding, vertically centered, single-line with ellipsis + title tooltip. Multi-line cells are a design smell. |
| Footer | Optional aggregate row (`tfoot`): counts, sums on money columns, `body-strong`, tabular-nums. Aggregates reflect the **filtered** set. |
| Pagination | **Pinned: virtualized infinite scroll is the default for app tables >100 rows** ([11] mandate); classic pagination (25/50/100) for the Client Portal and printable reports, where "page 2 of 4" and stable footers matter. Never both on one table. |

## 3. Column types & alignment

| Type | Alignment | Spec |
|---|---|---|
| Text / name | Left | Primary column is `body` 14; secondary text columns `small` 13 muted. |
| Numeric | **Right** | `tabular-nums` mandatory ([11 §3](../11_Design_Principles.md)). Header label also right-aligned. |
| Money | Right | Tabular figures, workspace currency symbol/code, two decimals always (minor-unit correct). Negative values: `−` sign + danger text, never parentheses-only. |
| Date | Left | Relative for recent ("2h ago", "3d"), absolute beyond 7 days ("Jul 14"); hover tooltip always shows full absolute datetime with timezone. Overdue treatment in §7. |
| Status | Left | Status chip: soft background + label + leading dot/icon. Never color alone ([11 §5](../11_Design_Principles.md)). |
| Person | Left | Avatar 20px + name; multiple assignees: 2 avatars + `+n`. Unassigned renders a dashed avatar placeholder, muted "Unassigned". |
| Actions | Right, last | Ghost icon buttons 16px, visible on row hover/focus; **max 2 visible** + kebab overflow. Always present in the tab order even when visually hover-revealed. |
| Checkbox | Left, first, 40px fixed | Header checkbox = select-all-in-filter (indeterminate when partial). |

Column count discipline: **≤8 columns by default view.** More exist behind column config (§4.7), not on first paint.

## 4. Interaction

### 4.1 Row click = open

- The **whole row** is the click target; it navigates to the entity's canonical URL. Cmd-click opens a new tab; middle-click works ([11 §8.7](../11_Design_Principles.md)).
- Interactive cells (checkbox, status quick-edit, actions) stop propagation — clicking them never navigates.
- No "view" button in the actions column; the row is the view button.

### 4.2 Hover

One neutral background step (`bg-raised`) on the full row, 150 ms. No border color changes, no elevation, no scale.

### 4.3 Selection model

- Checkbox click selects; **shift-click** selects a contiguous range from the last anchor; `⌘A` (focus inside table) selects **all rows in the current filter**, including virtualized/unfetched rows — shown as "All 1,204 selected".
- Selected rows: accent-soft background + checked box. Selection survives sorting and scrolling; it clears on filter change (with an undo toast if >10 were selected).

### 4.4 Bulk actions bar

**Pinned: toolbar-replace.** During selection the toolbar's content is replaced in place by: `☑ 12 selected · [Assign] [Status] [Move] [⋯] · Clear ✕`. Same 48px band, no floating bar, no layout shift, no content occlusion. Esc clears selection. Destructive bulk actions follow undo-over-confirm ([11 §8.6](../11_Design_Principles.md)); bulk money operations always confirm.

### 4.5 Sorting

- Click header = sort asc → desc → clear. **Shift-click adds** a secondary sort (max 3 keys, numbered chevrons).
- Sort state is URL-bound and persists per saved view. Default sort is defined per entity table and documented with the feature.

### 4.6 Inline edit — scoped

Inline edit exists **only** for status, assignee, priority, and date — the high-frequency triage fields. Trigger: click the cell's chip/avatar affordance, or press `e`/Enter on a focused cell in grid mode. The editor is a popover (select/date picker); commit is optimistic ([11 §8.3](../11_Design_Principles.md)). Text, money, and description fields are never inline-editable in tables — open the record.

### 4.7 Column configuration

Resize (drag header divider, min 80px), reorder (drag header), show/hide (column config popover). All three persist **per user per view**. "Reset columns" restores the view's defaults. The primary (name) column cannot be hidden.

### 4.8 Sticky first column

On horizontal scroll (md–lg, wide tables), the checkbox + primary column stick left with a subtle right-edge shadow indicating overflow. Never allow horizontal scroll without sticky identity context.

## 5. Filtering & saved views

- **Filter chips row:** active filters render as removable chips under the toolbar: `Status: Active ✕` `Assignee: Sara ✕`. Chips are editable in place (click opens that filter's popover).
- **Filter builder:** the `[Filter +]` popover lists fields → operators → values, keyboard-first, matching the typed filter grammar defined in [../architecture/SearchArchitecture.md](../architecture/SearchArchitecture.md). Power users can type the grammar directly into the palette/search box; the chips and grammar are two views of the same query.
- **Saved views:** any filter + sort + column + density configuration saves as a view. Views are **personal** by default, promotable to **shared** (workspace-visible, edit-locked to owner/admins). Shared views are how teams standardize — "Overdue invoices", "My week". Views appear in the view switcher and are palette-navigable, each with a canonical URL.
- Modified-view state shows an "edited" dot with Save / Reset affordances — never silently overwrite a shared view.

## 6. States

| State | Treatment |
|---|---|
| Loading | Skeleton rows (content-shaped, [11 §8.4](../11_Design_Principles.md)) that **preserve configured column widths** — zero layout shift when data lands. Row count of skeletons ≈ viewport capacity, capped at 10. |
| Empty (true) | Designed empty state per [EmptyStates.md](./EmptyStates.md): what this is, one CTA. Toolbar remains rendered. |
| Zero results from filter | **Distinct from true empty.** Compact inline message in the table body: "No results match these filters" + **Clear filters** action. Never show the first-run empty state to a filtered table. |
| Error | Inline retry band where rows would be: what failed, plain language, Retry button. Toolbar and header remain; no full-surface error takeover. |
| Partial-error rows | Rows that failed to hydrate render with a muted warning icon + "Couldn't load" + per-row retry; healthy rows stay interactive. One bad record never blanks a table. |

## 7. Row states

| State | Treatment |
|---|---|
| Unread / new | Primary cell at **500 weight** — emphasis by weight, not color; a color would collide with status semantics. Clears on open. |
| Overdue | Danger text on the **date cell only**, with an icon. Never tint the whole row — a screen of red rows tells you nothing. |
| Soft-deleted | Muted text + strikethrough on primary cell, "Restore" in actions. Visible only in "Deleted" filtered views. |
| Optimistic-pending | Subtle opacity pulse on the changed cell until reconciliation; rollback restores value + toast with Retry ([11 §8.3](../11_Design_Principles.md)). |
| Drag-reorder | Only on manually-ordered tables (e.g., pipeline stages). Grip handle appears on hover at row start; dragging lifts the row (shadow-1, 98% opacity) with a drop indicator line. Sorting any column disables manual reorder until sort is cleared. |

## 8. Density & responsive

### 8.1 Compact deltas

Comfortable is default; compact is the persisted per-user toggle ([11 §4.4](../11_Design_Principles.md)).

| Property | Comfortable | Compact |
|---|---|---|
| Row height | 44px | 36px |
| Cell text | body 14 | small 13 |
| Cell padding-x | 12px | 8px |
| Avatar | 20px | 16px |
| Chip height | 22px | 18px |
| Pointer target | ≥32px preserved | ≥32px preserved (hit area exceeds visual row where needed) |

### 8.2 Responsive strategy

| Range | Strategy |
|---|---|
| `xl+` | Full table, all configured columns. |
| `md–lg` | Horizontal scroll **with sticky checkbox + first column** (§4.8); lowest-priority columns may auto-hide per the view's column priority order. |
| `<md` | **Card-collapse, pinned pattern:** each row becomes a stacked card — line 1: **title** (+ unread weight); line 2: **status chip + key meta** (assignee avatar, date); line 3 optional: amount/secondary meta, right-aligned. Tap = open; long-press = select. Defined once per entity table (which fields map to which line) and documented with the feature. |

Never squeeze below readable: if a column would drop under 80px, it hides or the table scrolls — cell text never shrinks below 13px.

## 9. Keyboard

Focus enters the table as a grid; a single visible focus ring rides the current row (2px `--focus-ring`, inset).

| Key | Action |
|---|---|
| `j` / `k` or `↓` / `↑` | Next / previous row |
| `x` | Toggle row selection |
| `⇧j` / `⇧k` | Extend selection |
| `Enter` or `o` | Open focused row |
| `⌘Enter` | Open in new tab |
| `e` | Inline edit focused cell (where allowed, §4.6) |
| `←` / `→` | Move cell focus within the row (grid mode) |
| `⌘A` | Select all in filter |
| `Esc` | Clear selection, then clear cell focus |

Surface-local single keys (`a` assign, `d` due date, `p` priority) act on the focused or selected rows per [11 §8.1](../11_Design_Principles.md). All keys are registered in the shortcut registry and shown in the `?` overlay.

## 10. Accessibility

- `<th scope="col">` on all headers; row-header cell (`scope="row"`) on the primary column.
- Sortable headers are buttons with `aria-sort` (`ascending`/`descending`/`none`); sort changes announce via polite live region ("Sorted by due date, ascending").
- Selection announces: "Row selected, 12 of 200 selected"; select-all announces the full count.
- Row focus uses `aria-rowindex`/`aria-rowcount` under virtualization so screen readers know true position and size; virtualized windows never break the table's accessible structure.
- Hover-revealed actions are focusable and visible on focus; nothing is pointer-only.
- Status chips carry text labels; overdue and unread states are conveyed by icon/weight + text, never color alone.
- Density compact keeps 32px minimum targets; 200% zoom triggers the responsive strategy, not clipping.

## 11. Do / Don't

| Do | Don't |
|---|---|
| Right-align every numeric and money column with tabular-nums | **Never center-align numbers** — or anything else except icon-only cells |
| Cap default views at 8 columns | Ship 12-column default views "because the data exists" |
| Pair every status with a label or icon | **Never color-only status** |
| Keep horizontal scroll behind a sticky first column | **Never horizontal scroll without sticky identity context** |
| Use weight (500) for unread emphasis | Use accent or status color for unread |
| Scope danger color to the overdue cell | Tint entire rows red |
| Distinguish zero-filter-results from true empty | Show the first-run empty state on a filtered table |
| Preserve column widths in skeletons | Let loading and loaded layouts differ by a pixel |
| Make the whole row the open target | Add "View" buttons to action columns |
| Keep inline edit to status/assignee/priority/date | Build a spreadsheet inside a table |
| Replace the toolbar with the bulk bar in place | Float a bulk bar over the last visible rows |
| Use `<table>` semantics under virtualization | Ship div-grids with `role` sprinkles |
| Persist column config per user per view | Reset user layouts on every deploy |
| Announce sort and selection changes | Leave screen-reader users guessing at table state |

## 12. Open questions

| # | Question | Leaning | Owner |
|---|---|---|---|
| 1 | Row grouping (group by status/assignee) in v1 tables? | Phase 3+, board views cover most grouping needs until then | CPD |
| 2 | Column pinning beyond the first column (user-pinned trailing money column)? | Defer; revisit with Finance power-user feedback | CPD |
| 3 | Export (CSV) placement — toolbar kebab vs. palette action only? | Both: palette-first, kebab for discoverability; portal reports get an explicit button | CPD |
| 4 | Sticky footer aggregates during virtual scroll — always or on-demand? | Always for money tables, off elsewhere | CPD + Finance lead |
| 5 | Should shared views support per-view density lock (e.g., reports always comfortable)? | No — density stays a user preference, never a view property | CPD |
