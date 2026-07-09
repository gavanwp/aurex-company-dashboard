# Design Tokens — Master Registry

| | |
|---|---|
| **Document** | Design Tokens — Master Registry, AurexOS |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [../11_Design_Principles.md](../11_Design_Principles.md) · [ColorSystem.md](./ColorSystem.md) · [Typography.md](./Typography.md) · [SpacingSystem.md](./SpacingSystem.md) · [AnimationSystem.md](./AnimationSystem.md) · [Elevation.md](./Elevation.md) |

This is the **master token registry** for AurexOS. It owns the naming system and the complete list of design tokens. Per-domain documents ([ColorSystem.md](./ColorSystem.md), [Typography.md](./Typography.md), [SpacingSystem.md](./SpacingSystem.md), [AnimationSystem.md](./AnimationSystem.md), [Elevation.md](./Elevation.md)) elaborate rationale, ramps, and usage in depth — but a token that is not registered here does not exist. Implementation truth for shipped values lives in `packages/ui/styles/globals.css` and `packages/config/tailwind/preset.ts`; this registry extends that set and never contradicts it.

---

## 1. Token architecture

### 1.1 Two layers

Per [11_Design_Principles.md §2.2](../11_Design_Principles.md):

| Layer | Contents | Who may reference it |
|---|---|---|
| **Layer 1 — primitives** | Raw ramps: 12-step neutral (Graphite, hue 240), 12-step accent (Aurex Indigo, hue 231), status ramps. Documented in [ColorSystem.md](./ColorSystem.md). | Only the token definition layer inside `packages/ui`. Never components, never apps. |
| **Layer 2 — semantic aliases** | Intent-named tokens mapped per theme (`bg-surface`, `text-muted`, `border-subtle`, …). Everything in this registry. | All components and features — exclusively. |

A hex code, raw HSL value, or Tailwind palette color (`gray-200`) in feature code is a **lint failure**. Components express intent; themes resolve intent to values.

### 1.2 Naming grammar

All semantic tokens follow one grammar:

```
{category}-{concept}-{variant}-{state}
```

| Segment | Required | Vocabulary | Examples |
|---|---|---|---|
| `category` | yes | `bg`, `text`, `border`, `accent`, `status`, `module`, `chart`, `radius`, `shadow`, `opacity`, `space`, `font`, `duration`, `ease`, `icon`, `z`, `size` | `bg-…`, `duration-…` |
| `concept` | yes | The thing being styled: `app`, `surface`, `success`, `control`, `sidebar`, … | `bg-surface`, `status-success` |
| `variant` | when needed | `solid`, `soft`, `text`, `sm`, `strong`, `1`, `2`, … | `status-danger-soft`, `shadow-1` |
| `state` | when needed | `hover`, `active`, `disabled`, `focus` | `bg-hover`, `border-focus` |

Rules:

- Names describe **intent, never appearance**. `border-strong`, not `border-gray-dark`. A token named after its value is wrong even if the value never changes.
- Singular nouns, lowercase, hyphen-separated. No abbreviations except the established `bg` and `fg`/`-foreground`.
- `-foreground` suffix (shadcn convention, shipped) means "text/icon color placed **on** the base token" and is the accepted equivalent of an `-on-` variant.

### 1.3 CSS variable convention — HSL component triples

Color tokens are defined as **HSL component triples** (`240 6% 90%` — no `hsl()`, no commas) and consumed as `hsl(var(--token))`. This is shipped convention and is binding because it permits alpha composition at the point of use:

```css
/* definition (packages/ui/styles/globals.css) */
--border: 240 6% 90%;

/* consumption — full and alpha-composed */
border-color: hsl(var(--border));
background: hsl(var(--border) / 0.5);
```

Non-color tokens (radius, duration, z) are plain values (`0.5rem`, `150ms`, `40`).

### 1.4 The Tailwind bridge

`packages/config/tailwind/preset.ts` maps every CSS variable to a Tailwind utility (`colors.border → hsl(var(--border))`, `borderRadius.md → calc(var(--radius) - 2px)`, …). Consequences:

