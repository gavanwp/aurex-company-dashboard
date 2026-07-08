# 11 — Design Principles

| | |
|---|---|
| **Document** | Design Principles & UI Bible — AurexOS |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Founding CTO / Senior UI-UX Architect, AurexDesigns |
| **Related** | [01_Project_Vision.md](./01_Project_Vision.md) · [04_Feature_List.md](./04_Feature_List.md) · [10_Roadmap.md](./10_Roadmap.md) · [12_Project_Rules.md](./12_Project_Rules.md) |

---

## 1. Philosophy

AurexOS is where an agency team lives for eight hours a day. The design bar is therefore not "good SaaS" — it is **tools people are proud to have open on a screenshare**.

1. **Apple-quality finish.** Every pixel intentional. If a screen looks 90% done, it isn't done. Craft is a feature: alignment, optical spacing, consistent radii, and typographic rhythm are reviewed the same way logic is.
2. **Linear-inspired speed and density.** Fast is the personality. Keyboard-first, information-dense without crowding, sub-100 ms perceived response. Power users must never feel the tool is slower than they are.
3. **Notion-like calm simplicity.** Whitespace is functional. Screens present one primary action. Complexity is progressive — visible when summoned, invisible otherwise.
4. **Premium, not decorated.** Restraint reads as premium: a neutral canvas, one accent, subtle depth. No gradients-of-the-month, no glassmorphism for its own sake, no dashboard confetti.
5. **No clutter, ever.** Every element must justify itself. When in doubt, remove. The empty version of a screen is designed as deliberately as the full one.
6. **AI as the calm layer, not the loud one.** Aurex makes the product feel quieter, not busier: it appears when summoned or when genuinely useful, always attributed, never nagging (§9).

Litmus test for any screen: *would this hold up beside Linear and Notion in a side-by-side demo?* If not, it doesn't ship.

## 2. Design tokens

Tokens are the single source of truth, defined once in `packages/ui` and consumed by the Tailwind config and the shadcn/ui theme. No component references a raw value.

### 2.1 Semantic over raw

- Components never reference raw values (`#6E56CF`, `gray-200`, `16px`). They reference intent: `bg-surface`, `text-muted`, `border-subtle`, `accent-solid`, `status-danger`.
- Raw palettes exist only inside the token definition layer, where they are mapped to semantics per theme.
- A hex code appearing in feature code is a lint failure ([12_Project_Rules.md](./12_Project_Rules.md) enforcement applies to the design system too).

### 2.2 Two-layer model

