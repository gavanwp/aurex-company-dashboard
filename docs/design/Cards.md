# Cards

| | |
|---|---|
| **Document** | Card Specification — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [Components.md](./Components.md) · [Buttons.md](./Buttons.md) · [GridSystem.md](./GridSystem.md) · [DesignTokens.md](./DesignTokens.md) · [../11_Design_Principles.md](../11_Design_Principles.md) |

This document is the **target specification** for the generic card pattern. The shipped `packages/ui/components/card.tsx` is stock shadcn (`shadow-sm` default, 24px padding); the target is **border-first with no default shadow and 16px padding**. Domain-specific card anatomies (client card, project card, deal card) live in [Components.md](./Components.md) §5 — this file owns the pattern they inherit.

---

## 1. Card doctrine

1. **A card is a bounded, actionable unit — not decoration.** A card exists because its contents travel together: one entity, one summary, one set of actions. Wrapping content in a border to "make it look designed" is banned; if it isn't a unit, it's a section with a heading.
2. **Border-first depth.** Cards are defined by a 1px `--border-subtle` border and a background step — **no default shadow** ([../11_Design_Principles.md](../11_Design_Principles.md) §4.4). Shadows belong to floating layers; a card in a grid is not floating. (Delta: shipped card carries `shadow-sm`; remove.)
3. **Geometry:** radius **8**. Padding **16** default, **12** compact, **24** spacious (settings/marketing-adjacent surfaces only). Background `--bg-surface` on `--bg-app`.
4. **Equal-height law:** cards in a grid row are equal height, always. Ragged card bottoms read as broken (§5).
5. **Whole-card click target.** When a card represents an entity, the entire card is the link — not a "View" button. Secondary interactive elements inside (kebab, checkbox, avatar stack, inner links) sit above the card link and stop the event; they are real controls with their own focus stops. One primary target, many inner controls — never nested "clickable areas" competing for the same pixel.

## 2. Anatomy

```
┌────────────────────────────────────────┐
│ [icon 16] Title (title-3 15/600)   ⋮   │  ← header; kebab = ghost icon button
│                                        │
│ Body — supporting content, preview,    │  ← body 14 / small 13
│ progress, description…                 │
│                                        │
│ meta · meta · 2h ago                   │  ← meta row: small 13, --text-muted
├────────────────────────────────────────┤  ← border-subtle, only when footer exists
│ [avatar stack]        [ghost action]   │  ← footer, optional
└────────────────────────────────────────┘
```

- **Header:** title in **title-3 (15/600)**, `--text-primary`, one optional leading 16px icon. Kebab menu (ghost icon button, `sm`, aria-labeled) at the far right — the only overflow affordance; max one per card.
- **Body:** free slot — description, preview, progress, mini-chart. Body text 14, secondary detail 13.
- **Meta row:** small (13) `--text-muted`, items separated by "·". Timestamps, counts, owner.
- **Footer:** exists only when there are actions or persistent status to show, and only then does the separating `--border-subtle` top border render. An empty footer or a decorative divider is a bug.
- Internal spacing: 8px title-to-body, 12px body-to-meta, on the 4px grid throughout.

## 3. Variants

| Variant | Use | Distinguishing treatment |
|---|---|---|
| Static info card | Grouping read-only content (settings summaries) | No hover response; not focusable as a unit |
| Interactive / linked card | Entity in a grid, navigates on click | Hover: border → `--border-strong` + bg one step (`--bg-raised`); cursor pointer; **never a lift-shadow on hover** |
| Selectable card | Pickers, bulk selection | Selected: 1px `--accent-solid` border (border swap, not added outline) + `--accent-soft` bg; checkbox appears top-left on hover/selection in bulk contexts |
| Drag card (kanban) | Board cards | Rest: standard interactive card; `cursor: grab`. **While dragging: shadow level 1 + 2° tilt — the ONE allowed lift in the system**, because the card genuinely floats above the board. Drop target shows `--accent-soft` placeholder slot |
| Stat card | KPI tiles | Owned by [Components.md](./Components.md) §4; inherits geometry and states from this file |
| Domain cards | Client, project, deal, invoice… | Anatomy owned by [Components.md](./Components.md) §5; this file owns the generic frame, states, and grid behavior |

## 4. States matrix

| State | Treatment |
|---|---|
| default | `--bg-surface`, 1px `--border-subtle`, radius 8 |
| hover (interactive only) | border `--border-strong`, bg `--bg-raised`, 150 ms; no transform, no shadow |
| focus-within / focused card link | 2px `--focus-ring`, 2px offset around the card; inner controls additionally show their own rings when focused |
| selected | `--accent-solid` border + `--accent-soft` bg; persists independent of hover |
| dragging | shadow-1 + 2° tilt + `cursor: grabbing`; source position shows a dashed placeholder |
| disabled | 0.5 opacity, `not-allowed`, non-interactive; tooltip-why when non-obvious |
| loading | **skeleton in the card's own shape** — header line, two body lines, meta line at final dimensions; zero layout shift on data arrival; never a spinner in a card |
| error slot | inline error region inside the body: 16px danger icon + specific message + retry ghost button; the card frame stays intact — no red card borders for content errors |