- Components use Tailwind semantic utilities (`bg-card`, `text-muted-foreground`, `rounded-md`) — never arbitrary values (`bg-[#fff]`, `rounded-[7px]`).
- Every token added to this registry ships in the same PR as its `globals.css` definition **and** its preset bridge entry. A variable without a utility is unfinished.

### 1.5 Theme switching

- `darkMode: 'class'` — the `.dark` class on `<html>` re-resolves every semantic token. Components carry **zero** theme-conditional logic; a component that needs `dark:` overrides beyond what tokens provide indicates a missing token.
- Default follows system preference; explicit user override persists per user across devices ([11 §2.3](../11_Design_Principles.md)).
- Dark is its own ramp, not inverted light: dark surfaces get their own lightness ladder and reduced-saturation status hues.

### 1.6 Governance

- **Token changes are design decisions reviewed like API changes.** They are made only in `packages/ui`, only via PR with design review.
- **Shipped values are law.** A shipped value may not change without an amendment to this document and to [11_Design_Principles.md](../11_Design_Principles.md) where applicable. Extending the set is permitted; mutating it is a versioned design decision.
- **New tokens require amending this registry** in the same PR. This document is the census: if the name isn't here, lint treats the variable as raw.
- Per-component or per-feature token overrides are banned, ever ([11 §2.4](../11_Design_Principles.md)).

---

## 2. Color token registry

Values are HSL triples. "Shipped" = live today in `globals.css` under that exact variable name; "Registry" = specified here, to be added (see §14). Full ramps, contrast tables, and derivation rules: [ColorSystem.md](./ColorSystem.md).

### 2.1 Surfaces

| Token | CSS variable | Light | Dark | Usage |
|---|---|---|---|---|
| `bg-app` | `--background` (shipped) | `0 0% 100%` | `240 6% 7%` | The canvas. Content area behind everything. |
| `bg-surface` | `--card` (shipped) | `0 0% 100%` | `240 6% 9%` | Cards, panels, table rows on canvas. |
| `bg-raised` | `--popover` (shipped) | `0 0% 100%` | `240 6% 10%` | Floating layers: menus, popovers, dropdowns, tooltips. |
| `bg-overlay` | `--overlay` (registry) | `0 0% 100%` | `240 6% 10%` | Dialogs, command palette, drawers. Shares raised lightness; distinguished by scrim + shadow-2 ([Elevation.md](./Elevation.md)). |
| `bg-muted` | `--muted` (shipped) | `240 5% 96%` | `240 5% 15%` | Muted fills: secondary buttons, code blocks, skeletons, inactive tabs. |
| `bg-hover` | `--hover` (registry) | `240 5% 93%` | `240 5% 13%` | Hover/active wash on rows, list items, menu items. |
| `bg-sidebar` | `--sidebar` (shipped) | `240 5% 98%` | `240 6% 5%` | App shell sidebar. Below the canvas in dark, Linear-style. |
| `bg-sidebar-hover` | `--sidebar-accent` (shipped) | `240 5% 93%` | `240 5% 13%` | Hover/active nav item fill inside the sidebar. |

`--secondary` and `--accent` (shipped, shadcn structural) alias the `bg-muted` values; they remain for shadcn component compatibility and must track `--muted`.

### 2.2 Text

| Token | CSS variable | Light | Dark | Usage |
|---|---|---|---|---|
| `text-primary` | `--foreground` (shipped) | `240 10% 3.9%` | `0 0% 98%` | Default text, headings, values. |
| `text-secondary` | `--text-secondary` (registry) | `240 5% 30%` | `240 5% 78%` | Supporting copy, sidebar labels (matches shipped `--sidebar-foreground`). |
| `text-muted` | `--muted-foreground` (shipped) | `240 4% 42%` | `240 5% 65%` | Metadata, placeholders, timestamps, helper text, **AI ghost suggestions** (color, never opacity — [11 §9](../11_Design_Principles.md)). |
| `text-disabled` | — (computed) | `text-muted` × `opacity-disabled` | same | Disabled labels. No dedicated variable; apply `opacity-disabled` (§6). |
| `text-on-solid` | `--primary-foreground` (shipped) | `0 0% 100%` | `0 0% 100%` | Text/icons on accent-solid and status-solid fills. |

