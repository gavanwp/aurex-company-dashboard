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

1. **Apple-quality finish.** Every pixel intentional. If a screen looks 90% done, it isn't done. Craft is a feature: alignment, optical spacing, consistent radii, and typographic rhythm are reviewed like logic is.
2. **Linear-inspired speed and density.** Fast is the personality. Keyboard-first, information-dense without crowding, sub-100 ms perceived response. Power users must never feel the tool is slower than they are.
3. **Notion-like calm simplicity.** Whitespace is functional. Screens present one primary action. Complexity is progressive — visible when summoned, invisible otherwise.
4. **Premium, not decorated.** Restraint reads as premium: a neutral canvas, one accent, subtle depth. No gradients-of-the-month, no glassmorphism for its own sake, no dashboard confetti.
5. **No clutter, ever.** Every element must justify itself. When in doubt, remove. The empty version of a screen is designed as deliberately as the full one.
6. **AI as the calm layer, not the loud one.** Aurex makes the product feel quieter, not busier: it appears when summoned or when genuinely useful, always attributed, never nagging (§9).

Litmus test for any screen: *would this hold up beside Linear and Notion in a side-by-side demo?* If not, it doesn't ship.

## 2. Design tokens

Tokens are the single source of truth, defined once in `packages/ui` and consumed by Tailwind config and shadcn/ui theme.

