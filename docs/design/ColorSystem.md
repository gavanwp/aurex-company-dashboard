# Color System

| | |
|---|---|
| **Document** | Color System — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [11_Design_Principles.md](../11_Design_Principles.md) · [DesignTokens.md](./DesignTokens.md) · [DarkMode.md](./DarkMode.md) · [Accessibility.md](./Accessibility.md) · [Charts.md](./Charts.md) · [README.md](./README.md) |

---

## 1. Philosophy

Color in AurexOS is an instrument of hierarchy, not decoration. We hold to five laws, all derived from [11_Design_Principles.md](../11_Design_Principles.md) §2.4 and §5:

1. **Neutral-first.** ~90% of any screen is the Graphite neutral ramp — backgrounds, borders, and text. A calm neutral canvas is what makes the few colored moments legible. Premium reads as restraint, not saturation.
2. **One accent.** Aurex Indigo is the single brand hue. It marks primary actions, active navigation, selection, focus, and Aurex identity moments — nothing else. If a screen is more than ~10% accent-colored, the screen is wrong.
3. **Status colors mean status.** Green, amber, red, and blue carry exactly one meaning each. They are never used because a card "needed some color". Status is never conveyed by color alone — an icon or label always accompanies it.
4. **Module hues are subordinate.** The module identity family (§7) exists only for data-visualization series, module icon tints, and small identity moments. It never competes with the accent and never colors interactive chrome.
5. **AA in both themes is a merge requirement.** 4.5:1 for text, 3:1 for large text and meaningful UI boundaries — verified automatically on token pairs (§10). A color that cannot pass on its legal backgrounds does not enter the system.

## 2. The two-layer token model

We use two layers because it makes theming mechanical and hue drift impossible (recap and extension of [11_Design_Principles.md](../11_Design_Principles.md) §2):

- **Layer 1 — primitives.** The ramps in this document: Graphite N1–N12, Dark D1–D12, the Aurex Indigo scale, the four status scales, the module hues. Primitives live only inside `packages/ui`; nothing outside the token definition layer may reference them.
- **Layer 2 — semantic aliases.** Intent-named CSS variables (`--background`, `--muted-foreground`, `--border`, `--primary`, `--ring`, …) mapped per theme in `packages/ui/styles/globals.css` and bridged to Tailwind utilities in `packages/config/tailwind/preset.ts`. Components consume **only** this layer.

Rules:

- A hex code or raw HSL in feature code is a lint failure. Components say `bg-card`, `text-muted-foreground`, `border-input` — never `#5162C2` or `zinc-200`.
- Semantic tokens are the theming seam: light and dark are two mappings of the same aliases, so every component is theme-correct by construction.
- New primitives require amending this document. New aliases require a semantic justification ("what intent does this name?"), not a visual one.

## 3. Neutral ramp — Graphite (light theme, N1–N12)

The Graphite ramp is hue 240 at low saturation: a cool near-gray that reads as precise without feeling blue. Twelve steps, each with exactly one job. Steps N1–N6, N9–N12 are shipped values; **N7 and N8 are documented extensions** filling the border-strong and disabled slots.

