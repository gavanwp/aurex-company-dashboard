# Charts — AurexOS Design System

| | |
|---|---|
| **Document** | Charts & Data Visualization — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [ColorSystem.md](./ColorSystem.md) · [DashboardRules.md](./DashboardRules.md) · [Tables.md](./Tables.md) · [Typography.md](./Typography.md) · [../11_Design_Principles.md](../11_Design_Principles.md) |

This document is the binding specification for every chart, sparkline, and micro-visualization in AurexOS — Analytics, Finance, Dashboard widgets, CRM reports, and Aurex-generated answers. It elaborates [11_Design_Principles.md](../11_Design_Principles.md) §5 (data visualization) and §9 (AI attribution). Ramp token values are owned by [ColorSystem.md](./ColorSystem.md); widget sizing and dashboard composition by [DashboardRules.md](./DashboardRules.md).

---

## 1. Chart doctrine

1. **Every chart answers exactly one question.** "Revenue this quarter vs. last" is a chart. "Revenue, utilization, and pipeline on two axes" is three charts wearing a trench coat. If the title can't be phrased as the question, the chart isn't designed yet.
2. **Ink minimalism.** Data ink first, everything else earns its place: no 3D, no gradient fills for decoration, no drop shadows on marks, no dual axes without a written justification in the PR (two series with different units almost always want two aligned charts).
3. **Theme tokens always.** Charts consume the categorical ramp and neutral tokens from the token layer. **A hardcoded hex in a chart is a lint failure** — the same rule as everywhere else ([11 §2.1](../11_Design_Principles.md)), and charts are where it's most often broken.
4. **Charts are honest.** Y-axes for quantities start at zero unless a non-zero baseline is explicitly labeled; truncated axes, cherry-picked windows, and smoothed lines that invent data are integrity failures, not style choices.
5. **Charts are links** ([11 §8.7](../11_Design_Principles.md)). Anything a chart summarizes exists as records; clicking a mark drills into them (§6.2).

## 2. The categorical ramp

Values live in [ColorSystem.md](./ColorSystem.md); behavior is bound here.

| Series | Token | Hue (reference) |
|---|---|---|
| 1 | `--chart-1` | Accent indigo 231 48% 54% |
| 2 | `--chart-2` | Teal 172 66% 36% |
| 3 | `--chart-3` | Amber 38 92% 50% |
| 4 | `--chart-4` | Sky 199 84% 44% |
| 5 | `--chart-5` | Purple 275 55% 58% |
| 6 | `--chart-6` | Rose 0 70% 55% |

### 2.1 Assignment rules

- **Same series = same hue, always, everywhere** ([11 §5](../11_Design_Principles.md)). If "Revenue" is teal on the dashboard, it is teal in Analytics, in the PDF report, and in an Aurex answer. Series-to-hue mapping is registered per metric, not chosen per chart.
- **Pinned: module-owned metrics use their module identity hue.** Finance metrics render teal (172 66% 36%), CRM metrics sky (199 84% 44%), Analytics purple, Automation amber-orange (28 92% 50%), AI/Aurex the accent indigo. A finance chart's primary series is teal, not indigo — the accent is not the default chart color.
- **Cross-module comparisons** (and any chart without a module-owned primary) assign hues in **ramp order** (1→6) by series order. Never skip or shuffle for taste.
- A single-series chart uses its one hue solid; comparison-to-previous-period renders the prior period as the same hue at reduced emphasis (muted/dashed), never a second hue — the second hue would imply a second metric.

### 2.2 More than six series

**>6 series is a design smell.** Aggregate the tail into a neutral-colored "Other" (neutral step, never a seventh hue), or split the chart, or provide a series picker. The ramp does not extend.

### 2.3 Color-blind and dark-mode behavior

