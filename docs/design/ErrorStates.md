# Error States

| | |
|---|---|
| **Document** | Error State Specification — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [Forms.md](./Forms.md) · [LoadingStates.md](./LoadingStates.md) · [EmptyStates.md](./EmptyStates.md) · [Components.md](./Components.md) · [../11_Design_Principles.md](../11_Design_Principles.md) |

---

## 1. Doctrine

Errors are **recoverable moments, not dead ends**. Every error state answers three questions in order: what failed, why (when known), and what to do next. An error that answers none of these is a design defect regardless of how it looks.

1. **Specific beats generic.** "Couldn't send — the client's email bounced. Fix the address and retry." Never "Something went wrong." Generic errors are permitted only when we genuinely don't know more — and then we say *that* honestly (§3.3).
2. **The voice law.** Errors are written by a competent colleague ([../11_Design_Principles.md](../11_Design_Principles.md) §11): calm, direct, human. Never robotic codes as user copy ("Error 422: validation failure"), never cute-panicky ("Whoops! 😅"). Raw error codes never reach the UI (R-Q6).
3. **The placement law.** Errors render **inline, where the problem is** — on the field, next to the trigger, inside the region that failed. **Toasts never carry errors that require action** ([../11_Design_Principles.md](../11_Design_Principles.md) §12.8); a toast may report a rollback with a Retry action, but the durable fix always lives inline.
4. **Every recovery is one affordance away.** Retry, fix, undo, or a named path to someone who can help. No error surface ships without one.
5. **Reference ids, subtly.** Every *unexpected* error is captured to Sentry and shows its reference id in `caption` text, `--text-muted`, below the recovery actions: "Reference: AX-4F2K9". Small enough to ignore, present enough to paste into a support thread. Expected errors (validation, permissions) carry no reference id — they aren't incidents.

## 2. The error taxonomy

Every error belongs to one row. The row dictates placement and anatomy — features do not invent new error surfaces.

| Type | Placement | Anatomy | Recovery |
|---|---|---|---|
| Validation | Inline below the field ([Forms.md](./Forms.md) §6 owns) | Danger caption + 16px icon + danger border | Fix in place; error clears on valid change |
| Action failure | Inline near the trigger (below button / on the affected row) | Danger caption + icon; optimistic rollbacks add the retry toast ([LoadingStates.md](./LoadingStates.md) §6) | Retry affordance, always |
| Region load failure | In-region **error band** filling the widget/table/chart slot | 20px danger icon, `body-strong` title, one-line body, Retry ghost button; region keeps its reserved size — no layout shift | Retry refetches the region only |
| Page failure | Route error boundary — content region only, shell intact | Full-page spec (§3) | Retry / Go to dashboard |
| App failure | Root boundary (shell itself failed to render) | Minimal branded page: title + body + Reload + reference id | Reload |
| Connectivity | Top-of-content banner (§4) | Info-styled, persistent while offline | Auto-recovery on reconnect |
| Permission (403) | Full-page or in-region per scope (§3.2) | Explain + who can grant | Request access / switch workspace |
| Not found (404) | Full page (§3.1) | Honest, short | Go to dashboard / palette |
| Server (500) | Full page or region band per blast radius (§3.3) | "Our side" framing + reference id | Retry + status link |
| AI failure | Inside the AI surface only (§6) | Honest banner / step receipt | Manual path always named |
| Payment failure | Inline on the payment surface / entity timeline (§7) | Reassuring, specific | Retry / alternate method |

**Region error bands** are the workhorse: one failed dashboard widget shows its band while every neighbor renders normally. A single failed query never escalates to a page failure. Example band copy — title: "Couldn't load revenue", body: "The data didn't come back in time.", CTA: "Retry".

## 3. Full-page error specs

Full-page errors render in the **content region** — sidebar, top bar, and palette stay alive (the user can always leave). Layout mirrors the empty-state anatomy ([EmptyStates.md](./EmptyStates.md) §1.1): centered, ≤360px copy width, title-3 title, muted body, one primary action. Illustration optional per [IllustrationStyle.md](./IllustrationStyle.md); never for 500s (a broken moment is the wrong time for decoration).

### 3.1 404 — not found

| Slot | Copy |
|---|---|
| Title | This page doesn't exist |
| Body | The link may be wrong, or this item may have been deleted. Check the URL, or search for what you need. |
| Primary CTA | Go to dashboard |
| Hint | Press ⌘K to search *(caption, with `kbd` styling)* |

If the route pattern is valid but the entity is gone (deleted task, revoked doc), prefer the specific variant — title: "This task no longer exists", body: "It may have been deleted. Its project is still available." with a CTA to the parent entity.

### 3.2 403 — no access

| Slot | Copy |
|---|---|
| Title | You don't have access to this |
| Body | Your role doesn't include {module/entity}. A workspace owner or admin can grant it. |
| Primary CTA | Request access *(where the request flow exists; sends a notification to admins)* |
| Secondary | Switch workspace *(shown when the user belongs to multiple workspaces — the most common cause of "missing" data)* |

