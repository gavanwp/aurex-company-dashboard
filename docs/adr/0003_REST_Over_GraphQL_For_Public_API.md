# ADR-0003: REST (OpenAPI-First) Over GraphQL for the Public API

**Status:** Accepted
**Date:** 2026-07-08
**Deciders:** CTO / Founding team, AurexDesigns
**Related documents:** `../architecture/APIStrategy.md`, `../15_Future_Ideas.md`, `../08_Tech_Stack.md`

## Context

Internally, AurexOS has no separate API layer: React Server Components read tenant-scoped data and Server Actions mutate it, both inside the RLS-authenticated Supabase client (`../08_Tech_Stack.md` §2.1). That surface is private and can change freely. Phase 5 changes the stakes: a commercial SaaS needs a **published, versioned, third-party-consumable API** — for integrators (n8n, Zapier, Make), for customers' own scripts, and for the Phase 5 marketplace (`../15_Future_Ideas.md`). A published contract must be stable, rate-limitable per workspace, enforceable against RBAC/RLS, and cheap to keep documented. The API style decision shapes SDKs, webhooks, billing meters, and support load for years, so it is made now even though the surface ships in Phase 5.

## Decision

We will keep the internal surface as Server Actions + RSC, and build the Phase 5 public API as **versioned REST, defined OpenAPI-first**, with a generated TypeScript SDK and signed event webhooks (fed from `domain_events`). We will not offer GraphQL.

## Options Considered

### Option A — REST + OpenAPI (chosen)
- **Pros:** per-resource authorization maps 1:1 onto our RBAC checks and RLS policies — every endpoint is one auditable permission surface; per-workspace rate limiting and cost control are tractable because a request's cost is knowable from its route; the integrator ecosystem we care about (n8n, Zapier, Make) consumes REST + webhooks natively; OpenAPI gives us generated SDKs, generated docs, and contract tests from one source of truth; versioning (`/v1/`) is a solved, boring problem.
- **Cons:** clients over- and under-fetch; cross-entity aggregate views need explicitly designed endpoints; N endpoints means N pieces of documentation to keep honest.
- **Chosen.**

### Option B — GraphQL
- **Pros:** flexible cross-entity querying; a single evolving schema; strong typed-client tooling.
- **Cons:** arbitrary query shapes fight everything a multi-tenant public API needs: per-workspace rate limiting requires query cost estimation (a research problem, not a middleware), authorization must be enforced **per field** rather than per resource (a large, subtle surface over 20+ modules), and one tenant's pathological nested query is a noisy-neighbor incident. The major integrator platforms still want REST + webhooks anyway.
- **Rejected.** Revisit trigger: sustained partner demand for flexible cross-entity querying that curated REST endpoints demonstrably cannot serve.

### Option C — tRPC as the public API
- **Pros:** end-to-end TypeScript inference; near-zero boilerplate; we already get its benefits internally via typed Server Actions.
- **Cons:** TypeScript-only lock-in excludes every non-TS integrator; tRPC's contract culture is "the types are the contract," which is exactly right internally and exactly wrong as a published, versioned promise to strangers.
- **Rejected** for the public surface; the internal surface keeps its tRPC-like typing via Server Actions.

## Consequences

- **Positive:** one OpenAPI document drives the SDK, the docs site, contract tests, and the n8n/Zapier connectors; per-endpoint RBAC keeps the security review of the public surface finite; webhooks reuse the `domain_events` spine — no second event system.
- **Negative:** we own endpoint design forever — every "can you add field X to endpoint Y" is a versioning conversation; aggregate/reporting use cases will need purpose-built endpoints that GraphQL would have given for free; the internal (Server Actions) and public (REST) surfaces are two codepaths to the same domain logic, and keeping them behaviorally identical is ongoing discipline, not a one-time achievement.
- **Revisit when:** (a) partner/customer demand for flexible cross-entity querying is sustained and specific, (b) endpoint sprawl makes the OpenAPI document unmaintainable, or (c) an embedded-analytics product need appears that is fundamentally query-shaped.