| Step | HSL | HEX | RGB | Light-theme role |
|---|---|---|---|---|
| N1 | `0 0% 100%` | `#FFFFFF` | `255, 255, 255` | App background, cards, popovers (`--background`, `--card`, `--popover`) |
| N2 | `240 5% 98%` | `#FAFAFA` | `250, 250, 250` | Sidebar surface (`--sidebar`) |
| N3 | `240 5% 96%` | `#F4F4F5` | `244, 244, 245` | Secondary/muted surfaces, neutral hover fills (`--secondary`, `--muted`, `--accent`) |
| N4 | `240 5% 93%` | `#ECECEE` | `236, 236, 238` | Pressed/active neutral surface, sidebar item hover (`--sidebar-accent`) |
| N5 | `240 6% 90%` | `#E4E4E7` | `228, 228, 231` | Subtle borders, dividers (`--border`) |
| N6 | `240 6% 87%` | `#DCDCE0` | `220, 220, 224` | Input and control borders (`--input`) |
| N7 | `240 5% 78%` | `#C4C4CA` | `196, 196, 202` | Strong borders — table header rules, drag handles (`--border-strong`, extension) |
| N8 | `240 5% 65%` | `#A1A1AA` | `161, 161, 170` | Disabled text and icons (`--text-disabled`, extension; AA-exempt as inactive UI) |
| N9 | `240 4% 42%` | `#67676F` | `103, 103, 111` | Muted text — metadata, placeholders, captions (`--muted-foreground`) |
| N10 | `240 5% 30%` | `#494950` | `73, 73, 80` | Secondary text — sidebar labels, secondary UI copy (`--sidebar-foreground`) |
| N11 | `240 6% 10%` | `#18181B` | `24, 24, 27` | Strong text on tinted neutrals (`--secondary-foreground`, `--accent-foreground`) |
| N12 | `240 10% 3.9%` | `#09090B` | `9, 9, 11` | Primary text (`--foreground`) |

Accessibility (against N1–N4 surfaces): N12 = 19.90:1–16.86:1; N10 = 8.93:1–8.12:1 (N1–N3); N9 = 5.61:1–4.75:1 — muted text passes AA on every legal surface, including N4. N8 (2.56:1 on N1) is legal **only** for disabled states, which WCAG exempts. N7 (1.74:1 on N1) exceeds nothing textual — it is a boundary color paired with fills, never a lone meaning-bearing edge.

## 4. Dark ramp (D1–D12)

Dark is **not inverted light** — it is its own ramp with its own logic: elevation increases lightness, the sidebar sits *below* the canvas, and text steps are tuned for dark-adapted eyes (see [DarkMode.md](./DarkMode.md)). D9 is a documented extension (border-strong); all other steps are shipped values.

| Step | HSL | HEX | RGB | Dark-theme role |
|---|---|---|---|---|
| D1 | `240 6% 5%` | `#0C0C0E` | `12, 12, 14` | Sidebar — a step below the canvas, Linear-style (`--sidebar`) |
| D2 | `240 6% 7%` | `#111113` | `17, 17, 19` | App background (`--background`) |
| D3 | `240 6% 9%` | `#161618` | `22, 22, 24` | Cards (`--card`) |
| D4 | `240 6% 10%` | `#18181B` | `24, 24, 27` | Popovers, raised surfaces (`--popover`) |
| D5 | `240 5% 13%` | `#1F1F23` | `31, 31, 35` | Hover fills, sidebar item hover (`--sidebar-accent`) |
| D6 | `240 5% 15%` | `#242428` | `36, 36, 40` | Secondary/muted surfaces (`--secondary`, `--muted`, `--accent`) |
| D7 | `240 5% 16%` | `#27272B` | `39, 39, 43` | Subtle borders (`--border`) |
| D8 | `240 5% 19%` | `#2E2E33` | `46, 46, 51` | Input and control borders (`--input`) |
| D9 | `240 5% 28%` | `#44444B` | `68, 68, 75` | Strong borders; disabled text (`--border-strong`, extension; AA-exempt when disabled) |
| D10 | `240 5% 65%` | `#A1A1AA` | `161, 161, 170` | Muted text (`--muted-foreground`) |
| D11 | `240 5% 78%` | `#C4C4CA` | `196, 196, 202` | Secondary text (`--sidebar-foreground`) |
| D12 | `0 0% 98%` | `#FAFAFA` | `250, 250, 250` | Primary text (`--foreground`) |

Accessibility (against D2–D4 surfaces): D12 = 18.07:1–16.97:1; D11 = 10.86:1–10.41:1; D10 = 7.36:1–6.91:1, and still 6.03:1 on D6 — muted text passes AA on every dark surface. The sidebar border is a shipped semantic offset, `240 5% 14%` (`#212125`), sitting between D5 and D6 because the sidebar's darker canvas needs a fractionally darker rule.

