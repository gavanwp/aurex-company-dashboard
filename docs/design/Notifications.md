# Notifications — AurexOS Design System

| | |
|---|---|
| **Document** | Notification UI/UX — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [DashboardRules.md](./DashboardRules.md) · [Components.md](./Components.md) · [DesignTokens.md](./DesignTokens.md) · [../architecture/NotificationsArchitecture.md](../architecture/NotificationsArchitecture.md) · [../11_Design_Principles.md](../11_Design_Principles.md) · [../06_Module_Breakdown.md](../06_Module_Breakdown.md) |

This document is the binding UI/UX specification for notifications across AurexOS: the in-app inbox, toasts, badges, digests, push, and the preference center. The engine — pipeline, coalescing windows, channel adapters, retry, deliverability — lives in [../architecture/NotificationsArchitecture.md](../architecture/NotificationsArchitecture.md) and is **not respecified here**; where a rule below names a behavior (folding, priority, mandatory categories), the engine document defines how it is computed and this one defines how it looks and behaves.

---

## 1. Notification design philosophy

AurexOS is where people work eight hours a day; every interruption spends their attention. Binding principles:

1. **Respectful by architecture, not by settings.** Batching, coalescing, quiet hours, and digests are defaults, not opt-ins the user must discover ([../11_Design_Principles.md](../11_Design_Principles.md) §12.3).
2. **Every notification is actionable or genuinely informative.** If the recipient can neither act on it nor is meaningfully better informed by it, it does not exist as a type. "Engagement" is not a purpose.
3. **The delete-unloved-types law.** A notification type that users mass-disable gets **deleted from the product** — not re-enabled, not "re-imagined," not defaulted back on in a redesign. Opt-out rates are a tracked metric with a removal threshold ([../architecture/NotificationsArchitecture.md §6.4](../architecture/NotificationsArchitecture.md)).
4. **One system.** No module ships its own bell, banner, or badge. Everything noteworthy flows through this design and the one engine.
5. **Muting is a first-class feature.** Every surface that shows a notification also offers, one click deep, the way to never see its type again. Easy muting keeps the remaining notifications trusted.

## 2. The notification taxonomy

Eight visual classes. Every notification type maps to exactly one; a type that fits none is a design discussion, not a ninth class.

| Class | Icon (Lucide) | Priority band | Default channels | Coalescing |
|---|---|---|---|---|
| Mention | `at-sign` | High | In-app + push | Per-thread ("3 mentions in Meridian brief") |
| Assignment | `user-plus` | High | In-app + email | Per-actor-batch ("Omar assigned you 4 tasks") |
| Approval request | `check-circle` | **Mandatory** — top | In-app + email + push | **Never** (window 0) |
| Status change | `arrow-right-circle` | Medium | In-app | Per entity group ("Meridian: 5 tasks moved to Done") |
| Comment / reply | `message-circle` | Medium | In-app; email if unread 1h | Per thread |
| System / security | `shield-alert` | **Mandatory** — top | All channels | **Never**; bypasses quiet hours |
| AI-proposed ✦ | ✦ mark + `sparkle`-free (the mark *is* the icon) | High (it awaits a decision) | In-app | Never — each proposal is a decision |
| Digest | `newspaper` | Low (scheduled) | Email + in-app card | Is itself the coalescer |

- Priority bands order the inbox and the dashboard attention strip; within a band, AI priority ranking may reorder (L3 read-only — content never altered, per [../architecture/NotificationsArchitecture.md §10](../architecture/NotificationsArchitecture.md)).
- Mandatory classes (approval, security) can be rerouted between channels but never fully silenced, and never fold into digests.
- Class icons are tinted `--text-muted`; only security uses `--status-danger-text`. Status colors mean status ([../11_Design_Principles.md](../11_Design_Principles.md) §5).

## 3. In-app inbox (Notification Center)

The reference surface for every type; the UX contract in [../architecture/NotificationsArchitecture.md §5](../architecture/NotificationsArchitecture.md) binds here.

### 3.1 Anatomy

