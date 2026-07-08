# 13 — Monorepo Folder Structure

| | |
|---|---|
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Founding CTO, AurexDesigns |
| **Related** | `03_Architecture.md`, `05_Security_And_Permissions.md`, `08_Tech_Stack.md`, `09_Scaling_Strategy.md`, `11_Testing_Strategy.md` |

This is the definitive layout of the AurexOS monorepo (Turborepo + pnpm workspaces, per `08_Tech_Stack.md` §7). The structure exists to make the **modular monolith real**: module boundaries are visible in the filesystem, enforced by import rules, and aligned with the future service-extraction seams described in `09_Scaling_Strategy.md` §5. When in doubt about where code goes, use the decision table in §6.

---

## 1. Top-Level Layout (annotated)

```
aurex-company-dashboard/
├── apps/
│   └── web/                      # The AurexOS application (Next.js App Router)
│       ├── app/                  # Routes only — thin, delegates to modules/
│       │   ├── (auth)/           # Route group: login, signup, invite, workspace switch
│       │   ├── (os)/             # Route group: the authenticated OS shell
│       │   │   ├── layout.tsx    # Shell: sidebar, command palette, Aurex panel mount
│       │   │   ├── dashboard/
│       │   │   ├── crm/
│       │   │   ├── projects/
│       │   │   ├── tasks/
│       │   │   ├── calendar/
│       │   │   ├── meetings/
│       │   │   ├── email/
│       │   │   ├── finance/      # invoices/, expenses/, payments/ sub-routes
│       │   │   ├── proposals/
│       │   │   ├── contracts/
│       │   │   ├── documents/
│       │   │   ├── knowledge/
│       │   │   ├── clients/
│       │   │   ├── team/         # Team & HR
│       │   │   ├── automations/  # Automation Studio
│       │   │   ├── analytics/
│       │   │   ├── monitoring/   # Website Monitoring
│       │   │   └── settings/     # Settings & Permissions
│       │   ├── (portal)/         # Route group: Client Portal (Phase 4 — see §4)
│       │   │   └── portal/       # Client-facing views; portal-only layout & auth guard
│       │   └── api/              # Route handlers: webhooks in, exports, OG images
│       ├── modules/              # ★ Feature folders — where the product actually lives (§3)
│       │   ├── crm/
│       │   ├── projects/
│       │   ├── tasks/
│       │   ├── finance/
│       │   ├── aurex/            # The AI assistant surface (chat panel, command palette actions)
│       │   ├── ...               # One folder per module, same internal shape
│       │   └── shared/           # Cross-module app glue ONLY (shell chrome, workspace context)
│       ├── lib/                  # App-level plumbing: supabase clients, auth helpers, middleware utils
│       ├── middleware.ts          # Auth, workspace resolution, rate limiting
│       └── e2e/                  # Playwright specs (incl. two-tenant isolation suite)
│
├── packages/
│   ├── ui/                       # Design system (vendored shadcn/ui + Aurex components)
│   │   ├── components/           # Primitives + composed patterns (DataTable, EntityCard…)
│   │   ├── emails/               # React Email templates (Resend)
│   │   ├── styles/               # Tokens, CSS variables (theming/white-label hooks)
│   │   └── hooks/                # UI-only hooks (useMediaQuery…) — no data fetching
│   ├── core/                     # Domain layer — the heart of the modular monolith
│   │   ├── schemas/              # Zod schemas per domain object (single source of truth)
│   │   ├── types/                # Derived/domain types, enums, role & permission types
│   │   ├── events/               # domain_events contracts: event names + payload schemas
│   │   ├── permissions/          # RBAC logic: role → capability maps, can() helpers
│   │   ├── jobs/                 # enqueue() interface + job payload contracts
│   │   └── lib/                  # Pure shared logic (money, dates, ids) — zero I/O
│   ├── ai/                       # AI layer (Phase 1 scaffold, Phase 3 full — see 06_AI_Architecture.md)
│   │   ├── gateway/              # Provider abstraction, model tiers, metering, fallback
│   │   ├── agents/               # LangGraph graphs (checkpointed, HITL interrupt nodes)
│   │   ├── tools/                # Tool definitions — derived from packages/core schemas
│   │   ├── retrieval/            # RAG interface + pgvector implementation (swappable)
│   │   ├── prompts/              # Versioned prompt templates (reviewed like code)
│   │   └── evals/                # Golden sets + eval harness
│   ├── db/                       # Database access layer
│   │   ├── src/                  # Typed clients, query helpers, dbRead('analytics') routing
│   │   └── types/                # Generated types from Supabase schema (CI-refreshed)
│   └── config/                   # Shared tooling presets
│       ├── eslint/               # Incl. import-boundary rules (§5)
│       ├── tsconfig/             # Base + per-target tsconfigs (strict everywhere)
│       └── tailwind/             # Shared Tailwind preset + tokens bridge
│
├── supabase/
│   ├── migrations/               # Numbered SQL migrations (incl. RLS policies + pgTAP tests)
│   ├── functions/                # Edge Functions: webhooks/, jobs/, ai-pipelines/
│   ├── seed/                     # Deterministic seed data (demo workspace, two-tenant test fixtures)
│   └── tests/                    # RLS policy tests (run in CI against local stack)
│
├── infra/
│   └── n8n/                      # docker-compose + exported workflow definitions (versioned)
│
├── docs/                         # 01–15 planning docs (this file is 13)
├── .github/
│   └── workflows/                # ci.yml, deploy-web.yml, deploy-supabase.yml, schema-lint.yml
├── turbo.json                    # Task graph (build, lint, test, typecheck) + remote cache
├── pnpm-workspace.yaml
└── package.json
```

