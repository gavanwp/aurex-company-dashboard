# Accessibility

| | |
|---|---|
| **Document** | Accessibility — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [../11_Design_Principles.md](../11_Design_Principles.md) · [AnimationSystem.md](./AnimationSystem.md) · [ColorSystem.md](./ColorSystem.md) · [Forms.md](./Forms.md) · [Navigation.md](./Navigation.md) · [Components.md](./Components.md) |

This document owns the **accessibility architecture** of AurexOS: the conformance contract, keyboard and focus law, screen-reader structure, and testing governance. It implements [11_Design_Principles.md §10](../11_Design_Principles.md) and the PRD accessibility NFRs (02 §6.5). Domain documents own their specifics ([Forms.md §9](./Forms.md), [ColorSystem.md §10](./ColorSystem.md), [AnimationSystem.md §10](./AnimationSystem.md)); this document owns the global rules they hang from.

---

## 1. Commitment & scope

**WCAG 2.1 AA is the floor, in both themes, across the app AND the Client Portal.** Not a roadmap item, not a backlog epic — a **merge requirement**. A PR that ships an inaccessible surface is an incomplete PR, exactly like a PR that fails typecheck.

Scope of the commitment:

- Every surface: app shell, all ~20 modules, command palette, Aurex conversation, approval cards, portal, settings, emails rendered in-app.
- Both themes, every component state ([11 §6.2](../11_Design_Principles.md)), every breakpoint ([ResponsiveRules.md](./ResponsiveRules.md)).
- Every input mode: keyboard, pointer, touch, screen reader, voice control, 200% zoom, reduced motion, forced colors.

**Who this serves — the honest framing.** Accessibility in AurexOS is not a compliance tax; it is load-bearing for the product's core promise:

- **Keyboard power users and screen-reader users need the same thing:** every action reachable without a mouse, predictable focus, real semantics. The Linear-speed keyboard-first personality ([11 §8.1](../11_Design_Principles.md)) *is* the accessibility architecture. Building one builds the other.
- Agency staff live in this tool eight hours a day — low-vision, motor-impaired, and vestibular-sensitive teammates included. Clients on the portal are an audience we don't get to screen.
- Phase 5 sells to companies with procurement checklists. AA conformance is a sales document we write once by building it in, or forever by retrofitting.

## 2. The conformance checklist

WCAG 2.1 AA success criteria mapped to our concrete mechanisms. This table is the audit script for phase gates (§12).