- Opens from the sidebar bell as a right context panel (360px); full-page view exists at `/inbox` for heavy triage. One panel at a time, per shell rules.
- **Filter tabs:** All · Unread · Mentions · Approvals. Exactly four; module filtering happens via a compact filter menu, not more tabs.
- **Grouped by day** ("Today", "Yesterday", then dates). Within a day, priority band then recency.

Row spec:

```
┌──────────────────────────────────────────────────────────┐
│ ◱ [avatar] Priya completed 6 tasks in Meridian    2h  ●  │
│      └ source icon   rendered sentence · entity link      │
└──────────────────────────────────────────────────────────┘
```

| Element | Spec |
|---|---|
| Source icon | 16px module icon, `--text-muted` |
| Actor avatar | 20px; ✦ mark instead of avatar for AI actors |
| Sentence | `body` (14px); actor `body-strong`; entity names are real links |
| Time | `caption`, relative, absolute on hover |
| Unread dot | 6px `--accent-solid` dot, right-aligned |

### 3.2 Row interactions

- **Click** = deep link to the exact entity and position (the comment, the line item) + mark read. Permission-checked at click time.
- **Hover reveals** (right-aligned, icon buttons with tooltips): mark unread · mute this type · unwatch this entity. Where the action is safe and atomic, an inline action button renders persistently (not hover-only): **Approve** on expense approvals, **Acknowledge** on incidents. Inline approvals run the full action spine and are fully audited — an inline approval is a real approval.
- AI-proposed rows expand in place to the approval card ([Components.md §6](./Components.md)); Approve / Edit / Dismiss without leaving the inbox.

### 3.3 Unread model

- **Seen ≠ read.** Opening the panel marks items *seen* (clears the sidebar count); *read* requires a click or explicit mark. The unread dot tracks read.
- Sidebar bell shows a count badge of unseen items (cap per §5); the dot-only state (no number) is not used — a bell that glows without saying how much is anxiety design.

### 3.4 Bulk & keyboard

- **Mark all read** per day-group and globally; never confirmed (reversible). No bulk delete — notifications age out, users don't garbage-collect them.
- Keyboard, minimal pinned set: `j`/`k` move · `Enter` open · `e` mark read + collapse · `u` mark unread. That is the whole set; more chords go to the command palette.

## 4. Toasts

Toast law per [../11_Design_Principles.md](../11_Design_Principles.md) §12.8 — this section is its UI spec.

- **Confirm + undo only.** A toast confirms a completed action and offers undo for 5 seconds. Toasts never carry errors that require action — those render inline at the point of failure.
- **Placement (pinned):** bottom-right on desktop; top, full-width-minus-gutters on mobile (thumbs live at the bottom; toasts must not sit under them).
- **Max 3 stacked**; a fourth collapses the stack to "3 more actions" — it never pushes content or grows past three.
- Actionable toasts never auto-dismiss their action prematurely: undo gets its full 5s; hover/focus pauses the timer.
- **Progress toasts** for long operations the user initiated (export, bulk import): a single persistent toast with honest progress, resolving to a confirm toast with an action button ("Export ready — Download"). One per operation; progress toasts don't count toward the 3-stack until resolved.
- Toasts are not notifications: nothing shown as a toast is also delivered as an inbox row for the same actor's own action.

## 5. Badges & indicators

| Surface | Rule |
|---|---|
| Sidebar bell | Numeric unseen count, capped at **99+** |
| Per-module sidebar badges | **Actionable counts only** — items awaiting *this user's* action (approvals pending, tasks assigned). Never FYI counts. Justification: a badge is a demand for attention; a badge for information the user may safely ignore trains users to ignore all badges, destroying the signal for the ones that matter. |
| Browser tab title count | **Off by default**; per-user opt-in in the preference center. A counting tab title nags from another window. |
| Favicon dot | **No.** Not built. The favicon is identity, not a channel. |
| In-content dots | The 6px unread dot (§3.1) is the only in-content indicator; no pulsing, no animation. |

## 6. Coalescing presentation

