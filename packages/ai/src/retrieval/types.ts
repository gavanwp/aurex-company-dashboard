// Retrieval contract — interface pinned NOW, pgvector implementation deferred
// to Phase 3. The interface exists from day one specifically so the
// pre-committed upgrade path (dedicated Postgres+pgvector instance →
// Turbopuffer/Qdrant-class store) touches only this package
// (08_Tech_Stack.md §4.4; AIArchitecture.md §9).
//
// Implementor's contract, non-negotiable regardless of backing store
// (AIArchitecture.md §8.3 / §9):
// - every vector row carries workspace_id under the same RLS as every other
//   table (R-AI4) — no cross-workspace index, query, or cache;
// - two-stage ACL enforcement: acl_digest pre-filter (optimization) +
//   authoritative post-filter re-checking the invoker's effective permission
//   on every hit before context inclusion. The post-filter is the guarantee.
// - deletion/ACL propagation within minutes, not hours.

/**
 * Retrieval corpus source types, listed in descending trust order — the
 * source-weighting input for ranking and for context-block trust tiers
 * (07_AI_Strategy.md §5.4: verified KB ≻ published documents ≻ meeting
 * summaries ≻ raw transcripts ≻ email).
 */
export const RETRIEVAL_SOURCE_TYPES = [
  'kb_page',
  'document',
  'meeting_summary',
  'transcript',
  'email_thread',
] as const
export type RetrievalSourceType = (typeof RETRIEVAL_SOURCE_TYPES)[number]

/** One retrieved chunk, ACL-filtered, with provenance for citations (07_AI_Strategy.md §2.4). */
export interface RetrievalChunk {
  content: string
  sourceType: RetrievalSourceType
  /** Entity reference for citation links, e.g. `documents:{uuid}` or `kb:{uuid}#section`. */
  entityRef: string
  /** Fused relevance score (hybrid semantic + FTS via reciprocal rank fusion in the Phase 3 impl). */
  score: number
  /** Parent-context breadcrumb: `doc title → section path` (AIArchitecture.md §8.2 chunking rules). */
  breadcrumb?: string
  /** Verification state for KB sources — disclosed in citations (AIArchitecture.md §8.1). */
  verificationState?: 'verified' | 'unverified' | 'stale'
}

export interface RetrievalQueryOptions {
  limit?: number
  /** Restrict to specific corpus types (e.g. portal Aurex sees only portal-safe sources, 07_AI_Strategy.md §8.7). */
  sourceTypes?: RetrievalSourceType[]
  minScore?: number
}

/**
 * The swappable retrieval interface (docs/08 §4.4). `workspaceId` is a
 * required first argument on every call — tenancy is structural in the
 * contract, not a filter callers remember to add (R-AI4).
 *
 * Phase 3 implements this over pgvector (HNSW, hybrid with Postgres FTS,
 * light-tier re-rank for high-stakes queries).
 */
export interface Retrieval {
  query(workspaceId: string, text: string, options?: RetrievalQueryOptions): Promise<RetrievalChunk[]>
}
