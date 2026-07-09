# Grid System — AurexOS Design System

| | |
|---|---|
| **Document** | Grid System & Responsive Layout — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [SpacingSystem.md](./SpacingSystem.md) · [Typography.md](./Typography.md) · [DashboardRules.md](./DashboardRules.md) · [DesignTokens.md](./DesignTokens.md) · [../11_Design_Principles.md](../11_Design_Principles.md) |

This document is the binding specification for layout structure, breakpoints, and grids in AurexOS. It elaborates [11_Design_Principles.md §4.2](../11_Design_Principles.md) and matches the shipped Tailwind preset (`packages/config/tailwind/preset.ts`: container centered, max 1440px, 1.5rem padding).

---

## 1. Layout model — the app shell

Every authenticated surface (including the Client Portal, with client-scoped nav) lives in one shell:

```
┌──────────┬─────────────────────────────────────────────┬───────────┐
│          │  topbar: breadcrumb · search · actions      │           │
│ sidebar  ├─────────────────────────────────────────────┤  context  │
│  240px   │                                             │  panel    │
│  (or 64  │              content area                   │  360px    │
│   icon   │        (fluid — takes remainder)            │ (optional,│
│   rail)  │                                             │  one at   │
│          │                                             │  a time)  │
└──────────┴─────────────────────────────────────────────┴───────────┘
```

- **Sidebar:** 240px default, collapsible to a 64px icon rail. Workspace switcher top, module nav, Aurex entry bottom.
- **Right context panel:** 360px fixed width — entity details, comments, activity, Aurex conversation. **One panel at a time; panels replace, never stack.**
- **Content area:** fluid remainder, in one of exactly two modes:

| Mode | Behavior | Surfaces |
|---|---|---|
| **Full-bleed work surface** | Fills the content area edge to edge (inside 24px gutters); horizontal scroll when content exceeds width | Tables, boards, timelines, calendars, inbox |
| **Centered reading column** | ~880px max-width, centered; ~68ch text cap inside ([Typography.md §8](./Typography.md)) | Documents, Knowledge Base, settings, detail prose |

There is no third mode. A surface is either a work surface or a reading surface; deciding which is a design-review question, not a per-page style.

---

## 2. Breakpoint system

Authored **mobile-first** (`min-width` queries) — but honestly: the design priority is the dense desktop experience. Smaller breakpoints get a correct, legible adaptation, not a parallel design.

| Name | Min-width | Target device | Sidebar | Context panel | Nav pattern |
|---|---|---|---|---|---|
| `xs` | < 640px | Mobile | Hidden — overlay drawer | Full-screen takeover | Top bar + drawer; bottom-sheet actions |
| `sm` | 640px | Large phone / small tablet | Hidden — overlay drawer | Full-screen takeover | Top bar + drawer |
| `md` | 768px | Tablet | 64px icon rail (expandable overlay) | Overlay over content | Rail + tooltips |
| `lg` | 1024px | Laptop | 240px, collapsible to rail | Overlays content | Full sidebar |
| `xl` | 1280px | Desktop | 240px | Docked — content reflows beside it | Full sidebar |
| `2xl` | 1440px | Large desktop (**shipped container max**) | 240px | Docked | Full sidebar |
| ultra-wide | ≥ 1920px | External monitors | 240px | Docked | Full sidebar; content caps engage (§6) |

Rules:

- These seven names are the only breakpoints. No feature-local `@media (min-width: 900px)` — lint failure.
- The panel's dock-vs-overlay switch lives at `xl`: below it there isn't room for 240 + useful content + 360, so the panel floats; at `xl+` it docks and content reflows.
- Keyboard-first interactions (palette, shortcuts) exist at every breakpoint; touch targets follow the 32px minimum everywhere ([SpacingSystem.md §6](./SpacingSystem.md)).

---

## 3. The content grid

Inside the content area, layout composition uses a **12-column fluid grid**:

| Property | Value |
|---|---|
| Columns | 12, fluid |
| Gutter (column gap) | 16px (12px below `md`) |
| Margins (content edge) | 24px (16px on mobile) — the page gutters from [SpacingSystem.md §4](./SpacingSystem.md) |
| Row gap | 16px default; 24px between distinct sections (the 24px law) |

