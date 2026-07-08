# 10 — Roadmap

| | |
|---|---|
| **Document** | Phased Roadmap — AurexOS |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Founding CTO, AurexDesigns |
| **Related** | [01_Project_Vision.md](./01_Project_Vision.md) · [02_Product_Requirements_Document.md](./02_Product_Requirements_Document.md) · [05_Architecture.md](./05_Architecture.md) · [12_Project_Rules.md](./12_Project_Rules.md) · [15_Future_Ideas.md](./15_Future_Ideas.md) |

---

## 1. How to read this roadmap

This roadmap turns the vision in [01_Project_Vision.md](./01_Project_Vision.md) into six sequenced phases. Assumptions:

- **Team**: small founding team (2–4 builders including the founding CTO), full-time, dogfooding AurexOS inside AurexDesigns from Phase 1 onward.
- **Timeline start**: Phase 0 begins **2026-Q3**. Duration estimates are calendar time, not effort, and include the drag of running an agency simultaneously.
- **Multi-tenant from day one**: workspaces + Postgres RLS are built in Phase 0, not retrofitted in Phase 5. Phase 5 is a commercial *packaging* phase, not an architecture phase.
- **AI is the operating system**: every phase ships AI capability appropriate to the data that exists by then. We do not bolt AI on in Phase 3 — Phase 3 is where AI becomes the primary interface.

Dates beyond Phase 1 are planning targets, not commitments. Only the *order* and *exit criteria* are binding; durations get re-estimated at every phase gate (§9).

## 2. Milestone summary

| Phase | Name | Target window | Duration | Headline outcome |
|---|---|---|---|---|
| 0 | Foundation | 2026-Q3 (Jul–Sep) | ~8 weeks | Monorepo, multi-tenant core, CI/CD, design system seed — deployable "walking skeleton" |
| 1 | Internal MVP | 2026-Q4 (Oct–Dec) | ~10–12 weeks | AurexDesigns runs projects, tasks, and CRM-lite in AurexOS daily |
| 2 | Agency Operations | 2027-Q1–Q2 | ~5 months | Finance, proposals, contracts, documents, calendar, meetings, email — last third-party ops tools retired |
| 3 | AI Layer | 2027-Q3 | ~3 months | Aurex assistant, per-tenant RAG, Automation Studio — AI becomes the primary interface |
| 4 | Client Portal & Polish | 2027-Q4 | ~3 months | Clients live in the portal; analytics, monitoring, notifications; product-grade polish |
| 5 | Commercial SaaS | 2028-H1 | ~4–6 months | Billing, self-serve onboarding, first external agencies paying |

---

## 3. Phase 0 — Foundation (2026-Q3, ~8 weeks)

**Objective.** Build the skeleton every future module hangs on: monorepo, multi-tenancy, auth, RBAC, event core, design system, CI/CD. Nothing user-visible needs to be impressive; everything invisible must be right, because this is the only phase where architecture mistakes are cheap.

### Deliverables

| Area | Deliverables |
|---|---|
| Monorepo | Turborepo scaffold: `apps/web`, `packages/ui`, `packages/db`, `packages/ai` (stub), `packages/config`, `packages/events`; TypeScript strict, ESLint, Prettier, import-boundary lint rules per [12_Project_Rules.md](./12_Project_Rules.md) |
| Multi-tenancy | `workspaces`, `workspace_members` tables; RLS policies on every table from the first migration; RLS test harness that proves cross-tenant isolation in CI |
| Auth & RBAC | Supabase Auth (email + OAuth); role model (Owner, Admin, PM, Team Member, Sales, Finance, HR, Client, Guest) in DB; server-side permission-check helper used by all mutations |
| Event core | `domain_events` append-only table; typed event publisher/consumer in `packages/events`; audit log written from events |
| Design system | Tokens (light + dark), app shell (sidebar + content), command palette shell (Cmd+K), 15–20 base components in `packages/ui` per [11_Design_Principles.md](./11_Design_Principles.md) |
| Infra & CI/CD | Vercel + GitHub Actions (typecheck, lint, unit, RLS tests, Playwright smoke); preview deploys per PR; Sentry + PostHog wired; env validation with Zod at boot |
| Data layer | Migration pipeline (Supabase migrations only), UUIDv7 helper, `deleted_at` soft-delete convention, seed script for demo workspace |

