# 08 — Tech Stack Specification

| | |
|---|---|
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Founding CTO, AurexDesigns |
| **Related** | `03_Architecture.md`, `04_Database_Schema.md`, `06_AI_Architecture.md`, `09_Scaling_Strategy.md`, `13_Folder_Structure.md`, `14_Risk_Assessment.md` |

This document is the single source of truth for every technology in AurexOS: what we use, **why** we use it, what we considered instead, and when it enters the stack. Any deviation requires an ADR appended to `03_Architecture.md` and an update here. AurexOS is a **modular monolith in a Turborepo monorepo**, multi-tenant from day one (workspaces + Postgres RLS), with AI as the operating system — every choice below is evaluated against those three constraints.

---

## 1. Guiding Selection Principles

1. **One team, many modules.** We are a small team building 20+ modules. Every choice must minimize operational surface area. Managed services beat self-hosted unless there is a hard reason (n8n is the deliberate exception).
2. **SaaS-ready internally first.** Nothing we pick may block multi-tenancy, RLS, or per-workspace billing later. If a tool cannot express `workspace_id`, it does not enter the stack.
3. **Boring core, ambitious edges.** Postgres, TypeScript, and Next.js are deliberately conservative. The ambition budget is spent on the AI layer, not on the database or framework.
4. **Type safety end to end.** One Zod schema per domain object, consumed by the form, the server action, the edge function, and the AI tool definition. Drift between layers is a bug class we design out.
5. **Exit paths documented.** Every vendor choice includes an explicit lock-in assessment and exit path (expanded in `14_Risk_Assessment.md`).

---

## 2. Frontend

### 2.1 Next.js (App Router) — framework

- **Decision:** Next.js App Router, **React Server Components by default**. Client components are opt-in (`"use client"`) and justified per file (interactivity, browser APIs, animation).
- **Rationale:** RSC lets us fetch tenant-scoped data on the server, inside the RLS-authenticated Supabase client, and ship zero data-fetching JS for read-heavy views (Dashboard, CRM lists, Analytics). Server Actions give us mutation endpoints colocated with features without maintaining a parallel REST layer in Phase 0–2. Vercel deployment is first-class. The App Router's **route groups** map 1:1 onto our module structure (`(crm)`, `(projects)`, `(portal)` — see `13_Folder_Structure.md`).
- **Alternatives considered:**
  - *Remix / React Router v7* — excellent data model, but weaker RSC story, smaller ecosystem for our shadcn/Vercel path, and no advantage that outweighs retraining.
  - *SvelteKit* — smaller bundles, but the AI-era component ecosystem (shadcn/ui, TanStack, Vercel AI SDK) is React-first; hiring pool is smaller.
  - *SPA (Vite + React) + separate API* — clean separation, but doubles surface area (API framework, deploy, auth plumbing) for a small team; contradicts principle 1.
- **Rules:** Server Components by default; every page reads the workspace context server-side; no client-side secret access ever; `next/image` mandatory for user-facing images.

### 2.2 React 19 + TypeScript (strict)

- **Decision:** TypeScript `strict: true`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. No `any` without an inline justification comment; CI fails on new `@ts-expect-error` without a linked issue.
- **Rationale:** A 20-module product with one shared data model lives or dies on types. Generated DB types (`packages/db`) + Zod inference give us compile-time verification from Postgres column to form field.
- **Alternative considered:** loose TS with gradual tightening — rejected; retrofitting strictness onto a large codebase is far more expensive than starting strict.

### 2.3 TailwindCSS + shadcn/ui — styling & design system

