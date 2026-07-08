# ADR-0001: Shared-Schema Multi-Tenancy in a Modular Monolith

**Status:** Accepted
**Date:** 2026-07-08
**Deciders:** CTO / Founding team, AurexDesigns
**Related documents:** `../08_Tech_Stack.md`, `../09_Scaling_Strategy.md`, `../13_Folder_Structure.md`, `../14_Risk_Assessment.md`

## Context

AurexOS is built as AurexDesigns' internal operating system, but the explicit strategy (`../01_Project_Vision.md`) is to sell it as SaaS to other agencies. Two foundational choices must be made before any code exists, because both are prohibitively expensive to retrofit:

1. **Tenancy model** — how tenant data is isolated.
2. **Deployment topology** — one deployable or many services.

Forces: a very small founding team; Supabase/PostgreSQL as the committed platform; the need to ship an internal MVP quickly; the requirement that "becoming a SaaS" must not require a rewrite; strict security expectations for client data (`../14_Risk_Assessment.md`, multi-tenant leakage is a top-5 risk).

## Decision

We will build a **shared-schema multi-tenant system** — every tenant-owned table carries a `workspace_id` column enforced by PostgreSQL Row-Level Security — deployed as a **modular monolith** in a Turborepo monorepo, with module boundaries enforced at the package/import level rather than the network level.

## Options Considered

### Option A — Single-tenant now, add tenancy later
- **Pros:** fastest possible internal MVP; no RLS overhead.
- **Cons:** retrofitting tenancy touches every table, query, cache key, and storage path — a de facto rewrite; history shows this migration rarely happens cleanly. Directly contradicts the dual-track strategy.
- **Rejected.**

### Option B — Shared schema + `workspace_id` + RLS (chosen)
- **Pros:** one database to operate and migrate; RLS gives database-enforced isolation independent of application bugs; Supabase-native; marginal cost per new tenant near zero; single-tenant internal use is just "a database with one workspace".
- **Cons:** RLS policies add query-planning overhead and must be tested rigorously; noisy-neighbor risk at scale (mitigations in `../09_Scaling_Strategy.md`); enterprise buyers may eventually demand dedicated instances.
- **Chosen.**

### Option C — Schema-per-tenant or database-per-tenant
- **Pros:** strongest isolation story.
- **Cons:** migration fan-out across N schemas, connection-pool exhaustion, operational burden far beyond a founding team's capacity, and poor fit for Supabase's model.
- **Rejected for now;** revisit as a premium "dedicated cell" offering for enterprise tenants (see `../09_Scaling_Strategy.md`).

### Option D — Microservices from day one
- **Pros:** independent scaling and deployment per domain.
- **Cons:** network boundaries multiply latency, failure modes, and coordination cost; a small team pays the distributed-systems tax without any of the organizational pressure that justifies it; module seams are still unknown pre-MVP.
- **Rejected.** The modular monolith keeps seams explicit (`../13_Folder_Structure.md` import boundaries) so extraction stays possible.

## Consequences

- **Positive:** SaaS launch (Phase 5) is a billing and onboarding feature, not an architecture project. Isolation is defense-in-depth: RBAC in the application layer *and* RLS in the database. One deployable keeps CI/CD, observability, and local development simple.
- **Negative:** every table, index, and query must be designed workspace-first from the very first migration; RLS test coverage is mandatory, not optional (`../12_Project_Rules.md`); we accept noisy-neighbor risk until per-tenant rate limiting and, later, cell-based sharding land.
- **Revisit when:** (a) a single module's load or team ownership justifies service extraction, (b) an enterprise deal requires dedicated-instance isolation, or (c) p95 query latency degradation is attributable to RLS policy cost rather than missing indexes.