Never imply the content doesn't exist, and never dead-end: name the granting role. In-region permission gates (one locked widget on a shared dashboard) use the compact band with the same copy formula. Cross-reference: [EmptyStates.md](./EmptyStates.md) §2 permission class covers module-level gating.

### 3.3 500 — unexpected

| Slot | Copy |
|---|---|
| Title | Something broke on our side |
| Body | Your data is safe — this is a problem in the app, not your work. Retrying usually fixes it. |
| Primary CTA | Retry |
| Secondary | Status page *(link — Phase 5, once status.aurexdesigns.com exists)* |
| Caption | Reference: {id} |

"Your data is safe" appears only when true (render/read failures). If a write may not have persisted, say that instead: "We couldn't confirm your last change saved — check it after retrying."

### 3.4 Maintenance

Rare, scheduled, honest: title "Down for maintenance", body "We're back by {time, user's timezone}. Everything is exactly as you left it." No spinners, no fake countdowns, an ETA we intend to beat.

## 4. Connectivity & offline

1. **Detection:** a subtle banner pinned to the top of the content region — info-soft background, 16px icon, `small` text: **"Offline — changes will sync when you're back."** Never a modal, never a blocking overlay; the user keeps reading and working.
2. **Queued mutations:** optimistic changes made offline queue locally. The banner carries the count as it grows: "Offline — 3 changes will sync when you're back." Queued items show the standard pending affordance ([LoadingStates.md](./LoadingStates.md) §6) immediately — offline pending is visible pending.
3. **Reconnect:** the queue auto-flushes; on success the banner resolves to a success toast: "Back online — 3 changes synced." If any item fails, it follows the standard rollback pattern with Retry, individually — one failure never blocks the rest of the queue.
4. **Conflicts (rare):** if a queued change collides with a server-side change made while offline, surface an inline choice on the affected entity: "This changed while you were offline" with both versions and Keep mine / Keep theirs. Never auto-resolve destructively.
5. **Never silent data loss.** This is law. A change the user made is either synced, visibly pending, or visibly failed with a recovery path. There is no fourth state.

Money and sends are never queued offline (never optimistic — [LoadingStates.md](./LoadingStates.md) §6); their triggers disable with a tooltip: "You're offline — reconnect to send."

## 5. Validation errors

[Forms.md](./Forms.md) §6 owns the full architecture. The global laws restated for completeness:

- Inline, **on blur**; revalidate on change once erred — the error clears the moment the input is valid.
- Long forms get an **error summary** above the actions on failed submit; focus moves to the first errored field.
- **Server-side errors map back to their fields** and render exactly like client errors (shared Zod schema keeps them in agreement).
- **Never toast a validation error.** No exceptions.
- Message formula: what's wrong + how to fix — "This email is missing an @ — check for a typo", never "Invalid input".

## 6. AI error states

Aurex failing must never take the rest of the product down with it — and must never bluff.

| Failure | Surface & copy | Recovery |
|---|---|---|
| Model unavailable | Banner **in AI surfaces only**: "Aurex is unavailable right now — everything else works as usual." Ghost text, digests, and AI actions pause; nothing else degrades (R-AI6) | Each paused AI feature points to its manual path ("Create the invoice manually — I'll be back shortly") |
| Timeout mid-response | Partial response is **kept and attributed**, marked: "I stopped early — the response timed out." | "Continue" affordance resumes from where it stopped |
| Budget exhausted | In-panel state: "This workspace's AI budget for the month is used up. An owner can raise it in Settings → AI usage." | CTA for Owner role: "Review AI budget"; others see who to ask |
| Refusal / permission-blocked | Calm inline answer, no shame, no lecture: "I can't answer that — it needs finance access you don't have. A workspace owner can grant it." | Names the gate and the granter, same as any 403 |
| Tool failure in an agent run | The plan-card step is marked **failed** with a receipt row: "Couldn't fetch invoices — the request timed out." Aurex states plainly what it did and didn't complete | "Retry step" on the failed step; the run never silently skips it |

**The never-fake-confidence law:** when Aurex fails, times out, or can't find something, it says so — "I couldn't find that" — and never fills the gap with a plausible guess. Wrong-but-confident is the one unforgivable AI behavior ([../11_Design_Principles.md](../11_Design_Principles.md) §9). Failed and partial outputs stay ✦-attributed so provenance survives the failure.

## 7. Payment & money errors

Money errors get the most careful copy in the product. They are **never optimistic-rollback surprises** — money mutations validate loudly *before* submission wherever possible (card checks, balance validation, address verification) and show honest in-flight states after.

