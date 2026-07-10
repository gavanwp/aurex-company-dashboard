import { z } from 'zod'
import { EMBEDDING_SOURCE_TYPES } from '../types/index'

// Job queue contracts — the typed half of ADR-0005 (Background Jobs Postgres-First).
//
// Jobs are rows in public.jobs (supabase/migrations/0011_automations_and_jobs.sql):
// workers claim with FOR UPDATE SKIP LOCKED semantics, (workspace_id, job_key) is
// the idempotency key, and ALL enqueuing flows through the one Enqueuer interface
// in ./enqueue.ts. This file owns the payload registry: every queue name is bound
// to a zod schema so payloads are parsed at the boundary (R-T3) on enqueue AND on
// claim — a worker never trusts a jsonb column.
//
// The Job row type itself already lives in ../schemas/automation.ts (JobSchema /
// Job), mirroring the 0011 columns 1:1 — it is deliberately not redefined here
// (R-A4: never duplicate; R-T4: one source of truth per type).

// ── Seed queue payload schemas ──────────────────────────────────────────────
// One schema per queue. Payloads must stay JSON-plain (string/number/boolean/
// null/array/object only) — they are stored in jobs.payload jsonb verbatim.

/**
 * `notifications.deliver` — deliver one notification through its routed
 * channels (NotificationsArchitecture.md §2/§8: the pipeline after the matcher
 * runs as a job, never inline in a request path).
 */
export const NotificationsDeliverPayloadSchema = z.object({
  /** The public.notifications row to deliver (0005). */
  notificationId: z.string().uuid(),
  /**
   * Optional channel restriction — used by admin DLQ replays targeting a single
   * failed channel. Absent means "route via the preference matrix".
   */
  channels: z.array(z.enum(['in_app', 'email', 'push', 'digest'])).optional(),
})
export type NotificationsDeliverPayload = z.infer<typeof NotificationsDeliverPayloadSchema>

/**
 * `files.process` — post-upload processing pipeline for one public.files row
 * (StorageArchitecture.md §4: AV scan → thumbnails → extraction, all
 * asynchronous, triggered by `files.file.uploaded`).
 */
export const FilesProcessPayloadSchema = z.object({
  /** The public.files metadata row to process (0006). */
  fileId: z.string().uuid(),
})
export type FilesProcessPayload = z.infer<typeof FilesProcessPayloadSchema>

/**
 * `ai.ingest` — (re-)ingest one source entity into the RAG index
 * (AIArchitecture.md §8.2; same job machinery as file processing).
 */
export const AiIngestPayloadSchema = z.object({
  sourceType: z.enum(EMBEDDING_SOURCE_TYPES),
  sourceId: z.string().uuid(),
})
export type AiIngestPayload = z.infer<typeof AiIngestPayloadSchema>

// ── The registry ────────────────────────────────────────────────────────────

/**
 * Queue name → payload schema. THE extension point for background work:
 * adding a queue is adding an entry here (plus a worker) — nothing else.
 * Queue names are `module.verb`, mirroring the domain-event naming discipline
 * (12_Project_Rules.md §8) so a queue's owner is readable from its name.
 */
export const JOB_PAYLOAD_SCHEMAS = {
  'notifications.deliver': NotificationsDeliverPayloadSchema,
  'files.process': FilesProcessPayloadSchema,
  'ai.ingest': AiIngestPayloadSchema,
} as const

/** Every known queue name, derived from the registry — never hand-listed. */
export const JOB_QUEUES = Object.keys(JOB_PAYLOAD_SCHEMAS) as readonly JobQueue[]

export type JobQueue = keyof typeof JOB_PAYLOAD_SCHEMAS

/** The payload type a given queue carries, inferred from its registry schema. */
export type JobPayload<Q extends JobQueue> = z.infer<(typeof JOB_PAYLOAD_SCHEMAS)[Q]>

// ── Retry policy ────────────────────────────────────────────────────────────

/**
 * Shared retry backoff schedule: 30s → 2m → 10m → 1h → 6h
 * (NotificationsArchitecture.md §8; generic per ADR-0005). Index = attempts
 * already made. Callers add jitter — this table is deterministic on purpose.
 */
export const RETRY_BACKOFF_SECONDS = [30, 120, 600, 3_600, 21_600] as const

/**
 * Backoff before retry number `attempt` (1-based: attempt 1 already happened
 * and failed). Clamps to the last step so out-of-range input stays safe.
 */
export function retryBackoffSeconds(attempt: number): number {
  const index = Math.min(Math.max(attempt - 1, 0), RETRY_BACKOFF_SECONDS.length - 1)
  return RETRY_BACKOFF_SECONDS[index] ?? 21_600
}

// ── Deterministic job keys ──────────────────────────────────────────────────

const SAFE_DISCRIMINATOR = /^[A-Za-z0-9._:-]{1,120}$/

/**
 * FNV-1a 32-bit hash, hex-encoded. Pure and dependency-free on purpose: core
 * imports nothing but itself and config (13_Folder_Structure.md §5 iron law 3),
 * so no node:crypto. Collision resistance is adequate for idempotency keys —
 * the key only needs to be stable and workspace-unique, not adversary-proof.
 */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Stable JSON stringification (object keys sorted recursively). Used to derive
 * a deterministic default job key from a payload: two structurally equal
 * payloads always produce the same string, regardless of key insertion order.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
  return `{${entries.join(',')}}`
}

/**
 * Deterministic job key: `queue + discriminator → stable key`, the idempotency
 * input for the `(workspace_id, job_key)` unique constraint on jobs (0011) —
 * enqueueing the same logical job twice is an ON CONFLICT DO NOTHING no-op.
 *
 * Short, already-safe discriminators (an entity id, `invoiceId:2026-07`) stay
 * readable in the key; anything else (e.g. a stableStringify'd payload) is
 * hashed. Both paths are pure functions of the input, so replays and retries
 * across processes agree on the key. Result always fits jobs.job_key (≤ 200).
 */
export function buildJobKey(queue: JobQueue | (string & {}), discriminator: string): string {
  return SAFE_DISCRIMINATOR.test(discriminator)
    ? `${queue}:${discriminator}`
    : `${queue}:h${fnv1a(discriminator)}`
}
