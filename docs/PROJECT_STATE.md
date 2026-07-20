# AurexOS — Project State & Handoff

> **Read this first in any new session.** It is the fast-orientation snapshot of where the build is, how to run it, the binding rules, and the environment quirks. It complements (does not replace) the planning docs `01–15`, `architecture/`, and `design/`, which remain the source of truth.

_Last updated: 2026-07-19._

---

## 0. Latest session (2026-07-19) — deployment + AI Assistant + free-AI switch

**AurexOS is LIVE in production.** Deployed on **Vercel** (project `aurex-company-dashboard-web`,
account `wpgavan-gmailcoms-projects`, Hobby) from GitHub `gavanwp/aurex-company-dashboard`. Root
Directory `apps/web`, framework Next.js, **production branch = `main`** (pushing `main` auto-deploys;
`main` and the working branch are both at the latest commit). Live at
**https://aurex-company-dashboard-web.vercel.app** and the custom domain
**https://workspace.aurexdesigns.com** (Hostinger DNS: CNAME `workspace` → `cname.vercel-dns.com`;
SSL issued). Vercel env vars set: `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `NEXT_PUBLIC_APP_URL` (= custom
domain), `MAILBOX_TOKEN_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `ANTHROPIC_API_KEY`. Gmail OAuth works (the
callback `https://workspace.aurexdesigns.com/api/integrations/gmail/callback` is in the Google Console).

**Shipped this session (all committed to `main`, deployed):**

- **Documents DMS foundation** (migration `0024`): `document_folders/document_files/`
  `document_file_versions/document_tags/document_tag_assignments` + granular permissions + 10 domain
  events + read models + 10 server actions on the mutation spine (`modules/documents`). No UI yet;
  file upload/download needs `SUPABASE_SERVICE_ROLE_KEY` + a private bucket (not provisioned).
- **Profile page** `/settings/profile` (migration `0025` added `profiles.title/timezone/location`):
  real `updateProfile` (emits `workspace.member.profile_updated`), live stat tiles, recent activity,
  a `next-themes` theme control; linked from the sidebar + avatar menu (`modules/settings`).
- **Responsive + perf pass**: `app-shell` mobile nav drawer (Sheet) below `md` + a hamburger; global
  `body` overflow-x guard; prod `console.*` strip (`next.config.ts`); Email center mobile
  master-detail. Verified live via viewport resize (no horizontal overflow at 375px).
- **AI Assistant "Aurex"** — the Phase-3 flagship, at **`/assistant`** (sidebar item now live):
  - **P1** context-grounded chat — `getAssistantContext` builds a live RLS-scoped workspace snapshot
    (my open/overdue tasks, active projects, team, open pipeline value, outstanding AR).
  - **P2** read-tools agent — `modules/assistant/lib/tools.ts`: `list_tasks/list_deals/list_invoices/`
    `list_projects` (typed, Zod-validated, RLS-scoped, bounded). `askAurex` runs a bounded agent loop
    (max 4 tool rounds); gateway meters every call.
  - **P3** write tools + **approval cards** (R-AI3): `create_task/change_task_status/create_contact/`
    `create_deal`. Write tools only PROPOSE (`ProposedAction`); the user clicks **Approve** →
    `approveAurexAction` runs the module's REAL mutation (`createTask/changeTaskStatus/createContact/`
    `createDeal`). Each write tool is permission-gated so Aurex never offers what the caller can't do.
  - Prompts `aurexAssistantV1/V2/V3` in `packages/ai`. Shared `apps/web/lib/ai/gateway-errors.ts`
    surfaces a clear "out of AI credits" message on the provider billing 400.

