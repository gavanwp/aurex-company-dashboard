# 03 — System Goals

| | |
|---|---|
| **Document** | System Goals — AurexOS |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Founding CTO, AurexDesigns |
| **Related** | [01_Project_Vision.md](./01_Project_Vision.md) · [02_Product_Requirements_Document.md](./02_Product_Requirements_Document.md) · [04_Feature_List.md](./04_Feature_List.md) |

---

## 0. Purpose

This document turns the vision into **measurable engineering and product commitments**. Each goal has: the decision it encodes, the concrete rules that follow from it, and KPIs with targets. These KPIs are reviewed monthly; targets may be re-negotiated with CTO sign-off, but a goal cannot be silently ignored. Anti-goals (§11) are as binding as goals.

---

## 1. Multi-Tenancy From Day One

**Decision.** AurexOS is a multi-tenant SaaS from the first migration. AurexDesigns is tenant #1, not a special case. Tenancy is enforced in the database (Postgres Row-Level Security), not in application code goodwill.

**Rules.**
- Every table carries `workspace_id` (or derives tenancy via a FK chain declared in the schema docs); RLS enabled with deny-by-default policies on **100% of tables** — no exceptions, including lookup and join tables.
- All queries run under the authenticated user's JWT context; service-role access is restricted to audited system jobs.
- No internal-only shortcut may bypass tenancy — internal conveniences are feature flags scoped to the AurexDesigns workspace.
- Per-tenant isolation extends to storage paths (Supabase Storage / R2 key prefixes) and pgvector namespaces.

**KPIs.**
| KPI | Target |
|---|---|
| Tables with RLS enabled + policy tests in CI | 100% |
| Cross-tenant access attempts caught by automated tenancy test-suite (runs per PR) | 0 escapes, ever |
| Time to provision a new workspace (Phase 5) | ≤ 60 s, fully automated |
| Schema migrations required to onboard external tenant #1 | 0 |

## 2. AI-Native Architecture

**Decision.** Aurex is the operating system's kernel interface, not a feature. Every module ships with three AI contracts as part of its Definition of Done: (a) **context** — its entities are indexed into per-tenant pgvector RAG with permission-aware retrieval; (b) **tools** — typed, schema-validated actions Aurex can invoke; (c) **events** — domain events that feed AI context freshness.

**Rules.**
- AI gateway abstraction: Claude primary, OpenAI secondary; provider switch is config, not code. Model tiering (cheap models for classification/extraction, frontier for reasoning) is built into the gateway.
- LangGraph orchestrates multi-step agent flows; every tool execution is logged to the AI audit trail with inputs, outputs, model, cost, and approving user.
- Human-in-the-loop is structural: outbound (email, invoices, client-visible) and destructive actions are queued as pending approvals. Autonomy is granted per action-class per workspace, never globally.
- RAG retrieval must respect RBAC: a user's Aurex answers may only draw on rows that user could read directly. This is tested, not assumed.

**KPIs.**
| KPI | Target |
|---|---|
| Modules shipping with context + tools + events contracts | 100% (DoD-gated) |
| AI action approval rate (proposed → approved) | ≥ 85% by end of Phase 3 |
| Aurex cross-module answer accuracy (weekly eval set, human-graded) | ≥ 90% grounded-and-correct |
| Aurex first token p50 / full tool-cycle p95 | ≤ 1.5 s / ≤ 15 s |
| AI spend per workspace | Within per-workspace budget; alerting at 80% |
| RAG permission-leak tests | 0 escapes, ever |

## 3. Event-Driven Core

**Decision.** A single append-only `domain_events` table is the system's nervous system. Automations (Automation Studio), Notifications, Analytics, and AI context freshness are all *consumers* of the same stream — we build the emission machinery once and power four subsystems.

**Rules.**
- Every state-changing mutation emits ≥ 1 typed domain event (`task.completed`, `invoice.paid`, `deal.stage_changed`, ...), written transactionally with the mutation.
- Event names and payload schemas are versioned and documented; consumers must be idempotent.
- Events are append-only and tenant-scoped; they double as the backbone of activity feeds and (with the audit log) forensic history.
- n8n subscribes at the boundary for external automation; internal automations never depend on n8n availability.

**KPIs.**
| KPI | Target |
|---|---|
| State-changing mutations emitting domain events | 100% (lint/CI-enforced pattern) |
| Event → notification delivery p95 | ≤ 5 s |
| Event → automation trigger execution p95 | ≤ 10 s |
| Consumer idempotency (duplicate-delivery test suite) | 0 double-effects |
| Undocumented event types in production | 0 |

