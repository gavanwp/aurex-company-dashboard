# DesignSystem — The AurexOS Design System

| | |
|---|---|
| **Document** | Design System Master Document — AurexOS |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [../11_Design_Principles.md](../11_Design_Principles.md) · [./README.md](./README.md) · [./DesignTokens.md](./DesignTokens.md) · [./ColorSystem.md](./ColorSystem.md) · [./ComponentInventory.md](./ComponentInventory.md) |

This is the root document of the AurexOS design system. [../11_Design_Principles.md](../11_Design_Principles.md) is the binding UI bible; this suite elaborates it into a complete, enforceable system. Where the two could ever disagree, docs/11 wins until amended. Every future screen of AurexOS — internal app, Client Portal, emails, PDFs, marketing — is built from this system. There is no "off-system" UI.

---

## 1. What This System Is

A design system comparable in rigor to Apple's HIG, Linear's product language, and Stripe's dashboard system — scaled to a small team by being **mechanical**: tokens instead of taste debates, registries instead of memory, lint and CI instead of vigilance.

**Brand personality (binding adjectives):** professional, minimal, premium, modern, trustworthy, AI-first, fast, elegant. Premium is expressed through *restraint and finish* — a neutral canvas, one accent, exact spacing, both themes flawless — never through decoration. The permanent litmus test: **would this screen hold up beside Linear, Notion, and Stripe in a side-by-side demo?** If not, it doesn't ship.

**What we are explicitly not:** a generic Bootstrap-class dashboard (gradient stat cards, icon soup, five competing hues), a playful consumer app, or a showcase of animation. AurexOS is where agencies live eight hours a day; calm is the feature.

### 1.1 The five pillars

| Pillar | Meaning | Deep spec |
|---|---|---|
| Token-first | Every visual value flows from one registry; raw values in feature code are lint failures | [DesignTokens.md](./DesignTokens.md) |
| Neutral-first | ~90% of any screen is the Graphite neutral ramp; one indigo accent; status colors mean status | [ColorSystem.md](./ColorSystem.md) |
| Dense & fast | 14px body, 4px grid, keyboard-first, <100 ms feedback, skeletons not spinners | [Typography.md](./Typography.md) · [SpacingSystem.md](./SpacingSystem.md) |
| Both themes, always | Dark is a first-class ramp, not inverted light; AA contrast in both is a merge requirement | [DarkMode.md](./DarkMode.md) · [Accessibility.md](./Accessibility.md) |
| AI, calm and attributed | Aurex appears when summoned or useful; every AI artifact carries the ✦ mark; approval cards gate side effects | [Components.md](./Components.md) §AI |

## 2. System Anatomy

```
Foundations   →  ColorSystem · Typography · SpacingSystem · GridSystem · Elevation · DesignTokens
Language      →  BrandGuidelines · Icons · IllustrationStyle · AnimationSystem
Components    →  Components · Buttons · Forms · Cards · Navigation · Tables · Charts · ComponentInventory
Patterns      →  DashboardRules · Notifications · EmptyStates · LoadingStates · ErrorStates
Contracts     →  Accessibility · ResponsiveRules · DarkMode
```

Implementation lives in `packages/ui` (vendored shadcn/ui primitives + composed patterns, themed exclusively by the token layer) and `packages/config/tailwind` (the token bridge). The gallery route documents every component in every state in both themes — an undocumented state does not exist.

## 3. The Design Rules

These are the strict, citable rules of the system ("violates DR-7" in design review). Rules marked ⚙ are mechanically enforced (lint/CI); the rest are design-review blocking. Each rule's owning document holds the full rationale.