Engine-side folding rules live in [../architecture/NotificationsArchitecture.md §9](../architecture/NotificationsArchitecture.md); presentation:

- **Folded row:** one sentence — "Priya completed 6 tasks in Meridian" — with a chevron; expands **in place** to its member items, each independently clickable and mark-readable. Collapsing preserves per-member read state; the fold shows a dot if *any* member is unread.
- Folds render the actor once (single avatar), never an avatar pile for one actor. Multi-actor folds ("3 people commented on Homepage brief") show up to 3 stacked avatars.
- **Burst behavior:** bulk operations arrive as one fold regardless of window ("Import added 500 contacts"), per the engine's batch-ref guard. If a rate cap trips, the user sees a single "High activity in [module]" summary row — the UI never displays a wall of rows and never mentions rate caps or internals.

## 7. Digest design

Layout for both email and the in-app digest card (dashboard band B, [DashboardRules.md §9.1](./DashboardRules.md)):

- **Sections mirror the dashboard digest**, fixed order: Priorities · Risks · Meetings · Overdue — then "Everything else" (the folded digest-only items, grouped by module). Empty sections are omitted.
- **Aurex-narrated with ✦**: opening brief in Aurex's voice (first person, concrete, cites entities); the ✦ mark and "Narrated by Aurex" appear in the header of both email and card. Narration is per-recipient and permission-filtered before generation — no leakage via digest ([../architecture/NotificationsArchitecture.md §7](../architecture/NotificationsArchitecture.md)).
- **Every item deep-links** to its entity; email links are permission-checked at click time. No dead text in a digest.
- Email chrome: neutral, text-first, single-column, no hero images, sender "Aurex (AurexOS)". One footer line links to cadence controls and the preference center — never "unsubscribe from everything" as the only exit.
- **Cadence controls:** daily or weekly, delivery hour user-local, respects quiet hours; controls live in the preference center and are linked from every digest.

## 8. Web push

- **Permission-ask UX:** contextual and earned — we ask only after the user enables a push-worthy preference (e.g., routes approvals to push) or clicks "Enable desktop notifications," and never on first load or during onboarding. The browser prompt is preceded by our own one-line explainer card with a real decline option; declining is remembered and never re-prompted by us.
- **Content minimalism:** push body contains **title + entity type only** — "Approval requested · Expense" — never amounts, names, or message content. Justification: push renders on lock screens and mirrored displays we don't control; workspace data on a lock screen is a privacy breach we would be choosing on the user's behalf.
- **Click-through:** opens (or focuses) the app at the exact entity, marks the notification read. A push and its inbox row are the same notification — acting on one settles both.
- Push is Phase 2–3 and only ever carries high-band and mandatory classes; medium and low classes are not pushable even by preference.

## 9. Preference center

- **The matrix UI:** rows = notification types grouped by module; columns = **In-app · Email · Push · Digest-only · Off**. One control per cell, whole-row quick-set at the group header. Search across types.
- **Quiet hours picker:** start/end (user-local) + day toggles; a one-line note states what quiet hours do (defer, then fold) and what ignores them (security, approvals).
- **Mandatory rows locked:** approval and security rows render with a lock icon and disabled Off cell, with the explanation inline: "Security and approval notifications can be rerouted but not turned off." No mystery-disabled controls ([../11_Design_Principles.md](../11_Design_Principles.md) §6.2).
- **Noise report card** (Phase 3, L1): at the top of the preference center when relevant — "You dismiss 92% of *status change* notifications. Mute them or fold into your digest?" with one-tap **Mute** / **Digest-only** / **Keep**. ✦-attributed; acting is one tap; "Keep" suppresses that suggestion permanently.
- Role defaults ([../architecture/NotificationsArchitecture.md §6.2](../architecture/NotificationsArchitecture.md)) prefill the matrix; a "Reset to role default" affordance mirrors the dashboard's.

## 10. Portal notifications

