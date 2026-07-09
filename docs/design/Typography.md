# Typography — AurexOS Design System

| | |
|---|---|
| **Document** | Typography — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [SpacingSystem.md](./SpacingSystem.md) · [GridSystem.md](./GridSystem.md) · [DesignTokens.md](./DesignTokens.md) · [Elevation.md](./Elevation.md) · [../11_Design_Principles.md](../11_Design_Principles.md) |

This document is the binding specification for all type in AurexOS. It elaborates [11_Design_Principles.md §3](../11_Design_Principles.md) and never contradicts it. Where this file and the Design Principles disagree, the Design Principles win and this file gets fixed.

---

## 1. Typeface decision

### 1.1 The choice

| Role | Typeface | Fallback stack | Why |
|---|---|---|---|
| UI text | **Geist Sans** | Inter, system-ui, sans-serif | Neutral, modern, engineered for interfaces |
| Code, IDs, amounts, tabular data | **Geist Mono** | ui-monospace, monospace | Matched x-height with Geist Sans; true tabular figures |

Geist earns the job on four grounds:

1. **Modern SaaS neutrality.** Geist reads as a tool, not a brand statement. AurexOS is a workspace people stare at for eight hours; the typeface must disappear into the work. Geist's tight but open forms hold up at 13–14px where our UI actually lives.
2. **Variable font.** One file per family covers the entire 400–600 weight range (plus the 700 numeral exception, §5.4). No weight-per-file requests, no FOUT ladder, smaller payload.
3. **Tabular figures done right.** `tabular-nums` in Geist produces genuinely equal-width digits with sane punctuation spacing — finance surfaces, timers, and stat tiles align without hacks.
4. **Pedigree.** Geist is Vercel's production interface family, battle-tested at exactly the density and quality bar we benchmark against (Vercel, Linear, Stripe-class dashboards).

### 1.2 Alternatives considered

| Candidate | Verdict | Reason |
|---|---|---|
| **Inter** | Fallback, not primary | Excellent and the closest match — it is our first fallback. Slightly warmer and wider; at 14px dense tables it costs measurable horizontal space versus Geist. If Geist ever became unavailable, Inter is the drop-in. |
| **SF Pro** | Rejected | Platform-locked (Apple licensing prohibits web embedding). Cross-platform product; non-starter. |
| **Söhne / Untitled Sans** | Rejected | Beautiful, but commercial licensing scales per-pageview/per-domain — wrong cost model for a multi-tenant SaaS, and neither ships a maintained variable web build. |
| **System stack only** | Rejected | Free and fast, but the product renders differently on every OS; screenshots, docs, and the portal lose visual identity. Unacceptable at our craft bar. |

### 1.3 Self-hosting rules (binding)

- Fonts are **self-hosted** from `packages/ui/fonts` — never loaded from a third-party CDN (privacy, latency, tenant-data isolation).
- Variable WOFF2 only. Exactly two files ship: `GeistVF.woff2`, `GeistMonoVF.woff2`.
- `font-display: swap` on both faces. The fallback stack is metric-compatible enough that swap flash is minor; a blank-text wait is worse.
- Exposed as CSS variables consumed by the Tailwind preset (`packages/config/tailwind/preset.ts`): `--font-sans` → Geist Sans stack, `--font-mono` → Geist Mono stack. Feature code uses `font-sans` / `font-mono` utilities — never a raw `font-family`.
- Preload both font files in the app shell `<head>`. No other font files may be added without amending this document.

---

## 2. The eight-token scale

These eight tokens are the entire type system. They are defined once in `packages/ui` and consumed as utilities (`text-title-1`, `text-body`, …). A raw `font-size` in feature code is a lint failure.

| Token | Size / Line-height | Weight | Tracking | Usage | HTML mapping |
|---|---|---|---|---|---|
| `display` | 30px / 36px | 600 | −0.01em | Rare page-level hero: onboarding, settings landing, empty-workspace welcome | `h1` (hero contexts only) |
| `title-1` | 24px / 32px | 600 | −0.01em | Page titles — one per page, ever | `h1` |
| `title-2` | 18px / 26px | 600 | −0.01em | Section headers, dialog titles, panel titles | `h2` |
| `title-3` | 15px / 22px | 600 | 0 | Card headers, group labels, sidebar section titles | `h3` |
| `body` | 14px / 22px | 400 | 0 | Default UI text — everything not otherwise specified | `p`, `div`, `td` |
| `body-strong` | 14px / 22px | 500 | 0 | Emphasis, table headers, buttons, active nav items | `strong`, `th`, `button`, `h4`–`h6` |
| `small` | 13px / 18px | 400 | 0 | Dense tables (compact density), list metadata, secondary cells | `small`, compact `td` |
| `caption` | 12px / 16px | 400 | 0 | Timestamps, helper text, badges, input hints | `figcaption`, hint text |