| # | Rule | Owner |
|---|---|---|
| DR-1 ⚙ | No raw values in feature code — every color, radius, shadow, space, duration is a token | [DesignTokens.md](./DesignTokens.md) |
| DR-2 | One accent. A screen more than ~10% accent-colored is wrong. Status colors are the only other hues; module hues live only in charts and identity moments | [ColorSystem.md](./ColorSystem.md) |
| DR-3 | Never more than 3 "colored" elements competing in one view (accent + at most two status signals); everything else neutral | [ColorSystem.md](./ColorSystem.md) |
| DR-4 ⚙ | WCAG 2.1 AA in both themes is a merge requirement — 4.5:1 text, 3:1 UI boundaries | [Accessibility.md](./Accessibility.md) |
| DR-5 | Only the eight type tokens exist. A ninth size requires amending [Typography.md](./Typography.md). Weights 400/500/600 (700 for stat numerals only) | [Typography.md](./Typography.md) |
| DR-6 | All spacing on the 4/8/12/16/24/32/48/64 scale. Distinct content sections keep ≥24px separation. No 5px, no 10px, ever | [SpacingSystem.md](./SpacingSystem.md) |
| DR-7 | Radii are 4/6/8/12/pill by component class — badges/controls/cards/overlays. Never per-component invention | [Elevation.md](./Elevation.md) |
| DR-8 | Exactly two shadow levels exist. Cards are border-first with no default shadow; the kanban drag lift is the one sanctioned card shadow | [Elevation.md](./Elevation.md) |
| DR-9 | One primary button per view. Buttons are verbs with an object ("Create invoice"), sentence case, 8px icon gap | [Buttons.md](./Buttons.md) |
| DR-10 | Cards in a grid maintain equal height; max 4 per row (5 only ultra-wide); titles clamp at 2 lines | [Cards.md](./Cards.md) · [GridSystem.md](./GridSystem.md) |
| DR-11 | Forms validate inline (on blur, revalidate on change); errors are never toasts; never color-alone signaling | [Forms.md](./Forms.md) |
| DR-12 ⚙ | Charts use theme tokens only — a hardcoded hex in a chart is a lint failure; same series = same hue everywhere; deltas carry arrow + label, not color alone | [Charts.md](./Charts.md) |
| DR-13 | Numbers are tabular figures, right-aligned in tables, currency always explicit | [Typography.md](./Typography.md) · [Tables.md](./Tables.md) |
| DR-14 | One icon set (Lucide), one stroke weight, 16/20px. One concept = one icon, per the registry. No emoji except the ✦ Aurex mark | [Icons.md](./Icons.md) |
| DR-15 | Motion is 150/200/250 ms, ease-out in / ease-in out, transform+opacity only; springs only for drag; nothing decorative; reduced-motion always honored ⚙ | [AnimationSystem.md](./AnimationSystem.md) |
| DR-16 | Skeletons over spinners; no full-page spinner after the shell paints; zero layout shift when content lands | [LoadingStates.md](./LoadingStates.md) |
| DR-17 | Every list, table, and board ships its designed empty state — first-use, cleared, filtered-zero, and permission variants are distinct | [EmptyStates.md](./EmptyStates.md) |
| DR-18 | Undo over confirm for reversible actions; typed-name confirmation only for irreversible destruction; money and destructive ops are never optimistic | [ErrorStates.md](./ErrorStates.md) · [Forms.md](./Forms.md) |
| DR-19 | One overlay layer maximum — no modals-on-modals; panels replace, never stack | [Elevation.md](./Elevation.md) · [Navigation.md](./Navigation.md) |
| DR-20 | Every AI-created or AI-modified artifact carries the ✦ attribution mark with hover provenance; AI side effects pass through approval cards; ghost text never auto-commits | [Components.md](./Components.md) |
| DR-21 | Every feature registers its nav target and actions in the command palette before it is "done" | [Navigation.md](./Navigation.md) |
| DR-22 | Both themes ship with every component from day one; a component wrong in one theme is a bug, not a backlog item | [DarkMode.md](./DarkMode.md) |
| DR-23 | 32×32px minimum interactive targets, even in compact density | [Accessibility.md](./Accessibility.md) |
| DR-24 | Toasts confirm and offer undo; they never carry errors requiring action, never stack past three | [Notifications.md](./Notifications.md) |
| DR-25 | Notification types that users mass-disable are deleted, not re-enabled | [Notifications.md](./Notifications.md) |