- Clients receive a **restrained, client-facing subset**: portal messages, shared-document updates, invoice issued/paid, meeting scheduled, proposal status. Internal classes (assignments, status changes, AI proposals, system) never reach clients.
- **Email-first:** clients don't live in AurexOS; email is the primary channel, the portal bell is secondary. No push for portal users.
- **Branded:** portal emails carry the agency's branding (logo, accent) — the client's relationship is with the agency, not with AurexOS. Same neutral text-first layout discipline as §7.
- Frequency conservatism is doubled: default coalescing windows are longer, and there is no client-facing preference matrix — just per-thread mute and a simple email on/off. Clients get simplicity, not our settings surface.

## 11. Accessibility

- **Live regions:** toasts announce via `aria-live="polite"`; security/mandatory alerts use `assertive`. Digest and inbox updates do not announce — they're pull surfaces.
- **Focus:** toasts **never steal focus**; their actions are reachable via a documented shortcut (F6 rotation to the toast region) and the keyboard set in §3.4. Dismissal never moves focus. Inline approval cards are fully keyboard-operable per [../11_Design_Principles.md](../11_Design_Principles.md) §10.
- **Screen-reader sentence templates:** every notification renders a complete sentence with no icon-dependence: "{actor} {verb} {entity} in {project}, {relative time}, unread." Folded rows announce the fold: "Priya completed 6 tasks in Meridian, collapsed, press Enter to expand." The unread dot is exposed as state, not as a mystery graphic.
- Badge counts are exposed as accessible names ("Notifications, 12 unseen"), and the 99+ cap reads as "more than 99."
- Coalesced expansion, filter tabs, and the preference matrix are all arrow-key navigable; the matrix exposes row/column headers as real table semantics.

## 12. Do / Don't

| # | Do | Don't |
|---|---|---|
| 1 | Delete notification types users mass-disable | Re-enable or "relaunch" an unloved type |
| 2 | Coalesce by actor/entity/type ("6 tasks…") | Render burst events row by row |
| 3 | Use toasts for confirm + undo only | Put errors requiring action in toasts |
| 4 | Cap the toast stack at 3 | Let toasts pile, push content, or auto-dismiss pending undo |
| 5 | Badge only actionable counts | Badge FYI counts or use ambient glowing dots |
| 6 | Deep-link to the exact entity and position | Link to a module home and make the user hunt |
| 7 | Offer mute/unwatch one click from every row | Bury muting three screens into settings |
| 8 | Lock mandatory types with a visible explanation | Show mystery-disabled controls |
| 9 | Ask for push permission contextually, after value | Fire the browser prompt on first load |
| 10 | Keep push bodies to title + entity type | Put names, amounts, or content on lock screens |
| 11 | Attribute all AI narration and proposals with ✦ | Blend AI content into notifications unmarked |
| 12 | Respect quiet hours by default | Treat quiet hours as a power-user opt-in |
| 13 | Settle a notification once across channels | Make users clear the same item in push, email, and inbox |
| 14 | Keep the portal subset small, branded, email-first | Expose internal classes or our settings surface to clients |

## 13. Open questions

1. **Archive as a concept** — is `e` mark-read sufficient, or do heavy triagers need a separate archived state? Current lean: no archive; read + age-out keeps the model simple. Revisit with Phase 2 usage data.
2. **Slack transition period** — Slack-channel delivery via n8n exists until internal Slack is retired ([../06_Module_Breakdown.md §18](../06_Module_Breakdown.md)); does it appear as a column in the preference matrix or as a workspace-level setting only? Lean: workspace-level, invisible in personal preferences.
3. **Mobile push timing** — engine open question (push before a proper PWA?) affects this spec's §8; if deferred to Phase 3, the preference matrix ships without the Push column until then.
4. **Snooze in the inbox** — dashboard digest items snooze (§ [DashboardRules.md 9.1](./DashboardRules.md)); should inbox rows also snooze? Risk: snooze becomes a graveyard. Prototype against real triage behavior first.
5. **Per-entity watch controls** — "unwatch this entity" implies a watch model surface (watch a project, a deal); where that management UI lives (entity header vs. preference center) is unresolved.
