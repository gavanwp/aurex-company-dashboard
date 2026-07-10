import {
  JOB_PAYLOAD_SCHEMAS,
  buildJobKey,
  retryBackoffSeconds,
  stableStringify,
  type EnqueueOptions,
  type EnqueueResult,
  type Enqueuer,
  type JobPayload,
  type JobQueue,
} from '@aurexos/core'
import type { DbClient } from './index'
import type { Tables, TablesInsert } from './database.types'

// Postgres implementation of the core Enqueuer seam — ADR-0005.
//
// jobs (0011) is SERVICE-ROLE ONLY: RLS is enabled with zero policies, so the
// DbClient passed here MUST be a service-role client. Draining queues across
// workspaces is the one sanctioned cross-tenant scan (0011 comment); every
// other access carries workspace_id explicitly.
//
// TRANSACTIONALITY NOTE (honest limitation): supabase-js calls cannot join
// the caller's transaction. ADR-0005's "enqueue transactionally with the
// domain write" is fully realized once mutations move into RPCs / SQL
// functions that insert the domain row + event + job in one statement. Until
// then, PgEnqueuer gives idempotent at-least-once enqueue: callers enqueue
// AFTER the domain write commits, and the deterministic job key makes a
// retried enqueue a no-op rather than a duplicate.

/** ISO timestamp `seconds` from now — small local helper, UTC always. */
function isoIn(seconds: number): string {
  return new Date(Date.now() + seconds * 1_000).toISOString()
}

/**
 * The one way jobs enter public.jobs. Parses the payload against the queue's
 * registry schema (R-T3), derives a deterministic job key when none is given,
 * and absorbs (workspace_id, job_key) conflicts as deduplication — enqueueing
 * the same logical job twice is a structural no-op, not an error.
 */
export class PgEnqueuer implements Enqueuer {
  constructor(private readonly client: DbClient) {}

  async enqueue<Q extends JobQueue>(
    queue: Q,
    payload: JobPayload<Q>,
    opts: EnqueueOptions,
  ): Promise<EnqueueResult> {
    // Boundary parse even though the compiler already agrees — jobs.payload
    // is jsonb and workers on the other side re-parse; both ends validate.
    const parsed = JOB_PAYLOAD_SCHEMAS[queue].parse(payload)
    const jobKey = opts.jobKey ?? buildJobKey(queue, stableStringify(parsed))

    const row: TablesInsert<'jobs'> = {
      workspace_id: opts.workspaceId,
      queue,
      job_key: jobKey,
      // Registry payload schemas are JSON-plain by rule (jobs/types.ts), so a
      // parsed payload is structurally Json — asserted, never `any` (R-T2).
      payload: parsed as TablesInsert<'jobs'>['payload'],
      ...(opts.runAt !== undefined ? { run_at: opts.runAt } : {}),
      ...(opts.maxAttempts !== undefined ? { max_attempts: opts.maxAttempts } : {}),
    }

    // upsert + ignoreDuplicates = INSERT ... ON CONFLICT (workspace_id, job_key)
    // DO NOTHING. A conflicting insert returns zero rows — that is the
    // idempotency guard reporting "already enqueued", not a failure.
    const { data, error } = await this.client
      .from('jobs')
      .upsert(row, { onConflict: 'workspace_id,job_key', ignoreDuplicates: true })
      .select('id')

    if (error) {
      throw new Error(`enqueue(${queue}) failed: ${error.message}`)
    }
    const created = data?.[0]
    return created !== undefined
      ? { jobId: created.id, deduplicated: false }
      : { jobId: null, deduplicated: true }
  }
}