- **Layer 1 — primitives:** 12-step neutral scale, 12-step accent scale, status scales (Radix-style ramps). Nobody outside `packages/ui` touches these.
- **Layer 2 — semantic aliases**, mapped per theme:
  - Surfaces: `--bg-app`, `--bg-surface`, `--bg-raised`, `--bg-overlay`
  - Text: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-disabled`
  - Borders: `--border-subtle`, `--border-strong`, `--border-focus`
  - Accent: `--accent-solid`, `--accent-soft`, `--accent-text`
  - Status: `--status-{success,warning,danger,info}-{solid,soft,text}`
  - Focus: `--focus-ring`

### 2.3 Dark + light as first-class

- Both themes ship with every component from day one; a component that looks wrong in one theme is a bug, not a backlog item.
- Dark is not inverted light — it has its own surface ramp (app < surface < raised) and reduced-saturation status colors to avoid neon-on-black glare.
- Default follows system preference; explicit user override persists per user across devices.

### 2.4 Brand accent

- One accent (AurexDesigns violet family), used sparingly: primary actions, active nav, selection, focus, and Aurex identity moments.
- Heuristic: if a screen is more than ~10% accent-colored, it's wrong.
- Token changes are design decisions, made in `packages/ui` and reviewed like API changes. No component-local color or spacing overrides, ever.

## 3. Typography

- **Typeface:** **Geist Sans** for UI (fallback stack: Inter, system-ui). **Geist Mono** for code, IDs, amounts, and tabular data. Self-hosted variable fonts, `font-display: swap`.
- **Numbers:** `font-variant-numeric: tabular-nums` on all tables, finance surfaces, timers, and stat tiles — columns of figures must align.

| Token | Size / Line-height | Weight | Use |
|---|---|---|---|
| `display` | 30px / 36px | 600 | Page-level hero (rare — settings, onboarding) |
| `title-1` | 24px / 32px | 600 | Page titles |
| `title-2` | 18px / 26px | 600 | Section headers, dialog titles |
| `title-3` | 15px / 22px | 600 | Card headers, group labels |
| `body` | 14px / 22px | 400 | Default UI text |
| `body-strong` | 14px / 22px | 500 | Emphasis, table headers, buttons |
| `small` | 13px / 18px | 400 | Dense tables, list metadata |
| `caption` | 12px / 16px | 400 | Timestamps, helper text, badges |

Rules:

- Body text is 14px. This is a dense professional tool, not a marketing site; 16px body is for the commercial website, not the app.
- Weights limited to 400 / 500 / 600. 700 is reserved for numerals in stat tiles.
- Line length in reading surfaces (Documents, Knowledge Base) capped at ~68ch.
- Letter-spacing: default at body sizes; slight tightening (−0.01em) at ≥18px.
- No font-size soup: only the eight tokens above exist. A ninth size requires amending this document.

## 4. Spacing & layout

### 4.1 The 4px grid

- All spacing and sizing on the 4px base unit: 4, 8, 12, 16, 24, 32, 48, 64.
- Component internals prefer 8/12; section separation prefers 24/32. No 5px, no 10px, no "it looked right at 14", ever.

### 4.2 App shell

- Fixed left **sidebar**: 240px default, collapsible to a 64px icon rail; workspace switcher on top, module nav, Aurex entry at bottom.
- **Content area**: full-bleed for boards and tables; ~880px centered column for docs, settings, and reading surfaces.
- Optional **right context panel** (360px): entity details, comments, activity, and the Aurex conversation (§9). One panel at a time; panels replace, never stack.
- The Client Portal uses the same shell with client-scoped navigation — one design system, two audiences.

### 4.3 Command palette (Cmd+K) as a core surface

- Navigation, actions, entity search, and Aurex all live in the palette. It is a primary interface, not a shortcut gimmick.
- Every feature must register its nav target and primary actions in the palette registry to be considered shipped — this is a definition-of-done item.

### 4.4 Shape and depth

- **Radii:** 6px controls, 8px cards, 12px dialogs and panels. One system; no per-component invention.
- **Depth:** borders and subtle background steps first; shadows only for genuinely floating layers (menus, dialogs, palette). Two shadow levels exist; there is no third.
- **Density:** comfortable by default; tables and boards offer a compact toggle, persisted per user. Minimum pointer target 32×32px even in compact.

## 5. Color system

- **Neutral-first.** ~90% of any screen is the neutral ramp: backgrounds (steps 1–3), borders (4–6), muted text (8–9), primary text (11–12), mirrored appropriately in dark.
- **Restrained accent** per §2.4: accent-soft backgrounds for selected states; accent-solid only for primary buttons, active nav, focus, and Aurex identity.
- **Semantic status colors** are the only other hues allowed:
  - `success` (green) — completions, paid, healthy
  - `warning` (amber) — at risk, expiring, needs attention
  - `danger` (red) — errors, overdue, destructive actions
  - `info` (blue) — neutral notices
  - Each has solid/soft/text variants per theme. Status colors mean status — never decoration — and status is never conveyed by color alone (icon or label always accompanies it).
- **Contrast:** WCAG 2.1 **AA in both themes** is a merge requirement — 4.5:1 for text, 3:1 for large text and meaningful UI boundaries. Verified by automated checks on token pairs plus axe assertions in Playwright.
- **Data visualization** uses a dedicated categorical ramp derived from the token layer: color-blind safe, consistent across Analytics, Finance, and Monitoring, with the same series always getting the same hue.

## 6. Components

### 6.1 Foundation

- **Built on shadcn/ui**, themed by our tokens. shadcn/Radix supplies structure and accessibility primitives; the visual layer is entirely ours.
- **Every component lives in `packages/ui`.** Apps compose; they do not define. A component created inside `apps/web` twice is a lint failure — extract it ([12_Project_Rules.md](./12_Project_Rules.md) R-A4).
- **Composition over configuration:** prefer compound components (`<DataTable.Toolbar>`) to 20-prop monoliths.
- A Storybook-equivalent gallery route documents every component in every state, in both themes. Undocumented states don't exist.

### 6.2 Every state, every component

Every interactive component defines: default, `hover`, `focus-visible`, `active`, `disabled`, `loading` — and where applicable `empty` and `error`. A PR adding a component without its states is incomplete.

- **Focus:** 2px `--focus-ring` outline with 2px offset — always visible for keyboard focus, never removed, never replaced with a subtle glow nobody can see.
- **Disabled:** reduced opacity + `not-allowed` cursor; disabled controls expose a tooltip explaining *why* when the reason isn't obvious.
- **Loading:** buttons keep their width and show an inline spinner + label; surfaces use skeletons (§8.4), never full-page spinners.
- **Empty:** every list, table, and board has a designed empty state that teaches — what this is, why it's useful, one primary CTA, and optionally an "ask Aurex to set this up" action.
- **Error:** inline, specific, recoverable — what failed, why (if known), and a retry affordance. Raw error codes never reach the UI ([12_Project_Rules.md](./12_Project_Rules.md) R-Q6).

### 6.3 Iconography

- One icon set (Lucide), one stroke weight, sized 16px in dense UI and 20px in nav.
- Icons accompany text by default; icon-only buttons require an accessible name and a tooltip.
- No emoji as UI iconography. The single exception: the ✦ Aurex attribution mark (§9).

## 7. Motion

- **Framer Motion only**, wrapped in shared variants in `packages/ui/motion` — no ad-hoc keyframes or transition values per feature.
- **Durations:** 150 ms micro-interactions (hover, toggles) · 200 ms surface transitions (panels, popovers) · 250 ms max for large surfaces (dialogs, palette). Nothing slower without explicit design sign-off.
- **Easing:** ease-out entering, ease-in exiting. Springs only for drag-and-drop physicality (boards), tuned once, reused everywhere.
- **Purposeful only.** Motion must communicate origin (where a panel came from), relationship (card → detail), or confirmation (check morph on save). Decorative motion, looping ambience, and attention-seeking bounces are banned.
- **Never block input.** Users can act mid-animation; every transition is interruptible.
- **`prefers-reduced-motion` respected globally:** transform/opacity animations collapse to fast fades or nothing; no parallax, no auto-playing movement. Wired at the motion-wrapper level so features cannot forget it.
- **Streaming text** (Aurex responses) is motion too: steady token flow, no artificial typewriter throttling, layout reserved in advance so content doesn't jump.

## 8. Interaction principles

1. **Keyboard-first.** Every core flow completable without a mouse. Global: Cmd+K palette, `/` search where contextual, `?` opens the shortcut overlay. Surface-local: Linear-style single-key shortcuts on boards and lists (`a` assign, `d` due date, `p` priority). New features ship their shortcuts with the feature, registered in the shortcut registry.
2. **Instant feedback (<100 ms).** Every interaction acknowledges within 100 ms — a state change, an optimistic render, or a skeleton. If real work takes longer, the UI says so honestly: progress, not lies.
3. **Optimistic UI as default** for high-frequency mutations (tasks, comments, statuses), via the one standard TanStack Query mutation pattern: apply locally, reconcile on response, roll back with a toast + retry on failure. Money and destructive operations are **never** optimistic.
4. **Skeletons over spinners.** Content-shaped skeletons that match the final layout; spinners only for sub-element loading (a button in flight). No full-page spinners after the app shell has painted. Zero layout shift when data lands.
5. **Empty states that teach** (§6.2). The first-run experience is a designed journey, not a blank table.
6. **Undo over confirm.** Frequent, reversible actions execute immediately with a 5-second undo toast. Confirmation dialogs are reserved for genuinely destructive, irreversible acts — and destructive confirmations require typing the entity name or an explicit danger-styled button, never a default-focused "OK".
7. **Everything is a link.** Every entity (task, invoice, contact, document) has a canonical URL; cmd-click always works; navigation state survives refresh; back means back.
8. **Autosave everywhere** in editors, with visible save state ("Saved just now"). Explicit Save buttons only where a draft/publish distinction is real (proposals, portal-visible documents).

## 9. AI UX patterns — how Aurex appears

Aurex is the operating system's voice. It must feel like a competent colleague: capable, attributed, interruptible, and never spooky.

- **Command palette as AI front door.** Cmd+K accepts natural language alongside commands; queries that aren't direct matches route to Aurex inline. One surface, zero mode-switching.
- **Side panel for conversation.** A dockable right-panel thread with full context of the current view ("this project", "this invoice"). Persistent history per workspace. It is a panel in the shell — not a floating bubble; this is an OS surface, not a support widget.
- **Inline ghost suggestions.** In editors and composers, Aurex offers ghost-text completions: muted text, `Tab` accepts, `Esc` dismisses, any other keystroke ignores. Suggestions never auto-commit and are frequency-capped so writing never feels contested.
- **Approval cards for AI actions.** Any AI-proposed action with side effects renders as a structured card: what will happen, to which records, a diff or preview, and cost where relevant — with **Approve / Edit / Dismiss**. Outbound actions (emails, portal publishes) and destructive actions *always* pass through approval cards; there is no silent execution ([12_Project_Rules.md](./12_Project_Rules.md) R-AI3).
- **Streaming responses** with visible progress, a stop button, and disclosed tool-use steps ("Searching invoices… found 3"). Grounded answers cite sources as links to the actual records.
- **Always-visible attribution.** Every AI-created or AI-modified artifact carries a persistent "✦ Aurex" marker with hover detail: when, from what instruction, approved by whom. Attribution appears in audit logs, activity feeds, and on the artifact itself. Users can always distinguish human work from AI work — permanently, not just at creation time.
- **Confidence honesty.** Aurex says "I couldn't find that" rather than guessing; low-confidence output is labeled as a draft. Wrong-but-confident is the one unforgivable AI behavior.
- **Quiet by default.** Proactive Aurex output is confined to designated digest surfaces (dashboard briefing, scheduled reports). Aurex never interrupts with popups, never toasts "did you know I can…", never gates features behind AI upsells.

## 10. Accessibility

- **WCAG 2.1 AA** is the floor across both themes, enforced by axe checks in Playwright CI plus a manual audit at each phase gate ([10_Roadmap.md](./10_Roadmap.md) §9).
- **Focus management:**
  - Visible focus ring always (§6.2); dialogs and panels trap focus and restore it on close; `Esc` dismisses every overlay.
  - Palette and menus are fully arrow-key navigable; a skip-to-content link lives in the shell.
- **Screen readers:**
  - Semantic HTML first; ARIA where semantics fall short (Radix supplies most of it).
  - Live regions announce async results, toasts, and Aurex streaming completion.
  - Icon-only buttons always carry accessible names; tables use real table semantics with sortable-state announcements.
- **Motor & vision:**
  - All functionality keyboard-operable (§8); minimum 32px targets; UI scales cleanly to 200% zoom.
  - Color-blind-safe status treatment (§5); reduced motion honored (§7).
- **AI surfaces are accessible surfaces:** streaming output is readable by screen readers without spamming (buffered announcements), approval cards are fully keyboard-operable, and ghost text is exposed non-visually as a suggestion, not as document content.

## 11. Content & voice

- **Concise.** Buttons are verbs ("Create invoice", never "Submit"). Titles ≤ 6 words. Helper text is one sentence. If a paragraph is needed, the design is wrong.
- **Human, calm, direct.** We write like a competent colleague: "Couldn't send — the client's email bounced. Fix the address and retry." Never robotic ("Error 422: validation failure"), never cute-panicky ("Whoops! Something went wrong 😅").
- **No jargon.** Users see "workspace", "client", "invoice" — never "tenant", "entity", "record locked by RLS". Internal vocabulary stays internal.
- **Sentence case everywhere** — titles, buttons, labels. No Title Case, no ALL CAPS except tiny badge labels.
- **Aurex's voice:** first person, brief, concrete. Cites its sources, states uncertainty plainly, never apologizes theatrically, never over-hedges. Aurex refers to itself as "I" and describes actions honestly: "I drafted this — review before sending."
- **Numbers, dates, money:** locale-aware formatting; relative time for recent events ("2h ago") with absolute time on hover; money always with currency symbol/code and tabular figures.

## 12. Anti-patterns — what we never do

1. **Modals-on-modals.** One overlay layer maximum; nested flows use panels or full pages.
2. **Nagging upsells.** No feature-gated teaser buttons that open pricing dialogs mid-task, no persistent upgrade banners inside work surfaces. Plan limits are communicated at the moment of need, once, respectfully.
3. **Notification spam.** No default-on notifications for low-value events; batching and quiet hours by default; every notification type individually mutable. If users mass-disable a notification type, we delete it — we don't re-enable it.
4. **Confirmation fatigue.** No dialogs for reversible actions — undo instead (§8.6).
5. **Spinners as personality.** No full-page loaders, no fake progress bars.
6. **Mystery AI.** No unattributed AI content, no silent AI mutations, no "smart" defaults that change user data without a visible record.
7. **Dark patterns of any kind.** No guilt-trip cancel flows, no pre-checked marketing consents, no hidden data collection, no fake urgency.
8. **Toast abuse.** Toasts confirm and offer undo; they never carry errors that require action (those render inline), never stack past three, never auto-dismiss actionable content.
9. **Settings sprawl.** A preference is a design decision we refused to make. New settings require justification; defaults must be right for 90% of users.
10. **Novelty-driven redesigns.** Visual language changes go through tokens and design review — never one feature "trying something new".

## 13. Governance

- This document binds all UI work. Deviations require a written exception in the PR — and an amendment here if the deviation turns out to be right.
- The mechanically enforceable parts — token usage, component states, contrast, reduced motion, attribution — are enforced by lint/CI per [12_Project_Rules.md](./12_Project_Rules.md). The rest is enforced in design review, which is part of code review for any PR touching UI (R-Q3).
- Changes to this document follow the rule-change process in [12_Project_Rules.md](./12_Project_Rules.md) §10.
