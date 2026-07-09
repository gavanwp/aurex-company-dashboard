# ADR-0005: Background Jobs on Postgres First; Durable Queue Platform Only on Trigger

**Status:** Accepted
**Date:** 2026-07-08
**Deciders:** CTO / Founding team, AurexDesigns
**Related documents:** `../architecture/AutomationArchitecture.md`, `../09_Scaling_Strategy.md`, `../08_Tech_Stack.md`

## Context

AurexOS needs background work from Phase 1: notification fan-out, embedding generation, digest builds, automation executions, scheduled reports, webhook retries. Most of this work is *caused by* a domain write — an invoice is paid, therefore a receipt job must exist. Any queue that lives outside the database reintroduces the dual-write problem: the transaction commits but the enqueue fails (lost job), or the enqueue succeeds but the transaction rolls back (ghost job). Our load expectations (`../09_Scaling_Strategy.md` §8) say thousands of jobs per *hour* through Phase 4 — three orders of magnitude below where Postgres-based queues struggle. Anti-goal 6 (`../03_System_Goals.md` §11) forbids new queue infrastructure without proof Postgres cannot serve.

## Decision

We will run background jobs as **rows in a Postgres `jobs` table**: workers claim work with `FOR UPDATE SKIP LOCKED`, `pg_cron` drives recurrence, and Edge Functions execute. Jobs are **enqueued transactionally with domain writes** (job insert + event insert + mutation in one transaction — no dual-write problem), are idempotent by deterministic job key, and carry `workspace_id`. All enqueuing goes through one `enqueue()` interface in `packages/core`. A durable execution platform (Trigger.dev / Inngest / Temporal — evaluated at trigger time, not pre-committed) is adopted **behind that interface** only when a named trigger fires.

## Options Considered

### Option A — Postgres-first jobs table (chosen)
- **Pros:** transactional enqueue eliminates the dual-write bug class entirely; zero new infrastructure, zero new vendor, zero new tenancy model — jobs inherit RLS-adjacent workspace scoping, backups, and observability from the primary; `SKIP LOCKED` + deterministic job keys give safe concurrent workers and idempotent retries; comfortable headroom for thousands of jobs/hour. Mature libraries — **pgmq, graphile-worker** — are acceptable *implementations* of this option if they beat hand-rolling; the decision is "jobs live in Postgres," not "we write every line ourselves."
- **Cons:** polling granularity bounds job-start latency; long executions are constrained by executor limits; at high throughput, queue churn creates table bloat requiring vacuum attention.
- **Chosen.**

### Option B — Durable execution platform (Trigger.dev / Inngest / Temporal) from day one
- **Pros:** long-running executions, retries, and observability dashboards out of the box; genuinely the right tool at scale.
- **Cons:** real money and vendor coupling before any workload justifies it; the dual-write problem returns unless we keep an outbox in Postgres anyway — at which point the platform is an executor, not a queue, which is exactly the trigger-gated upgrade path, not the starting point. Violates anti-goal 6.
- **Rejected for now.** This is the named destination when triggers fire.

### Option C — Redis + BullMQ
- **Pros:** proven, fast, huge ecosystem.
- **Cons:** loses transactional enqueue (Redis cannot join a Postgres transaction), so the dual-write problem must be solved with an outbox — again reducing Redis to an executor; and it introduces Redis before *its* named trigger (`../09_Scaling_Strategy.md` §4.2) fires.
- **Rejected.**

### Option D — pgmq / graphile-worker as standalone decision
- Not a separate option: both are implementations of Option A and are evaluated on engineering merit inside it.

## Consequences

- **Positive:** job creation is atomic with the domain write, forever; the `jobs` table doubles as the outbox when a platform arrives — the migration is "platform becomes executor," and callers of `enqueue()` never change; one place to observe, query, and replay all background work.
- **Negative:** we own worker-loop correctness — visibility timeouts, poison-job handling, retry backoff — that a platform would sell us; job-start latency is bounded by polling cadence, so "interactive-adjacent" jobs (SLO: start < 5 s, `../09_Scaling_Strategy.md` §6) need a LISTEN/NOTIFY nudge or tight polling on a dedicated worker; executions longer than Edge Function limits simply cannot run until the platform arrives, which caps long AI pipeline design in Phase 3.
- **Revisit when (any one, sustained):** (a) throughput exceeds 10–20 jobs/sec, (b) workloads need > 15-minute executions (long AI pipelines), or (c) polling granularity breaches job-start SLOs. Action: evaluate Trigger.dev / Inngest / Temporal *then*, and slot the winner behind `enqueue()` with the jobs table as outbox.
