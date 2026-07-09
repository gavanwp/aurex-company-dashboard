# Illustration Style — AurexOS Design System

| | |
|---|---|
| **Document** | Illustration Style — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [EmptyStates.md](./EmptyStates.md) · [ColorSystem.md](./ColorSystem.md) · [Icons.md](./Icons.md) · [Elevation.md](./Elevation.md) · [../11_Design_Principles.md](../11_Design_Principles.md) |

This document is the binding specification for illustration in AurexOS. It elaborates [11_Design_Principles.md §1 and §6.2](../11_Design_Principles.md) and never contradicts it. [EmptyStates.md](./EmptyStates.md) consumes what this file defines.

---

## 1. Philosophy — seasoning, not decoration

Illustration in AurexOS is rare on purpose. It appears in exactly four places:

1. **Empty states** — a list, table, or board with nothing in it yet ([EmptyStates.md](./EmptyStates.md)).
2. **Onboarding moments** — the first-run journey, workspace setup.
3. **Error pages** — 404, permission denied, something broke.
4. **Marketing** — Phase 5, the commercial site only.

It **never** appears inside working surfaces. A dashboard, a table with data, a project board, an invoice — these are work, and work gets zero decoration. If a screen has content, it has no illustration. The moment illustration starts filling space "so the screen feels less empty", it has become clutter with a smile.

The style is **calm geometric minimalism**. We explicitly reject the Corporate-Memphis look — quirky oversized-limb blob-people high-fiving around a giant chart. That style signals "friendly startup, please forgive our software"; AurexOS signals "this tool is finished and it works". Blob-people are off-brand for professional, trustworthy, and premium — and they age like fruit.

Litmus test: an AurexOS illustration should look like it was drawn by the same hand that drew the interface. Because it was.

## 2. The style — structural line

We call the style **structural line**: geometric compositions built from the product's own visual DNA, so illustrations read as the UI dreaming about itself rather than a guest artist visiting.

### 2.1 Ingredients (binding)

| Element | Rule |
|---|---|
| Shapes | Rounded-rectangle surfaces, circles, lines — the same forms as our cards, badges, and inputs |
| Stroke | **2px, rounded caps and joins** — identical to icon stroke weight ([Icons.md §2.2](./Icons.md)) |
| Alignment | All geometry on the 8px grid within the composition; sizes on the 4px grid |
| Stroke color | Neutral ramp: **N7/N8** in light theme, **D9** in dark ([ColorSystem.md](./ColorSystem.md) owns the values) |
| Accent | **Exactly one accent element per illustration** — a highlighted card edge, a ✦ spark, a single indigo dot. One. |
| Fill | Soft accent-tinted fill at **8–12% opacity, on one shape maximum**; all other shapes are stroke-only or surface-token filled |

### 2.2 What is banned

- **No gradients.** Anywhere. Ever.
- **No textures, grain, or noise.**
- **No faces, characters, or human figures in v1.** Justification: characters age fast (every 2019 illustration system looks dated today), they carry localization and representation risk we don't need to manage, and a tiny team cannot keep a character system consistent across dozens of assets. Abstract structure is timeless, culture-neutral, and reproducible by anyone who can follow this spec.
- **No drop shadows inside illustrations.** Depth comes from overlap and stroke, not simulated lighting.

## 3. Grid & sizes

Three sizes exist, all built on the 4px grid:

| Class | Size | Where | Rules |
|---|---|---|---|
| **Spot** | 120–160px | Empty states | The default. One per empty state, per [EmptyStates.md](./EmptyStates.md) |
| **Scene** | 240–320px | Onboarding steps, error pages | Maximum **2 per user journey** — a journey papered with scenes reads as a pitch deck |
| **Micro** | 24–32px | Rare inline moments | Prefer an icon first ([Icons.md](./Icons.md)); micro-illustration needs design-review sign-off |

**Stroke stays 2px at every size.** We do not scale stroke with the composition. A spot and a scene sitting near a 16px icon must all read as one drawing system; scaling stroke proportionally would make scenes look bolder and micros look wiry, breaking optical kinship with the iconography. Detail density scales instead: bigger sizes get more elements, not thicker lines.

## 4. Theming — token-driven SVG only

Illustrations are **inline SVGs driven by CSS variables** — never baked rasters, never hardcoded hex.

- Strokes reference `var(--illustration-stroke)` (mapped to N7/N8 light, D9 dark), fills reference `var(--bg-surface)` / `var(--accent-soft)` equivalents. Token names and values are owned by [ColorSystem.md](./ColorSystem.md).
- Because color lives in tokens, every illustration themes automatically: dark mode is the **same strokes on the dark ramp values, accent unchanged**. No dark-mode variants are drawn, ever — if an illustration needs a redraw to survive dark mode, it violates this spec.
- PNG/JPG illustration assets in the app are a lint-level failure. (Marketing rasters for social cards are exempt — they are exports of the same SVG sources.)
- A hex code inside an illustration SVG committed to `packages/ui` fails review, same law as components ([11 §2.1](../11_Design_Principles.md)).

## 5. Subject matter guide