## 5. Grid behavior

- **Gaps:** 16px desktop, 12px tablet.
- **Columns:** responsive per [GridSystem.md](./GridSystem.md). Hard caps: **4 per row standard**, **5 per row ultra-wide (≥1920px)** — beyond that, cards get too wide to scan or too many to compare. 1 column below ~640px.
- **Equal-height enforcement:** grid rows stretch cards to the row's tallest member (min-height per row); optional slots collapse consistently so siblings align.
- **Truncation rules:** title clamps at **2 lines**, body at **3 lines**, always with ellipsis; full text available on the detail view (and title tooltip on truncation). Meta row never wraps — items drop from the right instead.
- A grid with one card does not stretch it full-width; the card keeps its column width.

## 6. Density

| Property | Comfortable (default) | Compact |
|---|---|---|
| Padding | 16px | 12px |
| Title | title-3 15/600 | small-strong 13/500 |
| Body clamp | 3 lines | 2 lines |
| Internal gaps | 8 / 12 | 4 / 8 |
| Grid gap | 16px | 12px |

Density follows the user's persisted workspace density toggle ([../11_Design_Principles.md](../11_Design_Principles.md) §4.4); cards never mix densities within one grid. Minimum 32px targets hold in compact.

## 7. Content rules

1. Every card answers three questions at a glance: **what is it** (title + icon), **what's its state** (status chip, progress, meta), **what can I do** (whole-card open + kebab/footer actions). A card that answers none of these is decoration — delete it.
2. **Max one primary metric per card.** One big number, everything else supporting. Two competing numbers = two cards or a table.
3. **Timestamps relative** ("2h ago") with **absolute on hover** ("8 Jul 2026, 14:32") — [../11_Design_Principles.md](../11_Design_Principles.md) §11.
4. **Status is always chip + icon, never color alone** (§5 of the bible). A colored left-edge stripe may reinforce status but never solely carry it.
5. Sentence case titles, ≤ 6 words; no full sentences as titles.
6. Empty optional slots collapse — no "No description" filler text inside cards.

## 8. Accessibility

1. **Heading semantics:** card titles are real headings (`h3`/`h4` consistent with the page outline), so screen-reader users can navigate grids by heading.
2. **Whole-card click semantics:** the card is a `<div>` containing one real link (the title) stretched to cover the card — **link semantics for navigation, button semantics only if the card triggers an action** (e.g., selection). Never `onClick` on a bare div; never a card that is a giant `<button>` wrapping other buttons (nested-interactive violation).
3. Inner controls (kebab, checkbox, inner links) are independent tab stops layered above the stretched link, each with its own focus ring and accessible name.
4. **Focus-within treatment:** keyboard-focusing the card link shows the 2px ring on the card boundary — identical prominence to hover or better, never subtler.
5. Selection state is `aria-pressed`/`aria-selected` as appropriate, plus the visible checkbox — never conveyed by border color alone.
6. Drag cards remain keyboard-operable: focus + Space lifts, arrows move between columns, Space drops, Esc cancels — announced via live region.

## 9. Do / don't

| # | Do | Don't |
|---|---|---|
| 1 | Border-first, flat at rest | Never default shadows on grid cards |
| 2 | Hover = border-strong + bg step | Never shadow-on-hover-everywhere or lift transforms |
| 3 | Reserve the lift (shadow-1 + tilt) for dragging | Never fake floating on static cards |
| 4 | Whole card as one link, inner controls layered | Never three competing clickable zones |
| 5 | One kebab per card, max | Never two overflow menus or exposed action rows on every card |
| 6 | Equal heights per grid row | Never ragged card bottoms |
| 7 | Clamp title 2 / body 3 lines | Never unbounded card heights from long text |
| 8 | Skeleton in the card's shape while loading | Never spinners inside cards |
| 9 | One primary metric per card | Never dashboards-in-a-card |
| 10 | Status chip + icon | Never color-only status stripes |
| 11 | Cards for units, sections for structure | **Never nested cards** — a card inside a card is a design failure |
| 12 | Footer border only when a footer exists | Never decorative dividers or empty footers |

## 10. Open questions

1. **Selectable + interactive combined** (card that both navigates and supports bulk-select): current answer is checkbox-on-hover top-left with click-zones separated; needs a usability pass on touch.
2. **Keyboard drag on boards** (§8.6) — interaction is specced; engineering pattern (dnd-kit live-region wiring) not yet validated in `packages/ui`.
3. **Compact title at 13/500** vs keeping 15/600 and shrinking only spacing — pinned to 13/500 for now; revisit beside the data-table compact spec in [Components.md](./Components.md).
4. Whether ultra-wide 5-column grids should instead cap at 4 + wider gutters — measure on real dashboard content before Phase 2.
5. Left-edge status stripe (§7.4): keep as an optional reinforcement or cut entirely for restraint — leaning cut; decide with [ColorSystem.md](./ColorSystem.md) owner.
