# Buttons

| | |
|---|---|
| **Document** | Button Specification — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [Components.md](./Components.md) · [Forms.md](./Forms.md) · [Cards.md](./Cards.md) · [DesignTokens.md](./DesignTokens.md) · [ColorSystem.md](./ColorSystem.md) · [../11_Design_Principles.md](../11_Design_Principles.md) |

This document is the **target specification**. The shipped `packages/ui/components/button.tsx` is stock shadcn (heights 32/36/40, `text-xs` on sm) and must be migrated: sizes to **28/32/36**, label type to **body-strong 14/500 at every size**, and semantic tokens per [DesignTokens.md](./DesignTokens.md). Deltas are flagged inline where they matter.

---

## 1. Doctrine

1. **One primary button per view.** A screen, dialog, or panel gets exactly one accent-solid button. Two primaries means the design has not decided what it wants the user to do — go back and decide. Everything else is secondary, ghost, or link.
2. **Buttons are verbs.** Label = verb + object: "Create invoice", "Send proposal", "Archive client". Never "Submit", "OK", "Yes", "Done" ([../11_Design_Principles.md](../11_Design_Principles.md) §11). If you can't name the verb, the button shouldn't exist.
3. **Hierarchy expresses importance without shouting.** The variant ladder (primary → secondary → ghost → link) carries emphasis through contrast and chrome, not size or color volume. If a screen is more than ~10% accent, it's wrong (§2.4 of the bible).
4. **Sentence case, always.** "Create invoice", not "Create Invoice", not "CREATE INVOICE".
5. Every button acknowledges interaction within **100 ms** — hover, active, or loading state — no dead clicks.

## 2. Variants

| Variant | Purpose | Cardinality |
|---|---|---|
| `primary` | The one main action of the view | **Exactly one per view** |
| `secondary` | Alternative or supporting actions | Unlimited, but restrained |
| `ghost` | Toolbars, dense rows, tertiary actions | Unlimited |
| `destructive` | The destructive act itself | Only inside confirmation contexts |
| `link` | Inline navigation inside text | Unlimited |
| `icon` | Icon-only compact actions | Requires `aria-label` + tooltip |

### 2.1 Token map — light theme

| Variant | Background | Text | Border |
|---|---|---|---|
| primary | `--accent-solid` | `--accent-on-solid` (white) | none |
| secondary | `--bg-surface` | `--text-primary` | `--border-strong` 1px |
| ghost | transparent | `--text-secondary` | none |
| destructive | `--status-danger-solid` | white | none |
| link | transparent | `--accent-text` | none |
| icon | per host variant (ghost default) | inherits | inherits |

### 2.2 Token map — dark theme

| Variant | Background | Text | Border |
|---|---|---|---|
| primary | `--accent-solid` (dark ramp step) | white | none |
| secondary | `--bg-raised` | `--text-primary` | `--border-strong` 1px |
| ghost | transparent | `--text-secondary` | none |
| destructive | `--status-danger-solid` (desaturated dark ramp) | white | none |
| link | transparent | `--accent-text` (dark-adjusted) | none |

### 2.3 Per-variant state treatments

| Variant | Hover | Active/pressed | Focus | Disabled |
|---|---|---|---|---|
| primary | accent-solid darkened one ramp step | darkened two steps | 2px `--focus-ring`, 2px offset | 0.5 opacity, `not-allowed` |
| secondary | bg steps to `--bg-raised` (light) / one step up (dark) | bg one further step, border unchanged | same ring | same |
| ghost | bg `--bg-raised` appears; text → `--text-primary` | bg one step deeper | same ring | same |
| destructive | danger-solid darkened one step | darkened two steps | same ring | same |
| link | underline appears (4px offset) | text darkened one step | same ring | 0.5 opacity, no underline |

Rules:

- **Primary** is the only accent-solid element on the screen besides active nav. Use it for the action the view exists for: "Create project" on the projects page, "Send invoice" in the invoice composer.
- **Destructive** styles the destructive act itself — the "Delete client" button inside the confirmation dialog — **never its entry point**. The row action or menu item that opens the confirmation is a ghost button or danger-text menu item.
- **Ghost** is the default for toolbars, table row actions, and dense list rows: zero chrome at rest keeps dense surfaces calm.
- **Icon buttons** are ghost by default, square (height = width), and always carry an `aria-label` plus a tooltip with the same text ([../11_Design_Principles.md](../11_Design_Principles.md) §6.3). No naked icon buttons, ever.
- Disabled buttons expose a tooltip explaining *why* when the reason isn't obvious (see §8).

