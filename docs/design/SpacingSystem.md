# Spacing System — AurexOS Design System

| | |
|---|---|
| **Document** | Spacing System — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [Typography.md](./Typography.md) · [GridSystem.md](./GridSystem.md) · [DesignTokens.md](./DesignTokens.md) · [Elevation.md](./Elevation.md) · [../11_Design_Principles.md](../11_Design_Principles.md) |

This document is the binding specification for all spacing in AurexOS. It elaborates [11_Design_Principles.md §4.1](../11_Design_Principles.md) and never contradicts it.

---

## 1. The 4px base grid with 8-point rhythm

All spacing and sizing derives from a **4px base unit**, composed into an **8-point layout rhythm**. The scale is exactly:

> **4 · 8 · 12 · 16 · 24 · 32 · 48 · 64**

Nothing else. Not 5, not 10, not 14, not 20, not 40, not "it looked right at 18".

### 1.1 Why base-4, not base-8

- **Typography alignment.** The type scale's line boxes and control heights need 4px resolution: a 32px control with 22px text needs 4-and-6-adjacent metrics that pure base-8 can't hit.
- **Icons.** 16px and 20px icons center inside 32px targets only with 4px-resolution padding.
- **Radii live on it.** The 4/6/8/12 radius system (see [Elevation.md](./Elevation.md)) sits on the 4px grid (6px is the sanctioned half-step for control radii only — it is a radius value, never a spacing value).
- **8-point rhythm on top.** While the base is 4, layout-level decisions (section gaps, card padding, gutters) prefer the 8-multiples: 8, 16, 24, 32, 48, 64. 4px and 12px are *component-internal* values — the tight couplings inside a control, not the air between blocks.

### 1.2 Banned values

`2, 5, 6, 10, 14, 18, 20, 28, 36, 40, 56` px — and any arbitrary Tailwind value (`p-[13px]`) — are lint failures in spacing contexts. Two clarifications:

- **20px does not exist as spacing.** It exists only as the nav icon size (Design Principles §6.3).
- **2px exists only for focus-ring width/offset and border weights** — those are strokes, not spacing.

If a layout seems to need a banned value, the surrounding structure is off-grid; fix the structure.

---

## 2. Spacing token table

Tokens are defined in `packages/ui` and consumed via Tailwind utilities. Feature code uses tokens; raw pixel spacing is a lint failure.

| Token | Value | Tailwind step | Primary usage |
|---|---|---|---|
| `space-1` | 4px | 1 | Icon-to-badge gaps, badge internal padding-y, tightest couplings |
| `space-2` | 8px | 2 | Icon-to-label gap, label-to-input, chip gaps, menu item padding-y |
| `space-3` | 12px | 3 | Compact card padding, list row padding-y, related-item clusters |
| `space-4` | 16px | 4 | Default card padding, field-to-field rhythm, grid gaps |
| `space-6` | 24px | 6 | **Section separation (the 24px law, §5)**, page gutters, dialog padding |
| `space-8` | 32px | 8 | Major section breaks, page-title-to-content, generous dialog sections |
| `space-12` | 48px | 12 | Page-level breathing room, empty-state padding, onboarding rhythm |
| `space-16` | 64px | 16 | Rare: hero surfaces, marketing-adjacent portal moments, icon rail width |

Reading the table: smaller value = tighter relationship. Spacing **is** hierarchy — two elements 4px apart are one thing; 24px apart are two things.

---

## 3. Component-internal spacing standards

These are the canonical internals, implemented once in `packages/ui`. Features never re-pad shared components.

### 3.1 Buttons

| Size | Height | Padding-x | Padding-y | Icon-to-label gap |
|---|---|---|---|---|
| `sm` | 28px | 8px | derived (centered) | 8px |
| `md` (default) | 32px | 12px | derived | 8px |
| `lg` | 40px | 16px | derived | 8px |

