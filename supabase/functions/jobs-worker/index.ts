// jobs-worker — the generic queue-worker pattern (ADR-0005 foundation skeleton).
//
// One invocation = one drain pass: claim a batch per queue → dispatch by
// queue → complete or fail (attempts++ happened at claim; dead-letter at
// max_attempts). Invoked by pg_cron on a tight cadence (see README.md), or
// manually via `supabase functions invoke jobs-worker` while developing.
//
// This file is the PATTERN ANCHOR for all future workers: dedicated workers
// (like notifications-deliver) copy this loop and narrow it to one queue.
// Keep handlers idempotent — the queue is at-least-once by design, and a
// crashed worker's jobs are re-claimed after the visibility timeout sweep.

import { createServiceClient } from '../_shared/service-client.ts'
import { claimJobs, completeJob, failJob, type JobRow } from '../_shared/jobs.ts'

/** How many jobs one invocation claims per queue — small on purpose: Edge
 * Function wall-clock limits bound execution; throughput comes from cadence,
 * not batch size (ADR-0005: long executions wait for the platform trigger). */
const BATCH_SIZE = 10

/**
 * Worker outcome per job. `permanent: true` skips retries entirely (the
 * handler classified the failure as unrecoverable — bad payload, deleted
 * target entity); everything else retries on the shared backoff schedule.
 */
type HandlerResult = { ok: true } | { ok: false; error: string; permanent?: boolean }

type JobHandler = (client: ReturnType<typeof createServiceClient>, job: JobRow) => Promise<HandlerResult>

/**
 * Queue → handler dispatch table. Mirrors the JOB_PAYLOAD_SCHEMAS registry in
 * packages/core/src/jobs/types.ts — every queue registered there eventually
 * gets a handler here (or its own dedicated worker function).
 *
 * Handlers parse their payload before acting (R-T3: a jsonb column is a
 * boundary). Once the deno.json import map lands, parse with the actual zod
 * schemas from @aurexos/core instead of structural checks.
 */
const HANDLERS: Record<string, JobHandler> = {
  // 'notifications.deliver' is handled by its dedicated worker
  // (../notifications-deliver) — listed here only if consolidation wins later.

  'files.process': (_client, job) => {
    // Skeleton: the file-processing pipeline (StorageArchitecture.md §4).
    // 1. Parse payload: { fileId } (FilesProcessPayloadSchema in core).
    // 2. Load the files row BY workspace_id + id (service role ⇒ explicit
    //    tenancy predicate, docs/09 §2.3).
    // 3. AV scan → quarantine on hit (av_status, 0006); fail closed.
    // 4. Thumbnails / extraction → derivative rows; fail open per stage.
    // 5. Extraction enqueues 'ai.ingest' (ACL-tagged) via the enqueuer.
    const fileId = typeof job.payload['fileId'] === 'string' ? job.payload['fileId'] : null
    if (fileId === null) {
      return Promise.resolve({ ok: false, error: 'files.process: payload missing fileId', permanent: true })
    }
    console.log(`files.process skeleton: would process file ${fileId} (workspace ${job.workspace_id})`)
    return Promise.resolve({ ok: true })
  },

  'ai.ingest': (_client, job) => {
    // Skeleton: RAG ingestion (AIArchitecture.md §8.2) — chunk, embed via the
    // packages/ai gateway, upsert ACL-tagged vectors, hash-diff re-ingestion.
    console.log(`ai.ingest skeleton: payload ${JSON.stringify(job.payload)} (workspace ${job.workspace_id})`)
    return Promise.resolve({ ok: true })
  },
}

Deno.serve(async (_req: Request): Promise<Response> => {
  const client = createServiceClient()
  const workerId = `jobs-worker:${crypto.randomUUID().slice(0, 8)}`
  const summary: Record<string, { claimed: number; succeeded: number; failed: number }> = {}

  for (const [queue, handler] of Object.entries(HANDLERS)) {
    const jobs = await claimJobs(client, queue, BATCH_SIZE, workerId)
    const stats = { claimed: jobs.length, succeeded: 0, failed: 0 }
    summary[queue] = stats

    for (const job of jobs) {
      try {
        const result = await handler(client, job)
        if (result.ok) {
          await completeJob(client, job.id)
          stats.succeeded += 1
        } else {
          // failJob applies the retry policy: 'failed' when permanent, 'dead'
          // at max_attempts (admin-replayable DLQ), else 'pending' + backoff.
          await failJob(client, job, result.error, { permanent: result.permanent === true })
          stats.failed += 1
        }
      } catch (err) {
        // A throwing handler is a programmer error, but the job must never
        // wedge in 'running' — record the failure and let the policy decide.
        const message = err instanceof Error ? err.message : String(err)
        await failJob(client, job, message)
        stats.failed += 1
      }
    }
  }

  return new Response(JSON.stringify({ workerId, summary }), {
    headers: { 'content-type': 'application/json' },
  })
})
