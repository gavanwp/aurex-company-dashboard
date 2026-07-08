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

These rules are **binding**. They exist because AurexOS is multi-tenant from day one and will hold other agencies' businesses: their money, contracts, and client data. Rules are numbered for citation in code review ("violates R-D3"). Every rule states *what*, *why*, and *how it's enforced*. Enforcement legend: **Lint** (ESLint/typecheck, fails locally and in CI) · **CI** (automated pipeline check) · **Review** (mandatory human code review) · **Runtime** (enforced by the platform itself, e.g. RLS).

## 1. Language & Types (R-T)

| # | Rule | Rationale | Enforcement |
|---|---|---|---|
| R-T1 | TypeScript strict mode everywhere. `strict: true` plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` in the shared tsconfig; no package may weaken it. | Half of production bugs are type bugs someone silenced. | CI (typecheck) |
| R-T2 | No `any`. Not explicit, not implicit, not `as any`. Truly unknown data is `unknown` and must be narrowed or Zod-parsed before use. `@ts-ignore` is banned; `@ts-expect-error` requires a comment explaining why and an issue link. | `any` is a contagion that disables the compiler downstream. | Lint (`no-explicit-any`, ban-ts-comment) |
| R-T3 | Zod at every boundary: API inputs, server-action arguments, webhook payloads, env vars, third-party API responses, form submissions, queue/event payloads. Internal call sites may trust types; boundaries never do. | The type system ends where the network begins. | Review + Lint (server actions must call a `defineAction` wrapper that requires a schema) |
| R-T4 | Derive types from schemas (`z.infer`), and DB types from generated Supabase types. Never hand-write a duplicate of a type that has a source of truth. | Duplicated types drift; drift becomes prod bugs. | Review |
| R-T5 | No non-null assertions (`!`) outside test files. Handle the null path or prove impossibility with a parse. | `!` is a runtime crash wearing a type annotation. | Lint |

## 2. Architecture (R-A)

| # | Rule | Rationale | Enforcement |
|---|---|---|---|
| R-A1 | Clean layering inside the modular monolith: `ui → application (actions/services) → domain → infrastructure`. UI never imports the DB client; domain logic never imports React. Each module (crm, projects, finance, …) exposes a public interface; cross-module reach-ins to internals are forbidden. | Modules must stay extractable and independently testable; the monolith stays modular only if boundaries are policed. | Lint (import-boundary rules via eslint-plugin-boundaries) + Review |
| R-A2 | Server Components by default. `"use client"` only for genuinely interactive leaves, and as low in the tree as possible. | Less client JS = the speed promised in [11_Design_Principles.md](./11_Design_Principles.md). | Review + CI (bundle-size budget) |
| R-A3 | All mutations go through server actions or Supabase Edge Functions — never client-side DB writes, never mutations in GET handlers or Server Components. Every mutation path runs: validate (Zod) → authorize (RBAC) → execute → emit domain event → audit. | One choke point makes security, auditing, and events enforceable at all. | Lint (`defineAction` wrapper mandatory) + Review |
| R-A4 | Never duplicate code — extract to packages. Second use of a UI component → `packages/ui`; of business logic → the owning module's service; of a utility → `packages/utils` (or the relevant shared package). Copy-paste across `apps/` or across modules is a rejected PR. | Duplication is how multi-tenant bugs get fixed in one place and stay live in another. | Review + CI (jscpd duplication check on changed files) |
| R-A5 | Import direction is one-way: `apps/*` may import `packages/*`; `packages/*` never import from `apps/*`; packages declare their allowed dependencies explicitly. Circular imports are build failures. | Cycles make refactoring and extraction impossible. | Lint + CI (madge circular-dependency check) |
| R-A6 | Domain events over direct coupling: side effects in other modules (notifications, audit, automations) subscribe to events from the `domain_events` table — module A never calls module B's internals to trigger its behavior. | The event core is what makes Automation Studio and the AI layer possible ([10_Roadmap.md](./10_Roadmap.md) Phase 3). | Review |

## 3. Data (R-D)

| # | Rule | Rationale | Enforcement |
|---|---|---|---|
| R-D1 | RLS enabled on **every** table, with explicit policies — including "internal" tables. A table without RLS cannot merge. | One unprotected table is a full tenant-isolation breach. | CI (migration linter asserts RLS on new tables) + Runtime |
| R-D2 | `workspace_id` (non-null, FK, indexed) on every tenant-scoped table, and every RLS policy filters by it. Tables that are genuinely global (e.g. plan catalogs) require an ADR saying so. | Tenancy must be structural, not conventional. | CI (schema check) + Review |
| R-D3 | Soft delete everywhere: `deleted_at timestamptz` on user-facing entities; default reads exclude soft-deleted rows; hard deletes only via scheduled purge jobs and the GDPR erasure flow. | Users delete the wrong thing weekly; agencies' businesses live here. | CI (schema check) + Review |
| R-D4 | Append-only audit log for every mutation: actor (user or Aurex), workspace, entity, action, before/after diff, timestamp, request id. Audit rows are never updated or deleted (no UPDATE/DELETE grants on the table). | Trust, debugging, compliance, and the "Aurex did this" attribution in [11_Design_Principles.md](./11_Design_Principles.md) all depend on it. | Runtime (DB grants) + Review (mutation wrapper writes audit automatically) |
| R-D5 | Primary keys are UUIDv7. No serial/identity integers for entity IDs, no UUIDv4 for new tables. | Time-ordered UUIDs: index locality without leaking row counts. | CI (migration linter) |
| R-D6 | Database identifiers are `snake_case` — tables (plural), columns, functions, indexes. Mapping to camelCase happens in the data layer, nowhere else. | One convention; no quoting hell. | CI (migration linter) |
| R-D7 | Migrations only — schema changes exclusively via versioned migration files in the repo, applied by pipeline. Manual changes in *any* environment (including local "just to test") are forbidden; migrations are forward-only (fix-forward, no edited history after merge). | The schema must be reproducible from the repo, always. | CI (schema drift check: prod schema diffed against migrations nightly) |
| R-D8 | Money is stored as integer minor units with an explicit `currency` column. Never floats, never implicit currency. | Floating-point money is how invoices stop reconciling ([10_Roadmap.md](./10_Roadmap.md) Phase 2 exit criteria). | CI (migration linter bans float money columns) + Review |

## 4. Security (R-S)

| # | Rule | Rationale | Enforcement |
|---|---|---|---|
| R-S1 | RBAC checked server-side on every route, server action, and edge function — via the shared `authorize(actor, permission, resource)` helper, before any work. Client-side checks are UX sugar only. RLS is the backstop, not the check. | Defense in depth: UI hides, application authorizes, database isolates. | Lint (`defineAction` requires a permission declaration) + Review + Runtime (RLS) |
| R-S2 | No secrets in code, ever — no API keys, tokens, connection strings, or webhook secrets in source, config files, or test fixtures. All secrets via environment variables. | One leaked service key is a full-database breach in a multi-tenant system. | CI (gitleaks secret scanning on every push) |
| R-S3 | Env vars validated with Zod at boot in `packages/config/env.ts`; the app refuses to start on missing/malformed config. `process.env` is accessed nowhere else. | Fail at deploy time, not at 2 a.m. when the code path finally runs. | Lint (ban raw `process.env` outside env.ts) + Runtime |
| R-S4 | No hardcoded values for anything environment- or tenant-dependent: URLs, limits, plan quotas, model names, fee percentages live in config or DB — not string literals scattered through code. | Hardcoded values are silent cross-environment and cross-tenant bugs. | Review |
| R-S5 | Input validation server-side always (R-T3), plus: HTML sanitized before render, file uploads validated for type/size and stored on R2 with signed URLs, all queries parameterized (no string-built SQL). | The client is enemy territory. | Review + CI (Semgrep rules for raw SQL/dangerouslySetInnerHTML) |
| R-S6 | Principle of least privilege for tokens: the Supabase service-role key exists only in server-only modules (never in anything bundled client-side); third-party tokens scoped minimally and per-integration; per-workspace credentials encrypted at rest; internal tokens rotated quarterly. | Every credential's blast radius must be the smallest possible. | Lint (server-only import guard) + Review + CI (bundle scan for key patterns) |
| R-S7 | New tables, roles, or permission changes require adversarial tests: prove the *forbidden* access fails (cross-tenant read, privilege escalation, client-role reaching internal data). | Security tests that only prove allowed paths prove nothing. | CI (RLS/permission test suite) + Review |

## 5. AI (R-AI)

| # | Rule | Rationale | Enforcement |
|---|---|---|---|
| R-AI1 | All model calls go through the AI gateway in `packages/ai` — no direct Anthropic/OpenAI SDK imports anywhere else. The gateway owns routing (Claude primary, OpenAI secondary), retries, cost metering, logging, and redaction. | One choke point for cost, audit, provider swaps, and safety. | Lint (ban provider SDK imports outside packages/ai) |
| R-AI2 | Every AI action is audited: prompt version, model, input context references, output, tokens/cost, workspace, triggering user, and resulting mutations — written to the audit log (R-D4) and surfaced as "Aurex did this" attribution. | Unattributed AI output is a trust and compliance failure ([11_Design_Principles.md](./11_Design_Principles.md) §9). | Runtime (gateway writes audit automatically) |
| R-AI3 | Human approval required for AI actions that are outbound (emails, client-portal publishes, payment links) or destructive (deletes, bulk edits, permission changes). These execute only from an explicitly approved approval card; the approval is itself audited. | An AI that emails a client something wrong once destroys adoption. | Review + Runtime (gateway action classification gates execution) |
| R-AI4 | No tenant data crosses tenants: retrieval (pgvector) is RLS-scoped by `workspace_id`; prompts are assembled only from the acting workspace's data; no cross-tenant caching of completions containing tenant data; tenant data never used to train or fine-tune models. | Tenant isolation applies to the AI layer with zero exceptions — this is existential. | Runtime (RLS on embeddings) + CI (adversarial retrieval tests) + Review |
| R-AI5 | Prompts are code: versioned in `packages/ai/prompts`, reviewed in PRs, never inline string literals in features; behavior-affecting prompt changes run the eval harness before merge. | Prompt drift is a regression class like any other. | Lint (ban inline prompt strings in feature code) + CI (evals) |
| R-AI6 | AI failures degrade gracefully: gateway timeouts and provider errors surface honest UI states ([11_Design_Principles.md](./11_Design_Principles.md) §9) and never block the non-AI path of a feature. | The OS must work when the AI doesn't. | Review |

## 6. Quality (R-Q)

| # | Rule | Rationale | Enforcement |
|---|---|---|---|
| R-Q1 | Production-ready only — no TODO-driven development. Code merges finished: no `TODO`/`FIXME`/commented-out blocks/dead code in merged PRs. Deferred work becomes a tracked issue, not a comment. | TODOs are decisions postponed onto whoever reads the code next. | Lint (no-warning-comments on changed lines) + Review |
| R-Q2 | Tests required for business logic: services, permission logic, money math, event handlers, and AI-gateway routing get unit tests (Vitest); each roadmap phase's golden paths get Playwright tests ([10_Roadmap.md](./10_Roadmap.md) §9). Trivial UI plumbing doesn't need tests; anything with a branch worth reviewing does. | Untested business logic in a system holding other companies' money is negligence. | CI (coverage gate on `packages/*` services + required suites) + Review |
| R-Q3 | Code review required: every change to `main` via PR with at least one approval; no direct pushes, including by the CTO. Review covers rules-compliance, security, and design-system conformance — not just "does it work". | Solo-merged code is where tenant-isolation bugs live. | CI (branch protection) |
| R-Q4 | Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, with module scopes, e.g. `feat(finance): …`). Squash-merge PRs so `main` history is a readable changelog. | Machine-readable history enables changelogs and archaeology. | CI (commitlint) |
| R-Q5 | CI must pass — typecheck, lint, unit, RLS/permission suite, Playwright smoke, migration lint, secret scan, build. Red CI is never merged over; a flaky test is a P1 bug, not an excuse. | A gate that can be skipped is not a gate. | CI (all checks required in branch protection) |
| R-Q6 | Errors are handled or propagated deliberately — no empty `catch`, no swallowed promise rejections; user-facing errors follow [11_Design_Principles.md](./11_Design_Principles.md) §6; unexpected errors reach Sentry with request context. | Silent failure is the most expensive failure. | Lint (no-empty catch, no-floating-promises) + Review |

## 7. Documentation (R-DOC)

| # | Rule | Rationale | Enforcement |
|---|---|---|---|
| R-DOC1 | Every module has a doc — purpose, data model, permissions matrix, events emitted/consumed, AI surfaces — created with the module and kept in `docs/`. | Undocumented modules can't be reviewed, onboarded into, or sold. | Review (PR checklist) |
| R-DOC2 | ADRs for architectural decisions in `docs/adr/` (numbered, immutable once accepted; superseded by new ADRs, never edited). Anything that would take >1 day to reverse gets an ADR: schema patterns, third-party choices, module boundaries, phase-gate decisions. | "Why is it like this?" must have an answer in the repo. | Review |
| R-DOC3 | Docs update in the same PR as the change they describe — schema changes update the module doc; behavior changes update affected docs (01–15). A PR that outdates a doc without touching it is incomplete. | Docs updated "later" are updated never. | Review (PR template requires a docs statement) |

## 8. Naming conventions

| Context | Convention | Example |
|---|---|---|
| Files & directories | `kebab-case` | `invoice-list.tsx`, `use-workspace.ts` |
| React components | `PascalCase` | `InvoiceList`, `ApprovalCard` |
| Functions & variables | `camelCase` | `createInvoice`, `workspaceId` |
| Types & interfaces | `PascalCase`, no `I`/`T` prefixes | `Invoice`, `WorkspaceMember` |
| Constants (true constants) | `SCREAMING_SNAKE` | `MAX_UPLOAD_BYTES` |
| DB tables/columns/functions | `snake_case`, tables plural | `workspace_members.deleted_at` |
| Env vars | `SCREAMING_SNAKE` | `SUPABASE_SERVICE_ROLE_KEY` |
| Domain events | `module.entity.verb` (past tense) | `finance.invoice.sent` |
| Feature flags | `kebab-case`, module-prefixed | `ai-ghost-suggestions` |
| Branches | `type/scope-summary` | `feat/finance-stripe-links` |
| Zod schemas | `camelCase` + `Schema` suffix | `createInvoiceSchema` |

Enforcement: Lint (filename + naming rules) + CI (migration linter for DB) + Review.

## 9. Enforcement summary

- **Local**: pre-commit hooks run lint, typecheck, and secret scan on staged changes — fast feedback, but CI is the authority.
- **CI (blocking)**: typecheck · ESLint (incl. boundary, `any`, env, SDK-import bans) · unit tests + coverage gate · RLS/permission adversarial suite · Playwright smoke · migration linter (RLS, `workspace_id`, `deleted_at`, UUIDv7, snake_case, money types) · schema-drift check · jscpd + madge · commitlint · gitleaks · Semgrep · bundle budget.
- **Review (blocking)**: everything automation can't judge — layering intent, duplication judgment, permission correctness, doc completeness, design conformance. The PR template is a checklist keyed to rule IDs.
- Rules without teeth are suggestions; when a rule proves unenforceable, we build the check or amend the rule — we don't quietly ignore it.

## 10. Rule change process

1. **Propose** via PR against this document: the change, its rationale, and its enforcement plan (a rule that can't be enforced automatically must name its review criterion).
2. **Decide**: founding CTO approves; any engineer can propose; objections are resolved in the PR, and significant changes get an ADR (R-DOC2) recording alternatives considered.
3. **Version**: this document's version bumps on every change; the changelog lives in git history via conventional commits (`docs(rules): …`).
4. **Migrate**: if existing code violates the new/changed rule, the PR must state the migration plan (fix now, or tracked issue with a deadline — never "eventually").
5. **Emergency exceptions**: a rule may be bypassed only for a production incident, with a post-hoc PR comment citing the rule and an issue to restore compliance within one week.

Silence is not amendment: a rule that is being ignored is either enforced again or formally changed through this process — never left ambiguous.