## 5. Brand accent — Aurex Indigo

One accent, used sparingly. Aurex Indigo is the restrained Linear-like indigo-violet family of [11_Design_Principles.md](../11_Design_Principles.md) §2.4. The solid and ring stops are shipped; hover/active/soft/text are documented derivations (hover = −6 L, active = −10 L from solid; soft = same hue at 95% L light / 17% L dark).

| Token | Light HSL | Light HEX / RGB | Dark HSL | Dark HEX / RGB |
|---|---|---|---|---|
| `--accent-solid` (`--primary`) | `231 48% 54%` | `#5162C2` / `81, 98, 194` | `231 48% 56%` | `#5969C5` / `89, 105, 197` |
| `--accent-solid-hover` | `231 48% 48%` | `#4051B5` / `64, 81, 181` | `231 48% 50%` | `#4255BD` / `66, 85, 189` |
| `--accent-solid-active` | `231 48% 44%` | `#3A4BA6` / `58, 75, 166` | `231 48% 46%` | `#3D4EAE` / `61, 78, 174` |
| `--accent-soft` | `231 48% 95%` | `#ECEEF8` / `236, 238, 248` | `231 48% 17%` | `#171D40` / `23, 29, 64` |
| `--accent-soft-hover` | `231 48% 92%` | `#E1E4F4` / `225, 228, 244` | `231 48% 21%` | `#1C244F` / `28, 36, 79` |
| `--accent-text` | `231 48% 40%` | `#354497` / `53, 68, 151` | `231 60% 75%` | `#99A4E5` / `153, 164, 229` |
| `--accent-on-solid` (`--primary-foreground`) | `0 0% 100%` | `#FFFFFF` / `255, 255, 255` | `0 0% 100%` | `#FFFFFF` / `255, 255, 255` |
| `--focus-ring` (`--ring`) | `231 48% 54%` | `#5162C2` / `81, 98, 194` | `231 60% 68%` | `#7C8BDE` / `124, 139, 222` |

Accessibility: white on solid = 5.42:1 light / 4.94:1 dark (AA text); on hover and active it only improves (6.86:1 / 7.67:1 light). `--accent-text` on `--accent-soft` = 7.48:1 light / 6.84:1 dark, and on the app background 8.66:1 / 7.90:1. The dark ring brightens to `231 60% 68%` because the light-theme ring value would sink to 3.82:1 against dark canvases; the brightened ring reaches 5.93:1 on D2.

**Usage law.** Accent-solid: primary buttons, active nav indicator, focus, the ✦ Aurex identity mark. Accent-soft: selected rows, active nav backgrounds, selection tints. Accent-text: links and accent-colored labels on soft or app backgrounds. That is the complete list. **The 10% heuristic:** squint at any screen — if more than roughly one-tenth of it is indigo, someone used the accent for decoration, hierarchy, or a second CTA, and the design is wrong. One primary action per view.

## 6. Status colors

Four hues, each meaning one thing in AurexOS. Every status color ships as a **solid / soft / text** triple per theme: solid for filled chips and buttons, soft for tinted row and banner backgrounds, text for status-colored copy on soft or app backgrounds. Solids for success/warning/danger are shipped; **info is a new token family defined here**; all soft/text variants are systematic derivations (soft = same hue at 95% L light, 15–18% L dark; text = same hue at an AA-passing lightness).