### 2.3 Borders & focus

| Token | CSS variable | Light | Dark | Usage |
|---|---|---|---|---|
| `border-subtle` | `--border` (shipped) | `240 6% 90%` | `240 5% 16%` | Default hairline: cards, dividers, table rules. |
| `border-strong` | `--border-strong` (registry) | `240 5% 78%` | `240 5% 28%` | Emphasis: hovered cards, active drop targets, segmented control active edge. |
| `border-input` | `--input` (shipped) | `240 6% 87%` | `240 5% 19%` | Form control borders (slightly stronger than subtle so fields read as interactive). |
| `border-focus` | `--ring` (shipped) | `231 48% 54%` | `231 60% 68%` | Focus ring. 2px outline, 2px offset, always visible ([11 §6.2](../11_Design_Principles.md)). |

### 2.4 Accent — Aurex Indigo

One accent, used sparingly (>~10% of a screen accent-colored means the screen is wrong — [11 §2.4](../11_Design_Principles.md)).

| Token | CSS variable | Light | Dark | Usage |
|---|---|---|---|---|
| `accent-solid` | `--primary` (shipped) | `231 48% 54%` | `231 48% 56%` | Primary buttons, active nav indicator, selection accents, Aurex identity moments. |
| `accent-soft` | `--accent-soft` (registry) | `231 48% 95%` | `231 40% 16%` | Selected rows, active filter chips, accent-tinted backgrounds. |
| `accent-text` | `--accent-text` (registry) | `231 48% 44%` | `231 70% 74%` | Accent-colored text/links on app or surface backgrounds (AA-checked). |
| `accent-foreground` | `--primary-foreground` (shipped) | `0 0% 100%` | `0 0% 100%` | Content on `accent-solid`. |

### 2.5 Status — solid / soft / text × four hues

Status colors mean status, never decoration, and never carry meaning by color alone ([11 §5](../11_Design_Principles.md)). `info` is a **new addition** to the shipped set. Exact soft/text derivations are owned by [ColorSystem.md](./ColorSystem.md); the registered values:

| Token | CSS variable | Light | Dark | Usage |
|---|---|---|---|---|
| `status-success-solid` | `--success` (shipped) | `142 72% 29%` | `142 55% 45%` | Paid, completed, healthy — solid fills. |
| `status-success-soft` | `--success-soft` (registry) | `142 55% 94%` | `142 45% 13%` | Success badge/backdrop tint. |
| `status-success-text` | `--success-text` (registry) | `142 72% 26%` | `142 55% 55%` | Success text on app/surface/soft. |
| `status-warning-solid` | `--warning` (shipped) | `38 92% 50%` | `38 90% 55%` | At risk, expiring — solid fills. |
| `status-warning-soft` | `--warning-soft` (registry) | `38 90% 94%` | `38 60% 13%` | Warning badge/backdrop tint. |
| `status-warning-text` | `--warning-text` (registry) | `30 92% 30%` | `38 90% 62%` | Warning text (darkened in light theme for AA). |
| `status-danger-solid` | `--destructive` (shipped) | `0 72% 45%` | `0 62% 52%` | Errors, overdue, destructive actions. |
| `status-danger-soft` | `--destructive-soft` (registry) | `0 75% 95%` | `0 45% 14%` | Danger badge/backdrop tint. |
| `status-danger-text` | `--destructive-text` (registry) | `0 72% 40%` | `0 70% 70%` | Danger text on app/surface/soft. |
| `status-info-solid` | `--info` (registry) | `217 85% 46%` | `217 75% 62%` | Neutral notices, in-progress. |
| `status-info-soft` | `--info-soft` (registry) | `217 85% 95%` | `217 50% 15%` | Info badge/backdrop tint. |
| `status-info-text` | `--info-text` (registry) | `217 85% 38%` | `217 75% 72%` | Info text on app/surface/soft. |