- **Decision:** Tailwind v4 with a shared preset in `packages/config`; shadcn/ui components vendored into `packages/ui` (not installed as a dependency — shadcn's copy-in model means we own the code).
- **Rationale:** shadcn/ui gives accessible Radix-based primitives we fully control — critical because the Client Portal (Phase 4) needs per-workspace theming/white-labeling, which is trivial when we own the components and use CSS variables for tokens. Tailwind keeps styling colocated and purgeable across the monorepo.
- **Alternatives considered:**
  - *MUI / Mantine* — faster start, but heavy runtime theming and fighting the framework for a bespoke "AI OS" feel.
  - *Chakra* — runtime CSS-in-JS cost, weaker RSC compatibility.
  - *CSS Modules / vanilla-extract* — more ceremony, no component library leverage.

### 2.4 Framer Motion — animation

- **Decision:** Framer Motion (`motion`) for the Aurex assistant surface, command palette, panel transitions, and dashboard micro-interactions.
- **Rationale:** The "AI operating system" positioning demands a product that *feels* alive; Framer Motion's layout animations and gesture APIs are the mature option in React. Confined to client components; never on the critical path of data rendering.
- **Alternative considered:** CSS-only transitions — the default for simple cases; Framer Motion is reserved for orchestrated/layout animations.

### 2.5 TanStack Query v5 — server state

- **Decision:** TanStack Query for all client-side server state (lists with live filters, optimistic task updates, infinite scroll, polling fallbacks), integrated with Supabase Realtime via cache invalidation on channel events.
- **Rationale:** RSC covers first paint; TanStack Query covers everything after — mutations with optimistic updates (Tasks Kanban, CRM pipeline drag), background refetch, and a normalized invalidation model keyed by `[workspaceId, module, entity]`. Rolling our own hooks around Supabase is the road to a worse, undocumented TanStack Query.
- **Alternatives considered:** *SWR* — lighter but weaker mutation/optimistic story; *RSC-only + router refresh* — fine for CRUD forms, unacceptable UX for Kanban/pipeline/inbox interactions; *Redux Toolkit Query* — brings Redux we don't otherwise need.

### 2.6 Zustand — client state

- **Decision:** Zustand for genuinely client-only state: command palette open/close, Aurex chat panel UI state, sidebar layout, unsent draft state, selection sets in tables.
- **Rationale:** Tiny, no provider tree, works with RSC boundaries. The rule that keeps it honest: **if the server knows about it, it belongs in TanStack Query; if only this browser tab cares, Zustand.**
- **Alternatives considered:** *Redux* — ceremony disproportionate to need; *Jotai* — fine, but Zustand's store model fits our "few global UI stores" shape better; *React Context* — retained for static DI (theme, workspace context), not for frequently-updating state.

### 2.7 React Hook Form + Zod — forms & validation

- **Decision:** React Hook Form with `zodResolver`; every domain schema defined **once** in `packages/core` and reused in: client form validation, Server Action input parsing, Edge Function payload validation, and AI tool parameter schemas.
- **Rationale:** Shared client/server validation is a security requirement (client validation is UX, server validation is the contract) and an AI requirement — Aurex's tool-calling layer (`06_AI_Architecture.md`) derives JSON Schemas for tools from the same Zod definitions, so the assistant can never construct a payload the API wouldn't accept from a human.
- **Alternatives considered:** *Valibot* — smaller bundle, but Zod's ecosystem (resolvers, OpenAPI, JSON Schema derivation for AI tools) wins; *Yup* — weaker TS inference; *server-only validation* — worse UX, and still needs a schema source of truth.

---

## 3. Backend — Supabase Platform

We consolidate the backend on Supabase (managed Postgres + Auth + Edge Functions + Storage + Realtime). This is a deliberate concentration bet; the lock-in analysis and exit paths live in `14_Risk_Assessment.md` §T1. The short version: our data layer is standard Postgres + SQL migrations, portable to any Postgres host; Auth and Realtime are the sticky parts and are wrapped behind internal interfaces.

### 3.1 PostgreSQL + Row-Level Security — database & tenancy

- **Decision:** Single shared-schema Postgres with **RLS enabled on every table, no exceptions**, keyed on `workspace_id`. RLS policies are written once as reusable SQL functions (`auth_workspace_ids()`, role-check helpers) and applied uniformly by migration templates.
- **Rationale:** Postgres is the only database that gives us relational integrity, RLS-based tenancy, `pgvector`, LISTEN/NOTIFY-backed realtime, and JSONB in one engine — which means one backup story, one query language, one mental model. RLS moves tenant isolation from "every developer remembers a WHERE clause" to "the database refuses" — defense in depth demanded by `05_Security_And_Permissions.md`.
- **Alternatives considered:** *schema-per-tenant* — migration fan-out becomes operationally brutal past ~50 tenants; *database-per-tenant* — reserved as the **enterprise tier escape hatch** (see `09_Scaling_Strategy.md` §2.5), not the default; *MySQL/PlanetScale* — no RLS, no pgvector; *MongoDB* — the domain (invoices ↔ projects ↔ clients ↔ tasks) is intensely relational.

### 3.2 Database conventions (normative)

These are enforced by migration review and a CI lint over the schema dump:

| Convention | Rule |
|---|---|
| Naming | `snake_case` for tables, columns, functions; plural table names (`invoices`, `crm_contacts`) |
| Primary keys | **UUIDv7** (`uuid` column, v7 generator function) — time-ordered, so B-tree index locality stays good under insert load, unlike random UUIDv4; globally unique, so IDs can be generated client-side and never collide across future shards |
| Timestamps | `created_at`, `updated_at` (trigger-maintained), `deleted_at` on **every** table; all `timestamptz` |
| Soft delete | `deleted_at IS NULL` baked into RLS policies and views; hard deletes only via scheduled purge jobs with audit entries |
| Tenancy | `workspace_id uuid NOT NULL REFERENCES workspaces(id)` on every tenant-scoped table + composite indexes leading with `workspace_id` |
| Events | Append-only `domain_events` table (see §5.2) — no UPDATE/DELETE grants |
| Audit | Append-only `audit_log` table, written by triggers + application layer |

### 3.3 Supabase Auth

- **Decision:** Supabase Auth for identity (email/password, OAuth: Google + GitHub, magic links for the Client Portal), with our own `workspace_members` table carrying role assignments; JWT claims carry `workspace_id` + role for RLS evaluation.
- **Rationale:** Native integration with RLS (`auth.uid()` in policies) removes an entire class of auth-database drift. RBAC itself (Owner → Guest, per `05_Security_And_Permissions.md`) lives in **our** tables, so we're not modeling roles in a vendor's opinionated system.
- **Alternatives considered:** *Clerk* — superb DX, but per-MAU pricing scales badly for a SaaS with client-portal seats, and it splits the identity source of truth away from the RLS database; *Auth.js* — self-maintained security surface we'd rather not own; *WorkOS* — added later only for enterprise SSO/SCIM (Phase 5), in front of Supabase Auth.

### 3.4 Supabase Edge Functions — server logic beyond Next.js

- **Decision:** Edge Functions (Deno) for: webhook receivers (Stripe, email inbound, n8n callbacks), scheduled jobs (via `pg_cron` → function invocation), AI background pipelines (embedding generation, digest generation), and anything that must outlive a Vercel request.
- **Rationale:** Server Actions handle request/response logic; Edge Functions handle **event-driven and scheduled** logic close to the database. Keeping webhooks off the Next.js app also isolates untrusted inbound payloads.
- **Alternatives considered:** *Vercel cron + route handlers* — acceptable, but couples background load to the web deployment; *dedicated worker service (Fly/Railway)* — this is the documented **upgrade path** when job volume demands it (`09_Scaling_Strategy.md` §3.3), not the starting point.

### 3.5 Supabase Realtime

- **Decision:** Realtime (Postgres CDC channels) for live task boards, notification badges, Aurex streaming status, and presence in Meetings/Documents. Channels are namespaced per workspace (`ws:{workspace_id}:{module}`) and authorized via RLS.
- **Rationale:** We get live UX without running a WebSocket fleet. Every realtime payload is treated as an *invalidation hint* for TanStack Query, not as the source of truth — this keeps correctness in Postgres.
- **Alternatives considered:** *Pusher/Ably* — another vendor + another tenancy model to secure; *polling* — the fallback we degrade to per-feature if Realtime hits scale limits (`09_Scaling_Strategy.md` §3.2).

---

## 4. AI Stack

Full architecture in `06_AI_Architecture.md`; stack decisions summarized here.

### 4.1 Model providers — Claude primary, OpenAI secondary

- **Decision:** Anthropic Claude as the primary model family (assistant reasoning, agentic tool use, long-context document/email analysis); OpenAI as secondary (fallback routing, embeddings if chosen at implementation time, and any capability gaps).
- **Rationale:** Aurex is agentic — it reads CRM records, drafts proposals, and executes tools. Claude's tool-use reliability and long-context behavior fit that core loop. A second provider is **required**, not optional: it de-risks outages, price shocks, and model regressions (`14_Risk_Assessment.md` §A3).

### 4.2 AI Gateway abstraction (internal, `packages/ai`)

- **Decision:** All model calls go through one internal gateway module: provider-agnostic request/response types, model tiering (`fast` / `standard` / `frontier` logical tiers mapped to concrete models in config), per-workspace token metering written to `ai_usage` (billing-ready for Phase 5), retry/fallback routing, redaction hooks, and full request/response logging (with PII controls).
- **Rationale:** Model churn is certain; our application code referencing "the assistant model tier" instead of a model ID makes churn a config change. Per-workspace metering from day one is what makes AI a sellable, cost-controlled SaaS feature later.
- **Alternatives considered:** *OpenRouter / hosted gateways* — adds a third party into the most sensitive data path (tenant business data in prompts); *LiteLLM proxy* — another service to run; our needs (2 providers, tiering, metering) are small enough to own as a library, and we can put a hosted gateway *behind* our interface later.

### 4.3 LangGraph — agent orchestration

- **Decision:** LangGraph (TypeScript) for multi-step agent workflows: stateful graphs with checkpoints (persisted to Postgres), explicit human-approval interrupt nodes, and deterministic replay for debugging.
- **Rationale:** Aurex's serious workflows (e.g., "prepare the monthly client report": gather project data → summarize → draft email → **await human approval** → send) are graphs with persistence and interrupts, exactly LangGraph's model. Human-in-the-loop checkpoints are a hard product rule (`14_Risk_Assessment.md` §A1: no irreversible external action without approval).
- **Alternatives considered:** *raw tool-call loops* — fine for single-step chat, unmanageable for resumable multi-step jobs; *LangChain (classic chains)* — abstraction sprawl without the state model; *Temporal* — superb durability but heavy infra for our stage; noted as a possible Phase 5 substrate for long-running automations.

### 4.4 pgvector — embeddings & per-tenant RAG

- **Decision:** `pgvector` in the primary Postgres, HNSW indexes, embeddings tables carrying `workspace_id` with the **same RLS policies as everything else**. Per-tenant RAG over Knowledge Base, Documents, CRM notes, and email (with consent flags).
- **Rationale vs dedicated vector DBs:** the decisive argument is **tenancy**. In pgvector, tenant isolation of vectors is the same RLS policy that protects the rest of the row — one isolation model, auditable in one place. A dedicated vector DB means re-implementing multi-tenant isolation in a second system, plus sync pipelines, plus a second backup/consistency story. At our scale (millions of vectors per large tenant, not billions), pgvector with HNSW is comfortably sufficient.
- **Upgrade path (pre-committed):** if p95 vector search exceeds budget or vector storage distorts primary sizing, we move embeddings to (in order of preference) a dedicated Postgres+pgvector instance (same code, new connection string) → Turbopuffer/Qdrant behind the existing `retrieval` interface in `packages/ai`. The retrieval interface exists from day one specifically so this swap touches one package. Triggers defined in `09_Scaling_Strategy.md` §4.2.

---

## 5. Automation

### 5.1 n8n — external automation (self-hosted, Docker)

- **Decision:** Self-hosted n8n via Docker (Compose in-repo; deployed on a small VM/Fly) for **external** integrations: third-party SaaS glue, inbound webhooks from tools we don't deeply integrate, and ops workflows.
- **Rationale:** Self-hosting keeps tenant data off n8n cloud, avoids per-execution pricing, and lets n8n reach our private endpoints. It buys us hundreds of pre-built connectors we should never hand-write.
- **Boundary rule:** n8n never touches the database directly — it calls authenticated internal API endpoints only. This keeps RLS/RBAC/audit as the single enforcement path.
- **Alternatives considered:** *Zapier/Make* — per-task pricing at multi-tenant scale is untenable, and data residency is worse; *Trigger.dev/Inngest* — these compete with our internal job strategy, not with n8n's connector catalog; re-evaluated in Phase 3 for durable jobs.

### 5.2 Automation Studio — internal automation on the domain-events table

- **Decision:** The internal Automation Studio module is built on the append-only `domain_events` table. Every meaningful state change (`invoice.paid`, `task.completed`, `deal.stage_changed`, …) is written as an event in the same transaction as the change. Consumers — automations, notifications, analytics rollups, AI context/memory, webhooks out to n8n — read from this one stream.
- **Rationale:** One event spine means automations, the notification system, analytics, and Aurex's situational awareness all share the same truth, with zero drift and a built-in replay/debug story. It is also the natural future outbox if we ever extract services (`09_Scaling_Strategy.md` §5).

---

## 6. Storage

| Concern | Choice | Rationale |
|---|---|---|
| Standard files (avatars, invoice PDFs, contract docs, KB attachments) | **Supabase Storage** | RLS-integrated access policies per workspace; signed URLs; zero extra vendor for the 95% case |
| Large / CDN-heavy assets (design deliverables, video, website-monitoring screenshots, client asset libraries) | **Cloudflare R2** | Zero egress fees (decisive for client-facing asset delivery), S3-compatible API, Cloudflare CDN in front |

- **Rule:** a single internal `storage` interface in `packages/core` routes by asset class; application code never talks to a bucket SDK directly. Object keys are prefixed `workspace_id/…` and access is issued via short-lived signed URLs minted server-side after an RBAC check.
- **Alternative considered:** *S3 everywhere* — egress pricing punishes exactly our Phase 4+ use case (clients downloading large deliverables).

---

## 7. Infrastructure & Tooling

| Tool | Decision & rationale | Alternatives considered |
|---|---|---|
| **Vercel** | Hosting for `apps/web`: preview deploys per PR (our review workflow), edge network, first-class Next.js. | Cloudflare Pages (weaker Next.js parity), self-hosted (ops cost). Exit path: Next.js self-hosts on any Node/Docker target. |
| **GitHub Actions** | CI/CD: typecheck, lint, unit tests, Playwright smoke, schema-convention lint, migration dry-run against a shadow DB, conventional-commit check. Deploys: Vercel via git integration; Supabase migrations + Edge Functions via CLI in a gated job. | CircleCI/Buildkite — no advantage at our scale; already on GitHub. |
| **Turborepo + pnpm** | Monorepo task graph with remote caching; pnpm for strict, fast, disk-efficient installs and workspace protocol. | Nx (more powerful, more framework buy-in than needed), npm/yarn workspaces alone (no task caching). |
| **Sentry** | Error tracking + performance tracing for web, Edge Functions, and AI pipeline failures; release tagging tied to CI; tenant-tagged events (`workspace_id` as tag, no PII in payloads). | Rollbar/Bugsnag — weaker Next.js RSC + source-map story. **Justification for adding:** a multi-tenant system without per-tenant error attribution cannot triage; this is table stakes before first external user. |
| **PostHog** | Product analytics (funnels, feature adoption per module), session replay (internal + opt-in), and **feature flags** — satisfying the feature-flag engineering rule without another vendor. EU hosting available for GDPR posture. | Mixpanel/Amplitude (no flags, no replay in one tool), LaunchDarkly (flags only, expensive). **Justification:** we're building 20 modules; knowing which ones agencies actually use is existential input to the Phase 5 packaging decision. |
| **Resend** | Transactional email (auth mails, notifications, client-portal invites, invoice sends) with React Email templates in `packages/ui`. Per-workspace sending domains in Phase 5. | SendGrid/Postmark (fine, but React Email integration and DX favor Resend; Postmark is the fallback if deliverability disappoints). **Justification:** the Email Center module makes email a core domain; template-as-component keeps email UI in the design system. |
| **Docker** | Only for self-hosted services: n8n (+ its Postgres) and local dev parity (`supabase start`). The application itself is not containerized while on Vercel. | — |

---

## 8. Testing Stack

| Layer | Tool | Scope & policy |
|---|---|---|
| Unit / logic | **Vitest** | `packages/core` (schemas, permissions logic, event contracts), `packages/ai` (gateway routing, prompt assembly — with recorded model fixtures). Fast, ESM-native, Turborepo-cacheable. |
| Component | **Testing Library** (+ Vitest, happy-dom) | `packages/ui` primitives and critical feature components (forms, permission-gated UI). Behavior-first queries; no snapshot-only tests. |
| E2E | **Playwright** | Cross-module critical paths: auth + workspace switching, **RLS/tenant-isolation smoke suite** (user A must never see workspace B data — run on every PR), invoice lifecycle, task board, portal access boundaries. Runs against a seeded local Supabase. |
| Database | **pgTAP-style SQL tests** (via Supabase test harness) | RLS policies tested as code: every table gets deny-by-default assertions. Non-negotiable per `05_Security_And_Permissions.md`. |
| AI evals | Vitest-driven eval harness (Phase 3) | Golden-set evaluations for Aurex tool-selection and RAG answer quality; regression gate on prompt/model changes. |

Chosen over Jest (slower, worse ESM), Cypress (Playwright's parallelism, trace viewer, and multi-context — needed for two-tenant isolation tests — win).

---

## 9. Full Stack Summary Table

| Technology | Role | Phase of adoption |
|---|---|---|
| Next.js (App Router, RSC) | Web framework | 0 — Foundation |
| React 19 | UI runtime | 0 |
| TypeScript (strict) | Language | 0 |
| TailwindCSS (+ preset) | Styling | 0 |
| shadcn/ui (vendored) | Design-system primitives | 0 |
| Framer Motion | Animation | 1 — Internal MVP |
| TanStack Query v5 | Client server-state | 1 |
| Zustand | Client-only state | 1 |
| React Hook Form + Zod | Forms + shared validation | 0 |
| Supabase Postgres + RLS | Database + tenancy | 0 |
| UUIDv7 keys, soft deletes, audit log | DB conventions | 0 |
| `domain_events` table | Event spine | 0 (schema) / 2 (consumers) |
| Supabase Auth | Identity + JWT claims for RLS | 0 |
| Supabase Edge Functions | Webhooks, scheduled + background logic | 1 |
| Supabase Realtime | Live updates, presence | 1–2 |
| Supabase Storage | Standard file storage | 1 |
| Cloudflare R2 | Large/CDN asset storage | 2 — Agency Ops |
| Anthropic Claude | Primary AI models | 3 — AI Layer (gateway scaffold in 1) |
| OpenAI | Secondary AI models / fallback | 3 |
| AI Gateway (`packages/ai`) | Provider abstraction, tiering, metering | 1 (scaffold) / 3 (full) |
| LangGraph | Agent orchestration, HITL checkpoints | 3 |
| pgvector (HNSW) | Embeddings, per-tenant RAG | 3 |
| n8n (Docker, self-hosted) | External automation/connectors | 2 |
| Automation Studio | Internal event-driven automation | 3 |
| Vercel | Hosting + preview deploys | 0 |
| GitHub Actions | CI/CD | 0 |
| Turborepo + pnpm | Monorepo build system | 0 |
| Sentry | Errors + tracing | 0 |
| PostHog | Product analytics + feature flags + replay | 1 |
| Resend (+ React Email) | Transactional email | 1 |
| Vitest / Testing Library / Playwright | Testing | 0 |
| RLS SQL tests (pgTAP-style) | Tenancy policy tests | 0 |
| WorkOS (SSO/SCIM) | Enterprise auth add-on | 5 — Commercial SaaS |
| Dedicated queue / workers | Background jobs at scale | 3–5, metric-triggered (`09`) |

---

## 10. Improvements Over the Original Suggestion

The original brief specified the core (Next.js, Supabase, Claude/OpenAI, LangGraph, pgvector, n8n, R2, Vercel). This document **adds** the following, deliberately:

1. **Turborepo monorepo (formalized).** "Modular monolith" is only real if module boundaries are mechanically enforced. Separate packages + import-boundary lint rules (see `13_Folder_Structure.md` §5) make the seams compiler-checked, which is exactly what makes future service extraction possible (`09_Scaling_Strategy.md` §5).
2. **TanStack Query.** The brief implied Supabase client calls from components. Ad-hoc fetching across 20 modules produces inconsistent loading states, no optimistic updates, and cache bugs. A single server-state layer with workspace-keyed invalidation is cheaper than the bespoke alternative every team ends up building badly.
3. **Zod as the single schema spine.** Elevated from "validation library" to architectural keystone: one schema drives form validation, server-side parsing, and **AI tool definitions**. Without this, the AI layer would develop its own drift-prone type system.
4. **Sentry.** No error tracking was specified. For a multi-tenant product, per-tenant error attribution is a prerequisite for operating in good faith — a tenant-affecting bug we can't see is a churn event (or a breach signal) we can't respond to.
5. **PostHog.** Adds product analytics **and** satisfies the feature-flag engineering rule in one tool. Phase 5 packaging (which modules become paid tiers) must be decided from usage data, not intuition.
6. **Resend + React Email.** Email is a first-class module (Email Center, notifications, portal invites, invoices). Choosing the transactional provider now — with templates living in the design system — prevents the usual "SMTP creds in an env var, HTML strings in code" debt.
7. **UUIDv7 primary keys.** Over the implicit default (UUIDv4): time-ordered UUIDs keep B-tree insert locality (materially better index performance on high-write tables like `domain_events`, `audit_log`, `notifications`) while remaining globally unique — which random v4 pays for with index fragmentation, and which serial integers pay for with enumeration risk and shard-hostility.
8. **The `domain_events` table as the event spine.** The brief listed automations, notifications, analytics, and AI context as features; this design makes them all *consumers of one append-only stream* written transactionally with state changes. It is the single highest-leverage schema decision in the system: it powers Automation Studio, guarantees notification/analytics consistency, gives Aurex a chronological memory of the business, and doubles as the outbox pattern if services are ever extracted.

---

*Changes to this document follow the ADR process in `03_Architecture.md`. Costs and scale triggers referenced here are maintained in `09_Scaling_Strategy.md`.*
