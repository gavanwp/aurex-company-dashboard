# Dashboard Rules — AurexOS Design System

| | |
|---|---|
| **Document** | Dashboard & Widget Rules — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [GridSystem.md](./GridSystem.md) · [Charts.md](./Charts.md) · [Components.md](./Components.md) · [Notifications.md](./Notifications.md) · [EmptyStates.md](./EmptyStates.md) · [../11_Design_Principles.md](../11_Design_Principles.md) · [../06_Module_Breakdown.md](../06_Module_Breakdown.md) |

This document is the binding specification for the AurexOS dashboard: information hierarchy, the widget size grammar, role defaults, and statistics presentation. The underlying 12-column grid is owned by [GridSystem.md §4](./GridSystem.md); chart internals by [Charts.md](./Charts.md); stat-card and activity-feed component anatomy by [Components.md](./Components.md). Module behavior and data model per [06_Module_Breakdown.md §1](../06_Module_Breakdown.md); role contents per [05_User_Roles.md §4](../05_User_Roles.md).

---

## 1. Dashboard philosophy

The dashboard is the role-aware home of AurexOS. One glance must answer three questions, in order:

1. **What needs my attention?**
2. **What changed since I was last here?**
3. **What's at risk?**

Everything else is secondary. Binding consequences:

- **The dashboard is a router to work, not a report museum.** Every widget exists to move the user *into* a module with context. A widget nobody clicks through is decoration and gets removed. Deep analysis lives in Analytics; the dashboard shows the signal that sends you there.
- **Calm > busy.** No confetti, no celebration animations, no vanity metrics ("total tasks ever created"), no auto-cycling carousels. A metric earns its place only if a specific role acts on it this week ([11_Design_Principles.md §1.4, §12](../11_Design_Principles.md)).
- **Permission-filtered, structurally.** A widget whose data source the viewer cannot see **never renders — not even as an empty shell or a locked teaser**. The layout reflows as if the widget did not exist. Rendering a locked widget is a nagging upsell ([../11_Design_Principles.md](../11_Design_Principles.md) §12.2) and a data-existence leak.
- **Personal, with a floor.** Users add, remove, and rearrange widgets, and can always "Reset to role default." The role default is the designed experience; personalization is an override, never a prerequisite for a usable dashboard.

Litmus test: if the user reads the dashboard for 10 seconds and closes the tab having done nothing, the dashboard failed — it should have routed them somewhere or confirmed nothing needs them.

## 2. Information hierarchy — the three bands

The dashboard page is exactly three bands, top to bottom. No other top-level structure exists.

```
┌──────────────────────────────────────────────────────────────┐
│ Good morning, Sana        [Wed 8 Jul] [Customize] [⟳ 2m ago] │  ← page header
├──────────────────────────────────────────────────────────────┤
│ ▲ NEEDS ATTENTION  (ranked, horizontal, dismissible)         │  ← band A
│ [⚠ 2 approvals waiting] [🔴 Invoice #221 overdue 12d] [···]  │
├──────────────────────────────────────────────────────────────┤
│ ✦ Aurex daily digest — Tuesday briefing            [collapse]│  ← band B
│   3 priorities · 1 risk · 2 meetings · 1 overdue             │
├──────────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌──────────────────┐                   │  ← band C
│ │ widget │ │ widget │ │      widget      │    (12-col grid)  │
│ └────────┘ └────────┘ └──────────────────┘                   │
└──────────────────────────────────────────────────────────────┘
```

### 2.1 Band A — Needs-attention strip

- A single horizontal strip of ranked cards: pending approvals, overdue items, failing automations, at-risk projects, anomaly callouts (§9.2). Source: the notification system's actionable set ([../architecture/NotificationsArchitecture.md §5](../architecture/NotificationsArchitecture.md)) — it is a *view* over notifications, not a second system.
- **Ranked, not chronological.** Approvals and security outrank everything; ordering within bands may use AI priority (L3 read-only). Max 6 items visible; overflow collapses into "+4 more" which opens the Notification Center filtered to actionable.
- Each item: status icon + one-sentence summary + one inline action where safe (Approve, Open) + dismiss (×). Dismiss hides the item from the strip only — the underlying notification and entity are untouched.
- The strip renders **nothing at all** (zero height, no "all clear" banner) when empty. Absence of alarm is the reward; we do not decorate it.

### 2.2 Band B — Aurex daily digest card