Shipped `-foreground` companions (`--success-foreground` `0 0% 98%` / dark `144 61% 8%`; `--warning-foreground` `26 83% 14%` / `26 83% 10%`; `--destructive-foreground` `0 0% 98%` both) remain the on-solid content colors; `--info-foreground` is registered as `0 0% 100%` light / `217 60% 10%` dark.

### 2.6 Module identity hues

Charts and module identity moments **only** (module icons, chart series, empty-state accents). Never buttons, never text, never surfaces. Theme-invariant identity triples; per-theme soft tints are derived in [ColorSystem.md](./ColorSystem.md).

| Token | CSS variable | Value (both themes) | Module |
|---|---|---|---|
| `module-ai` | — (aliases `--primary`) | accent | Aurex / AI |
| `module-automation` | `--module-automation` (registry) | `28 92% 50%` | Automation |
| `module-finance` | `--module-finance` (registry) | `172 66% 36%` | Finance |
| `module-crm` | `--module-crm` (registry) | `199 84% 44%` | CRM |
| `module-analytics` | `--module-analytics` (registry) | `275 55% 58%` | Analytics |

### 2.7 Chart ramp

Categorical, color-blind safe, consistent across Analytics, Finance, and Monitoring — the same series always gets the same hue ([11 §5](../11_Design_Principles.md)). Ordered assignment; full spec (sequential/diverging ramps, dark adjustments) in [ColorSystem.md](./ColorSystem.md).

| Token | CSS variable | Value | Source |
|---|---|---|---|
| `chart-1` | `--chart-1` (registry) | `231 48% 54%` | Aurex Indigo |
| `chart-2` | `--chart-2` (registry) | `199 84% 44%` | CRM cyan |
| `chart-3` | `--chart-3` (registry) | `275 55% 58%` | Analytics purple |
| `chart-4` | `--chart-4` (registry) | `172 66% 36%` | Finance teal |
| `chart-5` | `--chart-5` (registry) | `28 92% 50%` | Automation orange |

### 2.8 Focus

| Token | CSS variable | Light | Dark | Spec |
|---|---|---|---|---|
| `focus-ring` | `--ring` (shipped) | `231 48% 54%` | `231 60% 68%` | 2px outline, 2px offset, on every `:focus-visible`. Never removed, never diluted. |

---

## 3. Radius tokens

Base `--radius: 0.5rem` (8px) is shipped. One system; per-component invention is banned ([11 §4.4](../11_Design_Principles.md)).

| Token | Value | Derivation | Usage |
|---|---|---|---|
| `radius-sm` | 4px | `calc(var(--radius) - 4px)` (shipped as Tailwind `rounded-sm`) | Badges, checkboxes, tags, keycaps |
| `radius-control` | 6px | `calc(var(--radius) - 2px)` (shipped as `rounded-md`) | Buttons, inputs, selects, menu items |
| `radius-card` | 8px | `var(--radius)` (shipped as `rounded-lg`) | Cards, panels-in-content, table containers |
| `radius-overlay` | 12px | `calc(var(--radius) + 4px)` (registry; bridge as `rounded-xl`) | Dialogs, command palette, right panel, drawers |
| `radius-pill` | 9999px | literal (registry; Tailwind `rounded-full`) | Pills, avatars, scrollbar thumbs |

---

## 4. Shadow / elevation tokens

Exactly **two** shadow levels exist; there is no third ([11 §4.4](../11_Design_Principles.md)). Depth is otherwise carried by borders and surface lightness steps. Full policy, the surface ladder, and the component elevation map: [Elevation.md](./Elevation.md).

| Token | Light | Dark | Usage |
|---|---|---|---|
| `shadow-1` | `0 4px 12px rgb(0 0 0 / 0.08)` | `0 4px 12px rgb(0 0 0 / 0.4)` | Floating menus, popovers, dropdowns, tooltips |
| `shadow-2` | `0 12px 32px rgb(0 0 0 / 0.12)` | `0 16px 48px rgb(0 0 0 / 0.5)` | Dialogs, command palette, drawers |

Surface lightness steps (dark theme ladder `sidebar 5% < app 7% < surface 9% < raised/overlay 10%`) are elevation tokens in effect — see §2.1 and [Elevation.md §2](./Elevation.md).

