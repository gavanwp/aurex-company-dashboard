# 09 — Scaling Strategy

| | |
|---|---|
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Founding CTO, AurexDesigns |
| **Related** | `08_Tech_Stack.md`, `08_Tech_Stack.md`, `05_User_Roles.md`, `07_AI_Strategy.md`, `08_Tech_Stack.md`, `10_Roadmap.md`, `14_Risk_Assessment.md` |

This document defines how AurexOS scales from **one agency (AurexDesigns, internal)** to **thousands of agency workspaces** as a commercial SaaS — without a rewrite. The strategy is explicitly staged: we buy headroom with architecture (tenancy model, event spine, module seams) and spend money/complexity (replicas, queues, shards) only when named metrics demand it. **Every scaling step below has a trigger; nothing is built speculatively.**

---

## 1. Scaling Philosophy

1. **Scale by trigger, not by fear.** Each mechanism in this doc has a quantitative trigger. Until the trigger fires, the simpler design stands.
2. **The tenancy model is the scaling model.** Because every row, vector, file key, realtime channel, and job carries `workspace_id`, every future partitioning/sharding/extraction decision has an obvious key. This is why we insisted on it in Phase 0 (`08_Tech_Stack.md` §3.1).
3. **The monolith is a feature.** A modular monolith on serverless compute scales horizontally by default. Our scarce resource is engineering attention, not CPU.
4. **AI is the first thing to outgrow the primary.** Plan for AI workloads (embeddings, batch jobs, usage logging) to be the earliest extraction, and design the seams accordingly.

---

## 2. Tenancy Model Deep-Dive

### 2.1 The model: shared schema, `workspace_id` + RLS

Every tenant-scoped table carries `workspace_id uuid NOT NULL`. Postgres RLS policies — deny-by-default, applied to every table — restrict all reads/writes to workspaces the authenticated user belongs to, with role predicates layered per `05_User_Roles.md`. JWT claims (workspace memberships, active role) are evaluated inside policies via stable helper functions so the planner can cache them.

### 2.2 Why shared-schema multi-tenancy

| Criterion | Shared schema + RLS (chosen) | Schema-per-tenant | DB-per-tenant |
|---|---|---|---|
| Migration cost at 1,000 tenants | 1 migration | 1,000 migrations (fan-out, partial-failure states) | 1,000 migrations + fleet orchestration |
| Cross-tenant ops (admin, analytics, abuse detection) | Trivial SQL | Painful | Requires a data warehouse |
| Cost per marginal tenant | ~0 | Connection/catalog overhead | Full instance cost — kills PLG/free tier |
| Isolation strength | Logical (RLS) — strong if policies are tested | Logical (search_path bugs are a real class) | Physical — strongest |
| Fit with Supabase | Native | Poor | Manual fleet |

Shared-schema is the only model where a free/self-serve tier is economically possible and where a two-person team can operate thousands of tenants. The isolation trade-off is closed with engineering discipline, not hope — see §2.3.

### 2.3 Isolation guarantees (and how they're enforced)

- **Deny-by-default:** RLS enabled at table creation; a table without policies returns zero rows. A CI schema lint fails the build if any table lacks RLS or `workspace_id` (where required).
- **Policy tests as first-class tests:** every table ships pgTAP-style assertions — "user in workspace A gets 0 rows from workspace B" — run on every PR (`08_Tech_Stack.md` §8).
- **Two-tenant Playwright suite:** end-to-end cross-tenant probes through the real UI/API on every PR.
- **`service_role` discipline:** the RLS-bypassing key is confined to Edge Functions with a documented allowlist of operations; it never reaches the Next.js app. Every service-role query must carry an explicit `workspace_id` predicate, enforced by code review + a wrapper API in `packages/db` that makes the workspace parameter mandatory.
- **Storage & Realtime inherit the model:** object keys prefixed by `workspace_id` with policy checks; realtime channels namespaced and authorized per workspace.
- Residual risk and monitoring for leakage: `14_Risk_Assessment.md` §S1.