- **One card**, full grid width, collapsible (collapsed state persists per user). Phase 3; the band simply doesn't exist before then.
- Always carries the ✦ Aurex attribution mark with hover detail ([../11_Design_Principles.md](../11_Design_Principles.md) §9). Content is generated per recipient, permission-filtered before the model sees it. Full card spec in §9.1.

### 2.3 Band C — the widget grid

The 12-column grid per [GridSystem.md §4](./GridSystem.md), populated per §3–§5 below.

### 2.4 Page header

| Element | Spec |
|---|---|
| Greeting | `title-1`, sentence case, first name only ("Good morning, Sana"). Time-of-day aware; never exclamation marks. |
| Date | `caption`, muted, absolute ("Wed 8 Jul") |
| Customize | Secondary button — enters rearrange mode (§3.5) |
| Freshness | `caption` "Updated 2m ago" — only when stale per §10.2 |

No page-level tabs, no hero banners, no promotional slots. The header is one row, ever.

## 3. Widget system

### 3.1 The size grammar

Widget sizes are a closed grammar. There are five sizes; there is no sixth.

| Size | Cols | May contain | May NOT contain |
|---|---|---|---|
| **S** | 3 | One stat: single metric + delta + optional sparkline | Lists, charts with axes, tables |
| **M** | 4 | Stat group (2–3 related stats) or mini-list ≤ 5 rows | Full charts, tables |
| **L** | 6 | One dense chart ([Charts.md §7](./Charts.md)) or list ≤ 8 rows | Multiple charts, tables > 8 rows |
| **XL** | 8 | Table peek or board peek (≤ 8 rows / ≤ 3 columns of a board) | Anything a full module page does better |
| **full** | 12 | Rare — calendars, timelines. Requires design-review sign-off per widget type | Everything else |

- Grid mechanics per [GridSystem.md §4](./GridSystem.md): 12 columns, 8px row unit, minimum widget width 3 columns, 16px gaps.
- **Max 4 widgets per row** standard; 5 permitted only at ultra-wide (≥1920px) where the dashboard cap engages.
- **Equal-height rows.** All widgets in a row share the height of the tallest; content inside shorter widgets vertically distributes, it does not stretch. Ragged rows are a lint-level design failure.
- A widget type declares which sizes it supports (e.g., "AR aging: S, L"). Users pick from declared sizes only.

### 3.2 Widget anatomy

```
┌───────────────────────────────────────┐
│ ◱ My tasks              [7d ▾]  [⋯]  │  ← header row
│ ───────────────────────────────────── │
│         (content per size)            │
│                                       │
│ View all in Tasks →                   │  ← footer link (lists/tables only)
└───────────────────────────────────────┘
```

| Part | Spec |
|---|---|
| Title | `title-3` (15/22, 600), sentence case, ≤ 4 words |
| Source icon | 16px Lucide icon of the source module, tinted `--text-muted` — module identity, not decoration |
| Timeframe control | Optional; compact select ("7d / 30d / QTD"). Only on widgets where period genuinely changes the answer. Persisted per user per widget. |
| Kebab menu (⋯) | Exactly four items: **Refresh · Configure · Remove · Go to module**. No more, ever. |
| Card chrome | Border-first card: `--border-subtle`, radius 8, padding 16, `--bg-surface` ([Components.md](./Components.md)) |

### 3.3 Drag-rearrange

- Entered via the header **Customize** button or long-press on a widget header. Widgets lift (raised shadow — the second and last shadow level), grid gaps show as drop guides.
- **Snap to grid only**: 12 columns × 8px rows. Free-form pixel placement does not exist ([GridSystem.md §4](./GridSystem.md)).
- Displaced widgets animate to their new slot with a **200ms** settle (ease-out); spring physics only on the dragged card itself ([../11_Design_Principles.md](../11_Design_Principles.md) §7).
- Layout saves automatically on drop ("Saved" caption in header); Esc during drag cancels and restores.
- Fully keyboard-operable: focus widget → Space to lift → arrows to move by one slot → Space to drop.

### 3.4 Add-widget flow

- "Customize → Add widget" opens a catalog panel (right context panel, 360px). The catalog is **permission-filtered at the source**: widget types whose data the user cannot see are absent from the list — not disabled, not teased.
- Each catalog entry: name, source module icon, supported sizes, one-line description, live-data thumbnail where cheap.
- Aurex natural-language creation ("overdue invoices over $2k") is Phase 3, L1 draft autonomy: Aurex proposes a configured report widget as a preview card; the user confirms placement. Nothing is added silently.