Cards get **no shadow** — border only. Hover may upgrade `border-subtle → border-strong`; it never adds a shadow.

---

## 5. Border tokens

| Token | Width | Color | Usage |
|---|---|---|---|
| `border-subtle` | 1px | §2.3 | Default everywhere: cards, dividers, table rules, sidebar edge |
| `border-strong` | 1px | §2.3 | Emphasis and hover states; drop targets |
| `border-input` | 1px | §2.3 | Form controls at rest |
| `border-focus` | 2px | `focus-ring` | Focus only — the single sanctioned 2px border |

**1px everywhere; 2px exists only for the focus ring.** No 1.5px, no decorative thick borders, no double borders.

---

## 6. Opacity tokens

| Token | Value | Usage |
|---|---|---|
| `opacity-disabled` | 0.5 | Disabled controls (+ `cursor: not-allowed`) |
| `opacity-scrim-light` | 0.6 | Overlay scrim behind dialogs/palette, light theme |
| `opacity-scrim-dark` | 0.7 | Overlay scrim, dark theme |
| `opacity-hover-wash` | 0.05 | Alpha-composed hover wash where a solid `bg-hover` is unavailable (e.g. over imagery) |

**AI ghost suggestions use `text-muted` color, never opacity** — opacity stacks unpredictably over varied backgrounds; a token color does not.

---

## 7. Spacing tokens

The 4px grid, 8-point rhythm ([11 §4.1](../11_Design_Principles.md)). Full layout rules: [SpacingSystem.md](./SpacingSystem.md).

| Token | Value | Tailwind | Typical use |
|---|---|---|---|
| `space-1` | 4px | `1` | Icon-to-label gap, badge padding-y |
| `space-2` | 8px | `2` | Control internal padding, tight stacks |
| `space-3` | 12px | `3` | Control padding-x, list item padding |
| `space-4` | 16px | `4` | Card padding, form field gaps |
| `space-6` | 24px | `6` | Section separation, card grids |
| `space-8` | 32px | `8` | Page section blocks |
| `space-12` | 48px | `12` | Major page regions |
| `space-16` | 64px | `16` | Hero/empty-state breathing room |

No 5px, no 10px, no "looked right at 14". Off-grid values are lint failures.

---

## 8. Typography tokens

Geist Sans / Geist Mono via `--font-sans` / `--font-mono` (shipped in the preset). Full rationale and pairing rules: [Typography.md](./Typography.md).

### 8.1 Families & weights

| Token | Value | Usage |
|---|---|---|
| `font-sans` | Geist Sans, Inter, system-ui | All UI text |
| `font-mono` | Geist Mono, monospace | Code, IDs, amounts, tabular data |
| `font-weight-regular` | 400 | Body, small, caption |
| `font-weight-medium` | 500 | Emphasis, table headers, buttons |
| `font-weight-semibold` | 600 | All titles and display |
| `font-weight-bold` | 700 | **Numerals in stat tiles only** |

### 8.2 The eight composite text styles

The only text styles that exist. A ninth requires amending [11_Design_Principles.md §3](../11_Design_Principles.md) and this registry.

| Token | Size / Line-height | Weight | Tracking | Usage |
|---|---|---|---|---|
| `text-display` | 30px / 36px | 600 | −0.01em | Page-level hero (rare) |
| `text-title-1` | 24px / 32px | 600 | −0.01em | Page titles |
| `text-title-2` | 18px / 26px | 600 | −0.01em | Section headers, dialog titles |
| `text-title-3` | 15px / 22px | 600 | 0 | Card headers, group labels |
| `text-body` | 14px / 22px | 400 | 0 | Default UI text |
| `text-body-strong` | 14px / 22px | 500 | 0 | Emphasis, table headers, buttons |
| `text-small` | 13px / 18px | 400 | 0 | Dense tables, list metadata |
| `text-caption` | 12px / 16px | 400 | 0 | Timestamps, helper text, badges |

### 8.3 Numeric variants

| Token | Value | Usage |
|---|---|---|
| `font-numeric-tabular` | `font-variant-numeric: tabular-nums` | Mandatory on all tables, finance surfaces, timers, stat tiles |