| SC | Criterion | Our mechanism |
|---|---|---|
| 1.1.1 | Non-text content | Icon-only buttons carry `aria-label` + tooltip ([11 §6.3](../11_Design_Principles.md)); avatars have name alt text; decorative icons `aria-hidden` |
| 1.3.1 | Info & relationships | Semantic HTML first; heading hierarchy law (§5); real `<table>` semantics; `<fieldset>` grouping ([Forms.md §9](./Forms.md)); landmarks (§5) |
| 1.3.2 | Meaningful sequence | DOM order = visual order law (§3); stacked layouts keep source order ([GridSystem.md §3](./GridSystem.md)) |
| 1.3.4 | Orientation | No orientation lock anywhere, including PWA manifest |
| 1.3.5 | Identify input purpose | `autocomplete` attributes on all identity/payment fields ([Forms.md](./Forms.md)) |
| 1.4.1 | Use of color | Color never the sole signal — status always pairs icon or label (§7) |
| 1.4.3 / 1.4.11 | Contrast (text / non-text) | Token-pair legality table in [ColorSystem.md §10](./ColorSystem.md): 4.5:1 text, 3:1 large text and meaningful UI boundaries, both themes, CI-verified |
| 1.4.4 / 1.4.10 | Resize text / reflow | 200% zoom clean; 400% reflows to single column; no horizontal scroll at 320px except data tables (§10) |
| 1.4.12 | Text spacing | Fixed type scale tolerates user spacing overrides; no clipped containers on text |
| 1.4.13 | Content on hover/focus | Tooltips/hover cards dismissible (Esc), hoverable, persistent until dismissed |
| 2.1.1 / 2.1.2 | Keyboard / no traps | Global keyboard map (§3); Esc law; trap+restore only inside overlays, released on close (§4) |
| 2.1.4 | Character shortcuts | Single-key shortcuts (`a`, `d`, `p`) active only when a list/board item has focus, never during text input |
| 2.2.1 | Timing adjustable | No timed UI except 5s undo toasts — and every undoable action is also recoverable via activity/trash (§9) |
| 2.3.1 | Flashes | Nothing flashes. Banned by [AnimationSystem.md §1](./AnimationSystem.md) |
| 2.4.1 | Bypass blocks | Skip-to-content link, first tabbable element in the shell (§4) |
| 2.4.2 / 2.4.6 | Page titles / headings | Every route sets a unique `document.title`; one `h1` per page (§5) |
| 2.4.3 | Focus order | Shell → content order; roving tabindex in composites (§3) |
| 2.4.7 | Focus visible | The ring: 2px `--focus-ring` + 2px offset, always, both themes (§4) |
| 3.1.1 | Language | `lang` attribute set; ICU-externalized strings (PRD §6.6) |
| 3.2.1 / 3.2.2 | On focus / on input | Focus never triggers navigation or context change; inputs never auto-submit |
| 3.2.3 / 3.2.4 | Consistent navigation / identification | One shell, one palette, one component library — consistency is structural |
| 3.3.1–3.3.3 | Errors & labels | Label always; error `aria-describedby` + focus-to-first-error ([Forms.md §9](./Forms.md), §6) |
| 3.3.4 | Error prevention (legal/financial) | Money and destructive operations are never optimistic; typed-name confirmations ([11 §8.6](../11_Design_Principles.md)) |
| 4.1.2 | Name, role, value | Radix primitives supply ARIA; composite widget contracts in §5 |
| 4.1.3 | Status messages | Live-region registry (§5): toasts, saves, async results, Aurex streaming |

## 3. Keyboard architecture

**Every core flow completable without a mouse** — the definition-of-done test per feature (§12).

- **Global map** (owned by [Navigation.md §11](./Navigation.md)): `Cmd+K` palette, `/` contextual search, `?` shortcut overlay, `Esc` dismiss, `g` then key for go-to navigation, surface-local single keys on boards/lists. New features register shortcuts in the shortcut registry before they're considered shipped.
- **Roving tabindex** in every composite widget: lists, boards, menus, palette results, toolbars, date grids. The widget is **one tab stop**; arrows move within it. `Tab` never crawls through 200 rows.
  - Lists/tables: ↑/↓ rows, →/← expands or enters cell focus where cells are interactive.
  - Boards: ↑/↓ within a column, →/← across columns; `Space` lifts for keyboard DnD.
  - Menus/palette: ↑/↓ items, `Enter` activates, type-ahead filters, `Home`/`End` jump.
- **Focus order law: DOM order = visual order.** No positive `tabindex`, ever. No CSS reordering (`order`, `flex-direction: row-reverse`) that diverges reading order from visual order — a lint-reviewable failure. Shell order: skip link → sidebar → top bar → main content → right panel.
- **Keyboard DnD** (spec in [AnimationSystem.md §6](./AnimationSystem.md)): `Space` lifts, arrows move with each position announced ("Moved to In progress, position 2 of 5"), `Space` drops, `Esc` cancels and restores. Ships with every draggable surface or the surface doesn't ship.
- **Discoverability:** `?` opens the shortcut overlay grouped by surface; tooltips show the shortcut beside the label ("Assign · A"); palette entries display their shortcuts. Shortcuts users can't find don't exist.
- **No keyboard traps + the Esc law:** `Esc` dismisses every overlay — dialog, panel, menu, palette, tooltip, ghost text — innermost first. Focus can always leave any widget via `Tab`/`Esc`. Third-party embeds (rich editor, charts) must prove an exit path in review.

## 4. Focus management