- The ramp is color-blind safe as a set (hue + lightness separation). Line charts additionally vary dash pattern or marker shape when ≥4 series; series are never distinguishable by hue alone at that count (§10).
- Dark mode keeps the **same hue family with adjusted lightness/saturation** per the token layer — teal stays teal, slightly lifted L, reduced S to avoid neon-on-black ([11 §2.3](../11_Design_Principles.md)). No separate dark ramp identities.

## 3. Chart type selection guide

| Question shape | Chart | Constraints |
|---|---|---|
| Trend over time | Line | ≤4 lines before dash/marker differentiation kicks in; area fill only for single series at low opacity |
| Composition over time | Stacked area | **Max 4 layers**; order layers largest-bottom; beyond 4 → aggregate to Other |
| Comparison across categories | Bar | **Horizontal when labels exceed ~12ch** (client names, campaign titles); vertical for short/temporal categories |
| Part-of-whole (snapshot) | Donut | **Max 5 segments + Other**; center shows total; never pie-with-3D, never exploded slices |
| Distribution | Histogram | Neutral single hue; bin count justified by data size |
| Pipeline conversion | Funnel (CRM) | Stage labels + absolute + % conversion between stages |
| Utilization / intensity over two dimensions | Heatmap | Sequential single-hue scale from the token layer; legend mandatory |
| Single value + context | Stat tile + sparkline | Per §8; not a chart type to decorate into more |

**Never:** radar (unreadable comparisons, area lies), gauge (one number cosplaying as a dashboard — use a stat tile with a target delta), word cloud (frequency theater with no scale). A request for any of these is a request for one of the shapes above.

## 4. Anatomy

```
┌──────────────────────────────────────────────┐
│ Revenue by month ⓘ            ◦ 2025 ◦ 2026 │ ← title-3 + info; legend chips top-right
│ $148.2k  ▲ 12% vs last period                │ ← value summary (700 numerals)
│ 160k ┤            ╭──╮        ┌───────────┐  │
│ 120k ┤      ╭─────╯  ╰──      │ Mar 2026  │  │ ← tooltip: shadow-1,
│  80k ┤ ─────╯                 │ 2026 42.1k│  │   tabular values
│  40k ┤ · · · · · · · · · · ·  │ 2025 38.4k│  │
│      └──┬────┬────┬────┬───   └───────────┘  │
│        Jan  Mar  May  Jul                    │ ← ticks: small 13, muted
└──────────────────────────────────────────────┘
```

| Part | Spec |
|---|---|
| Title | `title-3` 15/600, phrased as the question's subject; optional ⓘ info tooltip explaining metric definition and source. |
| Value summary | Current/total value in stat style (700 numerals, tabular) + delta (§5.4). Optional; mandatory on dashboard widgets. |
| Plot | Marks use ramp tokens; line weight 2px; bar radius 2px top; no mark shadows. |
| Axes | Tick labels `small` 13 muted, **4–6 ticks max** per axis. **No axis lines.** Gridlines: horizontal only, `border-subtle`. Vertical gridlines only on time-brush surfaces. |
| Legend | Top-right chips: 8px swatch (dot for lines, square for areas/bars) + label. **Interactive**: click toggles series, ⌥-click isolates. Hidden series chip goes muted. No legend for single-series charts. |
| Tooltip | Shared-crosshair on time axes (one tooltip, all series at that x). `shadow-1`, radius 8, caption label + tabular values, series swatches. Follows pointer, never occludes the hovered mark, flips at plot edges. |
| Empty / loading / error | Loading: skeleton of the chart's shape (axis + ghost marks), zero layout shift. Empty: per [EmptyStates.md](./EmptyStates.md), plot-area message, chrome retained. Error: inline retry band in the plot area. Never a spinner in a chart. |

## 5. Formatting