### AI capabilities delivered
- AI gateway **interface** defined in `packages/ai` (provider-agnostic: Claude primary, OpenAI secondary) with logging/audit hooks — implementation stubbed, contract real.
- No user-facing AI. Deliberate: no data yet worth reasoning over.

### Exit criteria (definition of done)
1. A new developer clones the repo and reaches a running local stack in under 30 minutes following docs alone.
2. Two seeded workspaces demonstrably cannot read each other's rows — proven by automated RLS tests in CI, not by inspection.
3. Sign-up → create workspace → invite member → role enforced, end-to-end on the production URL.
4. CI is green and required; `main` deploys automatically; a failing RLS test blocks merge.
5. Every table has RLS, `workspace_id` (where tenant-scoped), soft delete, and audit coverage.

### Non-goals
No CRM, projects, or tasks beyond skeleton routes. No AI responses. No mobile. No billing. No performance tuning beyond sane defaults.

### Key risks
- **Over-engineering the skeleton** (most likely failure). Mitigation: hard 8-week timebox; anything not needed by Phase 1 modules is cut.
- **RLS complexity underestimated** (policies + Edge Functions + service-role paths). Mitigation: build the RLS test harness first, treat it as the phase's core deliverable.
- **Supabase platform limits discovered late**. Mitigation: spike Realtime, Storage, and Edge Function cold starts in week 1–2.

---

## 4. Phase 1 — Internal MVP (2026-Q4, ~10–12 weeks)

**Objective.** AurexDesigns stops using ClickUp and the CRM spreadsheet. The founding team runs real client work — projects, tasks, contacts, pipeline — in AurexOS every working day. Dogfooding starts here and never stops.

### Deliverables

| Module | Deliverables |
|---|---|
| Dashboard | Workspace home: my tasks, active projects, pipeline snapshot, recent activity feed (from domain events) |
| Projects | Project CRUD, statuses, members, client link, project overview page, archive |
| Tasks | Board + list views, assignees, priorities, due dates, subtasks, comments, keyboard-first quick-add, real-time updates via Supabase Realtime |
| CRM-lite | Companies + contacts, pipeline stages (kanban), deal value, activity notes; explicitly *lite* — sequences and email sync are Phase 2 |
| Clients | Client records unified with CRM companies (one entity, two lenses) |
| Notifications (v0) | In-app notification center fed by domain events; no email digests yet |
| Settings | Workspace settings, member management, role assignment UI |

### AI capabilities delivered
- AI gateway live (Claude primary, OpenAI fallback) behind a feature flag.
- **First assist surfaces**: AI task-description drafting and AI project-summary ("what happened this week") — low-risk, read-mostly, all calls audited per [12_Project_Rules.md](./12_Project_Rules.md).

### Exit criteria
1. 100% of AurexDesigns active client projects tracked in AurexOS for 4 consecutive weeks; ClickUp/Notion-for-PM subscriptions cancelled.
2. Every founding team member creates or updates tasks daily (verified in PostHog).
3. Task board interactions feel instant: p95 optimistic-update render < 100 ms, p95 server confirm < 500 ms.
4. Zero cross-tenant leaks; audit log captures every mutation in the shipped modules.
5. Playwright coverage on the golden paths: create project → add tasks → move deal through pipeline.

### Non-goals
No client-facing anything. No invoicing, proposals, or email. No automation builder. No Gantt/timeline views. No import tooling beyond a CSV contact import.

### Key risks
- **Dogfooding rejection** — team quietly drifts back to old tools. Mitigation: CTO deletes old tool access at week 6; friction becomes the top-priority bug list.
- **Scope creep from daily use** ("just one more view"). Mitigation: phase-gate backlog; new asks go to Phase 2 unless they block daily use.
- **Realtime + optimistic UI complexity** eats the schedule. Mitigation: standardize one TanStack Query mutation pattern early and reuse it everywhere.

---

## 5. Phase 2 — Agency Operations (2027-Q1–Q2, ~5 months)

**Objective.** Retire the remaining operational tools: invoicing, proposals, contracts, documents, calendar, meetings, and client email all move into AurexOS. By the end, AurexDesigns' money and paperwork live in the system — which is exactly the data the AI layer needs next.

### Deliverables