- **The ring:** 2px outline in `--focus-ring` with 2px offset — visible in both themes against every legal background pair. It is **never removed, never replaced** with a subtle glow, inner shadow, or "brand-appropriate" alternative. `outline: none` without the ring token is a lint failure.
- **`:focus-visible`, not `:focus`:** the ring renders for keyboard-driven focus; pointer clicks don't paint rings on buttons. Inputs show their focused border state on any focus. Never suppress `:focus-visible`.
- **Overlay contract — trap and restore:** dialogs, panels, drawers, and the palette trap focus while open (Radix supplies the trap); on close, focus **returns to the triggering element**. If the trigger no longer exists, focus moves to the nearest logical ancestor (list container, page heading) — never dropped to `<body>`.
- **Focus after mutations** — pinned per pattern:

| After… | Focus goes to… |
|---|---|
| Delete of a list/table item | Next item; previous if last; list container's empty state if none remain |
| Create (inline) | The new item's primary field or title |
| Create (via dialog) | The new item's row/card in the surface behind |
| Dialog/panel close | The triggering element (restore) |
| Undo (from toast) | The restored item |
| Form submit with errors | First invalid field ([Forms.md §9](./Forms.md)) |
| Route navigation | The main content region (`tabindex="-1"` on `main`), announced via `document.title` |

- **Skip links:** "Skip to content" is the first tabbable element in the shell; visually hidden until focused, styled like a normal button when visible. Long composite surfaces (boards with many columns) additionally offer "Skip to [next region]" where tab-through would be punishing.

## 5. Screen reader architecture

**Landmark map** — one per shell region, stable across all modules:

| Shell region | Landmark |
|---|---|
| Top bar | `banner` |
| Sidebar navigation | `nav` (labeled "Main navigation") |
| Content area | `main` (exactly one) |
| Right context panel | `complementary` (labeled by its content: "Task details", "Aurex") |
| Portal footer | `contentinfo` |
| Search / palette | `search` role on the palette input container |

**Heading hierarchy law:** one `h1` per page — the page title. Widgets, cards, and panel sections get `h2`/`h3` in document order, no skipped levels. Headings are the screen-reader user's palette; a dashboard must be navigable by heading jumps alone.

**Name, role, value for composite widgets** — pinned contracts:

- **Kanban board = a list of lists.** Columns are `list`s within a labeled group; cards are `listitem`s with `aria-roledescription="card"`; the board container carries `aria-roledescription="kanban board"`. We do not pretend a board is a `listbox` or `grid` — those roles promise selection/cell semantics boards don't have. Drag state and position announcements via live region (§3).
- **Tables = real `<table>` semantics**; upgraded to `grid` role **only where cells are interactive** (inline editing). Sortable headers use `aria-sort`, and sort changes are announced ("Sorted by due date, ascending"). Row count and selection count announced on change.
- **Palette = combobox** with `listbox` popup (Radix/cmdk supplies it); result count announced on filter ("6 results").
- **Editors:** rich text exposes standard editing semantics; toolbar is a roving-tabindex `toolbar`.

**Live regions registry** — created once in the shell, never per-feature (dynamic region insertion is unreliable):

| Region | Politeness | Carries |
|---|---|---|
| Toast region | `polite` | Confirmations, undo offers |
| Alert region | `assertive` | Security events, session expiry, destructive failures — rare by definition |
| Async status | `polite` | "Saving… Saved", background job completion, sort/filter results |
| Aurex stream | `polite`, buffered | Streaming responses announced **per completed paragraph/step** — never token-by-token spam. Completion announced ("Aurex finished responding"). Tool steps announced as they resolve ("Searched invoices, found 3") |

**Rendered-sentence templates:** everything announced is a human sentence, not fragment soup. "Invoice INV-204 marked paid. Undo available." — never "Success. Updated. 1." Notification templates are written and reviewed as copy ([11 §11](../11_Design_Principles.md)).

## 6. Forms accessibility

[Forms.md §9](./Forms.md) owns field-level specifics. The global rules it hangs from:

- **Label always.** Every input has a programmatic label — visible by default; `aria-label` only for search-style fields whose affordance is unambiguous. Placeholder is never the label.
- **Errors:** message linked via `aria-describedby`, `aria-invalid` set, and on submit focus moves to the first invalid field with an error summary for long forms. Errors are specific and recoverable ([11 §6.2](../11_Design_Principles.md)).
- **Group semantics:** radio groups, checkbox groups, and multi-field units (address, date ranges) use `fieldset`/`legend` or the Radix group equivalent so the group name is announced with each member.
- Helper text is also `aria-describedby`; required state uses `aria-required` plus a visible indicator, not color alone.