| Value | Rule |
|---|---|
| Numbers | Compact notation above 4 digits: `12.4k`, `1.2M`; full value in tooltips. Always tabular-nums ([Typography.md](./Typography.md)). |
| Money | Workspace currency, symbol/code per locale; minor-unit correct (JPY has no decimals; tooltips show exact amounts, axes may compact). Never mix currencies on one axis — convert or split. |
| Dates | Smart tick density: intraday → `14:00`, daily → `Jul 8`, monthly → `Jul`, yearly → `2026`. Tick labels never rotate; thin ticks instead. |
| Deltas | **Arrow + sign + color + label**: `▲ +12% vs last period`. Direction is encoded four ways — never color alone ([11 §5](../11_Design_Principles.md)). "Up is good" is not assumed: deltas on cost metrics invert color semantics via the metric registry. |
| Percentages | One decimal max (`42.1%`); axes at 0/25/50/75/100 where the scale allows. |

## 6. Interaction

1. **Hover crosshair.** Time charts show a vertical crosshair + shared tooltip within 100 ms; nearest-point snapping, never require pixel-perfect hover.
2. **Click-to-drill.** Clicking a mark navigates to the filtered list behind it — the March bar of "Invoices by month" opens the invoice table filtered to March, canonical URL, cmd-click works ([Tables.md](./Tables.md) §5). Every aggregate mark declares its drill target; a chart with nowhere to drill must justify itself in review.
3. **Legend toggling** rescales axes with a 200 ms ease transition.
4. **Brush/zoom** exists only on Analytics deep-dive surfaces — never on dashboard widgets. Brush selection updates the URL (shareable range).
5. **Animation:** data updates transition marks 200 ms ease-out, and that is all. **No bouncy chart intros**, no staggered bar cascades, no draw-on line animations. Charts appear complete. `prefers-reduced-motion` collapses the 200 ms to none ([11 §7](../11_Design_Principles.md)).

## 7. Dashboards vs. reports

Two grades of the same system — never two systems:

| | Widget charts (dashboard) | Analytics charts (deep-dive) |
|---|---|---|
| Anatomy | Title + value summary + plot; sparkline-class density | Full anatomy (§4) |
| Legend | None if 1 series; chips if 2+ | Always for 2+ series |
| Axes | Minimal: 2–3 ticks or none (sparklines) | Full 4–6 ticks |
| Interaction | Hover tooltip + click-to-drill only | Full: toggle, brush, drill |
| Sizing | Owned by [DashboardRules.md](./DashboardRules.md) | Fills content area |

**Print / PDF / portal theming:** client-facing reports and exports always render in the **light theme** with the agency's branding slot (logo, portal accent per [ColorSystem.md](./ColorSystem.md)). Ramp hues are preserved — series identity survives export. Interactive affordances (legend chips, tooltips) are replaced by direct labels and printed value annotations; a chart that only works with a tooltip is not export-ready.

## 8. Sparklines & micro-viz