| Module | Deliverables |
|---|---|
| Finance | Invoices (create, send, PDF, statuses, Stripe payment links), expenses, payments ledger, basic P&L view; multi-currency display, single base currency |
| Proposals | Block-based proposal builder, templates, client-viewable share links with view tracking, accept/decline |
| Contracts | Contract records, versioned documents, e-signature flow (embedded provider), status tracking, renewal reminders |
| Documents | Doc editor (rich text), folders, workspace/project scoping, file attachments on R2, full-text search |
| Knowledge Base | Internal wiki built on Documents with structured spaces — the substrate for Phase 3 RAG |
| Calendar | Workspace + personal calendars, Google Calendar 2-way sync, task due-date overlay |
| Meetings | Meeting records linked to projects/clients, agenda + notes, action-item extraction to tasks (manual in this phase) |
| Email Center | Gmail/IMAP sync for client communication, threads linked to CRM contacts and projects, send from app via Resend/SMTP |
| Team & HR (v0) | Team directory, roles, capacity flags; leave tracking minimal |

### AI capabilities delivered
- **AI drafting across ops surfaces**: proposal section drafts, invoice line-item suggestions from project data, email reply drafts, meeting-notes summarization.
- All drafts are human-approved before anything leaves the workspace — the approval-card pattern from [11_Design_Principles.md](./11_Design_Principles.md) ships here, ahead of the full AI layer, because outbound documents demand it.

### Exit criteria
1. Every AurexDesigns invoice, proposal, and contract for a full quarter is produced and sent from AurexOS; legacy invoicing/proposal tools cancelled.
2. Client email threads visible on CRM/project records; team stops forwarding emails to each other.
3. Finance totals reconcile with the bank/Stripe to the cent for the trial quarter.
4. Calendar sync survives 30 days without duplicate or lost events.
5. Documents/KB search returns relevant results < 300 ms p95.

### Non-goals
No client portal (clients receive share links, not logins). No automation builder. No payroll/accounting-grade ledger (we integrate, not replace, the accountant). No RAG yet — but every document written this phase is future RAG corpus, so content structure matters.

### Key risks
- **Email sync is a tarpit** (OAuth scopes, threading, deliverability). Mitigation: scope to client-communication sync, not full inbox replacement; buy vs. build review at phase gate.
- **Financial correctness bugs destroy trust instantly**. Mitigation: money paths get the strictest test coverage in the codebase; append-only ledger entries; no floating-point money (integer minor units).
- **Five modules in five months is aggressive**. Mitigation: modules ship sequentially behind flags; Finance and Proposals are the must-haves, Meetings v1 can slip into early Q3 without blocking Phase 3.

---

## 6. Phase 3 — AI Layer (2027-Q3, ~3 months)

**Objective.** Aurex becomes the primary interface. With two-plus quarters of real operational data (projects, money, documents, email), ship the assistant, per-tenant RAG, and the Automation Studio. This is the phase that makes AurexOS an operating system instead of a suite.

### Deliverables

| Area | Deliverables |
|---|---|
| Aurex Assistant | Conversational assistant in command palette + side panel; streaming responses; workspace-wide context; tool use over internal modules (create task, draft invoice, query pipeline) via LangGraph agent graphs |
| RAG | pgvector per-tenant embeddings over Documents, KB, proposals, meeting notes, email; strict tenant isolation of vectors; citation of sources in every grounded answer |
| Automation Studio | Visual trigger → condition → action builder over domain events; action library across modules; n8n bridge for external actions; run history and error surfaces |
| AI actions & safety | Approval cards for all outbound/destructive AI actions; "Aurex did this" attribution on every AI-originated change; per-workspace AI usage metering; full AI audit trail |
| AI ops | Prompt versioning in `packages/ai`; eval harness with golden test sets for the top 10 assistant tasks; fallback routing Claude → OpenAI |

### AI capabilities delivered
This phase *is* the AI capability set: grounded Q&A over the whole workspace, cross-module actions with approval, proactive digests ("Monday morning briefing"), automation-authoring by prompt ("when an invoice is overdue 7 days, draft a reminder email for approval").

### Exit criteria
1. Aurex answers workspace questions with correct citations at ≥ 90% on the internal eval set; zero cross-tenant retrievals in adversarial tests.
2. AurexDesigns team uses Aurex or an automation on ≥ 50% of working days (PostHog); at least 10 automations running in production internally.
3. Every AI-originated mutation carries attribution and an audit record; every outbound/destructive action passed a human approval — verified by audit-log sampling.
4. p95 time-to-first-token < 1.5 s in the assistant panel.
5. AI cost per active user per month measured and under the target set at the phase gate.

### Non-goals
No client-facing AI (internal users only). No autonomous multi-step background agents acting without approval. No fine-tuning. No marketplace of automations ([15_Future_Ideas.md](./15_Future_Ideas.md)).