### 2.1 The no-ninth-size law

**Only these eight sizes exist.** There is no 11px, no 16px, no 20px, no 28px anywhere in the application. A ninth size requires amending [11_Design_Principles.md §3](../11_Design_Principles.md) through the rule-change process — it is not a PR-level decision. If a design "needs" a size between two tokens, the design is wrong: pick the nearer token and adjust weight or color instead.

### 2.2 Weight law

- Permitted weights: **400, 500, 600.** Nothing else, with one exception:
- **700 is reserved exclusively for numerals in stat tiles** (§5.4). A 700 letterform anywhere else is a defect.
- Emphasis inside running text is weight 500 (`body-strong`), never bold-700, never italic (§4.4).

---

## 3. Heading system — H1–H6 mapping

Semantic heading levels exist for document outline and accessibility. They **map onto the eight tokens** — heading levels never introduce new sizes.

| Level | Token | Additional treatment | Typical context |
|---|---|---|---|
| H1 | `title-1` | `--text-primary` | Page title. Exactly one per page. |
| H2 | `title-2` | `--text-primary`; 32px space above, 12px below (see [SpacingSystem.md](./SpacingSystem.md)) | Major page sections, dialog titles |
| H3 | `title-3` | `--text-primary`; 24px above, 8px below | Card headers, subsections |
| H4 | `body-strong` | `--text-primary`; 24px above, 4px below | Minor subsections in long documents |
| H5 | `body-strong` | `--text-secondary`; 16px above, 4px below | Rare — deep document nesting only |
| H6 | `body-strong` | `--text-muted`, caption-style contexts | Rarer still; prefer restructuring the document |

Rules:

- H4–H6 are differentiated by **color and spacing only** — all three are `body-strong` at 14/22/500. If a document genuinely needs visual hierarchy past H4, it is too deep; restructure it.
- `display` is **not** an H-level. It is a rare hero token used where a page has a welcome/landing character, and it still renders as an `h1` semantically in those contexts.
- Never skip heading levels for looks (an H3 styled where an H2 belongs). The outline is an accessibility contract.

---

## 4. Body & UI text rules

### 4.1 The 14px law

Default UI text is **14px** (`body`). AurexOS is a dense professional tool, not a marketing site — 16px body belongs on the commercial website, never inside the app. The Client Portal uses the same 14px system: one design system, two audiences.

### 4.2 Text colors

Text color is semantic, never raw (see [DesignTokens.md](./DesignTokens.md)):

| Token | Use |
|---|---|
| `--text-primary` | Headings, primary content, input values |
| `--text-secondary` | Supporting copy, descriptions |
| `--text-muted` | Metadata, placeholders, timestamps |
| `--text-disabled` | Disabled control labels only |

Never simulate hierarchy by shrinking text when a muted color does the job — color first, size only when the token scale says so.

### 4.3 Truncation and ellipsis

- Single-line UI strings (table cells, list titles, breadcrumbs, sidebar items) truncate with a CSS ellipsis; the full value is always recoverable via `title`/tooltip on hover and on keyboard focus.
- Multi-line clamping is allowed only at **2 or 3 lines** (card descriptions, notification previews) — never mid-word, never more than 3 lines.
- Never truncate: money amounts, dates, status labels, or error messages. Wrap or widen instead.
- IDs and references truncate from the **middle** (`INV-2026…0148`) so the discriminating tail stays visible.

### 4.4 Emphasis rules

- Emphasis is **weight 500, not italics.** Geist's italic exists but is banned in UI text — italics read as decoration at 14px and hurt scanability. The only italic anywhere is inside user-authored rich text in Documents.
- Never emphasize with ALL CAPS, underline (reserved for links), or letter-spacing tricks.
- At most one emphasis treatment per sentence. If everything is strong, nothing is.

### 4.5 Links

- In-content links: `--accent-text`, no underline at rest, underline on hover and on `focus-visible`.
- Entity links inside tables and lists (task names, client names): `--text-primary` at rest — the row is the affordance — with accent + underline on hover.
- Links are real anchors with canonical URLs (Design Principles §8.7). Cmd-click always works.
- Never style a link as a button or a button as a link; the visual grammar tells users what will happen.

---

## 5. Numbers & data typography

### 5.1 The tabular-nums law

`font-variant-numeric: tabular-nums` is **mandatory** on: all tables, all finance surfaces, timers, counters, stat tiles, and any vertical stack of figures. Columns of numbers must align digit-for-digit. This is applied at the component level in `packages/ui` (DataTable, StatTile, Timer) so features cannot forget it.

### 5.2 Geist Mono contexts