| Token | Meaning in AurexOS | Light HSL / HEX / RGB | Dark HSL / HEX / RGB |
|---|---|---|---|
| `--status-success-solid` | Paid, completed, healthy | `142 72% 29%` / `#157F3C` / `21, 127, 60` | `142 55% 45%` / `#34B262` / `52, 178, 98` |
| `--status-success-soft` | | `142 72% 95%` / `#E9FBF0` / `233, 251, 240` | `142 55% 16%` / `#123F23` / `18, 63, 35` |
| `--status-success-text` | | `142 72% 26%` / `#137236` / `19, 114, 54` | `142 50% 68%` / `#85D6A3` / `133, 214, 163` |
| `--status-warning-solid` | At risk, expiring, needs attention | `38 92% 50%` / `#F59F0A` / `245, 159, 10` | `38 90% 55%` / `#F4A825` / `244, 168, 37` |
| `--status-warning-soft` | | `38 92% 95%` / `#FEF5E7` / `254, 245, 231` | `38 90% 16%` / `#4E3304` / `78, 51, 4` |
| `--status-warning-text` | | `38 92% 28%` / `#895906` / `137, 89, 6` | `38 85% 70%` / `#F4C471` / `244, 196, 113` |
| `--status-danger-solid` | Overdue, errors, destructive actions | `0 72% 45%` / `#C52020` / `197, 32, 32` | `0 62% 52%` / `#D03939` / `208, 57, 57` |
| `--status-danger-soft` | | `0 72% 95%` / `#FBE9E9` / `251, 233, 233` | `0 62% 17%` / `#461010` / `70, 16, 16` |
| `--status-danger-text` | | `0 72% 38%` / `#A71B1B` / `167, 27, 27` | `0 75% 72%` / `#ED8282` / `237, 130, 130` |
| `--status-info-solid` *(new)* | Neutral notices, in-progress, FYI | `217 85% 46%` / `#125ED9` / `18, 94, 217` | `217 75% 62%` / `#558DE7` / `85, 141, 231` |
| `--status-info-soft` *(new)* | | `217 85% 95%` / `#E7F0FD` / `231, 240, 253` | `217 75% 17%` / `#0B244C` / `11, 36, 76` |
| `--status-info-text` *(new)* | | `217 85% 38%` / `#0F4EB3` / `15, 78, 179` | `217 80% 72%` / `#7EAAF1` / `126, 170, 241` |

On-solid foregrounds (shipped): success/danger take `0 0% 98%` in both themes (5.08:1 / 6.22:1, 5.83:1 / 4.65:1); dark success solid takes `144 61% 8%` (`#082112`); warning is bright, so it always takes a dark foreground — `26 83% 14%` (`#412006`, 6.87:1) light, `26 83% 10%` (`#2F1704`, 8.41:1) dark. Info solid takes white light (5.79:1) and `240 6% 5%` dark (5.91:1).

Pairing rules:

- **Text pairs with soft, never solid-on-app-as-text.** Status copy uses `-text` on `-soft` or on the app background — every such pair is ≥5.5:1 (§10). Warning solid at 2.13:1 on white must never be text or a thin meaning-bearing boundary in light theme.
- **Soft backgrounds always carry the matching `-text` and an icon or label.** A tinted row with no icon or wording fails the never-color-alone rule.
- **Danger is reserved.** Destructive buttons, overdue states, and errors — never "important". Importance is hierarchy's job, not red's.
- **Info is not a second accent.** It is a notice color; if you're reaching for info-blue on an interactive element, you want the accent or a neutral.

## 7. Module identity hues & the categorical chart ramp

A new primitive family, formalized here, giving each module a recognizable tint in icons, badges, and chart series. Together with rose they form the categorical data-visualization ramp.

| Token | Module / series | HSL | HEX | RGB |
|---|---|---|---|---|
| `--module-ai` | Aurex AI (the accent itself) | `231 48% 54%` | `#5162C2` | `81, 98, 194` |
| `--module-automation` | Automation | `28 92% 50%` | `#F5780A` | `245, 120, 10` |
| `--module-finance` | Finance | `172 66% 36%` | `#1F9888` | `31, 152, 136` |
| `--module-crm` | CRM | `199 84% 44%` | `#1293CE` | `18, 147, 206` |
| `--module-analytics` | Analytics | `275 55% 58%` | `#9E59CF` | `158, 89, 207` |
| `--chart-rose` | Chart series only | `0 70% 55%` | `#DD3C3C` | `221, 60, 60` |

