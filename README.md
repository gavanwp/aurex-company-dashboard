<div align="center">

# AurexOS

**The AI Operating System for Digital Agencies**

*Built by [AurexDesigns](https://aurexdesigns.com)*

[Vision](#-vision) · [Features](#-features) · [Architecture](#-architecture-overview) · [Technology](#-technology) · [Documentation](#-documentation) · [Roadmap](#-roadmap)

---

</div>

> **Status: Phase 1 — Internal MVP (in progress)**
> The complete product and engineering blueprint lives in [`docs/`](docs/). Phase 1 implementation is underway: auth, workspaces, Dashboard, Projects, Tasks, CRM, Clients, and Settings are built on the multi-tenant foundation. Read [`docs/10_Roadmap.md`](docs/10_Roadmap.md) for what ships next.

---

## 🌌 Vision

Digital agencies run on a patchwork of ten to twenty disconnected tools — Notion for docs, ClickUp for tasks, HubSpot for CRM, Slack for chat, Gmail for email, Zapier for glue, spreadsheets for everything else. Every tool holds a fragment of the truth. Nobody holds all of it. And AI, where it exists at all, is bolted onto the side of each silo.

**AurexOS replaces the patchwork with one system — and puts AI at the center of it, not the edge.**

AurexOS is the operating system for an AI-first agency: projects, clients, CRM, tasks, finance, proposals, meetings, email, documents, knowledge, and automation in a single ecosystem, with an AI assistant — **Aurex** — that has context over all of it and can act on all of it.

Think **Notion + Linear + ClickUp + HubSpot + Slack + ChatGPT + Zapier**, unified into one beautiful, fast, AI-native platform.

## 🎯 Mission

1. **First:** Become the internal operating system of AurexDesigns — every project, client, invoice, and decision lives in AurexOS.
2. **Then:** Become the commercial SaaS platform that thousands of agencies worldwide run their business on.

The system is built for the second goal from day one: multi-tenant, secure by default, and architected to scale — even while it serves a single agency.

## 🧠 AI Is the Operating System

AI in AurexOS is not a feature or a sidebar chatbot. Every module is AI-powered, and Aurex — the assistant at the heart of the platform — knows the entire workspace: projects, clients, tasks, invoices, meetings, expenses, emails, documents, the knowledge base, the calendar, and the team.

Ask it anything. Tell it to do anything.

> *"Create a proposal for the Meridian rebrand."* · *"Summarize today's work."* · *"Who is overloaded this week?"* · *"Find overdue invoices and draft reminder emails."* · *"Reply to this email."* · *"Generate the monthly client report."*

Aurex operates under strict governance: it acts with the invoking user's permissions (never more), outbound and destructive actions require human approval, and every AI action is written to an audit trail. See [`docs/07_AI_Strategy.md`](docs/07_AI_Strategy.md).

## ✨ Features

| Area | Modules |
|---|---|
| **Work** | Dashboard · Projects · Tasks · Calendar · Meetings |
| **Clients & Revenue** | CRM · Clients · Proposals · Contracts · Client Portal |
| **Money** | Invoices · Expenses · Payments · Financial Analytics |
| **Communication** | Email Center · Notifications · Meeting Notes |
| **Knowledge** | Documents · Knowledge Base · Global Search (⌘K) |
| **Intelligence** | Aurex AI Assistant · Analytics & Reports · Website Monitoring |
| **Operations** | Automation Studio · Team & HR · Settings & Permissions |
| **Future** | Template Marketplace · AI Agents Marketplace · Integration Marketplace · Password Manager |

Every module ships with AI capabilities — AI creates tasks, qualifies leads, predicts delays, drafts proposals and email replies, categorizes expenses, summarizes meetings, and generates reports. The full catalog lives in [`docs/04_Feature_List.md`](docs/04_Feature_List.md) and [`docs/06_Module_Breakdown.md`](docs/06_Module_Breakdown.md).

## 🏛 Architecture Overview

AurexOS is a **multi-tenant, event-driven, AI-native modular monolith**.

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App (Vercel)                     │
│   App Router · Server Components · shadcn/ui design system  │
├──────────────┬──────────────────────────┬───────────────────┤
│  Module UIs  │   Aurex AI Assistant     │   Client Portal   │
│ (feature     │  (LangGraph orchestrator │  (role-scoped     │
│  folders)    │   + typed tool registry) │   surface)        │
├──────────────┴──────────────────────────┴───────────────────┤
│                        AI Gateway                            │
│      Claude (primary) · OpenAI (secondary) · model routing   │
├──────────────────────────────────────────────────────────────┤
│                    Supabase Platform                         │
│  PostgreSQL + RLS (multi-tenancy) · Auth · Edge Functions    │
│  Realtime · Storage · pgvector (per-tenant RAG)              │
├──────────────────────────────────────────────────────────────┤
│                  Domain Events (Postgres)                    │
│   → Automation Studio · n8n · Notifications · Analytics      │
└──────────────────────────────────────────────────────────────┘
```

Key decisions (full rationale in [`docs/08_Tech_Stack.md`](docs/08_Tech_Stack.md) and [`docs/adr/`](docs/adr/)):

- **Multi-tenancy from day one** — every tenant table carries `workspace_id`, enforced by Postgres Row-Level Security. Becoming a SaaS is a billing feature, not a rewrite.
- **Modular monolith** — one deployable, strict module boundaries. Services get extracted along module seams only when metrics demand it ([`docs/09_Scaling_Strategy.md`](docs/09_Scaling_Strategy.md)).
- **Event-driven core** — every meaningful mutation emits a domain event; automations, notifications, analytics, and AI context all consume the same stream.
- **AI gateway abstraction** — no module calls a model provider directly; routing, caching, cost control, and audit happen in one place.

## 🛠 Technology

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) · React · TypeScript (strict) · TailwindCSS · shadcn/ui · Framer Motion |
| State & Data | TanStack Query · Zustand · React Hook Form · Zod |
| Backend | Supabase — PostgreSQL, Auth, Edge Functions, Realtime, Storage |
| AI | Anthropic Claude (primary) · OpenAI (secondary) · LangGraph · pgvector |
| Automation | Internal Automation Studio · n8n (self-hosted, Docker) |
| Storage | Supabase Storage · Cloudflare R2 |
| Infra | Vercel · GitHub Actions CI/CD · Turborepo + pnpm · Docker |
| Quality & Observability | Vitest · Playwright · Sentry · PostHog · Resend |

## 📦 Getting Started

Prerequisites: **Node 22+**, **pnpm 10+**, a [Supabase](https://supabase.com) project (or the Supabase CLI + Docker for a local stack).

```bash
git clone https://github.com/gavanwp/aurex-company-dashboard.git
cd aurex-company-dashboard
pnpm install

# 1. Configure environment
cp .env.example apps/web/.env.local        # fill in your Supabase URL + keys

# 2. Apply the database schema
#    Hosted: run supabase/migrations/*.sql in order via the SQL editor or
#    `supabase db push`. Local: `supabase start` applies migrations + seed.

# 3. Run
pnpm dev                                   # → http://localhost:3000
```

The seed (`supabase/seed/seed.sql`, local/dev only) creates a demo login — `demo@aurexdesigns.com` / `aurexos-demo` — with a populated AurexDesigns workspace: clients, contacts, deals, projects, and tasks.

## 🗂 Repository Overview

```
.
├── apps/
│   └── web/               # The AurexOS app (Next.js App Router)
│       ├── app/           # Routes only — thin pages per module
│       ├── modules/       # Feature folders: dashboard, projects, tasks, crm, clients, settings, shared
│       └── lib/           # Supabase clients, workspace context, action-kit
├── packages/
│   ├── ui/                # Design system (shadcn/ui + AurexOS components, tokens)
│   ├── core/              # Domain layer: Zod schemas, types, events, permissions
│   ├── db/                # Typed database layer (Database types, DbClient)
│   └── config/            # Shared tsconfig + Tailwind presets
├── supabase/
│   ├── migrations/        # Schema + RLS policies (numbered SQL)
│   └── seed/              # Deterministic demo data
├── docs/                  # The blueprint (01–15) — start here
│   └── adr/               # Architecture Decision Records
└── .github/workflows/     # CI: typecheck + build
```

Layout rules, import boundaries, and where new code goes: [`docs/13_Folder_Structure.md`](docs/13_Folder_Structure.md).

## 📚 Documentation

| Document | What it answers |
|---|---|
| [01 · Project Vision](docs/01_Project_Vision.md) | Why AurexOS exists and what winning looks like |
| [02 · PRD](docs/02_Product_Requirements_Document.md) | What we're building, for whom, and what "done" means |
| [03 · System Goals](docs/03_System_Goals.md) | Measurable technical and product targets |
| [04 · Feature List](docs/04_Feature_List.md) | Every feature, prioritized and phased |
| [05 · User Roles](docs/05_User_Roles.md) | RBAC model and permission matrix |
| [06 · Module Breakdown](docs/06_Module_Breakdown.md) | Deep specification of every module |
| [07 · AI Strategy](docs/07_AI_Strategy.md) | The AI-native architecture bible |
| [08 · Tech Stack](docs/08_Tech_Stack.md) | Every technology choice, with rationale |
| [09 · Scaling Strategy](docs/09_Scaling_Strategy.md) | From one agency to thousands |
| [10 · Roadmap](docs/10_Roadmap.md) | Phases 0–5 with exit criteria |
| [11 · Design Principles](docs/11_Design_Principles.md) | The design bible — visual, motion, AI UX |
| [12 · Project Rules](docs/12_Project_Rules.md) | The engineering constitution |
| [13 · Folder Structure](docs/13_Folder_Structure.md) | Monorepo layout and boundary rules |
| [14 · Risk Assessment](docs/14_Risk_Assessment.md) | Honest risk register with mitigations |
| [15 · Future Ideas](docs/15_Future_Ideas.md) | The ambitious, uncommitted horizon |

## 🧭 Development Philosophy

1. **AI-native, not AI-added.** Every module exposes typed tools to Aurex. If a feature can't be driven by the assistant, it isn't finished.
2. **Production-ready only.** No prototypes in `main`. Every merge is deployable.
3. **Multi-tenant by default.** Every table, query, and cache key is workspace-scoped. Always.
4. **Security is not a phase.** RLS on every table, RBAC on every route, audit log on every mutation, human approval on every outbound AI action.
5. **One source of truth.** Data lives once; everything else derives from it via events.
6. **Speed is a feature.** Interactions under 100ms, keyboard-first, optimistic UI. See [`docs/11_Design_Principles.md`](docs/11_Design_Principles.md).
7. **Documentation is part of the deliverable.** Docs and ADRs ship in the same PR as the change.

The full, enforceable rule set lives in [`docs/12_Project_Rules.md`](docs/12_Project_Rules.md).

## 🤝 Contribution Guidelines

Until the codebase opens up, contributions follow these ground rules:

- **Read first:** [`docs/12_Project_Rules.md`](docs/12_Project_Rules.md) is binding for every PR.
- **Branches:** `feature/<module>-<short-description>`, `fix/<short-description>`, `docs/<short-description>`.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
- **PRs:** small and focused; description explains *why*, not just *what*; docs updated in the same PR; CI must pass; at least one review required.
- **Architecture changes:** require an ADR in [`docs/adr/`](docs/adr/) before implementation.
- **No secrets, ever:** environment variables only, validated at boot.

## 🗺 Roadmap

| Phase | Focus | Outcome |
|---|---|---|
| **0 — Foundation** | Documentation, design system, database schema, infrastructure | This blueprint; the rails everything runs on |
| **1 — Internal MVP** | Auth, workspaces, Projects, Tasks, CRM-lite, Dashboard | AurexDesigns runs daily work in AurexOS |
| **2 — Agency Operations** | Finance, Proposals, Contracts, Documents, Calendar, Meetings, Email | The last external tools get switched off |
| **3 — AI Layer** | Aurex assistant, RAG, Automation Studio | AI runs through every module |
| **4 — Client Portal & Polish** | Client Portal, Analytics, Monitoring, Notifications | Clients live inside AurexOS too |
| **5 — Commercial SaaS** | Billing, self-serve onboarding, marketplaces | Other agencies subscribe |

Full detail, exit criteria, and phase gates: [`docs/10_Roadmap.md`](docs/10_Roadmap.md). The long-horizon vision: [`docs/15_Future_Ideas.md`](docs/15_Future_Ideas.md).

## 🧰 Tooling

Engineering governance from [`docs/12_Project_Rules.md`](docs/12_Project_Rules.md) is enforced mechanically:

- **ESLint 9 (flat config)** — one shared preset in `packages/config/eslint`, consumed by the root `eslint.config.mjs`. It encodes the constitution's lintable rules (no `any`, no non-null assertions, no floating promises, no raw `process.env`, no TODO comments) and the import-boundary matrix from [`docs/13_Folder_Structure.md`](docs/13_Folder_Structure.md) §5 via `eslint-plugin-boundaries`, including the module public-surface rule (`modules/*/index.ts`).
- **Husky + lint-staged** — `pre-commit` runs `eslint --fix` and Prettier on staged files; `commit-msg` runs commitlint.
- **commitlint** — conventional commits with kebab-case module scopes and a 100-char header (R-Q4), configured in `commitlint.config.mjs`.
- **Commands** — `pnpm lint` (per-package via Turborepo), `pnpm lint:root` (whole repo), `pnpm format`.

Hooks install automatically via the root `prepare` script on `pnpm install`. Local hooks are convenience; CI is the authority (docs/12 §9).

---

<div align="center">

**AurexOS** — built by [AurexDesigns](https://aurexdesigns.com) · © 2026 AurexDesigns. All rights reserved.

</div>