| Failure | Surface | Copy (exact) | Recovery |
|---|---|---|---|
| Card declined (client portal) | Inline on the payment form | Title: "This card was declined" · Body: "The bank didn't approve the charge — this is usually the card, not the invoice. Try another card, or contact {Agency} if it keeps happening." | Retry · Use a different method · "Contact {Agency}" link |
| Webhook lag (payment made, status pending) | Status pill + caption on the invoice | "Payment processing — this can take a minute." | None needed; auto-resolves. Never shows "unpaid" once payment is initiated |
| Invoice/proposal email bounce | Inline event on the entity timeline, danger-soft | "Couldn't deliver — {email} bounced. Fix the address and resend." | "Fix address" (opens contact edit) · "Resend" |
| Payout/refund failure (internal) | Inline on the transaction row | "The refund didn't go through — Stripe rejected it: {plain-language reason}." | Retry · link to the Stripe dashboard record |

Portal money copy never blames the client, never shows processor jargon ("gateway", "webhook"), and always offers the human path — "contact {Agency}" — because for the client, the agency *is* support.

## 8. Error copy rules

The formula, no steps skipped: **what happened → why (if known) → what to do.**

| Audience | Tone | Example |
|---|---|---|
| Internal app | Direct, efficient — a colleague at the next desk | "Couldn't move the task — check your connection and retry." |
| Client portal | Reassuring, warm, agency-fronted | "That didn't go through — nothing was charged. Try again, or contact {Agency}." |

Bounds: title ≤6 words, sentence case, no terminal period; body 1–2 sentences; recovery CTA is a verb. Danger color per status tokens, always paired with icon + text — never color alone ([../11_Design_Principles.md](../11_Design_Principles.md) §5).

**Banned patterns** (automatic review rejection):

1. Codes as headlines — "Error 500", "ERR_CONNECTION_RESET", stack traces, anywhere user-visible.
2. Blame-user phrasing — "You entered an invalid value", "You broke something". The problem is described, never the person.
3. Dead-end "contact support" — support is a *last* resort and always arrives with context: the reference id and what was attempted.
4. Apology theater — "We're so sorry!!", sad-face illustrations, "Oops"/"Whoops"/"Uh oh" (same banned list as [EmptyStates.md](./EmptyStates.md) §7).
5. Vague reassurance replacing information — "Something went wrong, please try again later" when we know what and where.

**Reference-id presentation:** `caption` size, `--text-muted`, prefixed "Reference:", monospace id (Geist Mono), click-to-copy with a "Copied" tooltip. Below recovery actions, never above the message. Unexpected errors only.

## 9. Logging & observability hooks

- **Every rendered error band, boundary, and failed-step receipt links a Sentry event.** The reference id shown to the user *is* the lookup key — support never asks users to describe an error we already captured. An error UI that renders without capturing is a bug.
- **Error states are PostHog-tracked** as first-class events: which error, which surface, which recovery action the user took (retry / abandon / navigate away). The errors users actually hit — and abandon on — rank fix priority; we do not guess at error-state importance.
- Retry outcomes are tracked too: a region whose Retry succeeds >90% of the time points at a timeout to tune, not copy to rewrite.
- Validation errors are aggregated (which fields fail most) but never logged with user-entered values.

## 10. Do / don't

| # | Do | Don't |
|---|---|---|
| 1 | Say what failed, why if known, and what to do | Ship "Something went wrong" when we know more |
| 2 | Render errors inline, where the problem is | Toast an error that requires action |
| 3 | Keep the shell alive on page-level failures | Blank the whole app for a content-region error |
| 4 | Contain failures to their region with an error band | Escalate one failed widget into a page error |
| 5 | Show a subtle Sentry reference id on unexpected errors | Print raw codes or stack traces as user copy |
| 6 | Offer retry/fix/undo on every error surface | Dead-end with "contact support" and no context |
| 7 | Keep partial AI output, attributed and resumable | Discard partial responses or let Aurex bluff past failure |
| 8 | Fail money operations loudly, before submission where possible | Optimistically confirm anything involving money or sends |
| 9 | Queue offline changes visibly, with counts | Lose or silently drop a user's change — ever |
| 10 | Reassure and name the agency in portal errors | Expose processor jargon or blame the client |

## 11. Open questions

| # | Question | Leaning | Owner |
|---|---|---|---|
| 1 | Request-access flow for 403s — Phase 2 with roles, or defer to Phase 3 admin tooling? | Phase 2: the notification-to-admin path is cheap and kills a top support ticket | CPD + product |
| 2 | Offline mutation queue depth — cap it (e.g., 50) and warn, or unbounded? | Cap at 50 with a banner warning; unbounded queues invite giant conflict piles | Design eng |
| 3 | Region error bands: auto-retry once (with backoff) before rendering, or always render immediately? | One silent auto-retry ≤2s, then render — halves visible transient errors; verify with PostHog | Design eng |
| 4 | Reference-id format — Sentry event id verbatim or short branded alias (AX-XXXX) with lookup? | Short alias; verbatim ids are unreadable over the phone | Platform |
| 5 | Status page (Phase 5) — link it from every 500 immediately at launch, or only during declared incidents? | Always link once it exists; a green status page is itself reassuring | CPD |
| 6 | Conflict UI ("Keep mine / Keep theirs") — field-level diff or whole-entity choice for v1? | Whole-entity for v1; field-level diff when the editor supports it | Design eng |