**The subordination rule (hard).** These hues are subordinate to the one-accent law of [11_Design_Principles.md](../11_Design_Principles.md) §2.4. They appear **only** in: (1) data-visualization series, (2) module icon tints, (3) small identity moments — badges and chart legends. They are **never** used for buttons, navigation, links, large surfaces, or any interactive chrome. A teal "Finance" button is a design-review rejection, not a stylistic choice.

**Series-consistency rule.** The same series always gets the same hue, across Analytics, Finance dashboards, and Monitoring. Revenue is finance-teal everywhere or nowhere. Chart palettes are assigned in [Charts.md](./Charts.md), not per screen.

**Color-blind notes.** Default series order maximizes hue-and-lightness separation: indigo → automation-orange → finance-teal → analytics-purple → crm-cyan → rose. Teal/orange is the deuteranopia-safe backbone pair. Cyan (199) and teal (172) are adjacent — beyond four series, reinforce with direct labels or marker shapes, never hue alone. Rose and orange separate on lightness for protanopes but still get labels. On light surfaces, automation orange measures 2.77:1 — fine for area fills, but line-weight marks (<3px) may darken lightness by up to 8 points to reach 3:1; the legend swatch keeps the canonical hue. All six exceed 3:1 on dark cards (3.34:1–6.52:1).

## 8. Interaction states

State colors are **derived from the ramps, never invented per component**. Every component gets its states from these formulas, so hover feels identical everywhere:

