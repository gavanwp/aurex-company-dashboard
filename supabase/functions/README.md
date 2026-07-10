# Edge Functions — Worker Pattern

Deno Edge Functions executing background work from the Postgres jobs queue
(ADR-0005: jobs are rows in `public.jobs`, migration 0011). These are
**foundation skeletons**: the claim → dispatch → complete/fail spine is real
and is the pattern anchor for every future worker; the domain logic inside
handlers is stubbed exactly where it plugs in.

## The worker pattern

Every worker is the same loop:

1. **Claim** a small batch from its queue — `claimJobs()` in `_shared/jobs.ts`.
   Claiming sets `status = 'running'`, increments `attempts`, and records
   `locked_at` / `locked_by`. Today this is an optimistic two-phase claim
   (conditional per-row `UPDATE` — racing workers cannot double-claim); the
   upgrade is migration **0012**'s `claim_jobs()` SQL function using
   `FOR UPDATE SKIP LOCKED`, invoked via `.rpc()` — the full SQL is documented
   in `packages/db/src/jobs.ts`. Callers don't change when it lands.
2. **Dispatch** by queue. Payloads are parsed before use (R-T3) — a `jsonb`
   column is a boundary. Queue names and payload schemas are registered in
   `packages/core/src/jobs/types.ts`; enqueuing happens only through the
   `Enqueuer` interface (`PgEnqueuer` in `packages/db`).
3. **Complete or fail.** Success → `succeeded`. Failure → `failJob()` applies
   the policy: permanent failures → `failed` (no retries); exhausted attempts
   (`attempts >= max_attempts`) → `dead` — the admin-replayable dead-letter
   state; otherwise back to `pending` with jittered backoff
   (30s → 2m → 10m → 1h → 6h, NotificationsArchitecture.md §8).

Handlers must be **idempotent**: the queue is at-least-once by design, and
deterministic job keys (`workspace_id, job_key` unique) plus per-side-effect
idempotency keys (e.g. notification delivery records) absorb replays.

## Functions

| Function | Queue(s) | Purpose |
|---|---|---|
| `jobs-worker` | `files.process`, `ai.ingest` | Generic multi-queue worker — the pattern anchor. New queues get a handler here until volume justifies a dedicated worker. |
| `notifications-deliver` | `notifications.deliver` | Dedicated delivery worker: load notification → preference matrix → channel adapters (ADR-0004) → delivery records. In-app is live via the row insert + Realtime; email (Resend) is stubbed in comments. |
| `_shared/` | — | `service-client.ts` (service-role factory — read its tenancy warning) and `jobs.ts` (claim/complete/fail helpers, to be replaced by `packages/db` imports once a Deno import map is wired). |

## Scheduling (pg_cron)

Workers are drained on a cadence by `pg_cron` + `pg_net` calling the function
URL. Example (lives in a migration when scheduling ships — never run
manually, R-D7):

```sql
select cron.schedule(
  'drain-notifications-deliver',
  '10 seconds', -- pg_cron >= 1.5 supports second-granularity schedules
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/notifications-deliver',
    headers := jsonb_build_object('Authorization', 'Bearer ' || '<cron-secret>')
  )
  $$
);
```

The delivery SLO (event → first-channel delivery p95 ≤ 5s, non-folded) makes
`notifications.deliver` the tightest cadence; `jobs-worker` can drain on
30–60s. If polling cadence ever breaches job-start SLOs, that is a named
ADR-0005 revisit trigger (LISTEN/NOTIFY nudge or a durable execution
platform behind the `enqueue()` seam) — not a reason to tighten cron blindly.

## Ground rules

- **Service role = explicit tenancy.** The service client bypasses RLS; every
  query carries `workspace_id` except the sanctioned cross-tenant queue scan
  (see migration 0011's comment and `_shared/service-client.ts`).
- **Never insert into `jobs` directly.** All enqueuing goes through the
  `Enqueuer` seam (`packages/core/src/jobs/enqueue.ts`, ADR-0005).
- **Secrets via `Deno.env` only** (R-S2/R-S3): `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY` are runtime-injected; `RESEND_API_KEY` etc. are
  set with `supabase secrets set`.
- **Pending tables.** `notification_preferences` and `notification_deliveries`
  are contracted in `packages/core/src/notifications/` but not yet migrated;
  workers fall back to registry defaults until those land.