// ── Worker-side claiming ────────────────────────────────────────────────────
//
// HONEST MINIMAL VERSION, and its upgrade path.
//
// The end-state claim is a SQL function using FOR UPDATE SKIP LOCKED (ADR-0005),
// called via RPC. It does NOT exist yet — it lands as migration 0012 (do not
// create it here; merged migrations are immutable and 0012 must ship with its
// own review). The function to add:
//
//   -- 0012 — claim_jobs(): atomic batch claim for queue workers (ADR-0005)
//   create or replace function public.claim_jobs(
//     p_queue text,
//     p_limit int,
//     p_worker text
//   ) returns setof public.jobs
//   language sql
//   security definer
//   set search_path = public
//   as $$
//     with claimed as (
//       select id from public.jobs
//       where queue = p_queue
//         and status = 'pending'
//         and run_at <= now()
//       order by run_at
//       for update skip locked
//       limit p_limit
//     )
//     update public.jobs j
//     set status = 'running',
//         attempts = j.attempts + 1,
//         locked_at = now(),
//         locked_by = p_worker,
//         updated_at = now()
//     from claimed
//     where j.id = claimed.id
//     returning j.*;
//   $$;
//   revoke all on function public.claim_jobs(text, int, text)
//     from public, anon, authenticated;
//
// Until 0012 lands, claimJobs() below uses an optimistic two-phase claim:
// select candidates, then a conditional per-row UPDATE guarded on
// (status = 'pending' AND attempts unchanged). Two workers racing for the
// same row cannot both win — the loser's UPDATE matches zero rows and it
// simply moves on. This is correct but chattier than SKIP LOCKED (one
// round-trip per candidate); swap the body for
// `client.rpc('claim_jobs', ...)` when 0012 merges — callers are unaffected.

/**
 * Claim up to `limit` due jobs from `queue` for this worker. Returns only the
 * rows actually won; racing workers lose silently and skip. Service-role
 * client required (jobs has zero RLS policies — deny-by-default).
 */
export async function claimJobs(
  client: DbClient,
  queue: JobQueue | (string & {}),
  limit: number,
  workerId: string,
): Promise<Tables<'jobs'>[]> {
  const nowIso = new Date().toISOString()
  const { data: candidates, error } = await client
    .from('jobs')
    .select('*')
    .eq('queue', queue)
    .eq('status', 'pending')
    .lte('run_at', nowIso)
    .order('run_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`claimJobs(${queue}) select failed: ${error.message}`)
  if (!candidates || candidates.length === 0) return []

  const claimed: Tables<'jobs'>[] = []
  for (const candidate of candidates) {
    const { data: won, error: claimError } = await client
      .from('jobs')
      .update({
        status: 'running',
        attempts: candidate.attempts + 1,
        locked_at: nowIso,
        locked_by: workerId,
      })
      .eq('id', candidate.id)
      .eq('status', 'pending')
      .eq('attempts', candidate.attempts)
      .select()
      .maybeSingle()

    if (claimError) throw new Error(`claimJobs(${queue}) claim failed: ${claimError.message}`)
    if (won !== null) claimed.push(won)
  }
  return claimed
}

/** Mark a claimed job succeeded and release its lock. */
export async function completeJob(client: DbClient, jobId: string): Promise<void> {
  const { error } = await client
    .from('jobs')
    .update({ status: 'succeeded', locked_at: null, locked_by: null, last_error: null })
    .eq('id', jobId)
    .eq('status', 'running')

  if (error) throw new Error(`completeJob(${jobId}) failed: ${error.message}`)
}

/**
 * Record a failed execution of a claimed job, applying ADR-0005 retry
 * semantics (attempts was already incremented at claim time):
 *
 * - `permanent: true`  → status `failed` (no retries — the adapter/worker
 *   classified the error as unrecoverable).
 * - attempts >= max_attempts → status `dead` (the DLQ state, admin-replayable).
 * - otherwise → back to `pending` with run_at pushed out on the
 *   30s → 2m → 10m → 1h → 6h schedule, jittered ±20% so retry herds spread.
 */
export async function failJob(
  client: DbClient,
  job: Tables<'jobs'>,
  errorMessage: string,
  opts?: { permanent?: boolean },
): Promise<void> {
  const lastError = errorMessage.slice(0, 2_000)
  const base = { locked_at: null, locked_by: null, last_error: lastError }

  const update =
    opts?.permanent === true
      ? { ...base, status: 'failed' as const }
      : job.attempts >= job.max_attempts
        ? { ...base, status: 'dead' as const }
        : {
            ...base,
            status: 'pending' as const,
            run_at: isoIn(retryBackoffSeconds(job.attempts) * (0.8 + Math.random() * 0.4)),
          }

  const { error } = await client.from('jobs').update(update).eq('id', job.id)
  if (error) throw new Error(`failJob(${job.id}) failed: ${error.message}`)
}