### Key risks
- **Hallucinated actions or answers erode trust faster than they add value**. Mitigation: citations mandatory for grounded answers; eval harness gates releases; approval cards for anything with side effects.
- **RAG tenant-isolation failure is existential**. Mitigation: vectors carry `workspace_id` under RLS like every other table; adversarial cross-tenant retrieval tests in CI.
- **Cost blowout**. Mitigation: metering from day one, caching, model routing (small models for cheap tasks).

---

## 7. Phase 4 — Client Portal & Polish (2027-Q4, ~3 months)

**Objective.** Open the system to clients and raise everything to product grade: client portal, analytics & reports, website monitoring, mature notifications, performance and accessibility passes. This phase makes AurexOS *demonstrable* to future customers.

### Deliverables

| Module | Deliverables |
|---|---|
| Client Portal | Client-role login; scoped views of their projects, tasks (client-visible only), invoices with online payment, proposals, contracts, shared documents; comment/approve flows; portal branding per workspace |
| Analytics & Reports | Dashboards for project health, team utilization, pipeline, revenue/cashflow; scheduled report emails; export |
| Website Monitoring | Uptime + SSL + Core Web Vitals checks for client sites; incident alerts into notifications and (optionally) client portal |
| Notifications (v1) | Preference center, email digests via Resend, batching/quiet hours, per-module granularity — anti-spam by design per [11_Design_Principles.md](./11_Design_Principles.md) |
| Polish | Performance budget enforcement (p75 route TTI targets), WCAG 2.1 AA audit and fixes, empty states/onboarding for every module, error-state sweep |

### AI capabilities delivered
- Aurex-generated **client-ready status reports** (human-approved before portal publish).
- Monitoring anomaly summaries ("what changed and why it matters") in plain language.
- Analytics Q&A: "which projects are over budget?" answered from live data with citations.

### Exit criteria
1. ≥ 5 real AurexDesigns clients actively using the portal (viewed ≥ 3 times, paid ≥ 1 invoice online).
2. Client-role RLS verified: portal users can access only explicitly client-visible records — adversarial tests in CI.
3. WCAG 2.1 AA audit passes on all core flows in both themes.
4. Performance budgets met: p75 TTI < 2 s on dashboard, projects, tasks, portal home.
5. Notification opt-out rate < 10% among internal users (proxy for "not spammy").

### Non-goals
No self-serve signup for external agencies. No billing for AurexOS itself. No client-facing Aurex chat (deferred; see [15_Future_Ideas.md](./15_Future_Ideas.md)). No native mobile apps — responsive web only.

### Key risks
- **Client-facing bugs damage the agency's real client relationships**. Mitigation: portal rolls out client-by-client, starting with the friendliest; feature flags per workspace.
- **"Polish" is unbounded**. Mitigation: polish backlog is fixed at phase start from a structured audit; new items go to Phase 5.

---

## 8. Phase 5 — Commercial SaaS (2028-H1, ~4–6 months)

**Objective.** Sell it. Self-serve onboarding, subscription billing, plan limits, security posture, and the operational machinery to support agencies we don't share an office with. Target: **10 external agencies live, 3+ paying** by end of phase.

### Deliverables

| Area | Deliverables |
|---|---|
| Billing | Stripe Billing subscriptions, per-seat + AI-usage components, plan tiers, grace/dunning flows, workspace plan limits enforced server-side |
| Onboarding | Self-serve signup → workspace creation → guided setup; importers (Notion, ClickUp/Asana, HubSpot CSV); demo data mode |
| Trust & security | Security review + pen test, data-processing agreement, data export & workspace deletion (right to be forgotten), status page, SOC 2 readiness plan (certification itself is post-phase) |
| Operations | Support pipeline, in-app changelog, feature-flag cohorts, per-tenant usage/cost observability, on-call basics |
| Commercial site | Marketing site, pricing page, docs site for customers |

### AI capabilities delivered
- Aurex-guided onboarding ("tell me about your agency and I'll set up your workspace").
- AI usage metering surfaced to customers with plan-based limits and overage billing.

### Exit criteria
1. A stranger agency signs up, onboards, and reaches daily active use with zero synchronous help from us.
2. 10 external agencies live; ≥ 3 on paid plans; involuntary churn (billing failures) handled automatically.
3. Billing reconciles: what Stripe charged = what plans say, verified monthly.
4. Data export and full workspace deletion work end-to-end and are documented.
5. Support response SLA met for 4 consecutive weeks.