## 4. Single Source of Truth

**Decision.** Every business entity exists exactly once; modules reference, never copy. A "client" is one row that CRM, Projects, Finance, Contracts, Portal, and Aurex all point at.

**Rules.**
- No duplicate entity stores per module; cross-module denormalization only as declared, rebuildable caches/materialized views.
- Soft deletes (`deleted_at`) everywhere; trash/restore UX; hard deletion only via the GDPR erasure workflow.
- Import pipelines (CSV, Notion/ClickUp/HubSpot importers in Phase 5) map into canonical entities — no "imported stuff" side tables surviving past migration.
- If two views can disagree about a fact, that's a Sev-2 data bug, not a cosmetic issue.

**KPIs.**
| KPI | Target |
|---|---|
| Canonical entities with a single authoritative table | 100% |
| Cross-module referential integrity violations (nightly check) | 0 |
| "Status disagreement" bug reports per quarter | ≤ 2, trending to 0 |
| Restore-from-trash success rate | 100% within retention window |

## 5. Extensibility & Marketplace-Ready

**Decision.** Phase 5's marketplaces (templates, AI agents, integrations) must be an *opening up*, not a re-architecture. The modular monolith enforces module boundaries now so third parties can occupy the same seams later.

**Rules.**
- Turborepo modular monolith: each module is a package with a public interface (entities, events, tools, routes); cross-module imports only through public interfaces (ESLint-enforced boundaries).
- Everything user-configurable is data, not code: pipelines, project templates, automation recipes, proposal templates are rows — which is exactly what makes them marketplace-distributable later.
- Feature flags on every module and every risky capability; flags are workspace-scoped.
- Internal AI tools use the same registration/typing mechanism that third-party AI agents will use in Phase 5.

**KPIs.**
| KPI | Target |
|---|---|
| Cross-module boundary violations (lint) | 0 in main |
| Templates (project/proposal/automation) representable as exportable data | 100% |
| Time to scaffold a new module (CLI + docs) | ≤ 1 day to walking skeleton |
| Phase 5 marketplace prerequisite refactors identified in retro | 0 architectural, minor only |

## 6. Security by Default

**Decision.** Security posture is enforced by defaults and CI, not by review vigilance. The three pillars: RLS on every table, RBAC on every route, append-only audit on every sensitive action.

**Rules.**
- Deny-by-default at both layers: a new table without RLS policies fails CI; a new route without an RBAC guard fails review checklist + integration test.
- Client-side permission checks are UX sugar only; the server re-checks everything.
- Secrets exclusively via env vars; committed-secret scanning in CI; least-privilege keys per service; quarterly key rotation.
- Audit log is append-only (no UPDATE/DELETE grants) covering: auth events, permission changes, finance actions, data exports, contract/proposal sends, and 100% of AI tool executions.
- OWASP ASVS L2 checklist per release; dependency audit (CI) with 7-day SLA on criticals.

**KPIs.**
| KPI | Target |
|---|---|
| Routes with server-side RBAC enforcement | 100% |
| Critical dependency vulns older than 7 days | 0 |
| Secrets in repo (scanner) | 0 |
| Audit coverage of sensitive-action catalog | 100% |
| Pen-test criticals before Phase 5 launch | 0 open |

## 7. Performance Targets

**Decision.** An operating system people live in all day must feel instant. Performance is a budgeted, CI-tracked feature; regressions block release like functional bugs.

**Targets (contractual, measured at p75 for web vitals / p95 for APIs, on production, mid-tier hardware):**

| Metric | Target | Measurement |
|---|---|---|
| TTFB (edge, p75) | ≤ 300 ms | Vercel analytics / RUM |
| LCP (p75) — dashboard, module list views | ≤ 2.0 s | RUM (web-vitals) |
| INP (p75) | ≤ 200 ms | RUM |
| CLS (p75) | ≤ 0.1 | RUM |
| API reads p95 | ≤ 400 ms | Server timing + Supabase logs |
| API writes p95 | ≤ 600 ms | Server timing |
| Global search / Cmd+K results p95 | ≤ 300 ms | Instrumented |
| Realtime propagation p95 | ≤ 2 s | Synthetic probes |
| Aurex first token p50 | ≤ 1.5 s | Gateway telemetry |
| JS bundle per route (gz) | ≤ 250 KB budget, tracked per PR | CI bundle analysis |