**IN PROGRESS — switch Aurex to Google Gemini's FREE tier** (the Anthropic account has $0 credits;
the user wants free). Done + deployed: `isAiConfigured()` recognizes `GEMINI_API_KEY`; `getAiEnv()`
forwards `GEMINI_API_KEY` + `AI_TIER_*`; the gateway has a Gemini adapter with tool-calling; tiers are
overridable via `AI_TIER_<TIER>=provider:modelId`. Already appended to `apps/web/.env.local`:
`AI_TIER_STANDARD/FRONTIER/LIGHT=gemini:gemini-2.0-flash`. **Waiting on** the user to add
`GEMINI_API_KEY=AIza…` (free key from aistudio.google.com/apikey) to `apps/web/.env.local` (they kept
saving it elsewhere — confirm it's in THAT file; grep the var NAME only). Then: smoke-test the key +
model with `@google/generative-ai` (resolve from `packages/ai`) incl. a `functionDeclarations` tool;
run the agent loop; **tune Gemini function-calling** in `packages/ai/src/gateway/providers/gemini.ts`
if the tool round-trip misbehaves (try `gemini-1.5-flash` if `gemini-2.0-flash` is invalid). Finally
add `GEMINI_API_KEY` + the three `AI_TIER_*` to Vercel and redeploy for the live site.

**Parked / backlog:**

- **`git stash@{0}`** — "custom-roles editor (RBAC increment 1)", code-complete (tsc/lint/build green)
  but migration `0023` RLS was never verified. `git stash pop` to resume; verify `0023` + commit.
- **Overdue-task automation** ("task not completed by date → notify") — user put ON HOLD; needs a
  Vercel Cron + `SUPABASE_SERVICE_ROLE_KEY` (scheduled cross-tenant scan).
- **Documents** — UI (P4) + upload/download need `SUPABASE_SERVICE_ROLE_KEY` + a private bucket.
- **Aurex next** — more write tools (log CRM activity, move deal stage, draft email); Phase 4 = RAG
  (pgvector) over docs/history.

**Gotchas learned this session (important):**

- **Migrations were landing on the WRONG Supabase project** — the seed uses fixed IDs (workspace
  `…aa01 AurexDesigns`) so every seeded DB looks identical. ALWAYS confirm the target with
  `node scripts/whoami-db.mjs` (`matchesApp=true` ⇒ ref == `tcwkxxfbzupotzoneoht`). After raw-SQL DDL,
  PostgREST's schema cache is stale (PGRST205 / column `does not exist` 42703) until reloaded via
  `node scripts/reload-schema.mjs` or a Supabase **project restart**. `0024`/`0025` ARE on Mumbai now.
- **Never type/paste API keys/tokens/secrets into fields** — the user pastes those; only non-secret
  config (URLs, `AI_TIER_*`) may be typed.
- **Browser tool** drives `vercel.com` but BLOCKS `github.com`/`supabase.com`/`hostinger.com`/
  `*.vercel.app` app domains → those steps are the user's. The user's Chrome sometimes has the WRONG
  Vercel account (`sknmcat2018`) → 404 on the project; it must be the `wpgavan` account.
- Anthropic **API** credits are separate from any **claude.ai** subscription, and from other orgs — a
  key only works if its own org has a positive prepaid balance.
- New diagnostic scripts committed: `scripts/whoami-db.mjs`, `scripts/reload-schema.mjs`,
  `scripts/diag-0023.mjs`. See also `DEPLOY.md`.

---

## 1. What AurexOS is

An **AI-native, multi-tenant SaaS "operating system" for digital agencies** (built by AurexDesigns). One workspace for a whole agency — CRM, projects, tasks, finance, proposals, contracts, meetings, email, documents, knowledge, automation — governed by an AI assistant (Aurex) with workspace-wide context. Internal tool first (AurexDesigns = tenant #1), commercial SaaS later. See `docs/01_Project_Vision.md`.

## 2. Repo & where things live

- **Path:** `C:\Users\wpgav\OneDrive\Desktop\DCCN THEORY CCP` (Windows).
- **Branch:** `claude/aurexos-architecture-planning-xy42eu`.
- **GitHub:** `https://github.com/gavanwp/aurex-company-dashboard` (remote `origin` = direct GitHub HTTPS; Git Credential Manager has the login cached).
- **Monorepo:** Turborepo + pnpm.
  - `apps/web` — the Next.js 15 App Router app (routes in `app/`, features in `modules/{module}/`).
  - `packages/core` — Zod schemas, domain types, events, permissions, jobs interface, pure lib (imports nothing but itself + config).
  - `packages/ui` — vendored shadcn/ui + design system (tokens in `styles/globals.css`).
  - `packages/db` — typed Supabase clients, hand-maintained `database.types.ts`.
  - `packages/ai` — AI gateway foundation (Phase 3 orchestration deferred).
  - `packages/config` — eslint/tsconfig/tailwind presets.
  - `supabase/migrations` — 22 SQL migrations (`0001`–`0022`). Enterprise RBAC ([ADR-0008](adr/0008_Enterprise_Identity_And_RBAC.md) / [EnterpriseIdentityAndRBAC.md](architecture/EnterpriseIdentityAndRBAC.md)): `0017` = **Organization tier** (1:1 backfill, `workspaces.organization_id` NOT NULL). `0018` = **data-driven RBAC engine** (`permissions`/`roles`/`role_permissions`/`user_permission_overrides`/`resource_grants`/`organization_policies`) seeded with 103 permissions + 19 system roles + the matrix; `workspace_members.role_id` backfilled. `0019` = **cutover**: `has_permission()` SQL resolver + `apps/web/lib/permissions.ts` (in-process `getEffectivePermissions`/`hasPermission`/`requirePermission`, DENY-wins, org-owner elevation). `0020` = clients/meetings permission keys. **All module server guards are now engine-resolved**: `requireCapability` is engine-backed (crm/clients/projects/tasks) via a capability→permission map; the role-set access files (team, contracts, proposals, finance, automations, meetings) call `requirePermission`. `ActionError`/`ActionResult` extracted to `lib/action-error.ts` to break the resolver↔action-kit cycle. The `canManageX`/`canViewX` UI-affordance helpers are also engine-backed now (async `hasPermission(ctx, …)`; all page call sites `await`). **The hardcoded `can(role, capability)` map is retired** — `packages/core/permissions` is a deprecation stub; nothing reads it (the `Capability` union is kept only as action-kit's legacy adapter surface). Verified: owner retains full access across all modules (org-owner elevation), employees restricted; tsc/lint/build green, 40 core tests. `0021` = **security surface** tables: `sessions`, `devices`, `auth_events` (login history, insert-only), `mfa_factors`, `api_keys` (hashed at rest), `invitations`, `impersonation_sessions` — all RLS-locked (self + org-admin; secret columns never selected to clients). DB types added. First management UI shipped — **People & access** (`/settings/people`, `modules/access`): the workspace roster with engine-resolved role names + an **Invite user** flow (engine-guarded `users.user.invite`, Zod-validated, **SHA-256-hashed** invite token, `workspace.member.invited` event + audit) + pending-invitation list with revoke, **member role-change** (roster role-select → `changeMemberRole`, guarded `users.role.assign`, updates `role_id` + syncs the legacy `role` enum for the RLS backstop, self/owner protected, event + audit), and a read-only **Roles & permissions** catalog (`/settings/roles`) grouping the 19 system roles by scope with per-role permission-by-module breakdown + member counts. **Invite-acceptance flow complete** (`0022`): public route `/invite/[token]` (token-hashed lookup) with an `invitation_preview` RPC and an `accept_invitation` security-definer RPC (validates token + **email match** to prevent hijack, creates the workspace + org membership with legacy-role sync, marks accepted, audits `workspace.member.joined`). Invite dialog copies the accept link (email transport deferred). **Security UIs shipped**: **API keys** (`/settings/api-keys`, `settings.apikey.manage`) — create with scope preset + expiry, **shown-once** plaintext key, SHA-256-hashed at rest, list + revoke, audited; **Sessions & devices** (`/settings/sessions`) — `login()` now records an `auth_events` + `sessions` row (best-effort), the page shows active sessions (revoke) + recent sign-in activity + "Sign out everywhere" (real global Supabase revocation). Both linked from Settings. **MFA + Security Center shipped**: TOTP two-factor via Supabase Auth native MFA (`/settings/sessions` → enroll with QR + secret → verify 6-digit code → factor active; mirrored to `mfa_factors` for org reporting; remove supported). **Security Center** (`/settings/security`, `security.audit.view`) — org posture: MFA coverage %, administrative accounts, active API keys, pending invites, failed sign-ins, + members-without-MFA / admin-accounts lists. _Remaining: guard-test suite (matrix drift → CI), JWT permission-digest fast path, custom-roles editor, invite email transport._
  - `docs/` — planning (`01–15`), `architecture/` (15 docs + ADRs 0001–0006), `design/` (28 docs).
  - `scripts/` — `apply-migrations.mjs` (whole set), `apply-migration.mjs` (single file, for incremental migrations on the already-migrated hosted DB), `seed-remote.mjs`, `seed-team.mjs` (node pg utilities).

## 3. Binding rules (never violate — enforced by lint/CI)

Full list: `docs/12_Project_Rules.md`. The ones that bite most:

- **R-D1/R-D2:** RLS deny-by-default + `workspace_id` on every tenant table.
- **R-D8:** money is **integer minor units** + a currency column — never floats. Totals recomputed server-side.
- **R-A3 mutation spine:** every mutation = **validate (Zod) → authorize (RBAC) → execute → emit domain event → write audit** via `defineAction`/action-kit.
- **R-A1/R-A6:** module boundaries. A module's `index.ts` is its ONLY public surface (plus an optional `server.ts` for server-only exports). Cross-module = public surface or domain events, never internals. Enforced by `eslint-plugin-boundaries`.
- **R-AI1–6:** all model calls through `packages/ai` gateway; all AI actions audited; outbound/destructive AI human-approved.
- **R-T:** TypeScript strict, no `any`, no non-null `!`, Zod at every boundary.
- **Domain events** are `module.entity.verb` **past tense** — the final segment must end in `-ed` or be in `{sent, paid, partially_paid, overdue}` (the events test enforces this; `expiring` → use `expiry_flagged`).
- **Design system** (`docs/design/`): token-driven, both light+dark, WCAG AA, one accent, cards border-first (no default shadow), no emoji (except the ✦ Aurex mark), sentence case.

## 4. Database (hosted Supabase — MUMBAI)

- **Active project:** `tcwkxxfbzupotzoneoht` — region **ap-south-1 (Mumbai)**. (Moved here from Tokyo for latency; ~92ms/round-trip vs Tokyo's ~375ms.)
- **Pooler host for DB ops:** `aws-1-ap-south-1.pooler.supabase.com`, user `postgres.tcwkxxfbzupotzoneoht`, port `5432` (session mode). Password is in `apps/web/.env.local` (ask the user; `@` in it must be URL-encoded as `%40`).
- **App env:** `apps/web/.env.local` (gitignored) holds `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Mumbai), `MAILBOX_TOKEN_KEY`, `GOOGLE_CLIENT_ID/SECRET`.
- **Migrations & seed:** the Supabase CLI **cannot spawn in this environment** — apply via node instead:
  - `SUPABASE_DB_URL="postgresql://postgres.tcwkxxfbzupotzoneoht:<PW>@aws-1-ap-south-1.pooler.supabase.com:5432/postgres" node scripts/apply-migrations.mjs`
  - `... node scripts/seed-remote.mjs` (seeds the demo workspace + login; `seed.sql` already sets auth token columns to `''` so password login works).
- **Demo login:** `demo@aurexdesigns.com` / `aurexos-demo` (workspace "AurexDesigns", role owner).
- **Data note:** Mumbai has the seed data (3 clients/projects, 6 tasks, deals). The few test entities created earlier on the old Tokyo project (1 proposal, 1 contract, 1 meeting, 2 invoices) were **not** migrated — clean start.
- **TODO (user):** rotate the Mumbai DB password (it was pasted in chat) and **delete the old Tokyo project** `gfakhddemnerfgskjdxq`.

## 5. How to run

```bash
pnpm install                 # pnpm 10.x (enable via corepack, or npm i -g pnpm)
# Fast (production — routes pre-built, this is what to demo):
pnpm --filter web build && pnpm --filter web start    # launch config "web-prod", port 3000
# Dev (slower — compiles each route on first visit; this is NOT real speed):
pnpm --filter web dev                                 # launch config "web"
# Verify before committing:
pnpm --filter web exec tsc --noEmit
pnpm --filter web lint
pnpm --filter @aurexos/core exec vitest run           # 51 tests
```

## 6. What's built (working, verified)

- **Foundation:** multi-tenant workspaces + RLS, RBAC (10 roles), auth (email/password, Google + GitHub OAuth, magic link, password reset, sessions), domain-events spine, append-only audit log, app shell (sidebar, ⌘K command palette, notifications, workspace context).
- **Phase 1 modules:** Dashboard (mockup-aligned, real data), CRM (pipeline, contacts), Clients, Projects, Tasks.
- **Phase 2 modules:**
  - **Calendar** — month/week, native events, task/meeting overlays.
  - **Email Center** — client-comms timeline, manual logging + **live Gmail OAuth read-only sync** (`/api/integrations/gmail/*`, tokens AES-256-GCM encrypted).
  - **Finance** — invoices (lifecycle, integer minor units), expenses, payments, overview (cash snapshot, AR aging, chart).
  - **Proposals** — block builder, tokenized public accept page `/p/[token]`, convert-to-invoice/project/deal.
  - **Meetings** — **pre-meeting brief** (assembles relationship context), live mode, decisions log, action-items → tasks.
  - **Contracts** — **renewal radar**, obligations → tasks, tokenized public signing `/c/[token]`, create-from-proposal.
  - **Team & HR** — directory (skill/capacity cards, search + specialization filter), member profiles (skills with proficiency meters, manager/reports, **field-level compensation** for Owner/HR/Finance), leave management (request → approve/reject/cancel lifecycle), people-overview tiles. Tables `hr_profiles` + `hr_leave_requests` (0016); events `hr.profile.*` / `hr.leave.*`.
  - **Automation Studio** — authoring surface over the event core: automations list, builder (trigger event picker + ordered actions from a registry + failure policy), draft→activate→pause lifecycle, run-history view, recipe gallery. Tables `automations`/`automation_runs` (0011); events `automation.created/updated/activated/paused/deleted`. **Aurex AI integrated** (first live AI surface): NL **drafting** ("describe an automation → proposed draft for review") and a **Q&A assistant** ("quick answers"), both routed through the `packages/ai` gateway (Claude), prompts versioned in `packages/ai/prompts`, usage metered to `ai_usage` (R-AI2), graceful "add a key" fallback (R-AI6). **Execution engine is live**: `apps/web/lib/automation-engine.ts` is hooked into `emitDomainEvent`, so an active automation runs wherever its trigger fires, system-wide (verified end-to-end: a Team leave request created a task + notified 8 members via the engine, recorded as a succeeded `automation_run`). Actions run with the acting client (RLS); loop-safe (ignores `automation.*`/`ai.*`, no chaining in v1); orphaned-owner automations auto-pause. _Deferred: queued/delayed execution + service-role creator-permission runs + multi-level chaining (the ADR-0005 worker)._
  - **Settings** (workspace, members, security).
- **Platform:** `packages/ai` gateway (Claude/OpenAI/Gemini adapters, router, prompts, metering); notification-engine contracts; storage abstraction; jobs enqueue seam; Edge Function skeletons.

## 7. Not built yet (sidebar shows "Soon")

Documents · Knowledge Base · Analytics · AI Assistant (Aurex chat — **Phase 3 flagship**: gateway now wired to the app and live in Automation; workspace-wide LangGraph orchestration + RAG + typed tools + approval cards still deferred) · Client Portal (Phase 4). _Team & HR Phase-3 AI and Automation's event→run execution engine are deferred; the authoring/AI surfaces shipped._

**AI is now wired into the app:** `apps/web/lib/ai/gateway.ts` builds the `packages/ai` gateway from env with a Supabase usage sink; `isAiConfigured()`/`getAiEnv()` in `lib/env.ts` gate it. Set `ANTHROPIC_API_KEY` in `apps/web/.env.local` to enable live AI (server-only var — restart, no rebuild needed). Without a key, AI surfaces degrade gracefully and the rest of the app is unaffected.

## 8. Performance state

- `getWorkspaceContext` (runs on every page): cut from ~3 round-trips to 1 (`getClaims()` local JWT verify + memberships/workspaces inner join).
- DB in Mumbai. **Navigation is now ~0.6–1.2s** (was 3–8s on Tokyo).
- Cards are border-first with an `interactive` hover variant; loading skeletons on all routes.
- **Remaining wins:** CRM `getDeals` still does a separate name-resolution round-trip (fold into a join); optimistic UI (TanStack Query) not wired; the middleware `getUser()` is one more per-nav round-trip (security-sensitive, left as-is). framer-motion is installed but intentionally unused (Radix/CSS animations already cover overlays; don't client-ify RSC pages for motion).

## 9. Environment quirks (save yourself pain)

- **Supabase CLI won't spawn** → use `scripts/apply-migrations.mjs` / `scripts/seed-remote.mjs` (node pg).
- **Browser screenshots time out** in the preview pane → verify with `get_page_text` / `read_page` / `javascript_tool` / `preview_logs` / direct DB queries.
- **`form_input` doesn't sync react-hook-form** → set inputs via native value setter + dispatched `input` events, or real keystrokes; then confirm persistence in the DB.
- **Stale `.next` cache** can throw `Failed to generate static paths / Unexpected end of JSON input` → `rm -rf apps/web/.next` and rebuild; it's not a code bug.
- **RHF live totals:** compute **inline** every render, never `useMemo` keyed on `watch()` (its array ref is stable → the memo freezes).
- **Cross-module creators don't exist yet** → convert flows do workspace-scoped direct writes + emit each module's domain event (see proposals/contracts/meetings `convert-actions.ts`).
- NEXT_PUBLIC_ env vars are build-time inlined → rebuild after changing Supabase URL/keys.

## 10. Working style that's been effective

Build each module with **one focused background subagent** (reads the docs + the sibling module as the pattern, action-kit spine, verifies typecheck/lint/DB). Then the main session wires the sidebar + middleware, verifies live in the browser + DB, and commits as **one logical unit** (conventional commit, `Co-Authored-By: Claude ...`). **Measure before optimizing; revert changes that don't help** (a lazy-command-palette perf attempt was measured and reverted because it didn't move the bundle).

## 11. Likely next steps

- Build the next module: **Team & HR**, **Documents + Knowledge Base** (RAG substrate), Automation Studio, or Analytics.
- **Phase 3 AI layer** — Aurex assistant, per-tenant RAG (pgvector), typed tools, approval cards (the product's headline).
- Follow-ups: real e-signature + emailed sends on Proposals/Contracts; Meetings AI summary; optimistic UI; CRM query-join optimization.
- Ops: rotate Mumbai DB password; delete old Tokyo project; push to GitHub; consider a PR into `main`.