## 3. Sizes

| Size | Height | H-padding | Type | Icon | When allowed |
|---|---|---|---|---|---|
| `sm` | 28px | 8px | 14/500 body-strong | 16px | Dense contexts only: table rows, card footers, toolbar clusters. Wrap in a 32px hit area to preserve the minimum target. |
| `md` | 32px | 12px | 14/500 body-strong | 16px | **Default.** Dialogs, forms, page headers, everywhere unless a rule below says otherwise. |
| `lg` | 36px | 16px | 14/500 body-strong | 16px | Empty-state CTAs, onboarding, marketing-adjacent surfaces inside the app. Never in tables or toolbars. |

- Label type does **not** shrink with size — 14/500 at every size. (Delta: shipped sm uses `text-xs`; fix.)
- Icon-only buttons: square at the size's height (28/32/36), icon stays 16px, centered.
- Minimum pointer target is 32×32px; `sm` buttons satisfy it via padded hit area, not visual size.

## 4. Anatomy

```
┌──────────────────────────────┐
│  [icon 16] ·8px· Label       │   md: 32px tall, 12px h-padding
└──────────────────────────────┘
```

- **Icon placement:** leading by default. Trailing icons are reserved for chevrons (dropdown/split triggers) and external-link markers — nothing else. Never both leading and trailing icons.
- **The 8px gap law:** icon-to-label gap is always 8px, at every size. No exceptions.
- **Loading anatomy:** the button keeps its exact width (lock width before swapping content). A 16px inline spinner replaces the leading icon (or takes its place if there was none); the **label stays visible**. Never replace the label with a spinner, never collapse the button. The button is non-interactive while loading but does not visually gray to disabled.
- **Badge-in-button:** a count badge ("Filters · 3") renders as a caption-size (12px) count after the label, separated by 8px, in a `--bg-raised` pill with radius 4. One badge maximum; counts only, never words.
- Labels never wrap and never truncate — if a label doesn't fit, it's too long. Rewrite it (≤ 3 words is the norm).

## 5. States

Full matrix — every variant defines every applicable state ([../11_Design_Principles.md](../11_Design_Principles.md) §6.2):

| State | Trigger | Treatment | Notes |
|---|---|---|---|
| default | — | per §2 token maps | |
| hover | pointer over | per §2.3, 150 ms transition | No hover state on touch |
| active / pressed | pointer down / Space held | per §2.3, instant (no transition-in) | Also applies while a connected menu is open |
| focus-visible | keyboard focus | 2px `--focus-ring` outline, 2px offset | Never removed, never restyled per variant |
| disabled | `disabled` / `aria-disabled` | 0.5 opacity, `cursor: not-allowed`, no hover | Tooltip-why when non-obvious; see §8.3 |
| loading | in-flight action | width-stable, inline 16px spinner, label kept | Clicks ignored; `aria-busy="true"` |
| loading + success (optional) | mutation resolves | brief check morph (≤ 250 ms), then default | Only where the view doesn't navigate away |

**Keyboard activation:** `Enter` activates on keydown; `Space` activates on keyup (pressing Space shows the pressed state, releasing fires). This is native `<button>` behavior — anything rendered as a button must reproduce it exactly. Every button is reachable in DOM order via Tab.

## 6. Button groups & split buttons

### 6.1 Segmented control vs split button

- **Segmented control** = one choice among peers (view toggles: "List | Board | Calendar"). Visually fused: shared border, 6px radius on the outer corners only, selected segment gets `--bg-raised` + `--text-primary`. Behaves as a radio group (arrow keys move selection).
- **Split button** = one default action + a dropdown of variants ("Save" ▾ → "Save and close", "Save as template"). Main segment carries the action; the attached 28px-wide chevron segment (separated by a 1px border in the on-solid tone) opens the menu. The chevron segment is its own focus stop with its own accessible name ("More save options").
- Use a split button only when the variants are true variants of the same verb. Unrelated actions go in a kebab menu instead.