## 7. Color & contrast

- **Token-pair legality** is owned by [ColorSystem.md §10](./ColorSystem.md): every permitted text-on-background token pair is enumerated and CI-verified at 4.5:1 (text) in both themes. An unlisted pair is illegal regardless of how it looks.
- **3:1 for UI boundaries:** meaningful boundaries — input borders, focus ring against adjacent colors, icon strokes, selected-state edges, chart series — meet 3:1. Decorative hairlines (`border-subtle` between same-surface rows) are exempt *only* when the grouping is also conveyed by spacing or structure.
- **Color never alone:** status pairs icon or label always ([11 §5](../11_Design_Principles.md)); chart series are distinguishable by label/pattern/tooltip, not hue alone; links inside prose are underlined; diff views pair +/− markers with color.
- **Forced colors / high contrast mode:** honor the system, don't fight it. No `forced-color-adjust: none` except where information would be destroyed (status swatches, chart fills — which then carry text equivalents). Focus and selection must survive on system colors; verified in the phase-gate audit (§12).

## 8. Motion & vestibular safety

- The reduced-motion contract is owned by [AnimationSystem.md §10](./AnimationSystem.md): wrapper-level collapse to ≤ 100ms opacity fades; transforms, springs, stagger, and shimmer die; function is never reduced.
- **No autoplay** — video, carousels, and ambient movement don't exist in AurexOS. **No parallax, ever**, regardless of preference.
- Nothing flashes more than three times per second — in practice, nothing flashes at all.

## 9. Touch & motor

- **32px minimum targets, even in compact density** ([11 §4.4](../11_Design_Principles.md)) — a compact table row may be 32px tall, but its hit areas never shrink below 32px (visual glyph may be smaller; hit area padding makes up the rest).
- **≥ 8px spacing between adjacent targets** or an equivalent dead zone, so a tremor doesn't fire the neighbor — audited on toolbars, kebab menus, and pagination.
- **No hover-only affordances.** Everything hover-revealed (row actions, card kebabs, inline edit pencils) is equally reachable via keyboard focus (same reveal on `:focus-within`) and via a persistent menu path (row kebab / context menu). Touch adaptations in [ResponsiveRules.md §5](./ResponsiveRules.md).
- **Timeout policy:** no timed UI exists except the 5-second undo toast — and every action offered in an undo toast is also recoverable through the activity feed or trash, so missing the toast never loses the ability to recover. Sessions warn before expiry and preserve unsaved work.
- Drag operations always have a non-drag equivalent (move-to menu, keyboard DnD).

## 10. Zoom & reflow

- **200% browser zoom: fully clean.** No clipped controls, no overlapping text, no lost functionality. The fixed type scale is deliberate — zoom is the user's fluidity mechanism ([Typography.md §8](./Typography.md)).
- **400% zoom (= 320px effective width): reflow to single column.** The mobile layout ([ResponsiveRules.md](./ResponsiveRules.md)) is the 400% layout; building responsive correctly buys this criterion.
- **No two-dimensional scrolling at 320px** — with one exception: data tables may scroll horizontally *within their own container*, because they collapse to cards below `md` and the table view remains an intentional alternative. The page body never scrolls horizontally.
- Sticky elements (headers, action bars) must not consume more than ~30% of viewport height at 200% zoom; they unstick below that threshold.

## 11. AI surface accessibility

AI surfaces are accessible surfaces ([11 §10](../11_Design_Principles.md)) — no exemption for novelty.

