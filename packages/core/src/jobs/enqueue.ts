import type { z } from 'zod'
import type { JobPayload, JobQueue } from './types'

// The enqueue() seam — ADR-0005 (Background Jobs Postgres-First).
//
// This file is CONTRACT ONLY. core is the dependency root and performs zero
// I/O (13_Folder_Structure.md §5 iron law 3), so the interface lives here and
// the Postgres implementation lives in packages/db (PgEnqueuer, jobs.ts).
// When a durable execution platform is adopted (ADR-0005 revisit triggers:
// >10–20 jobs/sec, >15-minute executions, polling breaches job-start SLOs),
// it slots in behind this same interface — callers of enqueue() never change.

/** Options accepted by every enqueue call. */
export interface EnqueueOptions {
  /** Tenancy is mandatory on every job row (R-D2); never optional. */
  workspaceId: string
  /**
   * Earliest execution time (ISO timestamp). Defaults to "now" — jobs.run_at
   * in 0011. Scheduled work (digest sends, retention purges) sets this.
   */
  runAt?: string
  /**
   * Idempotency key for (workspace_id, job_key) — see buildJobKey() in
   * ./types. When omitted, implementations derive a deterministic key from
   * the queue + payload, so accidental double-enqueues of identical work
   * still coalesce. Pass an explicit key when the *logical* job identity is
   * narrower than the payload (e.g. one reminder per invoice per day).
   */
  jobKey?: string
  /** Overrides jobs.max_attempts (default 5, matching the 0011 column default). */
  maxAttempts?: number
}

/** What an enqueue call reports back. */
export interface EnqueueResult {
  /**
   * The created job id — or null when the insert was absorbed by the
   * ON CONFLICT (workspace_id, job_key) DO NOTHING idempotency guard.
   */
  jobId: string | null
  /** True when an identical logical job already existed (no new row written). */
  deduplicated: boolean
}

/**
 * THE background-work interface. Every job in AurexOS is created through an
 * Enqueuer — never by inserting into public.jobs directly — so that payloads
 * are schema-parsed (R-T3), keys are deterministic, and the queue backend can
 * be swapped behind this seam (ADR-0005).
 *
 * Implementations MUST:
 * 1. Parse `payload` with the queue's registry schema before persisting.
 * 2. Insert transactionally with the caller's domain write where possible —
 *    the entire point of Postgres-first jobs is eliminating dual writes.
 * 3. Treat (workspaceId, jobKey) conflicts as success with deduplicated=true.
 */
export interface Enqueuer {
  enqueue<Q extends JobQueue>(
    queue: Q,
    payload: JobPayload<Q>,
    opts: EnqueueOptions,
  ): Promise<EnqueueResult>
}

/** A queue name bound to its payload schema — the unit defineQueue() returns. */
export interface QueueDefinition<TName extends string, TSchema extends z.ZodTypeAny> {
  readonly name: TName
  readonly schema: TSchema
  /** Boundary parse (R-T3): validates unknown input into the queue's payload type. */
  parse(input: unknown): z.infer<TSchema>
}

/**
 * Binds a queue name to its payload schema. The seed queues live in the
 * JOB_PAYLOAD_SCHEMAS registry (./types); defineQueue() is how new queues are
 * declared with full inference before being added to the registry — keeping
 * name and schema adjacent so neither can drift from the other (R-T4).
 *
 * @example
 * const digestQueue = defineQueue('notifications.digest', DigestBuildPayloadSchema)
 * digestQueue.parse(unknownInput) // typed DigestBuildPayload
 */
export function defineQueue<TName extends string, TSchema extends z.ZodTypeAny>(
  name: TName,
  schema: TSchema,
): QueueDefinition<TName, TSchema> {
  return {
    name,
    schema,
    parse: (input: unknown) => schema.parse(input),
  }
}
