// Job-queue helpers for Edge Function workers (ADR-0005).
//
// PATTERN ANCHOR — deliberately self-contained. The canonical, typed
// implementation of claim/complete/fail lives in packages/db/src/jobs.ts
// (PgEnqueuer, claimJobs, completeJob, failJob). These Deno-side copies exist
// because the functions do not yet have an import map wiring @aurexos/core
// and @aurexos/db into the Deno graph; once a deno.json import map lands,
// DELETE this file and import from packages/db (supabase/functions may import
// core/ai/db per 13_Folder_Structure.md §5). The logic must stay in lockstep
// with packages/db until then — a change to one is a change to both, same PR.
//
// Claiming strategy (same as packages/db, documented there in full):
// optimistic two-phase claim — select candidates, then per-row conditional
// UPDATE guarded on (status='pending' AND attempts unchanged). Racing workers
// cannot double-claim: the loser's UPDATE matches zero rows. Upgrade path is
// migration 0012's claim_jobs() SQL function (FOR UPDATE SKIP LOCKED) called
// via .rpc('claim_jobs', ...) — see packages/db/src/jobs.ts for the SQL.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/** Mirror of the jobs row (0011). Regenerated types replace this via the import map. */
export interface JobRow {
  id: string
  workspace_id: string
  queue: string
  job_key: string
  payload: Record<string, unknown>
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'dead'
  attempts: number
  max_attempts: number
  run_at: string
  locked_at: string | null
  locked_by: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

/** Retry backoff (NotificationsArchitecture.md §8): 30s → 2m → 10m → 1h → 6h. */
const RETRY_BACKOFF_SECONDS = [30, 120, 600, 3_600, 21_600] as const

function backoffSeconds(attempt: number): number {
  const index = Math.min(Math.max(attempt - 1, 0), RETRY_BACKOFF_SECONDS.length - 1)
  return RETRY_BACKOFF_SECONDS[index] ?? 21_600
}

function isoIn(seconds: number): string {
  return new Date(Date.now() + seconds * 1_000).toISOString()
}

/** Claim up to `limit` due jobs from `queue`. Returns only the rows won. */
export async function claimJobs(
  client: SupabaseClient,
  queue: string,
  limit: number,
  workerId: string,
): Promise<JobRow[]> {
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
  const rows = (candidates ?? []) as JobRow[]
  const claimed: JobRow[] = []

  for (const candidate of rows) {
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
    if (won !== null) claimed.push(won as JobRow)
  }
  return claimed
}

/** Mark a claimed job succeeded and release its lock. */
export async function completeJob(client: SupabaseClient, jobId: string): Promise<void> {
  const { error } = await client
    .from('jobs')
    .update({ status: 'succeeded', locked_at: null, locked_by: null, last_error: null })
    .eq('id', jobId)
    .eq('status', 'running')

  if (error) throw new Error(`completeJob(${jobId}) failed: ${error.message}`)
}

/**
 * Record a failed execution: permanent → 'failed'; attempts exhausted →
 * 'dead' (the admin-replayable DLQ state); otherwise back to 'pending' with
 * jittered backoff. attempts++ already happened at claim time.
 */
export async function failJob(
  client: SupabaseClient,
  job: JobRow,
  errorMessage: string,
  opts?: { permanent?: boolean },
): Promise<void> {
  const base = { locked_at: null, locked_by: null, last_error: errorMessage.slice(0, 2_000) }
  const update =
    opts?.permanent === true
      ? { ...base, status: 'failed' }
      : job.attempts >= job.max_attempts
        ? { ...base, status: 'dead' }
        : {
            ...base,
            status: 'pending',
            run_at: isoIn(backoffSeconds(job.attempts) * (0.8 + Math.random() * 0.4)),
          }

  const { error } = await client.from('jobs').update(update).eq('id', job.id)
  if (error) throw new Error(`failJob(${job.id}) failed: ${error.message}`)
}