**Deliberately not in the tree yet** (see §7): `apps/portal`, `apps/marketing`, `packages/billing`, `packages/integrations`, any `services/` directory, mobile apps.

---

## 2. Why routes and features are separated

`apps/web/app/` contains **routing only**: layouts, `page.tsx` files that compose feature components, route-level auth guards. All real code lives in `apps/web/modules/{module}/`. Rationale:

1. Next.js file conventions (page/layout/loading/error) make `app/` structurally noisy; business logic buried in it is hard to find and hard to extract.
2. A module folder that contains *everything about CRM* is the unit we would extract as a service if `09_Scaling_Strategy.md` §5 triggers fire. Routes are the one thing that wouldn't move — so they stay separate.
3. Route groups give us URL structure and layout nesting without dictating code organization.

Rule of thumb: **a `page.tsx` should be ≤ ~30 lines** — fetch workspace context, render one or two module components.

## 3. The module/feature-folder pattern (inside `apps/web/modules/`)

Every module is self-contained and internally identical, so navigating any module feels the same:

```
modules/crm/
├── components/          # Module-specific React components (ContactTable, DealPipeline…)
├── hooks/               # TanStack Query hooks (useContacts, useDealMutations) — workspace-keyed
├── actions/             # Server Actions: parse input with core schemas → check permissions → write → emit event
├── queries/             # Server-side data access for RSC pages (wraps packages/db)
├── types.ts             # Module-local types ONLY (shared ones belong in packages/core)
├── constants.ts
└── index.ts             # ★ Public surface — the ONLY file other modules may import from
```

- **Cross-module access goes through `index.ts` or through domain events.** If Projects needs a CRM contact picker, it imports `ContactPicker` from `modules/crm` (the public surface), or reacts to `crm.contact.created` events — never reaches into `modules/crm/queries/` internals. Enforced by lint (§5).
- **Every `actions/` mutation follows the same spine:** validate (Zod from `packages/core`) → authorize (`can()` from `packages/core/permissions`) → mutate (via `packages/db`, RLS as backstop) → emit domain event → revalidate/invalidate. Reviewers reject actions that skip a step.
- `modules/aurex/` is the assistant **surface** (panel, streaming UI, command palette actions); the assistant's **brain** (gateway, agents, tools) lives in `packages/ai`. This keeps the AI core reusable by Edge Functions and future apps.

## 4. Client Portal: same app, isolated route group (Phase 4 decision)

**Decision: the Client Portal ships inside `apps/web` under the `(portal)` route group — not as a separate app — with a pre-registered escape hatch.**

- **For same-app:** clients see *views over the same data* (projects, invoices, proposals, files); a separate app would duplicate data access, components, and auth against the same database. RBAC (`Client` role) + RLS already scope every query; the `(portal)` group gets its own layout, its own middleware guard (portal sessions can *only* reach `(portal)` routes — an allowlist, not a denylist), and a restricted import surface (portal pages may import only from module public surfaces explicitly marked portal-safe).
- **Why not a separate app now:** double deploy/monitoring surface, drift between two implementations of the same entities, and no isolation benefit that RLS + route-group guards don't already provide at this stage.
- **The escape hatch:** because portal pages only import module public surfaces and `packages/*`, extracting `apps/portal` later (white-label domains, separate release cadence, stricter compliance boundary in Phase 5) is a mechanical move, not a rewrite. That extraction trigger is a *product* decision (per-client custom domains / enterprise isolation demands), documented in `09_Scaling_Strategy.md` §5.

## 5. Import boundary rules (lint-enforced, not aspirational)

Enforced via ESLint boundary rules in `packages/config/eslint` + `tsconfig` project references; CI fails on violations.