### 3.5 Removal & reset

- Remove is immediate with a 5s undo toast ([../11_Design_Principles.md](../11_Design_Principles.md) §8.6) — no confirm dialog.
- "Reset to role default" lives in Customize mode; it *is* confirmed (one dialog) because it discards a whole personal layout.

## 4. Widget catalog by module

The canonical Phase 1–3 catalog. New widget types are added here first, shipped second.

| Widget | Sizes | Source module | Default for roles | Phase |
|---|---|---|---|---|
| My tasks (due/overdue) | M, L, XL | Tasks | Team Member, PM | 1 |
| Project health heatmap | L, XL | Projects | Owner, Admin, PM | 1 |
| Blocked tasks | M, L | Tasks | PM | 1 |
| Pipeline value & by-stage | S (value), L (stages) | CRM | Owner, Sales | 1 |
| Deals needing action | M, L | CRM | Sales | 1 |
| Proposal statuses | M | CRM/Proposals | Sales | 2 |
| AR aging | S (total), L (buckets) | Finance | Owner, Finance | 2 |
| Cash snapshot | S | Finance | Owner, Finance | 2 |
| Overdue invoices + reminder queue | M, L | Finance | Finance | 2 |
| MRR / retainer summary | S, M | Finance | Owner, Finance | 2 |
| Expense approvals pending | M | Finance | Finance, Owner | 2 |
| Month-close checklist | M | Finance | Finance | 2 |
| Team utilization | S, L | Team & HR / Analytics | Owner, Admin, HR | 2 |
| Leave & onboarding queue | M, L | Team & HR | HR | 2 |
| Calendar peek (today/this week) | M, L, full | Calendar | Team Member, PM, Sales | 2 |
| Unread mentions | M | Notifications | Team Member, PM | 1 |
| Approvals queue | M, L | Notifications / Aurex | Owner, Admin | 1 |
| Automation failures | M | Automation Studio | Admin | 3 |
| Website uptime | S, M | Monitoring | Admin, PM | 2 |
| Pinned report | L, XL | Analytics | Any (via pin flow) | 2 (basic) / 3 (AI) |
| Delay-risk predictions ✦ | M | Aurex / Projects | PM | 3 |
| Lead-scoring queue ✦ | M, L | Aurex / CRM | Sales | 3 |
| Specialization widget (repo/PR, SEO alerts) | M | Integrations / Monitoring | Team Member (by specialization) | 2–3 |

Rules: every widget row above deep-links to its source module; ✦-marked widgets carry AI attribution on every item; a widget type unused by >90% of workspaces for a quarter is a removal candidate — the catalog shrinks as well as grows.

## 5. Role default layouts

Defaults honor [05_User_Roles.md §4](../05_User_Roles.md). Sketches show band C only (bands A/B are universal). Numbers are column spans.

**Owner — Executive Dashboard**

```
[ Cash snapshot 3 ][ Pipeline value 3 ][ Project health heatmap 6      ]
[ Team utilization 4  ][ AR aging 4        ][ Approvals queue 4        ]
[ Pinned report: P&L snapshot 6          ][ Overdue invoices 6         ]
```

**Project Manager — Delivery Dashboard**

```
[ My projects' health 6                  ][ Tasks due this week 6      ]
[ Blocked tasks 4 ][ Unread client msgs 4 ][ Delay-risk ✦ 4            ]
[ Calendar peek (meetings) 6             ]
```

**Team Member — My Work Dashboard**

```
[ My tasks 8                                     ][ Today's calendar 4 ]
[ Unread mentions 4 ][ Specialization widget 4 ]
```

**Sales — Pipeline Dashboard**

```
[ Deals by stage 6                        ][ Deals needing action 6    ]
[ Follow-ups due 4 ][ Proposal statuses 4 ][ Lead-scoring queue ✦ 4    ]
[ This week's sales meetings 6            ]
```

**Finance — Finance Dashboard**

```
[ Cash position 3 ][ MRR summary 3 ][ AR aging 6                       ]
[ Overdue + reminder queue 6             ][ Expense approvals 4        ]
[ Month-close checklist 4 ]
```