---

## 9. Motion tokens

Framer Motion only, via shared variants in `packages/ui/motion` ([11 §7](../11_Design_Principles.md)). Full choreography: [AnimationSystem.md](./AnimationSystem.md).

| Token | Value | Usage |
|---|---|---|
| `duration-fast` | 150ms | Micro-interactions: hover, toggles, checkmarks |
| `duration-base` | 200ms | Surface transitions: panels, popovers, menus |
| `duration-slow` | 250ms | Large surfaces: dialogs, palette. **Absolute maximum** without design sign-off |
| `ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` (ease-out) | Anything entering |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` (ease-in) | Anything exiting |
| `spring-drag` | one shared Framer spring config (stiffness/damping tuned once in `packages/ui/motion`) | **Drag-and-drop only** (boards). No other springs exist |

**Reduced motion:** `prefers-reduced-motion: reduce` collapses transform/opacity animation to near-zero durations globally (shipped in `globals.css`) and is additionally wired at the motion-wrapper level so features cannot forget it. Animations degrade to instant state changes or fast fades — never to broken layouts.

---

## 10. Icon tokens

| Token | Value | Usage |
|---|---|---|
| `icon-size-dense` | 16px | Dense UI: tables, inputs, buttons, badges |
| `icon-size-nav` | 20px | Navigation, empty states, page-level actions |
| `icon-stroke` | 2 | The only stroke weight |
| Icon set | **Lucide only** | One set. No emoji as iconography (sole exception: ✦ Aurex attribution mark) |

---

## 11. Z-index scale

Plain integers. Only these values exist; arbitrary `z-[…]` is a lint failure. One overlay layer maximum — modals-on-modals are banned ([11 §12.1](../11_Design_Principles.md)); rules in [Elevation.md §6](./Elevation.md).

| Token | Value | Layer |
|---|---|---|
| `z-base` | 0 | Document flow |
| `z-sticky` | 10 | Sticky table headers, toolbars |
| `z-sidebar` | 20 | App shell sidebar |
| `z-panel` | 30 | Right context panel |
| `z-dropdown` | 40 | Menus, popovers, selects, comboboxes |
| `z-overlay-scrim` | 50 | Dialog/palette backdrop scrim |
| `z-dialog` | 60 | Dialogs, drawers |
| `z-palette` | 70 | Command palette |
| `z-toast` | 80 | Toast stack |
| `z-tooltip` | 90 | Tooltips (always on top) |

---

## 12. Size tokens

All on the 4px grid. Minimum pointer target is **32×32px**, even in compact density ([11 §4.4](../11_Design_Principles.md)).

| Token | Value | Usage |
|---|---|---|
| `size-control-sm` | 28px | Compact-density inputs/buttons (table inline controls; hit area padded to ≥32px) |
| `size-control-md` | 32px | Default inputs, buttons, selects |
| `size-control-lg` | 36px | Prominent forms, dialog primary actions, palette input |
| `size-sidebar` | 240px | Sidebar, expanded |
| `size-sidebar-rail` | 64px | Sidebar, collapsed icon rail |
| `size-panel` | 360px | Right context panel |
| `size-content-column` | 880px | Centered reading column (docs, settings) |
| `size-target-min` | 32px | Minimum interactive hit area — floor, not suggestion |

---

## 13. Token → platform mapping

The registry is platform-agnostic; **names are identical everywhere**. Today's implementation is CSS variables; the same names feed design tools and future native surfaces.

| Platform | Mechanism | Notes |
|---|---|---|
| **Web (today)** | CSS custom properties in `globals.css`, bridged to utilities by `preset.ts` | `darkMode: 'class'`; HSL triples per §1.3 |
| **Figma variables** | One collection per category; two modes (Light/Dark) mirroring `:root` / `.dark` | Variable names match token names 1:1 (`bg/surface`, `status/danger/soft`). Sync is one-way: code is source of truth; Figma is a projection |
| **React Native (future)** | Generated TypeScript theme object from the same registry (`theme.bg.surface`, `theme.duration.fast`) | HSL triples convert at build time; shadows map to platform elevation per [Elevation.md](./Elevation.md); no re-derivation, no forked values |

A single machine-readable source (JSON in `packages/ui`) generating all three targets is the intended end state — see §16.

---

## 14. Migration notes — shipped vs specified

Delta between `packages/ui/styles/globals.css` today and this full registry. **Nothing shipped changes value.** Engineering work is purely additive:

| Area | Shipped today | Specified to add |
|---|---|---|
| Status | `--destructive`, `--success`, `--warning` + foregrounds | **`--info` family** (solid/soft/text/foreground); **soft + text variants** for all four statuses (§2.5) |
| Surfaces | `--background`, `--card`, `--popover`, `--muted`, `--secondary`, sidebar family | `--hover` (generic hover wash, §2.1); `--overlay` alias for dialogs |
| Text | `--foreground`, `--muted-foreground` | `--text-secondary` (§2.2; value already shipped as `--sidebar-foreground`) |
| Borders | `--border`, `--input`, `--ring` | `--border-strong` (§2.3) |
| Accent | `--primary` + foreground | `--accent-soft`, `--accent-text` (§2.4) |
| Module / chart | — | `--module-*` hues (§2.6); `--chart-1…5` (§2.7) |
| Radius | `--radius` + lg/md/sm bridge | `radius-overlay` (12px) + `rounded-xl` bridge; `radius-pill` naming |
| Shadows | — (Tailwind defaults unused) | `shadow-1`, `shadow-2` as tokens; disable/ignore Tailwind's default shadow scale |
| Opacity | — | `opacity-disabled`, scrims, hover-wash (§6) |
| Motion | Accordion keyframes at 0.2s ease-out; global reduced-motion CSS | `--duration-*`, `--ease-*` variables + `packages/ui/motion` shared variants and the one `spring-drag` config (§9) |
| Z-index | — (ad-hoc) | The full §11 scale as preset `zIndex` entries |
| Sizes | — | §12 control heights and shell dimensions as named tokens |

Until a registry token ships, features must not hand-roll its value — they wait for the token or the PR adds it properly.

---

## 15. Do / Don't

| Do | Don't |
|---|---|
| Reference semantic tokens (`bg-surface`, `text-muted`) for every visual property | Never write hex, raw HSL, or Tailwind palette colors in feature code — lint failure |
| Add new tokens via `packages/ui` + amendment to this registry, in one PR | Never define component-local CSS variables that shadow registry names |
| Use `hsl(var(--token) / alpha)` for translucency | Never bake alpha into a color token's stored triple |
| Let `.dark` re-resolve tokens; ship both themes with every component | Never write `dark:` conditionals to patch a missing token — add the token |
| Use the two shadows for genuinely floating layers only | Never invent a third shadow, ever |
| Keep every dimension on the 4px grid and every z-index on the §11 scale | Never use arbitrary values (`z-[55]`, `rounded-[10px]`, `p-[18px]`) |
| Use `text-muted` color for ghost text and `opacity-disabled` for disabled | Never fake muted text with opacity on `text-primary` |
| Use module hues in charts and identity moments only | Never use module hues for buttons, links, status, or surfaces |

---

## 16. Open questions

1. **Machine-readable source of truth.** Should the registry move to a tokens JSON (W3C Design Tokens format) in `packages/ui` that generates `globals.css`, the preset, and Figma variables? Recommended before the React Native effort begins.
2. **Chart ramp size.** Five categorical hues cover current dashboards; Analytics may need 8. Extension order and hues to be settled in [ColorSystem.md](./ColorSystem.md) before Analytics Phase 2.
3. **Module hue dark-theme tuning.** Module hues are theme-invariant today; if AA contrast fails for chart text/legends in dark, ColorSystem.md may register per-theme variants (new tokens, not value changes).
4. **Compact density tokens.** Whether compact density warrants a parallel `size-control-*-compact` set or is handled purely by `size-control-sm` — decide with the DataTable density toggle work.
5. **shadcn structural aliases.** `--secondary`/`--accent` duplicate `--muted` values; consolidating them is a breaking rename for shadcn components — deferred until a shadcn upgrade forces it.