### 2.4 Noisy-neighbor mitigation

Shared infrastructure means one tenant can degrade others. Controls, in adoption order:

1. **Statement timeouts** (global, then per-role) so no tenant query runs unbounded. Phase 1.
2. **Per-workspace rate limits** at the application edge (middleware, keyed on `workspace_id`) for API, realtime subscriptions, and automation executions. Phase 2.
3. **Per-workspace quotas** stored in `workspace_limits`: rows/storage/AI tokens/automation runs per plan tier — metered off `domain_events` and `ai_usage`. Phase 5 (billing-enforced), soft-warning earlier.
4. **Workload segregation:** heavy analytical/AI reads move to replicas (§3.3), so an analytics-hungry tenant can't slow another tenant's invoice save.
5. **Pathological-tenant playbook:** identify via per-workspace `pg_stat_statements` attribution (workspace tag in application_name), then throttle → isolate (§2.5) → contractually re-tier.

### 2.5 Future: cells and dedicated instances (Phase 5+)

- **Dedicated instance tier:** because all data is keyed by `workspace_id` and migrations are plain SQL, a single enterprise tenant can be lifted onto its own Supabase project (dump → filtered restore → cutover behind a maintenance window). Sold as a premium isolation/compliance tier. No code changes — only a per-workspace connection-routing map in the app layer, which we build *only when the first enterprise contract demands it*.
- **Cell-based sharding:** if the shared pool itself outgrows one primary (trigger: sustained >60% primary CPU after replica offload and partitioning, or >~2 TB hot data), we split into **cells** — each cell a full stack (DB + realtime) hosting a set of workspaces, with a thin global routing layer (workspace → cell) and a small global control-plane DB (accounts, billing, cell map). Workspaces never span cells; this preserves the "everything joins locally" property that makes the product simple. This is a Phase 5+ blueprint, documented now so nothing in Phases 0–4 accidentally creates cross-workspace joins in product features.

---

## 3. Database Scaling

### 3.1 Indexing discipline (Phase 0+)

- Composite indexes lead with `workspace_id` on every tenant table (`(workspace_id, status)`, `(workspace_id, created_at DESC)` for feeds).
- Partial indexes exclude soft-deleted rows: `WHERE deleted_at IS NULL` — keeps hot indexes small as tombstones accumulate.
- UUIDv7 keys keep insert-heavy B-trees right-leaning and cache-friendly (`08_Tech_Stack.md` §10.7).
- Index review is part of migration review; unused-index audit quarterly via `pg_stat_user_indexes`.

### 3.2 Partitioning append-only tables

`domain_events`, `audit_log`, `notifications`, and `ai_usage` are the unbounded-growth tables.

