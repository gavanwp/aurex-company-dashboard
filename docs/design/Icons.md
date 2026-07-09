# Icons — AurexOS Design System

| | |
|---|---|
| **Document** | Icons — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [ColorSystem.md](./ColorSystem.md) · [Typography.md](./Typography.md) · [EmptyStates.md](./EmptyStates.md) · [Buttons.md](./Buttons.md) · [Navigation.md](./Navigation.md) · [../11_Design_Principles.md](../11_Design_Principles.md) |

This document is the binding specification for all iconography in AurexOS. It elaborates [11_Design_Principles.md §6.3](../11_Design_Principles.md) and never contradicts it. Where this file and the Design Principles disagree, the Design Principles win and this file gets fixed.

---

## 1. The decision — Lucide, and only Lucide

AurexOS uses **one icon set: [Lucide](https://lucide.dev)**. Not "primarily Lucide". One set.

Lucide earns the job on five grounds:

1. **A consistent 24-grid stroke system.** Every glyph is drawn on a 24×24 grid at a 2px stroke with rounded caps and joins. That single discipline is why a Lucide screen looks composed instead of collaged — the icons behave like one typeface, not a sticker sheet.
2. **Tree-shakable React package.** `lucide-react` ships each icon as an individual component, so bundles carry only the glyphs a route actually renders. This fits our vendored-component model in `packages/ui` exactly.
3. **Coverage.** ~1,500 icons and growing. Agencies touch CRM, finance, documents, calendars, and automation in one afternoon; we need breadth so we never reach for a second set.
4. **ISC license, active maintenance.** Permissive, no attribution burden, a large contributor base, and a steady release cadence — a fork of Feather that outgrew it.
5. **Visual kinship with our benchmark class.** Lucide is the de facto set of the Linear/shadcn/Vercel ecosystem we measure ourselves against. Our components are built on shadcn/ui ([11 §6.1](../11_Design_Principles.md)); Lucide is its native dialect.

### 1.1 Alternatives considered

| Candidate | Verdict | Reason |
|---|---|---|
| **Heroicons** | Rejected | Two weights (outline + solid) and Tailwind-native, but a materially smaller set (~300) — we would run out of glyphs and be forced into mixing. Its personality is also chunkier and rounder than our density calls for at 14px body text. |
| **Tabler** | Rejected | Huge set (4,000+), but the 1.5px default stroke reads thin and wiry at our workhorse 16px size; compensating means overriding stroke on every use, which is exactly the per-instance tinkering this system exists to kill. |
| **Phosphor** | Rejected | Beautiful, and six weights sounds like flexibility — in a team it is a consistency risk. Every weight choice becomes a per-PR debate, and the multi-weight runtime is heavier. We want a system with no decisions left in it. |

### 1.2 The one-set law (binding)

- **Mixing icon sets is a lint-level failure.** An import from `@heroicons/*`, `@tabler/icons*`, `@phosphor-icons/*`, or any other icon package anywhere in the repo fails CI, same class as a raw hex code ([11 §2.1](../11_Design_Principles.md)).
- **Missing glyphs get drawn, not imported.** If Lucide lacks a concept we need, we draw a custom icon **on the Lucide grid** — 24×24, 2px stroke, rounded caps and joins (§6) — and vendor it in `packages/ui/icons`. We never import a lookalike from another set.
- **No emoji as iconography**, anywhere in product UI. The single exception is the ✦ Aurex attribution mark (§5), which is a specified brand glyph, not an emoji.

---

## 2. Usage grammar

### 2.1 Sizes

Three sizes exist. There is no fourth.

| Size | Where | Notes |
|---|---|---|
| **16px** | Dense UI: buttons, table cells, inputs, badges, inline text, list metadata | The workhorse. Pairs with `body`/`small` text. |
| **20px** | Sidebar navigation, page headers, panel headers | Pairs with `title-2`/`title-3`. |
| **24px** | Rare accents in empty states and onboarding | Never in working surfaces; beyond this, use illustration ([IllustrationStyle.md](./IllustrationStyle.md)). |

- Sizes are set via the shared `<Icon>` wrapper's `size` prop — never freehand `width`/`height`.
- An icon rendered at any other size (18, 22, 28…) is a defect. If a slot "needs" an in-between size, the slot is wrong.

### 2.2 Stroke

- **Stroke width is 2 at every size.** No thin variants, no bolding on hover. Lucide's `strokeWidth` prop is not exposed by our wrapper.
- Optical weight consistency between a 16px table icon and a 20px nav icon comes from this rule; breaking it makes screens look assembled from two sets.

### 2.3 Color

Icons are text. They take text color tokens and nothing else.

| Context | Token |
|---|---|
| Default (accompanying a label) | `currentColor` — inherits the label's text token |
| Secondary / metadata | `--text-muted` |
| Disabled | `--text-disabled` |
| Active nav item, Aurex identity | `--accent-text` — the **only** accent uses for icons |
| Status glyphs | The matching `--status-*-text` token, always with a label or accessible name ([11 §5](../11_Design_Principles.md) — status is never color alone) |

- Module identity hues on icons are governed by §4 — they are the exception, and a narrow one.
- An icon never carries a raw color, a decorative color, or a hue its neighboring text doesn't have a reason for.

### 2.4 Optical alignment

- Icon + label sit on the same baseline grid: icon vertically centered against the label's line box, **8px gap** between icon and label (4px permitted only inside badges).
- Icon precedes the label in reading order by default. Trailing icons are reserved for directional affordances (chevrons, external-link).
- Inline icons within running text align to the cap height, not the line box, to avoid the "floating icon" look.

### 2.5 Targets

- **Icon-only buttons: 32×32px minimum hit area**, even in compact density ([11 §4.4](../11_Design_Principles.md)) — the glyph stays 16px inside it.
- Icon-only controls require an accessible name **and** a tooltip. No exceptions ([11 §6.3](../11_Design_Principles.md)). If a control can't earn a tooltip, give it a visible label instead.

---

## 3. Semantic icon registry

**One concept = one icon, forever.** The table below is canonical. The same concept never appears under two glyphs, and the same glyph never means two things. Adding a concept, changing an assignment, or drawing a custom glyph requires amending this registry — it is not a PR-level decision.

### 3.1 Modules

| Concept | Lucide icon | Notes |
|---|---|---|
| Dashboard | `layout-dashboard` | |
| CRM / pipeline | `kanban` | Pipeline-first mental model |
| Clients | `building-2` | Clients are companies, not avatars |
| Projects | `folder-kanban` | |
| Tasks | `list-checks` | |
| Calendar | `calendar` | |
| Meetings | `video` | |
| Email | `mail` | |
| Finance | `wallet` | Currency-neutral; never `$`-based glyphs in module chrome |
| Proposals | `file-pen` | |
| Contracts | `file-signature` | |
| Documents | `file-text` | |
| Knowledge base | `book-open` | |
| Client portal | `app-window` | |
| Team | `users` | |
| Automations | `workflow` | |
| Analytics | `chart-line` | |
| Monitoring | `activity` | |
| Settings | `settings` | |
| Aurex (AI) | **✦ custom mark** | §5. Never `sparkles`, never `bot`, never `wand` |

### 3.2 Common actions

| Concept | Lucide icon | Notes |
|---|---|---|
| Create / add | `plus` | |
| Edit | `pen-line` | |
| Delete | `trash-2` | Danger-styled contexts only |
| Duplicate | `copy` | |
| Archive | `archive` | |
| Restore | `archive-restore` | |
| Share | `share-2` | |
| Export | `download` | |
| Import | `upload` | |
| Filter | `list-filter` | |
| Sort | `arrow-up-down` | |
| Search | `search` | |
| More actions | `ellipsis` | Always opens a menu, never acts directly |
| Close / dismiss | `x` | |
| Refresh / sync | `refresh-cw` | |
| Link / copy link | `link` | |
| Attach | `paperclip` | |
| Comment | `message-square` | |
| Notifications | `bell` | |
| Help | `circle-help` | |

### 3.3 Status glyphs

| Status | Lucide icon | Token |
|---|---|---|
| Success | `circle-check` | `--status-success-text` |
| Warning | `triangle-alert` | `--status-warning-text` |
| Danger / error | `circle-x` | `--status-danger-text` |
| Info | `info` | `--status-info-text` |

Status glyphs always ship with a visible label or accessible name — never color-and-shape alone.

### 3.4 Entity glyphs

| Entity | Lucide icon | Notes |
|---|---|---|
| Invoice | `receipt` | |
| Payment | `credit-card` | |
| Expense | `banknote` | |
| Deal | `handshake` | |
| Lead | `target` | |
| Contact | `contact` | |
| Milestone | `milestone` | Yes, Lucide has one |
| Time entry | `timer` | |

---

## 4. Module icon tinting

[ColorSystem.md](./ColorSystem.md) assigns each module an identity hue (finance teal, CRM sky, automation orange, analytics purple, AI = accent) under a strict subordination law. For icons, that law lands here:

- **Sidebar module icons stay neutral.** Default `--text-muted`, hover `--text-primary`, **active = accent** — same as every nav item. Accent means "you are here"; a rainbow sidebar is dashboard confetti and does not ship.
- Module identity hues on icons are permitted in exactly three places:
  1. **Dashboard widget headers** — the module icon in a cross-module widget's header may carry its identity `*-text` token, so a mixed dashboard scans by module at a glance.
  2. **Chart legends** — where the series color is the module hue, the legend glyph matches.
  3. **Module badges** — compact "Finance" / "CRM" chips in cross-module feeds and search results.
- Everywhere else, module icons are neutral. Inside the Finance module, nothing needs to remind you where you are.

---

## 5. The ✦ Aurex mark

The four-pointed star is the attribution glyph for everything Aurex creates or modifies ([11 §9](../11_Design_Principles.md)). It is the brand's only ornament ([BrandGuidelines.md](./BrandGuidelines.md) §6) and the most tightly governed glyph in the system.

### 5.1 The glyph

- A custom four-pointed star drawn on the Lucide grid (24×24, 2px stroke, rounded joins), vendored as `packages/ui/icons/aurex-mark`. It is **not** the ✨ emoji, not Lucide `sparkles`, not `sparkle`.
- Rendered as text where an icon component is impractical (plain-text email, logs), the literal ✦ character is acceptable.

### 5.2 Where it appears

| Surface | Placement |
|---|---|
| AI-created or AI-modified artifact | Persistent inline marker beside the artifact title/metadata |
| Activity feeds & audit logs | Leading glyph on AI-authored rows |
| Approval cards | Card header, beside "Aurex proposes…" |
| Dashboard digest / scheduled reports | Digest header |
| Aurex conversation panel & palette answers | Response attribution line |

### 5.3 Rules (binding)

- **Sizes:** 12px inline (beside `small`/`caption` text) and 16px standard. Nothing larger in product UI.
- **Color:** `--accent-text` by default; `--text-muted` in dense metadata rows where accent would shout. Never a raw hue, never a gradient.
- **Hover detail contract:** the mark is interactive. Hover/focus reveals: **when** the AI acted, **from what instruction**, and **who approved it**. A ✦ without this provenance is a defect — attribution without evidence is decoration.
- **Never animates.** No pulse, no shimmer, no sparkle loops. Trust reads as stillness.
- **Never decorative.** The mark means "AI did this". Using it as a bullet, a divider, a "premium" garnish, or a marketing confetti particle is prohibited — every non-attributive use dilutes the one meaning it must keep.

---

## 6. Custom icon guidelines

For the rare concept Lucide doesn't cover (target: fewer than ten custom glyphs, ever):

- **Grid:** 24×24 viewBox, 1px padding from the edge on all sides (live area 22×22).
- **Stroke:** 2px, `stroke-linecap="round"`, `stroke-linejoin="round"`, no fills except where Lucide equivalents fill (dots, badges).
- **Corners:** exterior radii ≥2px; match the curvature language of neighboring Lucide glyphs — trace three similar Lucide icons before drawing.
- **Simplicity:** must survive 16px rendering. If a detail disappears at 16px, remove it at 24px.
- **Review:** every custom glyph is approved in design review side-by-side with the six nearest Lucide icons at 16px and 20px, in both themes. If it reads as a guest, it doesn't ship.
- Source lives in `packages/ui/icons` as a component matching the `lucide-react` API, and gets a row in the registry (§3) before merge.

---

## 7. Implementation notes

- **Imports are tree-shaken:** `import { Receipt } from "lucide-react"` per glyph — never the whole package, never a dynamic string-keyed icon map in feature code (it defeats tree-shaking). The registry maps concepts to components once in `packages/ui`.
- **Decorative by default:** icons accompanying visible text render `aria-hidden="true"` — the text carries the meaning.
- **Meaningful when alone:** icon-only controls get an accessible name (`aria-label` via the wrapper's required prop) plus a tooltip; standalone status glyphs get `role="img"` with a name.
- Icons never convey information that exists nowhere else in accessible form ([11 §10](../11_Design_Principles.md)).

---

## 8. Do / don't

| # | Do | Don't |
|---|---|---|
| 1 | Use Lucide for everything | Import "just one" Heroicon that looks close enough |
| 2 | Pick glyphs from the registry (§3) | Choose an icon per-feature because it "felt right" |
| 3 | Render 16px in dense UI, 20px in nav | Eyeball an 18px icon into a slot |
| 4 | Keep stroke width 2 everywhere | Thin strokes for "elegance" or thick for "emphasis" |
| 5 | Let icons inherit text color | Give an icon its own decorative hue |
| 6 | Reserve accent icons for active nav and Aurex | Accent-tint icons to make a row feel important |
| 7 | Pair every icon with text by default | Ship rows of unlabeled mystery glyphs |
| 8 | Give icon-only buttons 32px targets, names, tooltips | Ship a bare 16px click target |
| 9 | Draw missing glyphs on the Lucide grid | Paste an SVG from a random icon site |
| 10 | Use ✦ only for AI attribution, with hover provenance | Sprinkle ✦ or ✨ as premium garnish |
| 11 | Amend the registry when adding a concept | Let two glyphs drift into meaning the same thing |
| 12 | Use `triangle-alert` + label for warnings | Convey status with color alone |

---

## 9. Open questions

| # | Question | Owner | Target |
|---|---|---|---|
| 1 | Do boards need a 14px micro-size for ultra-compact density, or does 16px hold? Decide with real board data, not mockups. | CPD | Phase 2 |
| 2 | Should the module registry reserve glyphs for roadmap modules (Chat, Assets) now to prevent later collisions? | CPD | Phase 2 |
| 3 | Filled/duotone variants for selected states (e.g., active nav) — worth the added weight axis, or does accent color suffice? Current position: color suffices. | CPD | Phase 3 |
| 4 | Whether the ✦ mark needs a registered trademark check before marketing use. | Founding CTO | Phase 5 |
