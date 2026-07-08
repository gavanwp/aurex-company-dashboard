# 12 — Project Rules

| | |
|---|---|
| **Document** | Engineering Constitution — AurexOS |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Founding CTO, AurexDesigns |
| **Related** | [05_Architecture.md](./05_Architecture.md) · [10_Roadmap.md](./10_Roadmap.md) · [11_Design_Principles.md](./11_Design_Principles.md) · [15_Future_Ideas.md](./15_Future_Ideas.md) |

---

These rules are **binding**, not aspirational. They exist because AurexOS is multi-tenant from day one and will hold other agencies' entire businesses — their money, contracts, credentials, and client data. A rule that would be optional in a single-tenant internal tool is existential here.

Rules are numbered for citation in code review ("violates R-D3"). Each rule states the rule, a short rationale, and how it is enforced.

**Enforcement legend:**
- **Lint** — ESLint/typecheck rule; fails locally and in CI.
- **CI** — automated pipeline check; blocks merge.
- **Review** — mandatory human code review; the PR template checklist is keyed to rule IDs.
- **Runtime** — enforced by the platform itself (e.g., RLS, DB grants), so violation is impossible, not just detected.

---

## 1. Language & Types (R-T)

**R-T1 — TypeScript strict mode, everywhere.**
`strict: true` plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` in the shared tsconfig. No package or app may weaken the shared config.
*Rationale:* half of production bugs are type bugs someone silenced; strictness is cheapest at line one.
*Enforced by:* CI (typecheck on every package).

**R-T2 — No `any`. Ever.**
Not explicit, not implicit, not `as any`, not hidden behind a generic. Data of genuinely unknown shape is typed `unknown` and must be narrowed or Zod-parsed before use. `@ts-ignore` is banned outright; `@ts-expect-error` requires an adjacent comment explaining why plus a tracked issue link.
*Rationale:* `any` is a contagion — it disables the compiler for everything downstream of it.
*Enforced by:* Lint (`no-explicit-any`, `ban-ts-comment`, implicit-any via strict mode).

**R-T3 — Zod at every boundary.**
Every API input, server-action argument, webhook payload, environment variable, third-party API response, form submission, and queue/event payload is parsed with a Zod schema before use. Internal function calls may trust the type system; boundaries never do.
*Rationale:* the type system's guarantees end where the network begins; runtime validation is the only truth at the edge.
*Enforced by:* Lint (server actions must be declared through the `defineAction` wrapper, which requires an input schema) + Review.

**R-T4 — Types derive from their source of truth.**
Application types come from `z.infer<typeof schema>`; database types come from generated Supabase types. Hand-writing a parallel copy of a type that has a canonical source is forbidden.
*Rationale:* duplicated types drift silently, and drift becomes production bugs.
*Enforced by:* Review + CI (Supabase type generation checked for freshness).

**R-T5 — No non-null assertions outside tests.**
`!` is forbidden in application code. Handle the null path, restructure so it cannot occur, or prove the value with a parse.
*Rationale:* a non-null assertion is a runtime crash wearing a type annotation.
*Enforced by:* Lint (`no-non-null-assertion`, test files exempted).

## 2. Architecture (R-A)

**R-A1 — Clean layering inside the modular monolith.**
Dependency direction within each module: `ui → application (actions/services) → domain → infrastructure`. UI code never imports the DB client; domain logic never imports React. Each module (crm, projects, finance, …) exposes a public interface (`index.ts`); importing another module's internals is forbidden.
*Rationale:* the monolith stays modular — and modules stay extractable, testable, and sellable — only if boundaries are policed mechanically.
*Enforced by:* Lint (eslint-plugin-boundaries with an explicit layer/module map) + Review.

**R-A2 — Server Components by default.**
`"use client"` appears only on genuinely interactive leaves, pushed as low in the tree as possible. Data fetching happens on the server unless interactivity requires otherwise.
*Rationale:* less client JavaScript is how we deliver the speed promised in [11_Design_Principles.md](./11_Design_Principles.md).
*Enforced by:* Review + CI (per-route bundle-size budgets).

**R-A3 — All mutations through server actions or Edge Functions.**
No client-side database writes. No mutations in GET handlers or during Server Component render. Every mutation path runs the same sequence: **validate (Zod) → authorize (RBAC) → execute → emit domain event → write audit log** — provided by the shared `defineAction` wrapper.
*Rationale:* one choke point is what makes security, auditing, and the event core enforceable at all.
*Enforced by:* Lint (raw Supabase client banned in client bundles; mutations must use `defineAction`) + Review.

**R-A4 — Never duplicate code; extract to packages.**
The second use of a UI component moves it to `packages/ui`; the second use of business logic moves it into the owning module's service; the second use of a utility moves it to the shared utilities package. Copy-paste across apps or modules is a rejected PR.
*Rationale:* in a multi-tenant system, duplication is how a security fix lands in one copy and stays broken in the other.
*Enforced by:* CI (jscpd duplication check on changed files) + Review.

**R-A5 — One-way import graph.**
`apps/*` may import `packages/*`; `packages/*` never import from `apps/*`; each package declares its allowed dependencies. Circular imports anywhere are build failures.
*Rationale:* cycles make extraction, testing, and reasoning impossible; the graph must stay a DAG.
*Enforced by:* Lint (boundaries) + CI (madge circular-dependency check).

**R-A6 — Domain events over direct coupling.**
Cross-module side effects (notifications, audit, automations, AI triggers) subscribe to events from the `domain_events` table. Module A never calls module B's internals to trigger B's behavior. Event names follow `module.entity.verb` in past tense (§8).
*Rationale:* the event core is the substrate for Automation Studio and the AI layer ([10_Roadmap.md](./10_Roadmap.md) Phase 3); bypassing it starves them.
*Enforced by:* Review + Lint (cross-module import bans make direct coupling difficult by construction).

## 3. Data (R-D)

**R-D1 — RLS on every table. No exceptions.**
Every table has row-level security enabled with explicit policies — including lookup and "internal" tables. A migration creating a table without RLS cannot merge.
*Rationale:* one unprotected table is a complete tenant-isolation breach; "we'll add the policy later" is how breaches ship.
*Enforced by:* CI (migration linter asserts RLS + policies on every new table) + Runtime (Postgres enforces the policies).

**R-D2 — `workspace_id` on every tenant-scoped table.**
Non-null, foreign-keyed to `workspaces`, indexed, and referenced by the table's RLS policies. Genuinely global tables (plan catalogs, system config) require an ADR justifying the exemption.
*Rationale:* tenancy must be structural in the schema, not a convention in application code.
*Enforced by:* CI (schema check) + Review + Runtime (RLS).

**R-D3 — Soft delete everywhere.**
Every user-facing entity carries `deleted_at timestamptz`. Default read paths exclude soft-deleted rows. Hard deletes happen only via scheduled retention purges and the GDPR erasure flow — never from feature code.
*Rationale:* users delete the wrong thing weekly, and agencies' businesses live in these rows; recoverability is a product feature.
*Enforced by:* CI (schema check for the column; Semgrep rule flags `DELETE`/`.delete()` in feature code) + Review.

**R-D4 — Append-only audit log for every mutation.**
Every mutation writes an audit row: actor (human user or Aurex), workspace, entity, action, before/after diff, timestamp, request id. The audit table has no UPDATE or DELETE grants for any application role.
*Rationale:* trust, debugging, compliance, and the "Aurex did this" attribution ([11_Design_Principles.md](./11_Design_Principles.md) §9) all stand on this log.
*Enforced by:* Runtime (DB grants make tampering impossible) + the `defineAction` wrapper writing audit automatically + Review.

**R-D5 — Primary keys are UUIDv7.**
No serial/identity integers for entity IDs; no UUIDv4 on new tables.
*Rationale:* time-ordered UUIDs give B-tree index locality without leaking row counts or enabling enumeration.
*Enforced by:* CI (migration linter).

**R-D6 — Database identifiers are `snake_case`.**
Tables (plural nouns), columns, functions, indexes, policies. Mapping to camelCase happens once, in the data layer.
*Rationale:* one convention end-to-end; no quoted-identifier hell.
*Enforced by:* CI (migration linter).

**R-D7 — Migrations only. Never manual schema changes.**
Schema changes exist exclusively as versioned migration files in the repo, applied by the pipeline. Manual changes in any environment — including local "just to test" — are forbidden. Merged migrations are immutable; mistakes are fixed forward with a new migration.
*Rationale:* the schema must be reproducible from the repo at any commit; drift makes RLS guarantees unverifiable.
*Enforced by:* CI (nightly schema-drift check diffing production against migrations) + process (no human holds standing DDL access to production).

**R-D8 — Money is integer minor units plus an explicit currency column.**
Never floats, never numeric-with-vibes, never an implied currency.
*Rationale:* floating-point money is how invoices stop reconciling — and reconciliation to the cent is a Phase 2 exit criterion ([10_Roadmap.md](./10_Roadmap.md) §5).
*Enforced by:* CI (migration linter bans float/real money columns) + Review.

## 4. Security (R-S)

**R-S1 — RBAC checked server-side on every route, action, and function.**
Every server action, route handler, and Edge Function calls the shared `authorize(actor, permission, resource)` helper before doing any work. Client-side permission checks are UX sugar only. RLS is the backstop, never the primary check.
*Rationale:* defense in depth — the UI hides, the application authorizes, the database isolates. Each layer assumes the others failed.
*Enforced by:* Lint (`defineAction` requires a permission declaration) + Review + Runtime (RLS backstop).

**R-S2 — No secrets in code. Ever.**
No API keys, tokens, connection strings, or webhook secrets in source, config files, fixtures, or documentation. All secrets flow through environment variables and the platform secret stores.
*Rationale:* in a multi-tenant system, one leaked service key is a full-database breach across every customer.
*Enforced by:* CI (gitleaks secret scanning on every push, blocking) + pre-commit scan.

**R-S3 — Env vars validated with Zod at boot.**
A single `packages/config/env.ts` defines the schema for every environment variable; the app refuses to start if config is missing or malformed. Raw `process.env` access is banned everywhere else.
*Rationale:* configuration errors should fail at deploy time, not at 2 a.m. when the code path finally executes.
*Enforced by:* Lint (no raw `process.env` outside env.ts) + Runtime (boot-time parse).

**R-S4 — No hardcoded environment- or tenant-dependent values.**
URLs, limits, plan quotas, model identifiers, fee percentages, and feature thresholds live in validated config or the database — never as string/number literals scattered through features.
*Rationale:* hardcoded values are silent cross-environment bugs and future multi-tenant billing disputes.
*Enforced by:* Review + Lint (env access pattern funnels config through one place).

**R-S5 — Server-side input validation, always — plus output hygiene.**
R-T3 covers parsing; additionally: user HTML is sanitized before render, file uploads are validated for type and size and stored on R2 behind signed URLs, and all SQL is parameterized — string-built queries are banned.
*Rationale:* the client is enemy territory; every injection class gets a structural defense, not vigilance.
*Enforced by:* CI (Semgrep rules for raw SQL and `dangerouslySetInnerHTML`) + Review.

**R-S6 — Least privilege for every token.**
The Supabase service-role key exists only in server-only modules and never in client bundles. Third-party tokens are scoped minimally, per integration, per workspace, and encrypted at rest. Internal machine tokens rotate quarterly.
*Rationale:* every credential's blast radius must be the smallest the job allows.
*Enforced by:* Lint (server-only import guard) + CI (client-bundle scan for key patterns) + Review.

**R-S7 — Adversarial tests for every permission surface.**
New tables, roles, or permission changes ship with tests that prove forbidden access *fails*: cross-tenant reads, privilege escalation, client-role reaching internal records.
*Rationale:* security tests that only exercise allowed paths prove nothing; the negative case is the test.
*Enforced by:* CI (RLS/permission adversarial suite, required) + Review.

## 5. AI (R-AI)

**R-AI1 — All model calls through the AI gateway. Only.**
No direct Anthropic/OpenAI SDK imports outside `packages/ai`. The gateway owns provider routing (Claude primary, OpenAI secondary), retries, timeouts, cost metering, redaction, and logging.
*Rationale:* one choke point for cost control, auditability, provider migration, and safety policy — the AI equivalent of R-A3.
*Enforced by:* Lint (provider SDK imports banned outside packages/ai) + CI (dependency-graph check).

**R-AI2 — Every AI action is audited.**
Each gateway call records: prompt version, model, references to input context, output, token counts and cost, workspace, triggering user, and any resulting mutations — flowing into the R-D4 audit log and surfacing as the "Aurex did this" attribution.
*Rationale:* unattributed AI output is a trust failure in the product and a liability in a compliance review.
*Enforced by:* Runtime (the gateway writes the audit record itself; features cannot skip it).

**R-AI3 — Human approval for outbound and destructive AI actions.**
AI-proposed actions that leave the workspace (emails, client-portal publishes, payment links) or destroy/bulk-modify data execute only from an explicitly approved approval card ([11_Design_Principles.md](./11_Design_Principles.md) §9). The approval itself is audited with the approver's identity.
*Rationale:* one wrong AI email to a client destroys adoption faster than a hundred good ones build it.
*Enforced by:* Runtime (gateway classifies actions; unapproved outbound/destructive executions are refused) + Review.

**R-AI4 — No tenant data crosses tenants. Zero exceptions.**
Retrieval over pgvector is RLS-scoped by `workspace_id` like every other table. Prompts are assembled exclusively from the acting workspace's data. Completions containing tenant data are never cached across tenants. Tenant data is never used to train or fine-tune models.
*Rationale:* tenant isolation applies to the AI layer with the same force as the database — a cross-tenant leak through a prompt is existential ([10_Roadmap.md](./10_Roadmap.md) Phase 3 risks).
*Enforced by:* Runtime (RLS on embedding tables) + CI (adversarial cross-tenant retrieval tests) + Review.

**R-AI5 — Prompts are code.**
System prompts and prompt templates live versioned in `packages/ai/prompts`, are reviewed in PRs, and are never inline string literals inside feature code. Behavior-affecting prompt changes must run the eval harness before merge.
*Rationale:* prompt drift is a regression class like any other and gets the same regression protection.
*Enforced by:* Lint (inline prompt strings banned in feature code) + CI (eval suite on prompt changes).

**R-AI6 — AI failure degrades gracefully.**
Provider errors and timeouts surface honest UI states per [11_Design_Principles.md](./11_Design_Principles.md) §9 and never block the non-AI path of a feature. Every AI surface has a working manual fallback.
*Rationale:* the OS must keep operating when the AI doesn't — availability of core workflows cannot depend on model uptime.
*Enforced by:* Review + Playwright tests with the gateway mocked to fail.

## 6. Quality (R-Q)

**R-Q1 — Production-ready only. No TODO-driven development.**
Code merges finished: no `TODO`/`FIXME` markers, no commented-out blocks, no dead code, no "temporary" hacks in merged PRs. Deferred work becomes a tracked issue linked from the PR, not a comment in the code.
*Rationale:* a TODO is a decision postponed onto whoever reads the code next — usually at the worst time.
*Enforced by:* Lint (`no-warning-comments` on changed lines) + Review.

**R-Q2 — Tests required for business logic.**
Services, permission logic, money math, event handlers, and gateway routing get unit tests (Vitest). Each roadmap phase's golden paths get Playwright coverage ([10_Roadmap.md](./10_Roadmap.md) §9). Trivial UI plumbing is exempt; anything with a branch worth reviewing is not.
*Rationale:* untested business logic in a system holding other companies' money is negligence, not velocity.
*Enforced by:* CI (coverage gate on service layers; required suites in branch protection) + Review.

**R-Q3 — Code review required. No direct pushes.**
Every change to `main` goes through a PR with at least one approval — including the CTO's changes. Review explicitly covers rules-compliance, security, and design-system conformance, not just "does it work".
*Rationale:* solo-merged code is where tenant-isolation bugs live; review is the last human gate.
*Enforced by:* CI (branch protection: required review, no admin bypass).

**R-Q4 — Conventional commits, squash-merged.**
`feat:`, `fix:`, `refactor:`, `docs:`, `chore:` with module scopes (`feat(finance): stripe payment links`). PRs squash-merge so `main` reads as a changelog.
*Rationale:* machine-readable history powers changelogs, release notes, and archaeology.
*Enforced by:* CI (commitlint on PR titles) + repo merge settings.

**R-Q5 — CI must pass. Always.**
The required suite: typecheck, lint, unit tests, RLS/permission adversarial suite, Playwright smoke, migration lint, schema-drift, duplication and cycle checks, secret scan, Semgrep, bundle budget, build. Red CI is never merged over. A flaky test is a P1 bug, not an inconvenience to be retried into submission.
*Rationale:* a gate that can be skipped under pressure is not a gate — and pressure is exactly when the gate matters.
*Enforced by:* CI (all checks required in branch protection).

**R-Q6 — Errors are handled or propagated deliberately.**
No empty `catch` blocks, no swallowed promise rejections. User-facing errors follow the content rules in [11_Design_Principles.md](./11_Design_Principles.md) §6/§11; unexpected errors reach Sentry with request context attached.
*Rationale:* silent failure is the most expensive kind — it converts a bug report into a data-integrity investigation.
*Enforced by:* Lint (`no-empty`, `no-floating-promises`) + Review.

## 7. Documentation (R-DOC)

**R-DOC1 — Every module has a doc.**
Purpose, data model, permissions matrix, events emitted/consumed, and AI surfaces — created alongside the module in `docs/`, following the 01–15 numbering scheme.
*Rationale:* an undocumented module cannot be reviewed properly, onboarded into, or sold to customers.
*Enforced by:* Review (PR checklist item for new modules).

**R-DOC2 — ADRs for architectural decisions.**
Numbered Architecture Decision Records in `docs/adr/` for anything that would take more than a day to reverse: schema patterns, third-party choices, module boundaries, phase-gate outcomes. Accepted ADRs are immutable; they are superseded by new ADRs, never edited.
*Rationale:* "why is it like this?" must have an answer in the repo, not in someone's memory.
*Enforced by:* Review + roadmap governance ([10_Roadmap.md](./10_Roadmap.md) §11 requires ADRs at gates).

**R-DOC3 — Docs update in the same PR as the change.**
A schema change updates the module doc; a behavior change updates every affected doc (01–15). A PR that makes a doc wrong without touching it is incomplete.
*Rationale:* documentation updated "later" is documentation updated never.
*Enforced by:* Review (PR template requires an explicit docs-impact statement).

## 8. Naming conventions

| Context | Convention | Example |
|---|---|---|
| Files & directories | `kebab-case` | `invoice-list.tsx`, `use-workspace.ts` |
| React components | `PascalCase` | `InvoiceList`, `ApprovalCard` |
| Functions & variables | `camelCase` | `createInvoice`, `workspaceId` |
| Types & interfaces | `PascalCase`, no `I`/`T` prefixes | `Invoice`, `WorkspaceMember` |
| Constants (true constants) | `SCREAMING_SNAKE` | `MAX_UPLOAD_BYTES` |
| DB tables / columns / functions | `snake_case`, tables plural | `workspace_members.deleted_at` |
| Env vars | `SCREAMING_SNAKE` | `SUPABASE_SERVICE_ROLE_KEY` |
| Domain events | `module.entity.verb` (past tense) | `finance.invoice.sent` |
| Feature flags | `kebab-case`, module-prefixed | `ai-ghost-suggestions` |
| Branches | `type/scope-summary` | `feat/finance-stripe-links` |
| Zod schemas | `camelCase` + `Schema` suffix | `createInvoiceSchema` |

*Enforced by:* Lint (filename and identifier rules) + CI (migration linter for DB identifiers) + Review.

## 9. Enforcement architecture

- **Local:** pre-commit hooks run lint, typecheck, and secret scan on staged changes. Fast feedback — but local hooks are convenience; CI is the authority.
- **CI (blocking):** the full R-Q5 suite. Every rule above that lists Lint or CI enforcement maps to a concrete named check; a rule whose check doesn't exist yet is tracked as an engineering task, not treated as satisfied.
- **Review (blocking):** everything automation cannot judge — layering intent, duplication judgment, permission correctness, doc completeness, design conformance. The PR template checklist cites rule IDs so review is systematic, not vibes.
- **Runtime:** RLS, DB grants, and the gateway/`defineAction` wrappers make the most critical rules (R-D1, R-D4, R-AI2, R-AI3) *impossible* to violate rather than merely detected.

A rule without teeth is a suggestion. When a rule proves unenforceable in practice, we either build the missing check or amend the rule through §10 — we never quietly ignore it.

## 10. Rule change process

1. **Propose** via PR against this document: the change, its rationale, and its enforcement plan. A rule that cannot be enforced by Lint/CI/Runtime must name its concrete review criterion.
2. **Decide:** any engineer can propose; the founding CTO approves. Objections are resolved in the PR thread. Significant changes get an ADR (R-DOC2) recording the alternatives considered.
3. **Version:** this document's version bumps on every accepted change; history lives in git via `docs(rules): …` commits.
4. **Migrate:** if existing code violates a new or changed rule, the proposing PR must state the migration plan — fix now, or a tracked issue with a deadline. "Eventually" is not a plan.
5. **Emergency exceptions:** a rule may be bypassed only during a production incident, with a post-hoc note citing the rule and an issue restoring compliance within one week.

Silence is not amendment. A rule being ignored in practice is either re-enforced or formally changed through this process — never left ambiguous.