Column-span recipes (canonical, reuse before inventing):

| Layout | Spans | Used for |
|---|---|---|
| Detail + rail | 8 + 4 | Entity detail with metadata rail (when the 360 panel isn't in play) |
| Settings | 3 + 9 | Settings nav + settings content (inside the 880px column at `lg+`; stacked below) |
| Split view | 6 + 6 | Compare surfaces, before/after |
| Form column | 12 → capped ~640px | Forms never exceed ~640px wide (§6), regardless of spans |
| Full | 12 | Tables, boards (which then ignore internal columns — they're full-bleed surfaces) |

Below `md`, all multi-column recipes stack to single column in source order. Order in DOM = order when stacked; never reorder visually in a way that breaks reading or tab order.

---

## 4. Dashboard grid

Widget **sizing, types, and behavior** are owned by [DashboardRules.md](./DashboardRules.md). This document owns the underlying grid it sits on:

| Property | Value |
|---|---|
| Columns | 12 (same content grid, same 16px gaps) |
| Row unit | 8px vertical increments — widget heights are multiples of 8 |
| Minimum widget width | 3 columns |
| Common widget spans | stat tile 3 cols · chart 6 cols · feed/table 6–12 cols |
| Grid max-width | ~1600px centered on ultra-wide (§6) |
| Below `md` | Single column; widgets stack full-width in configured order |

Widgets snap to columns and 8px rows during drag/resize — free-form pixel placement does not exist. A widget that can't be useful at 3 columns must declare a larger minimum in its DashboardRules spec, not overflow.

---

## 5. Card grids

Responsive column counts for card collections (clients, projects, templates, files):

| Breakpoint | Columns | Gap |
|---|---|---|
| `xs` | 1 | 12px |
| `sm` | 2 | 12px |
| `md` | 2–3 | 12px |
| `lg` | 3 | 16px |
| `xl`–`2xl` | 3–4 (**max 4 at ≤1440**) | 16px |
| ultra-wide | max 5 | 16px |

**The five-card law: never more than 5 cards in one row**, at any width. Past 5, cards become too wide-short or too small to scan; the grid centers and caps instead (§6).

**Equal-height law:** cards in a row are equal height (CSS grid, not floats). Height is set by the tallest card's content; shorter cards bottom-pad — internal content never vertically stretches to fill. If one card is chronically taller than its row, its content is over-stuffed; fix the card ([SpacingSystem.md §3.3](./SpacingSystem.md)).

---

## 6. Ultra-wide strategy (≥ 1920px)

What stretches and what caps, per surface type:

| Surface | Behavior at ultra-wide |
|---|---|
| Tables, boards, timelines | **Stretch** — full-bleed stays full-bleed; tables may cap individual column widths and let the container scroll horizontally rather than letting text columns balloon |
| Reading surfaces (docs, KB, settings) | **Cap at 880px**, centered |
| Forms | **Cap at ~640px**, left-aligned within their reading column |
| Dashboard grid | **Cap at ~1600px**, centered |
| Card grids | Cap at 5 columns (§5); grid centers once the cap is hit |
| Dialogs, panels | Fixed widths always — never scale with viewport |

Principle: **density surfaces earn width; prose and input never do.** A 1920px document line or a 1400px text input is a defect. Centering is always symmetric within the content area (between sidebar and panel), never window-centered.

---

## 7. Page templates — the five canonical layouts

Every page is one of these five templates. A sixth template requires design review and an amendment here.

### 7.1 List page (tables: invoices, tasks, clients)

```
┌───────────────────────────────────────────────┐
│ title-1 + primary action                      │
│ toolbar: filters · search · density · views   │
├───────────────────────────────────────────────┤
│ full-bleed table (12 cols, horiz. scroll ok)  │
│ …                                             │
│ pagination / load-more                        │
└───────────────────────────────────────────────┘
```
Grid: full-bleed mode; 24px gutters; toolbar per [SpacingSystem.md §4](./SpacingSystem.md).

### 7.2 Board page (Kanban: pipeline, tasks)

```
┌───────────────────────────────────────────────┐
│ title-1 + view switcher + actions             │
├───────────────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐  → horiz. scroll  │
│ │col │ │col │ │col │ │col │                   │
│ └────┘ └────┘ └────┘ └────┘                   │
└───────────────────────────────────────────────┘
```
Grid: full-bleed; columns fixed-width (not grid-tracked) 280px, 16px gaps; board owns its horizontal scroll.

### 7.3 Detail page with panel (task, invoice, client)

```
┌──────────────────────────────┬───────────────┐
│ breadcrumb · title-1 · acts  │  context      │
├──────────────────────────────┤  panel 360    │
│ main content                 │  (details /   │
│ (8-col equiv. or reading     │   comments /  │
│  column, per surface type)   │   activity /  │
│                              │   Aurex)      │
└──────────────────────────────┴───────────────┘
```
Grid: content mode chosen by entity type (prose entities → reading column; data entities → full-bleed); panel docked at `xl+`, overlay below.

### 7.4 Settings page

```
┌──────────── centered 880px ─────────────┐
│ title-1                                  │
│ ┌────────┬─────────────────────────────┐ │
│ │settings│ section (title-2)           │ │
│ │nav     │ form fields (≤640px)        │ │
│ │(3 cols)│ …                           │ │
│ │        │ section (24/32px gaps)      │ │
│ └────────┴─────────────────────────────┘ │
└──────────────────────────────────────────┘
```
Grid: reading column; 3 + 9 recipe inside it at `lg+`, stacked below; forms capped ~640px.

### 7.5 Portal page (client-facing)

```
┌──────────┬───────────────────────────────────┐
│ client-  │ title-1 (project / invoice /      │
│ scoped   │  proposal)                        │
│ sidebar  │ content: reading column for       │
│ 240px    │ proposals/docs; full-bleed for    │
│          │ invoice tables                    │
└──────────┴───────────────────────────────────┘
```
Grid: same shell, same modes, client-scoped nav; slightly more generous card padding tier permitted (spacious 24px — see SpacingSystem open question 2). No context panel in the portal.

---

## 8. Do / Don't

| # | Do | Don't |
|---|---|---|
| 1 | Build every page on one of the five templates | Invent a bespoke page skeleton per feature |
| 2 | Use the seven named breakpoints | Feature-local media queries at arbitrary widths |
| 3 | Keep one context panel, replacing on navigation | Stack panels, or open panel-over-panel |
| 4 | Let tables and boards run full-bleed with horizontal scroll | Squeeze a wide table to fit by shrinking type or padding |
| 5 | Cap reading at 880px, forms at ~640px, dashboards at ~1600px | Stretch prose or inputs across ultra-wide viewports |
| 6 | Cap card rows at 4 (≤1440) / 5 (ultra-wide) | Let card grids grow unbounded columns |
| 7 | Keep cards in a row equal height via CSS grid | Ragged-bottom card rows, or stretching card content to fill |
| 8 | Stack multi-column recipes to source order below `md` | Visual reordering that breaks reading/tab order |
| 9 | Snap dashboard widgets to 12 cols × 8px rows | Free-form pixel widget placement |
| 10 | Author mobile-first CSS, design desktop-dense | Pretend mobile is the primary surface — it isn't; say so honestly |
| 11 | Center capped content between sidebar and panel | Center against the window and end up visually off-axis |

---

## 9. Open questions

1. **Board column width** — 280px fixed is the starting spec (§7.2); validate against real card content in the Projects module and record the final value here and in the board component.
2. **`md` tablet panel behavior** — overlay panel on tablet may fight with touch swipe gestures; needs a usability pass when tablet usage is measurable.
3. **Dashboard cap value** — ~1600px is provisional; [DashboardRules.md](./DashboardRules.md) may tighten it once widget minimums are final. That document wins for widget-level rules.
4. **Split view (6+6) keyboard model** — focus management between panes is unspecified; resolve when the first split surface (email? review?) is designed.
5. **Portal responsive floor** — clients open portal links on phones more than staff do; consider whether portal pages need a stricter mobile audit gate than internal surfaces.