Geist Mono is used for values that are *identifiers or machine-shaped*, where character-level scanning matters:

| Context | Face | Notes |
|---|---|---|
| Code, snippets, API keys | Geist Mono | Always (§7) |
| Entity IDs (`INV-0148`, `TSK-2291`) | Geist Mono | `small` or `caption` size, `--text-muted` |
| Money amounts in dense finance tables | Geist Mono (optional) | Team choice per surface — pick once per module, never mix within one table |
| Timestamps in logs / audit trails | Geist Mono | Fixed-width scanning |
| Body-copy numbers, dates in prose | Geist Sans + tabular-nums | Mono in prose is noise |

### 5.3 Money formatting

- Always with currency: symbol for the workspace's primary currency (`$1,240.00`), ISO code when currencies mix in one view (`1,240.00 USD`).
- Tabular figures always; two decimal places always in finance surfaces (no `$1.2k` in Finance — abbreviations like `$1.2k` are allowed only in dashboard stat tiles and chart axes).
- Negative amounts: minus sign + `--status-danger-text` in finance tables; never parentheses-only (color-blind rule — the sign carries the meaning, color reinforces).
- Locale-aware separators via the shared formatter; hand-formatted money strings are a defect.

### 5.4 Stat-tile numerals — the 700 exception

Stat tiles (dashboard KPIs) render their numeral at **weight 700**, tabular-nums, using `title-1` or `display` size depending on tile size. This is the single sanctioned use of 700 in the product. The tile's label and delta remain `caption`/`small` at standard weights.

### 5.5 Alignment rules

- **Numeric columns are right-aligned** in tables — amounts, quantities, durations, percentages. Headers of numeric columns right-align with their data.
- Text columns left-align. Never center-align table content (status badge columns may center as a whole-cell exception).
- Mixed cells (e.g. "3 of 12") count as numeric and right-align.
- Right-aligned numerics + tabular-nums is what makes a column scannable; both halves of the rule are mandatory together.

---

## 6. Labels, buttons, captions

### 6.1 Sentence case everywhere — the law

All UI text is **sentence case**: titles, buttons, labels, tabs, table headers, menu items, empty states. No Title Case, no ALL CAPS. The single exception: tiny badge labels (≤ 4 characters, e.g. `PRO`, `API`) may be uppercase at `caption` size with +0.02em tracking.

### 6.2 Buttons

- Button label: `body-strong` (14/22, 500). All button sizes share the label size — sizes differ by padding, not font size (see [SpacingSystem.md §3](./SpacingSystem.md)).
- Labels are verbs, ≤ 3 words: "Create invoice", "Send proposal" — never "Submit", never "OK" as a primary action.
- No multiline button labels. If the label wraps, shorten the label.

### 6.3 Form labels

| Element | Token | Color | Notes |
|---|---|---|---|
| Field label | `body-strong` (14/22, 500) | `--text-primary` | Above the input, 8px gap (SpacingSystem) |
| Required marker | inherits | `--status-danger-text` | ` *` after label; also conveyed in the accessible name |
| Helper text | `caption` (12/16) | `--text-muted` | Below input, one sentence max |
| Inline error | `caption` (12/16) | `--status-danger-text` | Replaces helper text; specific and recoverable |
| Placeholder | `body` | `--text-muted` | Example format only — never the label, never instructions |

### 6.4 Badges & captions

- Badge text: `caption` (12/16), weight 500, 4px radius (see [Elevation.md](./Elevation.md) / [DesignTokens.md](./DesignTokens.md)).
- Timestamps: `caption`, `--text-muted`, relative for recent ("2h ago") with absolute on hover — per Design Principles §11.
- Caption text never carries primary information alone; it annotates something at `body` size or larger.

---

## 7. Code typography

| Element | Spec |
|---|---|
| Inline code | Geist Mono, 13px (0.929em of body), `--bg-surface` chip background, 4px radius, 2px 6px padding, `--border-subtle` |
| Code block | Geist Mono, 13/20, 16px padding, 8px radius, `--bg-surface`, horizontal scroll — never wrap, never shrink to fit |
| Keyboard shortcut | The `Kbd` component from `packages/ui`: Geist Mono, `caption` size, key-cap chip with 4px radius and `--border-subtle`. Never hand-rolled `<kbd>` styling |
| Diffs / logs | Geist Mono 13/20, tabular by nature; additions/deletions use status soft backgrounds, never color alone |

Rules:

- Code never renders in Geist Sans, and prose never renders in Geist Mono.
- Shortcut notation follows platform: `⌘K` on macOS, `Ctrl+K` elsewhere — detected, not hardcoded. Every shortcut shown in menus and the `?` overlay uses `Kbd`.
- Syntax highlighting colors come from the token layer's code ramp, consistent across both themes.

---