- **Semantic over raw.** Components never reference raw values (`#6E56CF`, `gray-200`, `16px`). They reference intent: `bg-surface`, `text-muted`, `border-subtle`, `accent-solid`, `status-danger`. Raw palettes exist only inside the token definition layer.
- **Two-layer model.** Layer 1: primitive scales (neutral 1–12, accent 1–12, status scales — Radix-style). Layer 2: semantic aliases mapped per theme (`--bg-app`, `--bg-surface`, `--bg-raised`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-subtle`, `--border-strong`, `--accent-solid`, `--accent-soft`, `--focus-ring`).
- **Dark + light as first-class.** Both themes ship with every component from day one. Dark is not inverted light — it has its own surface ramp (app < surface < raised) and reduced-saturation status colors. Default follows system preference; user override persists per user.
- **Brand accent.** One accent (AurexDesigns violet family) used sparingly: primary actions, active states, focus, Aurex presence. If a screen is >10% accent-colored, it's wrong.
- **Token changes are design decisions**, made in `packages/ui` and reviewed like API changes. No component-local color/spacing overrides.

## 3. Typography

- **Typeface:** **Geist Sans** for UI (fallback: Inter, system-ui). **Geist Mono** for code, IDs, amounts, and tabular data. Self-hosted, `font-display: swap`, variable font.
- **Numbers:** `font-variant-numeric: tabular-nums` on all tables, finance surfaces, and countdowns.

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

Rules: body text is 14px — this is a dense professional tool, not a marketing site. Weights limited to 400/500/600 (700 reserved for numerals in stats). Line length in reading surfaces (docs, KB) capped at ~68ch. Letter-spacing: default, except slight tightening (−0.01em) at ≥18px.

## 4. Spacing & layout

- **4px base unit.** All spacing/sizing on the 4px grid: 4, 8, 12, 16, 24, 32, 48, 64. Component internals prefer 8/12; section separation prefers 24/32. No 5px, no 10px, ever.
- **App shell:** fixed left **sidebar** (240px default, collapsible to 64px icon rail) + **content area** (max-width per surface: full-bleed for boards/tables, ~880px centered for docs/settings) + optional **right context panel** (360px — details, comments, Aurex). Portal uses the same shell with client-scoped navigation.
- **Command palette (Cmd+K) is a core surface**, not a shortcut gimmick: navigation, actions, entity search, and Aurex all live there. Every feature must register its nav target and primary actions in the palette registry to be considered shipped.
- **Radii:** 6px controls, 8px cards, 12px dialogs/panels — one system, no per-component invention. **Depth:** borders and subtle background steps first; shadows only for genuinely floating layers (menus, dialogs, palette).
- **Density:** default comfortable; tables and boards offer a compact toggle (persisted per user). Minimum pointer target 32×32px even in compact.

## 5. Color system

- **Neutral-first.** ~90% of any screen is the neutral ramp. A 12-step neutral scale drives backgrounds (steps 1–3), borders (4–6), muted text (8–9), and primary text (11–12) — mirrored appropriately in dark.
- **Restrained accent** per §2. Accent-soft backgrounds for selected states; accent-solid only for primary buttons, active nav, focus, and Aurex identity moments.
- **Semantic status colors** — the only other hues allowed: `success` (green), `warning` (amber), `danger` (red), `info` (blue). Each has solid/soft/text variants per theme. Status colors mean status — never decoration. Status is never conveyed by color alone (icon or label always accompanies it).
- **Contrast:** WCAG 2.1 **AA in both themes** is a merge requirement — 4.5:1 for text, 3:1 for large text and UI boundaries. Verified by automated checks on token pairs plus axe checks in Playwright.
- **Data visualization** uses a dedicated categorical ramp derived from the token layer, color-blind safe, consistent across Analytics, Finance, and Monitoring.

## 6. Components

- **Built on shadcn/ui**, themed by our tokens. shadcn gives structure and accessibility primitives (Radix); the visual layer is entirely ours.
- **Every component lives in `packages/ui`.** Apps compose, they do not define. A component created inside `apps/web` twice is a lint failure — extract it ([12_Project_Rules.md](./12_Project_Rules.md), Architecture rules).
- **Every interactive component defines all states:** default, `hover`, `focus-visible`, `active`, `disabled`, `loading`, and where applicable `empty` and `error`. A PR adding a component without its states is incomplete. Storybook (or the equivalent gallery route) documents each state in both themes.
- **State specifics:**
  - *Focus:* 2px `--focus-ring` outline with 2px offset — always visible for keyboard focus, never removed.
  - *Disabled:* reduced opacity + `not-allowed` cursor; disabled controls still expose a tooltip explaining *why* when the reason isn't obvious.
  - *Loading:* buttons keep their width and show an inline spinner + label; surfaces use skeletons (§8), never full-page spinners.
  - *Empty:* every list/table/board has a designed empty state that teaches — what this is, why it's useful, one primary CTA, optionally an "ask Aurex to set this up" action.
  - *Error:* inline, specific, recoverable — what failed, why (if known), and a retry affordance. Raw error codes never reach the UI.
- **Composition over configuration:** prefer compound components (`<DataTable.Toolbar>`) to 20-prop monoliths.

## 7. Motion

- **Framer Motion only**, wrapped in shared variants in `packages/ui/motion` — no ad-hoc keyframes per feature.
- **Durations:** 150 ms for micro-interactions (hover, toggles), 200 ms for surface transitions (panels, popovers), 250 ms max for large surfaces (dialogs, palette). Nothing slower without explicit design sign-off. Standard easing: ease-out for entering, ease-in for exiting.
- **Purposeful only.** Motion must communicate — origin (where a panel came from), relationship (card → detail), or confirmation (check morph on save). Decorative motion, looping ambience, and attention-seeking bounces are banned.
- **Never block input.** Users can act mid-animation; interruptible transitions everywhere.
- **`prefers-reduced-motion` respected globally:** transform/opacity animations collapse to fast fades or nothing; no parallax, no auto-playing movement. This is wired at the motion-wrapper level so features can't forget it.
- **Streaming text** (Aurex responses) is motion too: steady token flow, no artificial typewriter throttling, layout reserved in advance so content doesn't jump.

## 8. Interaction principles

1. **Keyboard-first.** Every core flow completable without a mouse. Global: Cmd+K palette, `/` search where contextual, `?` shortcut overlay. Surface-local: Linear-style single-key shortcuts on boards/lists (e.g., `a` assign, `d` due date). New features ship their shortcuts with the feature, registered in the shortcut registry.
2. **Instant feedback (<100 ms).** Every interaction acknowledges within 100 ms — state change, optimistic render, or skeleton. If real work takes longer, the UI says so honestly (progress, not lies).
3. **Optimistic UI as default** for high-frequency mutations (tasks, comments, statuses) via the standard TanStack Query mutation pattern: apply locally, reconcile on response, roll back with a toast + retry on failure. Money and destructive operations are **never** optimistic.
4. **Skeletons over spinners.** Content-shaped skeletons that match final layout; spinners only for sub-element loading (button in-flight). No full-page spinners after the app shell has painted. No layout shift when data lands.
5. **Empty states that teach** (§6). First-run experience is a designed journey, not a blank table.
6. **Undo over confirm.** Frequent, reversible actions execute immediately with a 5-second undo toast. Confirmation dialogs are reserved for genuinely destructive/irreversible acts, and destructive confirmations require typing or an explicit danger-styled button — never a default-focused "OK".
7. **Everything is a link.** Entities (task, invoice, contact) have canonical URLs; cmd-click always works; navigation state survives refresh.
8. **Autosave everywhere** in editors, with visible save-state ("Saved just now"). Explicit Save buttons only where a draft/publish distinction is real (proposals, portal-visible docs).

## 9. AI UX patterns — how Aurex appears

Aurex is the operating system's voice. It must feel like a colleague: competent, attributed, interruptible, and never spooky.

- **Command palette as AI front door.** Cmd+K accepts natural language alongside commands; queries that aren't direct matches route to Aurex inline. One surface, zero mode-switching.
- **Side panel for conversation.** A dockable right-panel thread with full workspace context of the current view ("this project", "this invoice"). Persistent history, per-workspace. It is a panel, not a floating bubble — this is an OS surface, not a support widget.
- **Inline ghost suggestions.** In editors and composers, Aurex offers ghost-text completions (muted text, `Tab` accepts, `Esc` dismisses, any keystroke ignores). Suggestions never auto-commit. Frequency-capped so writing never feels contested.
- **Approval cards for AI actions.** Any AI-proposed action with side effects renders as a structured card: what will happen, to what records, diff/preview, cost if relevant — with **Approve / Edit / Dismiss**. Outbound (emails, portal publishes) and destructive actions *always* pass through approval cards; no silent execution ([12_Project_Rules.md](./12_Project_Rules.md), AI rules).
- **Streaming responses** with visible progress, a stop button, and tool-use steps disclosed ("Searching invoices… found 3"). Grounded answers cite sources as links to the actual records.
- **Always-visible attribution.** Every AI-created or AI-modified artifact carries a persistent "✦ Aurex" marker with hover detail (when, from what instruction, approved by whom). Attribution appears in audit logs, activity feeds, and on the artifact itself. Users can always distinguish human work from AI work — forever, not just at creation time.
- **Confidence honesty.** Aurex says "I couldn't find that" rather than guessing; low-confidence outputs are labeled as drafts. Wrong-but-confident is the one unforgivable AI behavior.
- **Quiet by default.** Proactive Aurex output is confined to designated digest surfaces (dashboard briefing, scheduled reports). Aurex never interrupts with popups, never toasts "did you know I can…", never gates features behind AI upsells.

## 10. Accessibility

- **WCAG 2.1 AA** is the floor across both themes, enforced by axe checks in Playwright CI plus manual audit at each phase gate ([10_Roadmap.md](./10_Roadmap.md) §9).
- **Focus management:** visible focus ring always (§6); dialogs/panels trap focus, restore it on close, and are dismissible with `Esc`; palette and menus fully arrow-key navigable; skip-to-content link in the shell.
- **Screen readers:** semantic HTML first, ARIA where semantics fall short (Radix supplies most). Live regions announce async results, toasts, and Aurex streaming completion. Icon-only buttons always carry accessible names. Tables use real table semantics with sortable-state announcements.
- **Motor & vision:** all functionality keyboard-operable (§8); minimum 32px targets; UI scales cleanly to 200% zoom; color-blind-safe status treatment (§5); reduced-motion honored (§7).
- **AI surfaces are accessible surfaces:** streaming output readable by screen readers without spamming (buffered announcements), approval cards fully keyboard-operable, ghost text exposed non-visually as suggestions.

## 11. Content & voice

- **Concise.** Buttons are verbs ("Create invoice", never "Submit"). Titles ≤ 6 words. Helper text one sentence. If a paragraph is needed, the design is wrong.
- **Human, calm, direct.** We write like a competent colleague: "Couldn't send — the client's email bounced. Fix the address and retry." Never robotic ("Error 422: validation failure"), never cute-panicky ("Whoops! Something went wrong 😅").
- **No jargon.** Users see "workspace", "client", "invoice" — never "tenant", "entity", "record locked by RLS". Internal vocabulary stays internal.
- **Sentence case everywhere** — titles, buttons, labels. No Title Case, no ALL CAPS except tiny badge labels.
- **Aurex's voice:** first person, brief, concrete, cites its sources, states uncertainty plainly, never apologizes theatrically and never over-hedges. Aurex refers to itself as "I" and to actions honestly: "I drafted this — review before sending."
- **Numbers, dates, money:** locale-aware formatting; relative time for recent ("2h ago") with absolute on hover; money always with currency code/symbol and tabular figures.

## 12. Anti-patterns — what we never do

1. **Modals-on-modals.** One overlay layer max; nested flows use panels or full pages.
2. **Nagging upsells.** No feature-gated teaser buttons that open pricing dialogs mid-task, no persistent upgrade banners in work surfaces. Plan limits are communicated at the moment of need, once, respectfully.
3. **Notification spam.** No default-on notifications for low-value events; batching and quiet hours by default; every notification type individually mutable. If users mass-disable a notification type, we delete it, not re-enable it.
4. **Confirmation fatigue.** No dialogs for reversible actions (undo instead, §8.6).
5. **Spinners as personality.** No full-page loaders, no fake progress bars.
6. **Mystery AI.** No unattributed AI content, no silent AI mutations, no "smart" defaults that change user data without a visible record.
7. **Dark patterns of any kind.** No guilt-trip cancel flows, no pre-checked marketing consents, no hidden data collection, no fake urgency.
8. **Toast abuse.** Toasts confirm and offer undo; they never carry errors requiring action (those render inline), never stack past three, never auto-dismiss actionable content.
9. **Settings sprawl.** A preference is a design decision we refused to make. New settings require justification; defaults must be right for 90% of users.
10. **Novelty-driven redesigns.** Visual language changes go through tokens and design review — never one feature "trying something new".

## 13. Governance

- This document binds all UI work; deviations require a written exception in the PR and an update here if the deviation is right.
- The token layer, component states, contrast, reduced-motion, and attribution rules are enforced mechanically (lint/CI) per [12_Project_Rules.md](./12_Project_Rules.md); the rest is enforced in design review, which is part of code review for any PR touching UI.
- Changes to this document follow the rule-change process in [12_Project_Rules.md](./12_Project_Rules.md) §10.