- **Design now:** all four are written append-only with `created_at` and `workspace_id`, and are never joined in hot OLTP paths — so they are partition-ready by construction.
- **Trigger:** any of them exceeds ~100M rows or its indexes stop fitting comfortably in memory.
- **Action:** native range partitioning by month on `created_at` (with `workspace_id` in the partition key only if a cell split hasn't already happened). Old partitions: `audit_log` retained per compliance policy (cold storage export → detach), `domain_events` beyond 12 months archived to R2 as Parquet (analytics can still read them), `notifications` pruned at 90 days.

### 3.3 Read replicas

- **Trigger:** primary CPU sustained >50%, or analytics/AI read latency interfering with OLTP p95.
- **Action (Supabase read replicas):** route by workload, not by chance — Analytics & Reports module, Aurex RAG retrieval reads, dashboard aggregate widgets, and export jobs go to replicas via an explicit `dbRead('analytics')` handle in `packages/db`. OLTP and anything read-after-write stays on primary. Replica lag is surfaced as a health metric; consumers of replicas must be lag-tolerant by contract.

### 3.4 Connection pooling

Serverless compute (Vercel functions + Edge Functions) multiplied by per-request connections is the classic Postgres killer.

- **Day one:** all app connections go through **Supavisor** in transaction mode (Supabase's built-in pooler; PgBouncer-equivalent). Direct connections are reserved for migrations.
- **Consequences we accept and design for:** transaction-mode pooling forbids session state — no session-level `SET`, no prepared-statement reliance across transactions; RLS context arrives via JWT claims per request, which is compatible.
- **Trigger for revisiting:** pool saturation alerts (>80% pool utilization) → raise pool size / split pools per workload (web vs jobs vs AI) before touching instance size.

### 3.5 Moving heavy AI workloads off the primary

Ordered plan, each step trigger-gated:

1. **Phase 3 (immediate):** embedding generation and batch AI jobs run in background workers (Edge Functions → §4.4), never in request paths; vector writes are batched.
2. **Trigger — vector search p95 > 300 ms or vector data > ~30% of primary storage:** move `embeddings` + `ai_usage` to a **separate Postgres instance** (same schema conventions, same code via a second connection in `packages/db`). RAG reads leave the primary entirely.
3. **Trigger — recall/latency still failing at high vector cardinality:** swap the retrieval backend to a dedicated vector store behind the `retrieval` interface (`08_Tech_Stack.md` §4.4). Application code above the interface does not change.

---

## 4. Application & AI Scaling

### 4.1 Stateless compute

The Next.js app and Edge Functions hold **zero** instance state: no in-memory sessions, no local file writes, no in-process cron. All state lives in Postgres/Storage/R2. Horizontal scale is therefore the platform's problem (Vercel/Supabase autoscale), and deploys are trivially replaceable instances — the precondition for §7's zero-downtime story.

### 4.2 Caching layers (in order of preference)

1. **RSC/full-route caching** for non-tenant-specific surfaces (marketing, docs) — aggressive.
2. **TanStack Query client cache** — the workhorse for perceived performance; workspace-keyed invalidation via realtime hints.
3. **Postgres-materialized aggregates** — dashboard/analytics widgets read from event-derived rollup tables (refreshed by jobs), not from `COUNT(*)` over raw tables.
4. **Redis (Upstash)** — introduced **only** when a named trigger fires (rate-limit counters at edge scale, hot per-workspace config reads >X/s, AI prompt-fragment caching). Not in the stack before then; every Redis key must have an owner, TTL, and invalidation story.

Deliberately **not** caching tenant data at the CDN edge: cache-key-by-tenant mistakes are a data-leak class we opt out of entirely (`14_Risk_Assessment.md` §S1).

### 4.3 Background jobs: Postgres first, queue later

- **Phase 1–3: pg-based jobs.** A `jobs` table (or pgmq) with `FOR UPDATE SKIP LOCKED` workers driven by scheduled Edge Functions; `pg_cron` for recurrence. Jobs are idempotent by design (job key = deterministic hash), carry `workspace_id`, and record attempts/errors. This handles thousands of jobs/hour with zero new infrastructure and transactional enqueue with domain writes (job insert + event insert in one transaction — no dual-write problem).
- **Trigger for a dedicated queue:** sustained >10–20 jobs/sec, or job latency SLO breaches from polling granularity, or need for >15-min executions (long AI pipelines).
- **Action:** adopt a durable job platform (Trigger.dev / Inngest / Temporal — evaluated then) **behind the existing `enqueue()` interface** in `packages/core`. The pg jobs table remains the outbox; the platform becomes the executor. Callers never change.

### 4.4 AI scaling: cost, growth, batch, tiering

AI is the dominant variable cost at SaaS scale. Controls (full detail in `07_AI_Strategy.md`):

- **Token cost management:** every model call is metered per workspace/feature/model in `ai_usage` from the first call (Phase 1 scaffold). Budgets per plan tier with soft (warn) and hard (degrade to smaller tier / require confirmation) limits. Prompt caching for stable system/context prefixes. Context assembly is retrieval-first — RAG snippets, never "stuff the whole CRM in."
- **Model tiering:** logical tiers (`fast`/`standard`/`frontier`) routed by task class: classification, tagging, and routing on `fast`; drafting and summarization on `standard`; multi-step agentic work on `frontier`. Tier mapping is config, so provider price/capability changes are ops events, not deploys.
- **Batch processing:** embeddings, digests, enrichment, and eval runs use provider batch APIs (≈50% cost) off-peak; only interactive Aurex traffic pays real-time prices.
- **Embedding storage growth:** chunking policy caps vectors per document; re-embedding on model upgrade runs as a background backfill per workspace (never big-bang); cold workspaces' vectors are eligible for compression/eviction with lazy re-embedding. Growth is tracked as a first-class capacity metric (§6).
- **Degradation ladder:** provider outage → secondary provider (gateway fallback) → reduced tier → graceful "Aurex is limited right now" UX. The OS keeps operating when the AI doesn't; the AI layer is additive to workflows, never a hard dependency for CRUD.

---

## 5. Evolution Path: Modular Monolith → Services (Only If Metrics Demand)

**Default position: never extract.** Extraction is a response to a measured constraint, not an aspiration.

- **The seams are the modules.** Package boundaries + the `domain_events` spine mean each module already communicates through typed interfaces and events. An extracted service takes its tables, subscribes to the event stream (events table doubles as outbox → relay), and exposes the same interface over the network.
- **Extraction triggers (any one, sustained):**
  1. A module's workload profile is fundamentally different (e.g., Website Monitoring's polling fleet; AI batch pipelines' GPU/latency profile) and is distorting shared capacity.
  2. Deploy coupling causes measurable harm (a module needs 10×/day deploys while another needs stability).
  3. A compliance boundary requires physical separation (e.g., Finance data residency for a jurisdiction).
- **Likely first extractions, in order:** (1) AI pipeline workers, (2) Website Monitoring probes, (3) Email ingestion. Note all three are *workers*, not user-facing services — the user-facing monolith likely survives to very large scale.
- **Anti-goal:** microservices for org-chart or fashion reasons. With a team of this size, every extraction is a standing operational tax; the burden of proof is on extraction.

---

## 6. Observability

- **Structured logging:** JSON logs everywhere; every log line carries `workspace_id`, `user_id` (hashed where required), `request_id`, `module`. Logs without tenant context are lint-flagged.
- **Tracing:** Sentry performance tracing across Next.js → Server Action → DB, and through Edge Functions; `request_id` propagated into `pg` via `application_name` for query attribution. OpenTelemetry-compatible so we can re-point the backend later.
- **Metrics that page (SLOs):**

| SLO | Target (Phase 2 → 5) |
|---|---|
| App availability | 99.5% → 99.9% |
| Interactive p95 (page/server-action) | < 500 ms → < 300 ms |
| Aurex first-token p95 | < 2.5 s |
| Realtime delivery p95 | < 2 s |
| Background job start p95 | < 60 s (standard), < 5 s (interactive-adjacent) |
| Cross-tenant leakage incidents | 0 — any occurrence is a SEV-1 with disclosure protocol (`14_Risk_Assessment.md` §S1) |

- **Capacity metrics reviewed monthly:** primary CPU/IO, pool utilization, table/index sizes (esp. §3.2 tables), vector storage share, AI token spend per workspace, realtime connection counts. Each trigger in this document maps to a dashboard panel with its threshold drawn on the chart — triggers are watched, not remembered.

---

## 7. Zero-Downtime Deploys & Migrations

- **App deploys:** Vercel immutable deploys + instant rollback; feature flags (PostHog) gate risky features independently of deploys; preview deploys per PR against branch databases for schema-affecting work.
- **Migration protocol — expand → migrate → contract, always:**
  1. *Expand:* additive change (new column nullable/defaulted, new table, new index `CREATE INDEX CONCURRENTLY`). Deploy code that writes both/reads old.
  2. *Migrate:* backfill in batched jobs (workspace-by-workspace, throttled), verify counts.
  3. *Contract:* switch reads, then (a release later) drop the old path; destructive DDL only after a soak period and only with a tested rollback script.
- **Rules:** no long-lived locks (lock_timeout set in migration harness); no renames in place (add + backfill + drop); RLS policy changes ship with their pgTAP tests in the same migration; every migration dry-runs against a production-shaped shadow DB in CI (`08_Tech_Stack.md` §7).
- **Data rollback story:** PITR enabled from Phase 1; restore runbook tested quarterly (a backup that hasn't been restored is a rumor).

---

## 8. Load Expectations by Phase

Planning numbers, deliberately conservative on revenue-phase growth; revisited each phase gate (`10_Roadmap.md`).

| Phase | Workspaces | Active users | DB size (hot) | Events/day | AI tokens/mo | Concurrent realtime | Primary bottleneck to watch |
|---|---|---|---|---|---|---|---|
| 1 — Internal MVP | 1 | ~10 | < 1 GB | ~5k | ~5M | ~20 | Nothing — resist optimizing |
| 2 — Agency Ops | 1 (+2–3 pilot) | ~30 | ~5 GB | ~50k | ~30M | ~75 | Job volume from automations |
| 3 — AI Layer | ~5 | ~60 | ~20 GB (vectors ~30%) | ~200k | ~300M | ~150 | AI cost + embedding growth |
| 4 — Client Portal | ~10 (+ portal clients) | ~300 | ~50 GB | ~1M | ~600M | ~500 | Realtime connections, portal p95 |
| 5 — Commercial SaaS (yr 1) | 200–1,000 | 3k–15k | 0.3–1.5 TB | 10–50M | 2–10B | 5k–20k | Pool saturation → replicas → partitioning (in that order) |

Rule of thumb encoded here: **through Phase 4, a single well-indexed Postgres primary with a pooler is comfortably sufficient.** The Phase 5 column is where §3's triggers start firing, roughly in the order listed.

---

## 9. Cost Model Considerations

- **Cost floor (Phases 1–3):** Supabase Pro + Vercel Pro + small n8n VM + Sentry/PostHog starter tiers + AI usage ≈ low hundreds of $/mo; AI usage is the only line item with real variance — hence metering from day one.
- **Unit economics target for Phase 5:** infrastructure cost per active workspace < 10% of that workspace's plan price. The dominant terms will be (1) AI tokens — managed by tiering/budgets/batching (§4.4), priced into plans with included quotas + metered overage; (2) database — managed by partitioning/archival keeping hot data small; (3) egress — managed by R2's zero-egress for asset-heavy tenants.
- **Cost observability:** per-workspace COGS estimate (AI spend + storage + rough compute share) computed monthly from `ai_usage` + storage stats; any workspace whose COGS exceeds its plan price is flagged (the noisy-neighbor and mispriced-plan detector in one).
- **Spend guardrails:** provider budget alerts at 50/80/100% of monthly AI budget; hard per-workspace daily token ceilings even for internal use — a runaway agent loop must hit a wall (`14_Risk_Assessment.md` §A2).

---

## 10. Summary: The Order of Operations When Things Get Slow

1. Check the query — missing/wrong index, N+1 in a Server Component, un-partitioned scan. (Fixes 80% of incidents.)
2. Check the pool — utilization, transaction-mode misuse.
3. Move the workload — analytics/AI reads to replica, sync work to jobs.
4. Partition the append-only tables.
5. Separate the AI datastore.
6. Introduce Redis for the named hot paths.
7. Dedicated queue/workers.
8. Extract the worker-shaped service the metrics point at.
9. Cells / dedicated instances.

Each step is roughly 10× the operational cost of the previous one. We take them in order, and only when the dashboards say so.