- **Streaming:** buffered live-region announcements per completed paragraph/step (§5) — a screen reader user hears prose, not a token firehose. The **Stop button is keyboard-reachable during streaming** (in tab order the moment streaming starts, `Esc` also stops) and its state change is announced.
- **Approval cards are fully keyboard-operable:** the card is a focusable region announced as a whole — *"Aurex proposes: send invoice reminder to Meridian Co. Approve, edit, or dismiss."* — with Approve / Edit / Dismiss as real buttons in tab order. Approval is never a hover-revealed or pointer-only affordance; the audit trail depends on deliberate activation.
- **Ghost text is a suggestion, not content.** Inline completions are exposed via ARIA as a suggestion (announced once: "Suggestion available — Tab to accept, Escape to dismiss"), never inserted into the accessible document content until accepted. A screen reader must never read AI text as if the user wrote it — attribution law applies non-visually too.
- **Citations are navigable:** source links in Aurex answers are real links with entity names as link text ("Invoice INV-204"), reachable in tab order, never bare footnote numbers.
- **✦ attribution** is exposed as text ("Created by Aurex, approved by Marco") wherever the mark appears — the mark itself is `aria-hidden`; the information is not.

## 12. Testing & governance

- **axe in Playwright CI — blocking.** Every route and every overlay state runs axe assertions; violations fail the build like type errors. Token-pair contrast is separately CI-verified ([ColorSystem.md §10](./ColorSystem.md)).
- **Keyboard-only definition-of-done:** every feature PR demonstrates its core flow mouse-free (documented in the PR test plan). Draggable surfaces demonstrate the keyboard DnD path.
- **Manual audit per phase gate** ([10_Roadmap.md §9](../10_Roadmap.md)): screen-reader passes with **NVDA (Windows) and VoiceOver (macOS/iOS)** over the phase's critical flows, plus forced-colors, 200%/400% zoom, and reduced-motion passes. Findings are logged as bugs, not "a11y debt".
- **Severity law: an accessibility issue has the severity of the same issue as a functional bug.** "Keyboard user cannot approve an AI action" is a P0 exactly as "button doesn't work" is a P0 — because it is the same bug.
- Regressions add a test. Repeated regressions in a pattern promote the check into the component library so the class of bug dies at the source.

## 13. Do / Don't

| # | Do | Don't |
|---|---|---|
| 1 | Ship the focus ring (2px + 2px offset) on every interactive element | Remove or restyle focus indication because it "clutters" the design |
| 2 | Use semantic HTML and Radix primitives first | Rebuild widgets from `div`s and retrofit ARIA |
| 3 | Keep DOM order equal to visual order | Use positive `tabindex` or CSS reordering that breaks reading order |
| 4 | Make composites one tab stop with roving arrows | Let `Tab` crawl through every row of a table |
| 5 | Return focus to the trigger when overlays close | Drop focus to `<body>` and strand keyboard users |
| 6 | Announce async results through the shell's live-region registry | Insert ad-hoc `aria-live` divs per feature |
| 7 | Buffer Aurex streaming announcements by paragraph | Announce token-by-token or stay silent until the end |
| 8 | Pair every status color with an icon or label | Convey state by hue alone |
| 9 | Keep hover-revealed actions reachable via focus and menus | Ship pointer-only affordances |
| 10 | Give every timed action a persistent recovery path | Make the 5s undo toast the only way back |
| 11 | Test keyboard-only and screen-reader flows per feature | Defer a11y to a pre-launch sweep |
| 12 | Honor forced-colors mode | Force brand colors over system high-contrast settings |
| 13 | Expose ghost text as a suggestion with explicit accept/dismiss | Let AI text enter accessible content before acceptance |

## 14. Open questions

| # | Question | Owner | Target |
|---|---|---|---|
| 1 | Kanban `aria-roledescription` vocabulary — validate the "list of lists + card" contract with real NVDA/VoiceOver users before Phase 2 locks the board component | Chief Product Designer | Phase 2 gate |
| 2 | Rich text editor choice must pass the Esc-law and semantics review — evaluate candidates' a11y trees before adoption | Founding CTO | Phase 2 (Documents) |
| 3 | Live-region verbosity setting (verbose/terse announcements) — is this the one justified user preference, or settings sprawl ([11 §12.9](../11_Design_Principles.md))? | Chief Product Designer | Phase 3 |
| 4 | WCAG 2.2 delta (focus-not-obscured, target size 2.5.8, dragging 2.5.7) — we largely meet it by construction; formally adopt 2.2 AA as the floor? | Chief Product Designer | Phase 4 re-baseline |
| 5 | Portal screen-reader audit with real client-side assistive tech mixes (older browsers, mobile SRs) | Chief Product Designer | Phase 3 (Portal) gate |
