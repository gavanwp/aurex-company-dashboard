# ADR-0002: Search on Postgres — FTS + pgvector Hybrid, No Dedicated Search Engine

**Status:** Accepted
**Date:** 2026-07-08
**Deciders:** CTO / Founding team, AurexDesigns
**Related documents:** `../architecture/SearchArchitecture.md`, `../08_Tech_Stack.md`, `../03_System_Goals.md`

## Context

Global search (Cmd+K) spans 20+ modules — clients, deals, tasks, invoices, documents, emails — with a contractual p95 ≤ 300 ms (`../03_System_Goals.md` §7). Every result must respect both tenancy (RLS) and role-level permissions: a search index that leaks a row title across workspaces is a SEV-1, same as a database leak. Meanwhile the AI layer already requires pgvector semantic retrieval with `workspace_id`-scoped RLS for per-tenant RAG, and the `domain_events` spine already gives us change-driven index maintenance for free. Anti-goal 6 (`../03_System_Goals.md` §11) forbids new datastores without proof that Postgres genuinely cannot serve. The question: does search justify that proof today?

## Decision

We will run global search entirely on Postgres: **FTS (`tsvector` + `pg_trgm` for fuzzy matching) hybridized with pgvector semantic retrieval via Reciprocal Rank Fusion**, sharing the RAG embedding infrastructure, with permission post-filtering through the same RLS-authenticated path as every other query. No dedicated search engine enters the stack until a named trigger fires.

## Options Considered

### Option A — Postgres FTS + pgvector hybrid (chosen)
- **Pros:** one datastore, one RLS isolation model — search results are permission-correct by construction, not by sync discipline; the pgvector side is *shared with RAG*, so semantic search costs zero new infrastructure; event-driven index maintenance (tsvector triggers, embedding jobs off `domain_events`) already exists; RRF fusion of lexical + semantic rankings covers both "exact invoice number" and "that proposal about rebranding" query shapes.
- **Cons:** Postgres FTS relevance tuning is manual work (weights, dictionaries, synonyms); faceting and typo-tolerance are weaker than purpose-built engines; search load shares the primary's capacity.
- **Chosen.**

### Option B — Meilisearch
- **Pros:** excellent developer experience, instant typo-tolerant results, faceting out of the box.
- **Cons:** a second datastore means a **second tenancy model to secure** — Meilisearch has no RLS, so multi-tenant filtering becomes application-level key discipline, exactly the isolation-by-goodwill we rejected in ADR-0001; plus a sync pipeline whose lag and failure modes we own; plus a second backup story.
- **Rejected for now.** Meilisearch is the **named fallback** if the triggers below fire.

### Option C — Elasticsearch / OpenSearch
- **Pros:** the most powerful relevance and aggregation toolkit in existence.
- **Cons:** an operational heavyweight — cluster sizing, JVM tuning, index lifecycle management — that is simply the wrong tool for a 2–4 person team. Everything B's cons say, with a larger blast radius.
- **Rejected.**

### Option D — Typesense
- **Pros:** similar DX story to Meilisearch, simple to operate.
- **Cons:** same second-datastore/second-tenancy-model objections as B, with a smaller ecosystem and community.
- **Rejected.**

## Consequences

- **Positive:** search inherits tenancy, permissions, backup, and observability from the primary database with zero additional moving parts; semantic search ships as a byproduct of the RAG investment; the `search()` interface in `packages/core` is the seam behind which Meilisearch would slot if ever needed.
- **Negative:** we sign up for honest FTS tuning work — ranking weights, `pg_trgm` thresholds, per-module `tsvector` configurations — that a dedicated engine gives for free; typo-tolerance will be merely adequate, not delightful; search queries compete with OLTP for primary capacity until replica routing (`../09_Scaling_Strategy.md` §3.3) absorbs them; RRF fusion adds a query-shape complexity that must be benchmarked, not assumed.
- **Revisit when:** (a) search p95 sustains > 300 ms **after** index and query tuning, (b) searchable corpus exceeds ~50M rows, or (c) product requirements demand faceting or typo-tolerance beyond what honest FTS tuning delivers. Fallback path: Meilisearch behind the existing `search()` interface, fed from `domain_events`.