| Element | Spec |
|---|---|
| Stat-card sparkline | 1.5px line, single hue (metric's registered hue), no axes/gridlines/tooltip on dashboard tiles; last point dotted. Height 32px, width fills card. Trend context only — never the primary read (the number is). |
| Progress bar | 4px track (`bg-raised`) + fill in metric hue; label + percentage always adjacent, tabular. Overflows (>100%) cap the fill and state the overflow in text. |
| Progress ring | 32px, same rules as bars; center shows the value. Rings only where circular geometry earns space (avatars, compact tiles). |
| Health dot | 8px status dot **always with icon or label** — a bare colored dot is a color-only signal and banned ([11 §5](../11_Design_Principles.md)). |
| Utilization bar | Segmented horizontal bar (billable / non-billable / free) using ramp tokens; segment labels in tooltip + legend on first use per surface. |

Micro-viz obeys every doctrine rule: tokens only, honest scales, tabular numerals.

## 9. AI-generated charts

Aurex's "ask the data" answers render charts with the **same primitives and rules** — an AI chart is not a special chart:

- Same ramp, same anatomy, same formatting. If Aurex can't express an answer in the §3 type table, it answers with a table or text instead of inventing a visualization.
- **Metric lineage always visible** (trust law per [../07 (AI principles)](../11_Design_Principles.md)): every Aurex chart carries an expandable "How this was computed" — the underlying query/filters in plain language ("Invoices, status paid, grouped by month, workspace currency") with links to the source records. No lineage, no chart.
- **✦ attribution** ([11 §9](../11_Design_Principles.md)): the persistent ✦ Aurex mark with hover detail (when, from what instruction). If an Aurex chart is pinned to a dashboard, attribution travels with it permanently.
- Confidence honesty: partial or low-confidence data renders with an explicit caveat band, not a clean-looking chart over dirty data.

## 10. Accessibility

- **Text alternative always:** every chart offers a "View as table" toggle rendering the same data as a real table ([Tables.md](./Tables.md) semantics). This is the canonical screen-reader path; the SVG carries a concise `aria-label` summary ("Revenue by month, Jan–Jul 2026, trending up 12%").
- **Shape/pattern redundancy** where feasible: line charts ≥4 series vary dash/markers; single-hue encodings (heatmaps) always pair with value labels or tooltips readable via keyboard.
- **Contrast:** all marks meet **3:1 against their background** in both themes (verified on token pairs in CI); gridlines deliberately sit below 3:1 — they are not information.
- **Keyboard tooltip access:** plots are focusable; arrow keys step through data points, announcing series, label, and value via live region; Enter on a point triggers its drill-down. Legend chips are buttons in the tab order.
- Delta and status semantics never rely on color alone (§5.4); reduced motion collapses all chart transitions (§6.5).

## 11. Do / Don't

| Do | Don't |
|---|---|
| Phrase every chart title as the subject of one question | Build multi-question dashboards charts with dual axes |
| Consume ramp and neutral tokens exclusively | Hardcode hex — it is a lint failure, not a style nit |
| Keep the same metric the same hue app-wide | Recolor series per chart "for variety" |
| Start quantity axes at zero, or label the baseline loudly | Truncate axes to dramatize a flat line |
| Aggregate series 7+ into a neutral "Other" | Extend the ramp or recycle hues within one chart |
| Use horizontal bars when labels run long | Rotate tick labels 45° |
| Encode deltas with arrow + sign + color + label | Signal direction by color alone |
| Ship loading skeletons shaped like the chart | Put a spinner in a plot area |
| Link every aggregate mark to its filtered records | Render dead-end charts users can't interrogate |
| Give every chart a data-table alternative | Treat the SVG as the only representation |
| Render prior-period comparison as the same hue, muted | Give last year its own ramp color |
| Keep dashboards sparkline-dense, analytics full-anatomy | Cram full legends and axes into widget tiles |
| Show lineage + ✦ on every Aurex chart | Let AI charts appear as unattributed facts |
| Transition data updates in one 200 ms ease | Animate chart intros, cascades, or draw-ons |

## 12. Open questions

| # | Question | Leaning | Owner |
|---|---|---|---|
| 1 | Charting library commitment (Recharts vs. visx vs. in-house on d3-scale)? | visx-class low-level + our own primitives in `packages/ui/charts`; decision with eng before Analytics phase | CPD + Founding CTO |
| 2 | Sequential/diverging scales for heatmaps — token ramp definition? | ColorSystem.md to define one sequential (neutral→module hue) and one diverging ramp; no per-feature scales | ColorSystem owner |
| 3 | Annotation layer (goal lines, event markers) in v1? | Goal lines yes (finance targets), event annotations Phase 4 | CPD |
| 4 | Export formats beyond PDF — PNG copy-to-clipboard for decks? | Yes, low cost, high agency value; light theme + branding rules apply | CPD |
| 5 | Real-time streaming charts (monitoring) — update cadence and motion? | Batch updates ≥5 s, single 200 ms transition per batch; no per-point ticking | CPD + eng |