The anti-patterns of [../11_Design_Principles.md](../11_Design_Principles.md) §12 apply in full alongside these rules.

## 4. Figma Organization

The Figma workspace mirrors this documentation one-to-one, so the docs, the Figma library, and `packages/ui` never drift in structure. One team library file publishes to all product files.

### 4.1 File & page structure

```
AurexOS Design (Figma team)
├── 🧭 00 — Foundations (library file, published)
│   ├── Cover & changelog
│   ├── Tokens / Variables        ← Figma Variables mirror DesignTokens.md 1:1 (same names)
│   ├── Color                     ← ramps + semantic styles, light & dark modes
│   ├── Typography                ← the 8 text styles, exactly
│   ├── Spacing & Grid            ← layout grids, breakpoint frames
│   ├── Elevation & Radius
│   └── Icons                     ← Lucide set + custom-on-grid glyphs + ✦
├── 🧩 01 — Components (library file, published)
│   ├── Primitives                ← one page per family: Buttons, Forms, Cards, …
│   ├── Composed patterns         ← DataTable, ApprovalCard, StatCard, Palette…
│   ├── AI components             ← chat, approval card, streaming, memory viewer
│   └── _Sandbox                  ← WIP; nothing here is consumable
├── 📐 02 — Templates
│   ├── Page templates            ← the 5 canonical layouts (GridSystem.md §7)
│   ├── Dashboard templates       ← role defaults (DashboardRules.md §5)
│   └── Portal templates
├── 🖼 03 — Illustrations          ← token-driven SVG sources (IllustrationStyle.md)
├── 🔬 04 — Explorations           ← spikes; explicitly non-canonical, dated, archived quarterly
└── 📱 05 — Prototypes             ← click-through flows for testing; per-flow pages
```

### 4.2 Working rules

- **Variables are the token registry.** Figma Variables use the exact token names from [DesignTokens.md](./DesignTokens.md), with light/dark modes; a token added in Figma without a docs PR (or vice versa) is drift and gets reverted.
- **Components mirror `packages/ui` names** (`Button`, `ApprovalCard`) with variants matching the documented variant/size/state matrices — auto-layout, all states, both modes.
- **Every canvas frame states its breakpoint** (from [GridSystem.md](./GridSystem.md)) and uses the shared layout grids.
- **Developer handoff**: engineers consume the docs first, Figma second — Figma illustrates, documentation binds. Handoff-ready frames are marked ✅ and link the relevant doc section; specs beyond tokens (behavior, a11y, states) live in these documents, never in Figma comments.
- **Library governance**: publishing rights limited to design-system owners; product designers consume; a component enters the library only after its documentation entry exists ([ComponentInventory.md](./ComponentInventory.md) §4 workflow).

## 5. Governance

- **This suite binds all UI work.** Deviation requires a written exception in the PR and, if the deviation is right, an amendment here — the rule-change process of [../12_Project_Rules.md](../12_Project_Rules.md) §10 applies.
- **Mechanical enforcement** follows docs/11 §13: token usage, contrast pairs, reduced motion, component states, and chart-hex bans are lint/CI checks; the rest is design review, which is part of code review for any UI-touching PR.
- **Change flow**: token/foundation changes → PR against the owning doc + [DesignTokens.md](./DesignTokens.md) + Figma Variables + `packages/ui` in the same change set. New components → the [ComponentInventory.md](./ComponentInventory.md) contribution workflow.
- **Versioning**: each document versions independently (metadata table); this master document bumps when pillars, rules, or structure change.

## 6. Open Questions

1. **Design-lint depth** — which DR rules beyond the ⚙-marked set can be pushed into automated checks (e.g., spacing-scale lint on Tailwind classes) without false-positive noise? Evaluate at Phase 1 exit.
2. **Figma Code Connect** — worth wiring component code links once `packages/ui` stabilizes (lean: Phase 2)?
3. **Marketing-surface tokens** — Phase 5's marketing site may need a display type scale and looser accent rules; decide then whether that is an extension of this system or a sibling brand system (lean: extension, one family).