**Rules.** Route-level code splitting; server components by default; optimistic UI for all frequent mutations; prefetch on hover/intent; skeletons over spinners; virtualized lists for >100 rows; N+1 queries treated as bugs.

## 8. Reliability Targets

**Decision.** Agency-critical data (invoices, contracts, client work) demands boring, provable reliability — and graceful degradation between subsystems.

**Targets & rules.**
| Item | Target |
|---|---|
| Availability (app core) | 99.9% monthly (Phase 5 SLO; internal objective from Phase 2) |
| RPO | ≤ 24 h Phases 1–2 (daily backups); ≤ 1 h from Phase 3 (PITR) |
| RTO | ≤ 4 h, restore-drill verified quarterly |
| Error rate (5xx) | < 0.1% of requests |
| Degradation isolation | AI outage → zero CRUD impact; n8n outage → zero internal-automation impact; provider failover (Claude→OpenAI) automatic |
| Incident process | Sev levels defined; Sev-1 postmortem within 5 business days, blameless, actions tracked |
| Migrations | Reversible, zero-data-loss, rehearsed against production snapshot |
| Observability | Sentry (errors), structured logs, uptime probes, per-module health dashboards |

## 9. Developer Experience Goals

**Decision.** A tiny team ships a huge surface only if the paved road is fast: strict types end-to-end, one command to run everything, generators for repetitive scaffolding, CI that catches whole bug classes.

**Rules.**
- TypeScript strict everywhere; DB types generated from schema (single source); zod (or equivalent) validation at every boundary.
- `pnpm dev` boots the full stack (Next.js + Supabase local + n8n) in one command; seeded demo workspace included.
- Module generator scaffolds: schema + RLS policies + events + AI tool stubs + routes + tests + docs page.
- Conventional commits; preview deploys per PR; docs-per-module required by DoD (engineering rule).

**KPIs.**
| KPI | Target |
|---|---|
| Fresh-clone to running app | ≤ 15 min |
| CI wall time (lint + types + tests + tenancy suite) | ≤ 10 min |
| PR → preview deploy | ≤ 5 min |
| Type coverage | 100% strict, no `any` escapes in main (lint-enforced) |
| Modules with current docs page | 100% |

## 10. Product-Level System Goals

| Goal | KPI | Target |
|---|---|---|
| Consolidation (G1 in PRD) | Subscriptions retired at AurexDesigns | ≥ 10 by end of Phase 4 |
| AI as interface (G2) | WACO — weekly AI-completed operations per active workspace | Up and to the right; baseline set end of Phase 3 |
| Daily-driver stickiness | Weekly active seats ÷ licensed seats | ≥ 80% internal; ≥ 60% external betas |
| Client-communication load | "Status?" inbound emails per active client per month | −50% after Portal adoption |
| Onboarding (Phase 5) | Signup → first meaningful action (project created / import done) | ≤ 30 min |

## 11. Anti-Goals

Things we deliberately will **not** optimize for. Proposals that serve an anti-goal are rejected by default.

1. **No microservices.** The modular monolith stays until a measured scaling wall forces extraction. Complexity budget goes to product, not distributed-systems plumbing.
2. **No infinite configurability.** We are opinionated software with escape hatches, not a no-code platform. If a customization request requires a rules engine for the rules engine, the answer is no.
3. **No AI autonomy theater.** We do not chase "fully autonomous agent" demos at the cost of trust. Approval-gated actions that get approved 85%+ of the time beat autonomous actions that get reversed.
4. **No feature-count competition.** We do not match ClickUp checkbox-for-checkbox. Fewer features at Apple/Linear polish, per Vision principle 4.
5. **No premature horizontal expansion.** Agencies only, until the agency vertical is demonstrably won (Year-3 criteria in [01_Project_Vision.md](./01_Project_Vision.md) §9).
6. **No exotic infrastructure.** Postgres until proven otherwise; no new datastore, queue, or framework without an ADR proving Postgres/Supabase genuinely cannot serve.
7. **No dark-pattern lock-in.** Full data export is a feature we maintain proudly; retention is earned by product quality.
8. **No unaudited AI writes.** There is no code path by which an AI mutation skips the audit trail. Not for demos, not for internal tooling, not temporarily.

---

*KPI dashboard is reviewed at the monthly engineering review. Target changes require CTO sign-off and a changelog entry in this document.*