- Label is always `body-strong` 14px regardless of size ([Typography.md §6.2](./Typography.md)) — sizes differ by box, not font.
- Icon-only buttons are square at the size's height (28/32/40) — all meet or exceed the 32px target rule via hit-area extension on `sm`.
- Buttons in a row: 8px gap between related actions; 12px between a primary and a separated secondary group.

### 3.2 Inputs

| Property | Value |
|---|---|
| Height (default) | 32px (`md`), 40px (`lg` — auth/onboarding surfaces only) |
| Padding-x | 12px |
| Leading icon to text | 8px |
| Label above input | 8px ([Typography.md §6.3](./Typography.md)) |
| Helper/error text below | 4px |
| Textarea padding | 12px all sides |

### 3.3 Cards

| Density | Padding | Header-to-body gap |
|---|---|---|
| Compact | 12px | 8px |
| **Default** | **16px** | 12px |
| Spacious (dashboard feature cards, settings) | 24px | 16px |

Card footer actions sit 16px below the last content row, top-aligned with a `--border-subtle` divider where the card is interactive-heavy.

### 3.4 List rows & table cells

| Element | Comfortable | Compact |
|---|---|---|
| List row padding-y | 12px | 8px |
| List row padding-x | 16px | 12px |
| Table cell padding-y | 12px | 8px |
| Table cell padding-x | 16px | 12px |
| Effective row height (14px body) | ~46px / 40px target | ~38px / 36px target |
| First/last cell edge padding | 16px | 16px (edges never compress) |

### 3.5 Badges, dialogs, popovers, menus

| Component | Spec |
|---|---|
| Badge | 2px padding-y is banned — badge is 4px padding-y equivalent via fixed 20px height, 8px padding-x, 4px radius, 4px gap to adjacent text |
| Dialog | **24px padding** all sides; 16px between title and body; 24px above the actions row |
| Popover | 4px outer offset from trigger; content padding 12px (16px for form-bearing popovers) |
| Menu | 4px container padding; menu items 8px padding-y, 12px padding-x, 8px icon-to-label gap; 4px between grouped sections plus divider |
| Toast | 12px padding, 8px icon gap; stack gap 8px (max three — Design Principles §12.8) |
| Tooltip | 4px 8px padding, `caption` text |

---

## 4. Layout spacing

| Context | Value |
|---|---|
| Page gutters (content area edge padding) | **24px desktop / 16px mobile** (< 768px) |
| Page title (`title-1`) to content | 24px |
| Section separation (between distinct content blocks) | **24px minimum; 32px for major breaks** |
| H2 section: space above / below heading | 32px / 12px |
| H3 subsection: above / below | 24px / 8px |
| Card grid gaps | 16px desktop / 12px tablet ([GridSystem.md §5](./GridSystem.md)) |
| Sidebar padding | 12px x-padding; 8px between nav items' hit areas (items themselves 8px padding-y); 16px between nav groups |
| Icon rail (64px collapsed) | icons centered; 8px between targets |
| Right context panel (360px) | 16px padding; 24px between panel sections; panel header 12px padding-y |
| Toolbar (above tables/boards) | 12px padding-y, gutters match page (24px); 8px between controls, 16px between control groups |

### 4.1 Form vertical rhythm (binding)

| Relationship | Gap |
|---|---|
| Label → input | 8px |
| Input → helper/error text | 4px |
| Field → next field | 16px |
| Field group → next group (with group `title-3` label) | 24px |
| Last field → actions row | 24px |
| Side-by-side fields in one row | 16px gap |

Forms are the most repeated pattern in the product; this rhythm is implemented in the shared `Form` layout primitives, not re-decided per feature.

---

## 5. The 24px law

> **Always maintain at least 24px between distinct content sections.**

Formalized: any two blocks that a user would name differently ("the filters", "the table", "the activity feed") are separated by ≥ 24px. Within a named block, internals use 8/12/16. Major page-level breaks (e.g. between a stats row and the workspace below it) use 32px.

Corollaries:

- Whitespace is the primary grouping tool — prefer 24px of air over a divider; use dividers only where scroll positions make gaps ambiguous (long settings pages, menus).
- Never "save space" by compressing section gaps to 16px on a crowded screen. If a screen is crowded at 24px rhythm, it has too much on it — cut content, not air (Design Principles §1.5).
- The 24px law applies inside panels and dialogs too, at their smaller scale: panel sections separate at 24px even though panel padding is 16px.

---

## 6. Density system

Density is a user preference on tables and boards, persisted per user (Design Principles §4.4). It is a **coordinated set of deltas**, not per-component improvisation:

| Property | Comfortable (default) | Compact |
|---|---|---|
| Table cell padding-y | 12px | 8px |
| Table cell padding-x | 16px | 12px |
| Table text | `body` 14px | `small` 13px |
| List row padding-y | 12px | 8px |
| Board card padding | 16px | 12px |
| Board card gap | 8px | 8px (unchanged — cards must stay separable) |
| Row action targets | 32px | 32px (**never shrinks**) |

Rules:

- **32×32px minimum pointer target even in compact.** Compact reduces *air*, never *hit area* — compact rows keep full-height click zones and 32px controls via hit-area extension.
- Density affects work surfaces only (tables, boards, dense lists). It never changes page gutters, section separation, dialogs, forms, or type tokens outside tables.
- Exactly two densities exist. A "cozy" third mode requires amending this document.

---

## 7. Optical spacing corrections

The grid is law for *boxes*; the eye is law for *perception*. Sanctioned corrections:

1. **Icon optical centering.** Directional glyphs (play, chevron, send) sit optically off-center in their bounding box. Correction: nudge the glyph **inside** its fixed 16/20px icon box (via the icon's own artboard alignment), never by changing the box or its grid padding.
2. **Asymmetric text padding.** A container pairing a `title-3` header with body text may read top-heavy; if needed, correct within the token scale (e.g. 16px top / 12px bottom on a card header block) — both values on-grid, asymmetry documented in the component, not ad hoc.
3. **Punctuation and avatar hangs.** Avatars and checkboxes in list rows align to the text's optical left edge; the shared row primitive owns this correction.

The rule: corrections change **which grid value** is used, or move content inside a grid-sized box — they never introduce off-grid values. "Optical" is not a license for 10px.

---

## 8. Do / Don't

| # | Do | Don't |
|---|---|---|
| 1 | Use spacing tokens (`space-*` / Tailwind steps) everywhere | Arbitrary values (`p-[10px]`, `gap-[18px]`) — lint failure |
| 2 | Separate distinct sections by ≥ 24px | Compress section gaps to fit more on screen |
| 3 | Group with whitespace first | Reach for dividers and boxes before trying air |
| 4 | Keep 32px minimum targets in compact density | Shrink hit areas when shrinking padding |
| 5 | Use 8px icon-to-label gaps universally | Per-component icon gap invention |
| 6 | Pad dialogs 24px, cards 16px, menus 4px/8px | Re-pad shared components inside features |
| 7 | Follow the form rhythm (8/4/16/24/24) | Eyeball form gaps per screen |
| 8 | Make optical corrections inside grid-sized boxes | Use "optical" to justify 5px/10px values |
| 9 | Let mobile reduce gutters to 16px | Reduce component-internal padding on mobile |
| 10 | Keep edge padding (first/last table cells) at 16px in both densities | Let content touch container edges |
| 11 | Cut content when a screen is crowded | Cut whitespace when a screen is crowded |

---

## 9. Open questions

1. **Board card gap in compact** — §6 keeps 8px in both densities; validate on real Kanban data during the Projects module hardening pass and record the outcome.
2. **Spacious card tier** — 24px "spacious" cards currently apply to dashboard feature cards and settings; decide whether portal-facing cards join this tier before the Portal phase.
3. **Touch density on tablet** — md–lg viewports with touch input may warrant forcing comfortable density regardless of the user's compact preference. Needs usage data; do nothing until then.
4. **Tailwind step aliases** — whether to expose `space-*` semantic names in the preset or rely on numeric steps with lint enforcement; owned by [DesignTokens.md](./DesignTokens.md) once written.