### Non-goals
No marketplaces (templates, agents, integrations), no white-labeling, no public API GA, no mobile apps — all catalogued in [15_Future_Ideas.md](./15_Future_Ideas.md). No enterprise SSO/SAML unless a paying design partner requires it.

### Key risks
- **Building for imagined customers instead of real ones**. Mitigation: recruit 3–5 design-partner agencies during Phase 4; Phase 5 backlog is driven by their onboarding friction.
- **Support load swamps a tiny team**. Mitigation: onboarding quality is the top deliverable; docs site and in-app guidance before launch breadth.
- **Compliance expectations (SOC 2, DPAs) gate deals**. Mitigation: SOC 2 readiness (controls, logging, policies) in-phase; certification scheduled after first revenue proves demand.

---

## 9. What we ship every phase, regardless

Non-negotiable per-phase output, independent of feature scope (enforced by [12_Project_Rules.md](./12_Project_Rules.md)):

1. **Docs** — every new module gets its module doc; ADRs in `docs/adr/` for every architectural decision; docs updated in the same PR as the change.
2. **Tests** — unit tests for business logic, RLS/permission tests for every new table and role, Playwright coverage for each phase's golden paths.
3. **Migrations** — all schema changes via versioned migrations; zero manual schema edits in any environment.
4. **Audit coverage** — every new mutation path writes to the append-only audit log; verified by phase-gate sampling.
5. **Security review** — a cross-tenant and privilege-escalation review of everything new in the phase.
6. **Design-system compliance** — new UI built from `packages/ui` tokens/components; both themes; AA contrast.
7. **Observability** — Sentry + PostHog instrumentation for new surfaces; a dashboard exists before the feature is declared done.

## 10. Dependencies between phases

- **0 → 1**: RLS harness, RBAC helper, event core, and `packages/ui` are hard prerequisites for any module work. Nothing in Phase 1 starts until Phase 0 exit criteria pass.
- **1 → 2**: CRM/Clients entities are the anchor that Finance, Proposals, Contracts, and Email attach to. Task/comment patterns from Phase 1 are reused, not reinvented.
- **2 → 3**: RAG is only as good as the corpus — Documents, KB, meeting notes, and email from Phase 2 *are* the AI layer's fuel. Automation Studio consumes the domain-event vocabulary accumulated across Phases 0–2. The approval-card pattern ships in Phase 2 and is generalized in Phase 3.
- **3 → 4**: Client-facing reports and monitoring summaries reuse Aurex + RAG. Portal permissioning extends the Client role defined in Phase 0 and exercised nowhere before Phase 4 — expect latent RLS gaps; the Phase 4 adversarial tests exist for this reason.
- **4 → 5**: Self-serve onboarding presumes the polish, empty states, and portal maturity of Phase 4; selling a rough product to strangers is the one sequencing mistake this roadmap exists to prevent.
- **Cross-cutting**: multi-tenancy is never a phase — it is a Phase 0 property that every later phase inherits and re-verifies.

## 11. Roadmap governance

### Phase gates
- A phase ends only when **all exit criteria pass**, reviewed in a written phase-gate review (stored in `docs/adr/` as a decision record). Criteria are verified with evidence (CI runs, PostHog queries, audit samples) — not vibes.
- At each gate the *next* phase's duration and deliverables are re-estimated and this document is versioned (1.1, 1.2, …).
- A phase may be declared done with explicitly waived criteria only by written CTO decision recording the waiver, its reason, and the debt item created.

### Scope-change rules
1. **Within a phase**: new scope requires removing equal-or-larger scope ("swap, don't stack"). The default answer to mid-phase additions is "Phase N+1 backlog".
2. **Between phases**: module reordering is allowed at gates if dependencies (§10) hold; moving a module *earlier* requires demonstrating its prerequisites already exist.
3. **Emergency lane**: security issues, data-integrity bugs, and dogfooding blockers bypass the process — fix first, record after.
4. **Kill criteria**: any module unused by its intended internal users for 6+ weeks post-launch triggers a keep/fix/kill review at the next gate.

### Cadence
- Weekly: 30-minute roadmap check against phase exit criteria.
- Per gate: full review, re-estimate, ADR, version bump of this document.
- This document is the single source of truth for sequencing; if a plan elsewhere disagrees with it, this document wins or gets amended — never silently diverged from.