## 8. Responsive typography

**The scale is fixed.** AurexOS does not use fluid `clamp()` typography — viewport-proportional text is for marketing pages; a dense tool needs predictable metrics at every width so tables, rows, and touch targets stay on the spacing grid.

Exactly two tokens may step down below the `md` breakpoint (< 768px — see [GridSystem.md §2](./GridSystem.md)):

| Token | ≥ md | < md |
|---|---|---|
| `display` | 30/36 | 26/32 |
| `title-1` | 24/32 | 22/28 |
| all others | unchanged | unchanged |

Rules:

- No other token responds to viewport. `body` is 14px on a phone and 14px on a 32-inch monitor.
- Reading surfaces (Documents, Knowledge Base) keep the **~68ch line-length cap** at every width; on wide screens the column caps, it never stretches (GridSystem §6).
- Text must scale cleanly to 200% browser zoom (Design Principles §10) — which is another reason sizes are fixed: zoom is the user's fluidity mechanism, not ours.
- Honesty clause: CSS is authored mobile-first, but the design priority is the dense desktop experience. Mobile gets a correct, legible layout — not a reimagined one.

---

## 9. Line-height & rhythm

The type scale is built to land on the 4px spacing grid ([SpacingSystem.md §1](./SpacingSystem.md)):

| Token | Line-height | Grid multiple |
|---|---|---|
| `display` | 36px | 9 × 4 |
| `title-1` | 32px | 8 × 4 |
| `title-2` | 26px | *off-grid by design* — see note |
| `title-3` | 22px | *off-grid by design* — see note |
| `body` / `body-strong` | 22px | *off-grid by design* — see note |
| `small` | 18px | *off-grid by design* — see note |
| `caption` | 16px | 4 × 4 |

Note on 22px/26px/18px: strict 4px line-heights (20/24) render 14–18px text either cramped or airy. We chose optical quality over grid purity **inside** the line box, and restore rhythm **outside** it: all margins, paddings, and gaps around text are grid values (4/8/12/16/24/32), so blocks of text always start and end on grid positions relative to their container.

Rules:

- Line-height is part of the token — never override `leading-*` on a type token.
- Single-line UI elements (buttons, badges, table cells) center text vertically inside grid-sized boxes (e.g. 32px control height), so the off-grid line box never leaks into layout.
- Vertical rhythm between text blocks comes from the spacing scale, not from stacked line-height tricks or `<br>` elements.
- Paragraph spacing in reading surfaces: 12px between paragraphs, 24px before a new H2/H3 section (SpacingSystem §4).

---

## 10. Do / Don't

| # | Do | Don't |
|---|---|---|
| 1 | Use the eight tokens via `packages/ui` utilities | Write a raw `font-size`, ever — lint failure |
| 2 | Emphasize with weight 500 | Use italics or ALL CAPS for emphasis |
| 3 | Keep body at 14px in the app and the portal | "Bump it to 16 for readability" — that's the marketing site |
| 4 | Right-align numeric table columns with tabular-nums | Left-align amounts or use proportional figures in columns |
| 5 | Use Geist Mono for code, IDs, and machine-shaped values | Use mono in prose, or sans for code |
| 6 | Sentence case on every title, button, and label | Title Case, ALL-CAPS headers, decorative smallcaps |
| 7 | Map H1–H6 onto the eight tokens | Invent a size for a heading level, or skip levels for looks |
| 8 | Truncate with ellipsis + hover/focus recovery | Truncate money, dates, statuses, or error messages |
| 9 | Reserve 700 for stat-tile numerals | Bold-700 anything else, anywhere |
| 10 | Keep reading columns ≤ ~68ch | Let document text stretch across a 1920px window |
| 11 | Fix type sizes across breakpoints (only display/title-1 step down) | Fluid `clamp()` type, viewport-relative font sizes |
| 12 | Use the `Kbd` component for every shortcut display | Hand-style `<kbd>` per feature |
| 13 | Format money with the shared locale-aware formatter | Concatenate `"$" + amount` in feature code |

---

## 11. Open questions

1. **Mono money in Finance tables** — §5.2 leaves Geist Mono for amounts as a per-module choice. Decide once for the Finance module during its build phase and record the outcome here.
2. **CJK / Arabic fallbacks** — Geist covers Latin/Greek/Cyrillic. If localization ships beyond those scripts, we need a metric-compatible fallback per script (candidate: Noto Sans family) and an amendment to §1.3.
3. **Portal marketing moments** — client-facing proposal covers may want `display` at larger-than-30px. Current ruling: no — proposals use `display` as-is. Revisit only with real client feedback.
4. **Variable optical sizing** — Geist has no optical-size axis today. If one ships upstream, evaluate whether `caption`/`small` benefit before adopting.