- Admin = Owner layout minus P&L detail (finance stats at summary level unless Finance-granted), plus pending invites, automation failures, and integration health widgets. HR = leave queue L, onboarding M, headcount/utilization S+S, calendar M.
- **Reset-to-default** restores the current role default exactly, including sizes and timeframe settings. Role defaults are versioned; a default change never silently rewrites a personalized layout — it only changes what Reset restores. Tenant-customizable role defaults arrive Phase 5.

## 6. Statistics presentation

### 6.1 Stat tile rules

Component anatomy in [Components.md](./Components.md); these are the content laws:

- **One metric per tile.** A tile answering two questions is two tiles.
- Numeral: **700 weight, tabular figures** — the only permitted use of 700 ([../11_Design_Principles.md](../11_Design_Principles.md) §3). Money always carries currency; large numbers abbreviate consistently (12.4k, 1.2M) with the exact value on hover.
- **Delta**: arrow + status color + explicit label ("↑ 12% vs last 30d"). The comparison period is always written out — a bare "+12%" is banned. Color never carries the meaning alone; the arrow and label do ([../11_Design_Principles.md](../11_Design_Principles.md) §5).
- Delta color follows *desirability*, not direction: churn going down is green.
- **Sparkline** optional (S tiles): single neutral line, no axes, no dots, same period as the delta. Decoration-free per [Charts.md](./Charts.md).

### 6.2 Thresholds

- A stat may turn amber (warning) or red (danger) only when a **defined threshold** exists in the widget's spec (e.g., AR aging > 60d bucket non-zero → amber; cash runway < 8 weeks → red). Vibes-based coloring is banned.
- Threshold state always pairs the color with an icon and a one-line reason on hover ("3 invoices past 60 days").
- **Red requires an action attached** — a red stat must offer a click-through that starts fixing it, or it stays amber. Alarm without a handle is noise.

### 6.3 The no-unexplained-numbers law

Every stat on the dashboard clicks through to the exact filtered view that produced it. "Pipeline value $148k" opens the pipeline filtered to open deals; the number on the dashboard and the number at the destination **must match**. A stat that can't cite its source doesn't ship.

## 7. Charts on dashboards

- Dashboard chart widgets use the **dense variants only** — see [Charts.md §7](./Charts.md): no chart titles duplicating the widget title, minimal axes, no in-chart legends beyond two series, direct labeling preferred.
- **Max 2 chart widgets per role default layout.** Justification: the dashboard is scanned in seconds; charts demand reading time, and three charts side-by-side turn a router into a report museum (§1). Users may personally exceed two; we never ship a default that does.
- Charts inherit the shared categorical ramp — the same series gets the same hue as in Analytics ([../11_Design_Principles.md](../11_Design_Principles.md) §5).
- No donut/gauge widgets on defaults; a single number with a delta (§6) says it better in a third of the space.

## 8. Activity feed & recency

- Where an activity feed widget exists, events render **coalesced**, same rules as notifications ([Notifications.md §6](./Notifications.md)): "Priya completed 6 tasks in Meridian," expandable in place — never six rows.
- AI-performed actions always carry the ✦ mark inline ("✦ Aurex drafted 2 reminder emails") with hover attribution detail. Human and AI work must be distinguishable at a glance, permanently ([../11_Design_Principles.md](../11_Design_Principles.md) §9).
- Timestamps: relative ("2h ago"), absolute on hover; grouped under day headers past 24h ([../11_Design_Principles.md](../11_Design_Principles.md) §11).
- Feed rows are links: actor → profile, entity → entity. Everything is a link (§8.7 of the bible).

## 9. AI on the dashboard

### 9.1 Digest card spec

- Sections, fixed order: **Priorities** (suggested top 3) · **Risks** · **Meetings today** · **Overdue**. Empty sections are omitted, not shown empty. Aurex-narrated prose, first person, brief, every named entity a deep link.
- Per-item actions: **Open** (deep link) · **Snooze** (reappears tomorrow) · **"Why am I seeing this?"** — expands the grounding: which events/records produced the item. Explainability is a right, not a debug tool.
- Card actions: collapse (persisted), digest settings (cadence, time — routes to the preference center, [Notifications.md §9](./Notifications.md)).
- Generation is per-recipient and permission-filtered before the model sees context ([../architecture/NotificationsArchitecture.md §7](../architecture/NotificationsArchitecture.md)). ✦ attribution always visible; narration is L3 read-only.