### 6.2 Alignment rules (pinned)

- **Dialogs and panels: right-aligned, primary rightmost.** Reading a dialog ends at the bottom-right; the concluding action sits where the eye lands. Order: `[ghost cancel] [secondary] [primary]`.
- **Page-level forms (settings, editors): left-aligned, primary first.** Long forms are read top-down along the left edge where labels live; the action row continues that scan line. Order: `[primary] [ghost cancel]`.
- This split is deliberate: dialogs are transactions (conclude at the corner), forms are documents (conclude in the reading column). Do not mix the two conventions within one surface.
- Gap between grouped buttons: 8px. Destructive actions are never adjacent to the primary — see [Forms.md](./Forms.md) §8.

## 7. Placement rules

| Surface | Rule |
|---|---|
| Dialog footer | Right-aligned per §6.2; max three buttons; exactly one primary (or one destructive **instead of** a primary in confirm dialogs — never focused by default) |
| Page header | One primary max, rightmost; secondary/ghost to its left; overflow into a kebab menu after three total |
| Table row actions | Ghost and icon buttons only, `sm` size; revealed on row hover/focus-within; never a primary inside a row |
| Empty state | One `lg` primary CTA + optionally one link-variant secondary ("Learn more"); nothing else |
| Card footer | `sm` ghost/secondary only; the card's primary action is the card click itself ([Cards.md](./Cards.md) §1) |
| Toolbar | Ghost and icon buttons; segmented controls for view switches |

## 8. Accessibility

1. **Accessible names.** The name is the visible label; icon-only buttons get `aria-label` matching the tooltip text word-for-word.
2. **Focus order** follows visual order. Dialog focus lands on the least-destructive control first; destructive confirms are **never** the default focus ([../11_Design_Principles.md](../11_Design_Principles.md) §8.6).
3. **`disabled` vs `aria-disabled` (pinned): prefer `aria-disabled="true"` when the action is contextually blocked** (nothing selected, quota reached, missing permission). An `aria-disabled` button stays focusable and keeps its tooltip reachable, so keyboard and screen-reader users can discover *why*; activation is a no-op that may surface the reason inline. Reserve the native `disabled` attribute for structurally impossible states (form still loading) where the button carries no information.
4. Loading buttons set `aria-busy="true"` and keep their label so assistive tech reads the same name throughout.
5. Contrast: label-on-background meets 4.5:1 in both themes; the focus ring meets 3:1 against adjacent colors.

## 9. Do / don't

| # | Do | Don't |
|---|---|---|
| 1 | One accent-solid primary per view | Never two primaries — demote one |
| 2 | Label with verb + object ("Create invoice") | Never "Submit", "OK", "Yes/No", "Cancel/OK" pairs |
| 3 | Keep width stable while loading | Never swap the label for a spinner |
| 4 | Style only the destructive act as destructive | Never a red button as the *entry point* to deletion |
| 5 | Ghost buttons in tables and toolbars | Never bordered/solid buttons cluttering dense rows |
| 6 | Icon + label by default | Never icon-only for destructive actions — the label is the guardrail |
| 7 | Tooltip + `aria-label` on every icon button | Never a naked icon button |
| 8 | `aria-disabled` + tooltip for contextual blocks | Never a silently dead disabled button with no explanation |
| 9 | Sentence case | Never Title Case or ALL CAPS labels |
| 10 | 8px icon-to-label gap, 16px icons | Never eyeballed gaps or 20px icons inside controls |
| 11 | Right-align dialog actions, primary rightmost | Never a default-focused destructive confirm |
| 12 | Rewrite labels that don't fit | Never truncate or wrap a button label |

## 10. Open questions

1. **Success morph (§5):** ship the check-morph micro-confirmation in v1, or defer until the motion variants in `packages/ui/motion` are stable?
2. **Split button keyboard model:** one tab stop with arrow-key access to the chevron, or two tab stops? Currently specced as two; revisit after usability pass.
3. **`sm` hit-area padding** implementation (transparent expanded hit area vs margin-based) needs an engineering decision that doesn't break flex layouts.
4. Migration timing for the shipped shadcn sizes (32/36/40 → 28/32/36) — coordinate with [DesignTokens.md](./DesignTokens.md) control-height tokens to land in one PR.