Subjects are **abstract-structural**: they depict the shape of the work, not a metaphor for the feeling of the work.

| Module / moment | Composition |
|---|---|
| Projects (empty) | Stacked rounded-rect cards, one milestone dot on a connecting line |
| Tasks (empty) | Three horizontal task rows, one with a checked circle |
| CRM / pipeline (empty) | Three columns of card outlines, one card mid-move |
| Finance (empty) | An invoice sheet outline with line rows and one accent check |
| Documents / KB (empty) | Overlapping page outlines, one with visible text lines |
| Calendar (empty) | A month grid fragment, one accent-ringed day |
| Automations (empty) | Nodes connected by a right-angled line, one accent node |
| Analytics (empty) | Axis lines and a single ascending stroke path |
| Aurex / AI moments | A **✦ constellation** — the mark plus faint connected points |
| Inbox zero / all done | Calm horizontal lines settling to a baseline — stillness as reward |
| Error pages | The relevant surface outline, visibly broken at one clean point |

### 5.1 Metaphor rules

- **Concrete over whimsical.** Show the artifact (invoice, board, page), not an allegory for it.
- **No clip-art metaphors:** no rockets, unicorns, trophies, treasure chests, mountaintops, lightbulbs, or high-fives. These are the visual equivalent of the hype-words banned in [BrandGuidelines.md §5](./BrandGuidelines.md).
- One idea per illustration. If a composition needs a caption to be parsed, redraw it — the text below it ([EmptyStates.md](./EmptyStates.md)) explains *why it matters*, never *what it is*.

## 6. Composition rules

- **Single focal point.** One accent element is the focal point by definition; everything else recedes in neutral strokes.
- **Negative space ≥40%** of the bounding box. Crowded illustrations read as effortful; calm is the brand.
- **Horizon alignment:** compositions sit on an implied horizontal baseline in the lower third of the bounding box — floating free-form scatter is banned.
- **Optical centering** in empty-state slots: center on the composition's visual mass, not the SVG bounding box; nudges in 4px steps only.
- Elements may break the bounding box edge only on the horizontal axis (a card sliding in), never the top or bottom.

## 7. Production & governance

- **Source of truth:** SVG sources live in `packages/ui/illustrations`, one file per asset, exported as React components alongside icons.
- **Naming:** `illustration-{surface}-{moment}.svg` — e.g. `illustration-projects-empty.svg`, `illustration-error-404.svg`. Sentence-case display names in the gallery.
- **Gallery:** every illustration appears in the component gallery in both themes, at its intended size, beside its empty-state copy. Undocumented illustrations don't exist ([11 §6.1](../11_Design_Principles.md)).
- **Review:** new or changed illustrations go through design review like any component — checked against §2 ingredients, §6 composition, and side-by-side with two existing assets for kinship.
- **Accessibility:** illustrations are decorative — `aria-hidden="true"`, empty `alt` semantics, meaning always conveyed by the adjacent text. An illustration is never the sole carrier of information. No animation in v1; if ever animated, it respects `prefers-reduced-motion` at the wrapper level ([11 §7](../11_Design_Principles.md)).

## 8. Do / don't

| # | Do | Don't |
|---|---|---|
| 1 | Illustrate empty states, onboarding, errors | Decorate dashboards, tables, or any surface with content |
| 2 | Build from rounded rects, 2px strokes, 8px grid | Freehand organic shapes that match nothing in the UI |
| 3 | Use one accent element per illustration | Multi-color compositions, "brand moments" in four hues |
| 4 | Keep accent fills at 8–12% opacity on one shape | Solid accent flooding, gradients, glows |
| 5 | Draw abstract structure (cards, sheets, nodes) | Blob-people, mascots, hands, faces |
| 6 | Ship token-driven SVGs that theme automatically | Bake rasters or hardcode hex in SVG source |
| 7 | Keep 2px stroke at every size | Scale stroke weight with composition size |
| 8 | Leave ≥40% negative space | Fill the box because empty "feels unfinished" |
| 9 | Show the artifact (invoice, board, page) | Reach for rockets, trophies, mountaintops |
| 10 | Route new assets through design review | Let features commission one-off art |
| 11 | Convey meaning in adjacent text, hide art from AT | Make an illustration the only explanation |
| 12 | Reuse existing assets across similar moments | Grow the library faster than it can stay consistent |

## 9. Open questions

| # | Question | Owner | Target |
|---|---|---|---|
| 1 | Subtle entrance motion for empty-state illustrations (150ms fade/settle) — worth it, or does stillness serve calm better? Current position: stillness. | CPD | Phase 2 |
| 2 | Whether Phase 5 marketing needs a richer illustration tier (larger scenes, limited second hue) — and if so, a separate marketing addendum, not a change here. | CPD | Phase 5 |
| 3 | Illustration usage in the client portal: same library, or a reduced neutral-only set so agency branding leads? Cross-ref [BrandGuidelines.md §9](./BrandGuidelines.md). | CPD | Phase 3 |
| 4 | Revisit the no-characters rule if user research shows onboarding warmth suffers. Requires evidence, not taste. | CPD | Phase 4 |