### 9.2 Anomaly callouts

- Sourced from Analytics anomaly detection, rendered in the attention strip (§2.1). **L0 — informational only**: an anomaly callout never mutates anything and never demands action, it offers "View in Analytics."
- Every callout is explainable in one hover: metric, expected range, observed value, period. Unexplainable anomalies are not shown.

### 9.3 Approval cards inline

- AI-action approvals surface in the attention strip and approvals-queue widget as compact approval rows; expanding one renders the full **approval card** — what will happen, to which records, diff/preview, Approve / Edit / Dismiss. The full spec lives in [Components.md §6](./Components.md); this document only places it.
- Approving from the dashboard is a real, audited approval — same action spine as everywhere else.

## 10. Refresh & realtime

- **Live where it matters:** attention-strip items, badge counts, and approval states update in realtime. Widget data refreshes on an interval per widget type (stats 60s–5m; heavy analytics on load + manual refresh).
- **Staleness indicator:** any widget whose data is older than 5 minutes shows a muted "refreshed 6m ago" caption; the page header mirrors the oldest widget. Silent staleness is lying with numbers.
- **No auto-relayout while the user is looking.** New data updates values in place; it never reorders, resizes, or inserts widgets under the cursor. Justification: the dashboard is a spatial memory surface — users learn where their numbers live, and moving them destroys the one-glance contract (§1). Rank changes in the attention strip apply on next page focus, not mid-read.
- Numbers updating in place may use a 150ms fade — no count-up animations, no pulsing.

## 11. Empty & first-run

- A brand-new workspace dashboard **teaches**: each role-default widget renders its designed empty state — what this widget shows, why it matters, one CTA into the source module ("Create your first project"), optionally "✦ Ask Aurex to set this up." Full patterns in [EmptyStates.md](./EmptyStates.md).
- The attention strip and digest are simply absent when empty (§2.1) — no placeholder cheerleading.
- A dashboard where the user has removed everything shows a single centered card: "Your dashboard is empty" + Add widget + Reset to role default.

## 12. Do / Don't

| # | Do | Don't |
|---|---|---|
| 1 | Ship role defaults with ≤ 2 chart widgets | Ship a default that needs reading, not glancing |
| 2 | Make every stat click through to its exact source view | Show any number the user can't trace |
| 3 | Hide widgets the user lacks permission for entirely | Render locked, empty, or teaser widget shells |
| 4 | Let users add/remove/rearrange, with Reset to default | Auto-add widgets to a user's layout, ever |
| 5 | Attach an action to every red state | Use red as ambient alarm without a handle |
| 6 | Use the five-size grammar (S/M/L/XL/full) | Invent per-widget custom sizes or free-form placement |
| 7 | Keep rows equal-height | Ship ragged rows or stretched filler content |
| 8 | Coalesce activity ("6 tasks completed") | Render event spam row by row |
| 9 | Mark all AI content with ✦ and grounding | Blend AI output into the feed unattributed |
| 10 | Update values in place, note staleness honestly | Auto-relayout, reorder, or animate counts while the user reads |
| 11 | Omit empty attention strip / digest sections | Decorate emptiness with "all clear!" banners |
| 12 | Write deltas with explicit comparison periods | Show bare percentages or color-only deltas |
| 13 | Retire widgets nobody uses | Let the catalog only ever grow |
| 14 | Confirm layout reset (destructive to personalization) | Confirm widget removal (undoable — toast instead) |

## 13. Open questions

1. **Locked widgets in role defaults** — should Owner compliance widgets (approvals queue) be non-removable? Leaning yes for approvals only; needs a "locked" affordance spec if so. (Mirrors [06_Module_Breakdown.md §1](../06_Module_Breakdown.md) open question.)
2. **Digest cadence default** — per-user or per-role default? Current lean: role default (Owner daily, Team Member daily, HR weekly), user-overridable.
3. **Dashboard width cap** — [GridSystem.md](./GridSystem.md) holds ~1600px provisional; confirm after XL widgets exist at real densities. This document wins for widget-level rules.
4. **Mobile dashboard order** — widgets stack single-column in configured order; should the attention strip pin above the fold with digest collapsed by default on mobile? Prototype pending.
5. **Pinned-report freshness** — Analytics reports can be expensive; do pinned reports get a cheaper materialized "peek" query, or the 5-minute staleness caption as standard? Decision belongs to Analytics + this doc jointly.