| From ↓ may import → | `apps/web` | `packages/ui` | `packages/core` | `packages/ai` | `packages/db` | `packages/config` |
|---|---|---|---|---|---|---|
| `apps/web` | own module via public surface only | ✅ | ✅ | ✅ | ✅ | ✅ |
| `packages/ui` | ❌ | ✅ | ✅ (types/schemas only) | ❌ | ❌ | ✅ |
| `packages/core` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `packages/ai` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `packages/db` | ❌ | ❌ | ✅ (types) | ❌ | ✅ | ✅ |
| `supabase/functions` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |

The three iron laws:

1. **Apps import packages; packages never import apps.** A package that needs something from an app is a design error — move the something down.
2. **`ai` and `db` never import `ui`.** The AI layer and data layer must run headless (Edge Functions, future workers). Any UI dependency would poison that.
3. **`core` imports nothing but itself and config.** It is the dependency root: pure schemas, types, events, permission logic. If `core` ever needs `db` or `ai`, the abstraction is inverted — fix the design, not the lint rule.

## 6. Where new code goes (decision table)

| You are writing… | It goes in… |
|---|---|
| A new page/route for an existing module | `apps/web/app/(os)/{module}/` — thin page delegating to the module folder |
| A component used by exactly one module | `apps/web/modules/{module}/components/` |
| A component used by 2+ modules with no domain logic | `packages/ui/components/` |
| A component used by 2+ modules **with** domain logic | The owning module's public surface; others import it |
| A Zod schema / domain type / enum | `packages/core/schemas` or `types` — never module-local if any second consumer exists |
| A new domain event | `packages/core/events` (contract) + emit from the owning module's action |
| A permission rule | `packages/core/permissions` (+ RLS policy in `supabase/migrations`) — always both |
| A DB table/column/index/RLS policy | `supabase/migrations/` (+ regenerate `packages/db/types`) |
| A server mutation | `apps/web/modules/{module}/actions/` following the §3 spine |
| A webhook receiver / scheduled job / AI pipeline | `supabase/functions/` (payload schemas from `packages/core`) |
| An AI tool / agent graph / prompt | `packages/ai/tools|agents|prompts` |
| An email template | `packages/ui/emails/` |
| An n8n workflow | Built in n8n, exported JSON committed to `infra/n8n/` |
| A new module entirely | New folder in `modules/` + route group entry + schemas/events in `core` + an entry in `02_Modules.md` — requires a design doc first |
| A test | Colocated `*.test.ts(x)` for unit/component; `apps/web/e2e/` for Playwright; `supabase/tests/` for RLS |

## 7. Naming conventions (normative)

| Thing | Convention | Example |
|---|---|---|
| Files & folders | `kebab-case` | `deal-pipeline.tsx`, `use-contacts.ts` |
| React components | `PascalCase` export | `DealPipeline` |
| Functions, variables, hooks | `camelCase` (`use` prefix for hooks) | `createInvoice`, `useContacts` |
| DB tables/columns/functions | `snake_case`, plural tables | `crm_contacts.workspace_id` |
| Zod schemas | `PascalCase` + `Schema` suffix | `InvoiceSchema`, `CreateInvoiceInput` |
| Domain events | `snake.dot` past tense, module-prefixed | `finance.invoice.paid` |
| Env vars | `SCREAMING_SNAKE`, app-prefixed where public | `NEXT_PUBLIC_SUPABASE_URL`, `ANTHROPIC_API_KEY` |
| Branches / commits | conventional commits; `feat/{module}-{slug}` branches | `feat(crm): pipeline drag ordering` |

## 8. Deliberately NOT in the tree yet

Absence below is a decision, not an omission:

- **`apps/portal`** — Phase 4 ships in-app (§4); extraction is a pre-planned escape hatch, not a default.
- **`apps/marketing`** — the public site stays out of this repo until Phase 5 packaging work begins.
- **`packages/billing`** — Stripe/plan logic is Phase 5; creating it earlier invites building for hypothetical customers (`14_Risk_Assessment.md` §P2).
- **`packages/integrations` / marketplace SDK** — future marketplaces (templates, agents, integrations) get their own design doc before any folder exists.
- **`services/`** — no extracted services exist and none are planned until `09_Scaling_Strategy.md` §5 triggers fire; an empty `services/` directory is an invitation to premature microservices.
- **Redis config, queue workers, cell routing** — each appears only when its named scaling trigger fires.
- **Mobile apps** — out of scope pre-Phase 5; the web app is responsive by requirement.

The tree grows by subtraction of this list, each entry moving out only via an ADR in `03_Architecture.md`.