| State | Neutral surfaces | Accent solids | Accent soft / selected |
|---|---|---|---|
| Hover | One ramp step deeper: N1→N3, N3→N4 · D3→D5, D6→D5-adjacent | −6 L: `--accent-solid-hover` | `--accent-soft-hover` |
| Active/pressed | One further step: N4 · D6 | −10 L: `--accent-solid-active` | soft-hover held |
| Selected | `--accent-soft` background + `--accent-text` label; never a neutral | n/a (solids aren't selection) | persists independent of hover |
| Focus | 2px `--focus-ring` outline, 2px offset — additive to any state, never replaces it | same | same |
| Disabled | Text/icons → N8 / D9; fills at 50% opacity; `not-allowed` cursor | 50% opacity, no hover response | 50% opacity |

Rules: hover never changes hue, only lightness. Selection is accent-soft (persistent) and hover is neutral (transient) — they must remain visually distinct so a hovered unselected row never mimics a selected one. Status solids follow the same −6/−10 L hover/active derivation. Disabled states never respond to hover.

## 9. Semantic token reference

The complete alias map, per theme. Shipped values from `packages/ui/styles/globals.css`; rows marked *(ext)* are extensions specified by this document.

| Semantic token | Light value | Dark value |
|---|---|---|
| `--background` | `0 0% 100%` (N1) | `240 6% 7%` (D2) |
| `--card` | `0 0% 100%` (N1) | `240 6% 9%` (D3) |
| `--popover` | `0 0% 100%` (N1) | `240 6% 10%` (D4) |
| `--secondary` / `--muted` / `--accent` | `240 5% 96%` (N3) | `240 5% 15%` (D6) |
| `--foreground` / `--card-foreground` / `--popover-foreground` | `240 10% 3.9%` (N12) | `0 0% 98%` (D12) |
| `--secondary-foreground` / `--accent-foreground` | `240 6% 10%` (N11) | `0 0% 98%` (D12) |
| `--muted-foreground` | `240 4% 42%` (N9) | `240 5% 65%` (D10) |
| `--text-disabled` *(ext)* | `240 5% 65%` (N8) | `240 5% 28%` (D9) |
| `--border` | `240 6% 90%` (N5) | `240 5% 16%` (D7) |
| `--input` | `240 6% 87%` (N6) | `240 5% 19%` (D8) |
| `--border-strong` *(ext)* | `240 5% 78%` (N7) | `240 5% 28%` (D9) |
| `--primary` | `231 48% 54%` | `231 48% 56%` |
| `--primary-foreground` | `0 0% 100%` | `0 0% 100%` |
| `--accent-solid-hover` / `-active` *(ext)* | `231 48% 48%` / `231 48% 44%` | `231 48% 50%` / `231 48% 46%` |
| `--accent-soft` / `--accent-soft-hover` *(ext)* | `231 48% 95%` / `231 48% 92%` | `231 48% 17%` / `231 48% 21%` |
| `--accent-text` *(ext)* | `231 48% 40%` | `231 60% 75%` |
| `--ring` | `231 48% 54%` | `231 60% 68%` |
| `--success` / `--success-foreground` | `142 72% 29%` / `0 0% 98%` | `142 55% 45%` / `144 61% 8%` |
| `--warning` / `--warning-foreground` | `38 92% 50%` / `26 83% 14%` | `38 90% 55%` / `26 83% 10%` |
| `--destructive` / `--destructive-foreground` | `0 72% 45%` / `0 0% 98%` | `0 62% 52%` / `0 0% 98%` |
| `--info` / `--info-foreground` *(ext)* | `217 85% 46%` / `0 0% 100%` | `217 75% 62%` / `240 6% 5%` |
| `--status-*-soft` / `--status-*-text` *(ext)* | per §6 table | per §6 table |
| `--sidebar` | `240 5% 98%` (N2) | `240 6% 5%` (D1) |
| `--sidebar-foreground` | `240 5% 30%` (N10) | `240 5% 78%` (D11) |
| `--sidebar-accent` | `240 5% 93%` (N4) | `240 5% 13%` (D5) |
| `--sidebar-accent-foreground` | `240 6% 10%` (N11) | `0 0% 98%` (D12) |
| `--sidebar-border` | `240 6% 90%` (N5) | `240 5% 14%` (between D5/D6) |
| `--module-*` / `--chart-rose` *(ext)* | per §7 table | per §7 table |

## 10. Accessibility verification

The contrast matrix below is the legal-pair table: which text tokens may sit on which surface tokens. Ratios are computed from the exact HSL values above; ✓ = passes its requirement (4.5:1 text, 3:1 large text/UI boundary).

**Light theme**

| Text token | on N1 (app/card) | on N2 (sidebar) | on N3 (muted) | on N4 (hover) | on soft (own family) |
|---|---|---|---|---|---|
| `--foreground` (N12) | 19.90 ✓ | 19.06 ✓ | 18.10 ✓ | 16.86 ✓ | — |
| `--sidebar-foreground` (N10) | 8.93 ✓ | 8.55 ✓ | 8.12 ✓ | — | — |
| `--muted-foreground` (N9) | 5.61 ✓ | 5.37 ✓ | 5.10 ✓ | 4.75 ✓ | — |
| `--accent-text` | 8.66 ✓ | — | — | — | 7.48 ✓ |
| `--status-success-text` | 6.02 ✓ | — | — | — | 5.60 ✓ |
| `--status-warning-text` | 6.01 ✓ | — | — | — | 5.56 ✓ |
| `--status-danger-text` | 7.46 ✓ | — | — | — | 6.37 ✓ |
| `--status-info-text` | 7.61 ✓ | — | — | — | 6.62 ✓ |
| white on `--primary` / hover / active | 5.42 ✓ / 6.86 ✓ / 7.67 ✓ | | | | |

**Dark theme**

| Text token | on D2 (app) | on D3 (card) | on D4 (popover) | on D6 (muted) | on soft (own family) |
|---|---|---|---|---|---|
| `--foreground` (D12) | 18.07 ✓ | 17.31 ✓ | 16.97 ✓ | 14.82 ✓ | — |
| `--sidebar-foreground` (D11) | 10.86 ✓ | 10.41 ✓ | — | — | — |
| `--muted-foreground` (D10) | 7.36 ✓ | 7.05 ✓ | 6.91 ✓ | 6.03 ✓ | — |
| `--accent-text` | 7.90 ✓ | — | — | — | 6.84 ✓ |
| `--status-success-text` | 10.91 ✓ | — | — | — | 6.90 ✓ |
| `--status-warning-text` | 11.66 ✓ | — | — | — | 7.21 ✓ |
| `--status-danger-text` | 7.29 ✓ | — | — | — | 6.05 ✓ |
| `--status-info-text` | 8.00 ✓ | — | — | — | 6.50 ✓ |
| white on `--primary` / hover / active | 4.94 ✓ / 6.43 ✓ / 7.24 ✓ | | | | |

Known boundaries, documented deliberately: N8/D9 disabled text is below 4.5:1 by design (WCAG exempts inactive controls); warning solid on light app background is 2.13:1 and therefore illegal as text or thin boundary (§6); accent solid on D2 is 3.82:1 — legal as a large fill (≥3:1) whose white label carries the 4.94:1 text contrast, illegal as dark-theme link text (use `--accent-text`).

**Tooling.** The matrix is executable: a CI check recomputes contrast for every pair in this table from the token source and fails the build on regression — token edits cannot silently break AA. Playwright axe assertions cover rendered composites (overlays, charts, images) that token math can't see. Both are merge requirements per [11_Design_Principles.md](../11_Design_Principles.md) §5; process detail lives in [Accessibility.md](./Accessibility.md).

## 11. Usage rules

1. **Do** consume only semantic tokens in components. **Don't** ever write a hex, raw HSL, or Tailwind palette color in feature code — it is a lint failure.
2. **Do** keep ~90% of every screen on the neutral ramp. **Don't** tint cards, headers, or empty states "for warmth".
3. **Do** use accent-solid for exactly one primary action per view. **Don't** ship a screen that is more than ~10% accent-colored.
4. **Do** pair every status color with an icon or label. **Don't** convey any state by color alone.
5. **Do** use status hues only for their §6 meanings. **Don't** use green/amber/red/blue as decoration, categorization, or emphasis.
6. **Do** put status text on soft or app backgrounds via `-text` tokens. **Don't** place warning solid as text or a thin boundary on light surfaces.
7. **Do** confine module hues to chart series, icon tints, and badges. **Don't** use them on buttons, nav, links, or any surface larger than a badge.
8. **Do** keep the same chart series on the same hue everywhere. **Don't** re-assign palette colors per screen or "refresh" chart colors per feature.
9. **Do** derive hover/active by the standard lightness steps (§8). **Don't** invent per-component hover colors or change hue on interaction.
10. **Do** verify both themes before merging — the CI matrix plus a visual pass. **Don't** ship a component that is only correct in the theme you developed in.
11. **Do** mark selection with accent-soft + accent-text. **Don't** use neutral fills for selected states or accent fills for mere hover.
12. **Do** propose new primitives by amending this document with contrast proofs. **Don't** add a color because one screen wanted it.

## 12. Open questions

1. **High-contrast theme.** Do we ship a third, forced-high-contrast mapping (Windows HCM / `prefers-contrast: more`) in Phase 2, or rely on the AA-verified defaults until enterprise demand appears?
2. **Sequential/diverging chart ramps.** §7 fixes the categorical ramp; heatmaps and diverging deltas need dedicated ramps — to be specified in [Charts.md](./Charts.md) from the same primitives.
3. **Per-workspace accent?** Agencies may ask to brand their client portal with their own accent. If we ever allow it, it must be a Layer-2 remap with automated AA re-verification — never a component change. Decision deferred.
4. **`--accent` naming collision.** The shipped shadcn alias `--accent` is a *neutral* hover surface, while this document's "accent" means Aurex Indigo (`--primary`). Rename shipped `--accent` → `--interactive-muted` in a coordinated migration, or live with the shadcn convention? Tracked in [DesignTokens.md](./DesignTokens.md).
