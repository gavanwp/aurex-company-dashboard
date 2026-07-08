# 02 — Product Requirements Document (PRD)

| | |
|---|---|
| **Document** | Product Requirements Document — AurexOS |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Senior Product Manager, AurexDesigns |
| **Related** | [01_Project_Vision.md](./01_Project_Vision.md) · [03_System_Goals.md](./03_System_Goals.md) · [04_Feature_List.md](./04_Feature_List.md) · 06_Module_Breakdown.md (per-module deep specs) |

---

## 1. Executive Summary

AurexOS is a multi-tenant, AI-native operating system for digital agencies, built by AurexDesigns. It consolidates ~20 operational modules — CRM, Projects, Tasks, Calendar, Meetings, Email Center, Finance, Proposals, Contracts, Documents, Knowledge Base, Client Portal, Team & HR, Automation Studio, Analytics, Website Monitoring — behind a single permission model, a single event stream, and a single AI assistant (**Aurex**) with workspace-wide context and typed, auditable tools.

The product ships in two tracks on one codebase: (1) the internal operating system for AurexDesigns (Phases 0–4), and (2) a commercial SaaS for other agencies (Phase 5). Multi-tenancy (workspaces + Postgres RLS), RBAC, soft deletes, and the domain-event core are non-negotiable from the first migration.

This PRD defines *what* we build and *for whom*. Deep per-module specifications live in **06_Module_Breakdown.md**; measurable system targets live in [03_System_Goals.md](./03_System_Goals.md); the full prioritized catalog lives in [04_Feature_List.md](./04_Feature_List.md).

## 2. Goals & Non-Goals

### 2.1 Goals

| # | Goal | Measure (see 03_System_Goals.md for targets) |
|---|---|---|
| G1 | Replace AurexDesigns' fragmented tool stack with one system | ≥ 10 subscriptions retired by end of Phase 4 |
| G2 | Make Aurex AI the primary interface for routine operations | WACO (weekly AI-completed operations) trending up; approval rate ≥ 85% |
| G3 | Be commercially multi-tenant from day one | Zero cross-tenant data access; Phase 5 requires no data-model migration |
| G4 | Apple/Linear-grade UX: fast, minimal, keyboard-first, accessible | LCP ≤ 2.0s p75, WCAG 2.1 AA, Cmd+K covers all navigation |
| G5 | Event-driven core powering automations, notifications, analytics, AI | 100% of state-changing mutations emit domain events |
| G6 | Client-facing surface that reduces "what's the status?" email | Client Portal adoption ≥ 80% of active clients by Phase 4 |

### 2.2 Non-Goals (v1, Phases 0–4)

- **Not** a general-purpose work OS for non-agency verticals.
- **Not** a replacement for design tools (Figma), code hosting (GitHub), or accounting ledgers — we integrate.
- **Not** real-time chat (Slack replacement is aspirational; v1 ships contextual comments/threads on entities, not a channels product).
- **Not** native mobile apps (responsive web + PWA only in v1).
- **Not** fully autonomous AI — all outbound/destructive AI actions require human approval in v1.
- **Not** marketplaces, self-serve billing, or public API (Phase 5).
- **Not** on-premise deployment (self-hosted n8n is the only Docker-hosted component).

## 3. Personas

All personas operate inside a **workspace**; roles map to the RBAC model (Owner, Admin, Project Manager, Team Member [Developer, Designer, SEO Specialist, Content Writer, Marketing], Sales, Finance, HR, Client, Guest).

| # | Persona | Role mapping | Core jobs | Top pains today |
|---|---|---|---|---|
| P1 | **Ava — CEO / Co-founder** | Owner | See business health at a glance; unblock decisions; win deals | Data scattered across 14 tools; no trustworthy single dashboard; status archaeology |
| P2 | **Marco — Project Manager** | Project Manager | Plan projects, assign work, keep clients informed, protect margins | Copies statuses between tools; writes the same update 3 times (task tool, email, report) |
| P3 | **Dev — Developer** | Team Member (Developer) | Ship tasks; know what's next; minimal meetings | Task context split across ClickUp/Slack/Notion/GitHub; interruptions for status |
| P4 | **Dana — Designer** | Team Member (Designer) | Design deliverables; manage feedback cycles | Feedback arrives via email/Slack/comments in 3 tools; version confusion |
| P5 | **Sena — SEO Specialist** | Team Member (SEO) | Run audits, track rankings/deliverables, report to clients | Reporting is manual spreadsheet assembly every month |
| P6 | **Cora — Content Writer** | Team Member (Content) | Produce content against briefs and calendars | Briefs, drafts, and approvals live in different tools |
| P7 | **Mia — Marketing** | Team Member (Marketing) | Campaigns, social calendar, internal marketing ops | Campaign assets, calendar, and results are never in one place |
| P8 | **Sam — Sales** | Sales | Pipeline management, proposals, follow-ups | CRM disconnected from delivery reality; proposals in a 4th tool |
| P9 | **Fiona — Finance** | Finance | Invoices, expenses, payments, margin reporting | Invoicing tool knows nothing about project scope or hours |
| P10 | **Hana — HR/Ops** | HR | Onboarding, leave, team records, capacity | HR data in spreadsheets; onboarding checklist is tribal knowledge |
| P11 | **Cleo — Client** | Client (portal-only) | Know project status; approve deliverables; pay invoices | Has to email the PM for everything; invoices arrive from a system she's never seen |
| P12 | **Gus — Guest/Contractor** | Guest | Contribute to specific projects only | Over-broad access or endless permission requests |
| P13 | **Alex — Future Agency Owner** *(Phase 5)* | Owner (external tenant) | Adopt AurexOS for their agency with minimal migration pain | Evaluating yet another tool; fears lock-in and migration cost |

## 4. User Stories (per persona, prioritized)

Format: *As [persona], I want [capability], so that [outcome].* Priority P0 = MVP-critical for the persona's phase.

### P1 — CEO / Co-founder (Ava)
- **P0** As Ava, I want a company dashboard aggregating pipeline, active projects, cash (invoiced/paid/overdue), and team utilization, so that I see business health without asking anyone.
- **P0** As Ava, I want to ask Aurex cross-module questions ("Which clients are at risk this month and why?") and get cited answers, so that decisions are grounded in the actual data.
- **P1** As Ava, I want an append-only audit trail of all sensitive actions (including every AI action), so that I can trust delegation to people and AI.
- **P2** As Ava, I want monthly auto-generated business review reports, so that board/partner updates take minutes.

### P2 — Project Manager (Marco)
- **P0** As Marco, I want to create a project from a template (phases, task lists, roles, milestones), so that setup takes minutes and follows our playbook.
- **P0** As Marco, I want board/list/timeline views of tasks with assignees, estimates, priorities, and dependencies, so that I plan and rebalance visually.
- **P0** As Marco, I want Aurex to draft the weekly client status update from tasks completed, milestones, blockers, and upcoming calendar items, so that I edit for 2 minutes instead of writing for 30.
- **P1** As Marco, I want risk signals surfaced automatically (overdue tasks trending, budget burn vs. progress, no client contact in 14 days), so that I intervene before escalation.
- **P1** As Marco, I want meeting notes and action items auto-captured and converted into tasks with my approval, so that nothing said in a meeting is lost.

### P3 — Developer (Dev)
- **P0** As Dev, I want a personal "My Work" queue across all projects sorted by priority/due date, so that I always know what's next.
- **P0** As Dev, I want tasks linked to GitHub branches/PRs with status sync, so that PMs get status without asking me.
- **P1** As Dev, I want to do everything keyboard-first (Cmd+K, quick-assign, quick-status), so that the tool never breaks my flow.
- **P2** As Dev, I want Aurex to answer "how did we implement X for client Y?" from the knowledge base and past project docs, so that I don't re-solve solved problems.

### P4 — Designer (Dana)
- **P0** As Dana, I want deliverables with versioned file attachments (Figma links, exports) and threaded feedback per version, so that feedback is never lost across channels.
- **P1** As Dana, I want client approval requests through the portal with an audit trail, so that "approved" is a fact, not a memory.

### P5 — SEO Specialist (Sena)
- **P1** As Sena, I want recurring deliverable schedules (monthly audits, reports) generated as tasks automatically, so that retainer work never slips.
- **P1** As Sena, I want Aurex to assemble the monthly client SEO report from tracked deliverables and monitoring data, so that reporting is a review, not a build.
- **P2** As Sena, I want website monitoring (uptime, Core Web Vitals, SSL/domain expiry) for client sites, so that I catch regressions before the client does.

### P6 — Content Writer (Cora)
- **P1** As Cora, I want briefs, drafts, reviews, and approvals as one document workflow with statuses, so that content moves through a visible pipeline.
- **P2** As Cora, I want Aurex to draft first-pass content from the brief and the client's knowledge-base entry (voice, audience, past work), so that I start from 60%, not 0%.

### P7 — Marketing (Mia)
- **P1** As Mia, I want a shared content/social calendar view spanning campaigns and channels, so that scheduling conflicts are visible.
- **P2** As Mia, I want campaign entities linking tasks, assets, and outcomes, so that we can see what worked.

### P8 — Sales (Sam)
- **P0** As Sam, I want a pipeline (Kanban by stage) of leads/deals with contacts, companies, activities, and next steps, so that nothing rots silently.
- **P0** As Sam, I want Aurex to draft follow-up emails using full relationship history (emails, meetings, proposal state), so that follow-ups are fast and personal.
- **P1** As Sam, I want proposals generated from templates + CRM + service catalog, sent for e-acceptance, with view tracking, so that the proposal loop closes in hours.
- **P1** As Sam, I want won deals to convert into a client + project + contract skeleton in one action, so that handoff to delivery is lossless.

### P9 — Finance (Fiona)
- **P0** As Fiona, I want invoices generated from projects/contracts (fixed, milestone, retainer), sent with payment links, with statuses (draft/sent/viewed/paid/overdue), so that billing is systematic.
- **P0** As Fiona, I want automated overdue reminders (AI-drafted, approval-gated), so that collections don't depend on my memory.
- **P1** As Fiona, I want expense capture (receipt upload, AI extraction of vendor/amount/date/category) with approval flows, so that expense tracking isn't a spreadsheet.
- **P1** As Fiona, I want project profitability (revenue vs. cost of time + expenses), so that we know which work makes money.

### P10 — HR/Ops (Hana)
- **P1** As Hana, I want team records, roles, onboarding checklists, and leave tracking in the workspace, so that HR data leaves the spreadsheets.
- **P2** As Hana, I want capacity/utilization views feeding project planning, so that we staff realistically.

### P11 — Client (Cleo)
- **P0** As Cleo, I want a portal showing my projects' status, milestones, shared deliverables, and invoices, so that I never have to email for basics. *(Portal ships Phase 4; P0 within that phase.)*
- **P0** As Cleo, I want to approve/reject deliverables and comment in the portal, so that my feedback is structured and on the record.
- **P1** As Cleo, I want to pay invoices online from the portal, so that paying is frictionless.
- **P2** As Cleo, I want to ask a scoped Aurex about *my* projects only, so that I get instant answers within my permission boundary.

### P12 — Guest (Gus)
- **P1** As Gus, I want access to exactly the projects I'm invited to and nothing else, so that agencies can safely bring me in.

### P13 — Future Agency Owner (Alex, Phase 5)
- **P0** As Alex, I want self-serve signup, workspace creation, guided onboarding, and CSV/API import from Notion/ClickUp/HubSpot, so that switching costs days, not months.
- **P0** As Alex, I want transparent seat-based billing with plan management, so that procurement is a credit card, not a sales cycle.
- **P1** As Alex, I want workspace templates ("agency starter") and marketplace templates, so that I start from best practice.
- **P1** As Alex, I want data export of everything I put in, so that I never feel locked in.

## 5. Functional Requirements by Module

Summaries only — authoritative per-module detail (data model, flows, edge cases, AI tool schemas) lives in **06_Module_Breakdown.md**. Feature-level priority/phase mapping lives in [04_Feature_List.md](./04_Feature_List.md).

| Module | Phase | Functional requirements (summary) |
|---|---|---|
| **Platform: Auth & Workspaces** | 1 | Supabase Auth (email+password, Google OAuth, magic link); workspace create/join/invite; every row tenant-scoped with RLS; session management; 2FA. |
| **Settings & Permissions** | 1→ | RBAC per role list in brief; granular per-user permission overrides; per-module enable/disable; workspace branding; feature flags; API keys (Phase 5). |
| **Dashboard** | 1 | Role-aware home: My Work, project health, pipeline snapshot, cash snapshot, activity feed, Aurex briefing. Widgets permission-filtered; configurable layout (P1). |
| **Aurex AI Assistant** | 3 (surface stub in 1) | Workspace-context chat (global + per-entity); RAG over pgvector per tenant; typed module tools; propose→approve→execute for outbound/destructive; AI audit trail; daily briefing; cross-module Q&A with citations; gateway abstraction (Claude primary, OpenAI fallback); LangGraph orchestration. |
| **CRM** | 1 (lite) → 2 | Companies, contacts, leads, deals; pipeline stages (customizable); activities (calls, emails, notes) auto-logged; deal→client conversion; AI lead enrichment and next-step suggestions. |
| **Projects** | 1 | Projects linked to clients; templates; phases/milestones; team assignment; status & health; budgets (Phase 2 ties to Finance); project-level docs/files/activity. |
| **Tasks** | 1 | CRUD; list/board/timeline/calendar views; assignee, priority, due dates, estimates, labels, subtasks, dependencies, checklists; comments with @mentions; recurring tasks; My Work; GitHub linkage. |
| **Calendar** | 2 | Unified workspace + personal calendar; Google Calendar 2-way sync; entities (tasks, milestones, meetings, invoices due) projected onto calendar; scheduling links (P1). |
| **Meetings** | 2 | Meeting entities linked to clients/projects; agenda; notes; transcript ingestion; AI summary + action-item extraction → task creation with approval; decisions log. |
| **Email Center** | 2 | Gmail integration (OAuth per user); shared client-communication timeline; send/receive linked to CRM/client/project entities; templates; AI drafting with approval; open/reply tracking (P2 of module). |
| **Finance** | 2 | Invoices (fixed/milestone/retainer/recurring), line items from tasks/contracts; Stripe payment links; expenses with receipt OCR + approval; payments reconciliation; project profitability; overdue automation. Multi-currency P1. |
| **Proposals** | 2 | Template-based proposal builder; service catalog; CRM merge fields; web-view links with tracking; e-acceptance; accepted → project/contract/invoice scaffold. |
| **Contracts** | 2 | Contract records + templates; versioning; e-signature (embedded provider); renewal/expiry reminders; linkage to client, project, invoices. |
| **Documents** | 2 | Block-based doc editor (Notion-feel); folders/permissions; templates; comments; version history; AI writing assist; file storage via Supabase Storage / R2 for large assets. |
| **Knowledge Base** | 2→3 | Curated internal KB (SOPs, playbooks, client profiles); article lifecycle (draft/review/published); powers Aurex RAG with citation-back; stale-content flags (AI, P2). |
| **Clients** | 1 (lite) → 2 | Client entity = hub linking CRM company, projects, contacts, invoices, contracts, docs, meetings, emails; health score; AI account summary. |
| **Client Portal** | 4 | Separate scoped surface for Client role: project status, milestones, shared deliverables, approvals, invoices + pay, messages, scoped Aurex (P2). White-label branding (Phase 5). |
| **Team & HR** | 2 | Profiles, roles, specializations; onboarding checklists; leave requests/approvals; capacity & utilization; org directory. Payroll **out of scope** (export only). |
| **Automation Studio** | 3 | Internal automations: trigger (domain event) → conditions → actions (typed module tools); template gallery; run history & error handling; n8n bridge for external SaaS automation; AI "describe workflow in English → draft automation" (P1). |
| **Notifications** | 1 (basic) → 4 | In-app inbox, email digests, web push; per-user granular preferences; consumes domain events; smart batching (P1); Slack bridge during transition (P2). |
| **Analytics & Reports** | 4 | Dashboards per domain (pipeline, delivery, finance, team); report builder (P1); scheduled email reports; AI narrative insights ("what changed and why"). |
| **Website Monitoring** | 4 | Uptime checks, SSL/domain expiry, Core Web Vitals snapshots for client sites; alerting into Notifications; client-facing status in Portal (P1). |
| **Phase 5 platform** | 5 | Stripe subscription billing; self-serve onboarding + import; Template / AI Agents / Integration marketplaces; public API + webhooks; white-labeling. Password Manager (future, flagged). |

**Cross-cutting requirements (all modules):** global search + command palette (Cmd+K) over all permitted entities; soft deletes with trash/restore; append-only audit log; domain-event emission on every state change; import/export (CSV at minimum); optimistic UI with offline-tolerant retry; keyboard-first interaction; dark + light themes.

## 6. Non-Functional Requirements

Targets are contractual for engineering; measurement methodology in [03_System_Goals.md](./03_System_Goals.md).

### 6.1 Performance budgets
| Metric | Target |
|---|---|
| TTFB (Vercel edge, p75) | ≤ 300 ms |
| LCP (p75, dashboard & module list views) | ≤ 2.0 s |
| INP (p75) | ≤ 200 ms |
| API reads p95 | ≤ 400 ms |
| API writes p95 | ≤ 600 ms |
| Aurex first token (p50) | ≤ 1.5 s |
| Realtime event propagation (p95) | ≤ 2 s |
| Client-side route transitions | ≤ 150 ms perceived (prefetch + optimistic) |

### 6.2 Availability & reliability
- 99.9% monthly availability target for the app core (Phase 5 SLO; internal target from Phase 2).
- RPO ≤ 24h (daily backups) Phase 1–2; RPO ≤ 1h (PITR) from Phase 3. RTO ≤ 4h.
- Graceful degradation: AI layer outage must not impair CRUD operations; n8n outage must not impair internal automations.

### 6.3 Security
- Postgres RLS on **every** table; deny-by-default policies; tenancy tests in CI.
- RBAC enforced on every route/server action; client-side checks are UX only, never authority.
- Encryption in transit (TLS 1.2+) and at rest; secrets only via env vars (no hardcoded values — engineering rule).
- Append-only audit log for auth events, permission changes, finance actions, exports, and 100% of AI tool executions.
- OWASP ASVS L2 as review baseline; dependency scanning in CI; least-privilege service keys.

### 6.4 Privacy & GDPR
- Data processing register per module; DPA-ready posture for Phase 5.
- Right to access/erasure: per-user export and hard-erasure workflow (crypto-shredding for backups documented).
- AI providers under DPAs; **no tenant data used for model training**; per-workspace AI data-residency controls (opt-out of secondary provider).
- PII minimization in logs; configurable retention windows for emails/transcripts.

### 6.5 Accessibility
- WCAG 2.1 AA across the app and Client Portal: full keyboard operability, visible focus, ARIA-correct composite widgets (boards, palettes, editors), 4.5:1 contrast in both themes, reduced-motion support (Framer Motion honors `prefers-reduced-motion`).
- Automated axe checks in CI + quarterly manual audit of critical flows.

### 6.6 Internationalization-readiness
- All UI strings externalized from day one (no hardcoded copy); ICU message format.
- Locale-aware dates, numbers, currencies (multi-currency finance is P1, Phase 2).
- v1 ships English-only; architecture must make adding a locale a translation task, not an engineering task. RTL not in v1.

### 6.7 Scale assumptions (design envelope)
- v1 envelope: 500 workspaces, 50 seats/workspace, 1M tasks, 10M domain events, 5M vector chunks — all comfortably within a single well-indexed Postgres/Supabase instance; partitioning strategy documented before Phase 5.

## 7. Constraints

| # | Constraint |
|---|---|
| C1 | Stack is decided (see [01_Project_Vision.md](./01_Project_Vision.md) §Architecture): Turborepo modular monolith, Next.js App Router + TS strict + Tailwind + shadcn/ui + Framer Motion, Supabase, pgvector, n8n (Docker), Cloudflare R2, Vercel + GitHub Actions. Deviations require ADR + CTO sign-off. |
| C2 | Team is small (founding team + agency staff part-time); scope must fit a modular-monolith, sequential-phase delivery. |
| C3 | AI costs are variable; gateway must support per-workspace budgets, model tiering (cheap models for classification, frontier for reasoning), and caching. |
| C4 | AurexDesigns' live client work depends on this system from Phase 1 — migrations must be zero-data-loss and reversible. |
| C5 | Engineering rules are binding: TS strict, RLS everywhere, RBAC on every route, soft deletes, append-only audit, env-vars only, feature flags, conventional commits, docs per module. |

## 8. Assumptions

1. Supabase RLS + workspace_id scoping is sufficient tenant isolation for the target market (no dedicated-instance requirement before Phase 5 enterprise tier).
2. Gmail + Google Calendar cover ≥ 90% of internal and early-customer needs; Outlook can wait for Phase 5 demand.
3. Frontier-model quality and pricing continue to improve or hold; Claude-class models remain available via API under DPA.
4. Agencies will accept AI drafting with human approval as the trust model (validated internally before external launch).
5. Stripe is acceptable for both invoice payments (Phase 2) and SaaS billing (Phase 5) in launch geographies.
6. Meeting transcription can rely on a third-party transcription API; we do not build ASR.

## 9. Out of Scope for v1 (Phases 0–4)

- Marketplaces (templates, AI agents, integrations), public API, webhooks for customers, white-labeling, SaaS billing — **Phase 5**.
- Native mobile apps; offline-first sync (offline-*tolerant* only).
- Real-time channels chat; voice/video calling (we link out to Meet/Zoom).
- Payroll processing, tax filing, double-entry general ledger.
- Password Manager (future module, explicitly flagged).
- On-premise/self-hosted AurexOS; SSO/SAML & SCIM (Phase 5 enterprise).
- Ads-platform management and social publishing APIs (calendar + tasks only in v1).

## 10. Acceptance Criteria Style

All feature specs (in 06_Module_Breakdown.md and issues) use **Gherkin-style Given/When/Then**, and every feature must include criteria for these five dimensions:

1. **Happy path** — the core behavior.
2. **Permissions** — at least one scenario proving a forbidden role/tenant *cannot* perform or see the action (RLS + RBAC).
3. **Events & audit** — the domain event(s) emitted and audit entries written.
4. **AI surface** — the Aurex tool/context exposure (or explicit "no AI surface" declaration).
5. **Empty/error states** — defined UX for zero-data and failure.

Example:

```gherkin
Feature: Send invoice
  Scenario: Finance sends a draft invoice
    Given a Finance user in workspace W with a draft invoice for client C
    When they click "Send" and confirm
    Then the invoice status becomes "sent", an email with a payment link is delivered to C's billing contact
    And a domain event `invoice.sent` is emitted and an audit entry recorded
  Scenario: Team Member cannot send invoices
    Given a Team Member without finance permissions
    Then the send action is not visible and the server action returns 403
  Scenario: Aurex proposes sending
    Given Aurex drafts an overdue reminder
    Then it is queued as a pending approval and nothing is sent until a permitted human approves
```

Definition of Done additionally requires: TS strict passes, RLS tests, docs updated, feature flag wired, a11y checks pass.

## 11. Open Questions

| # | Question | Owner | Needed by |
|---|---|---|---|
| Q1 | E-signature: embed a provider (Documenso/Dropbox Sign) vs. build lightweight click-wrap acceptance for contracts? | CTO | Phase 2 kickoff |
| Q2 | Email Center depth: full two-way Gmail client vs. client-communication timeline with send capability? (Scope risk is high.) | PM | Phase 2 kickoff |
| Q3 | Meeting transcription vendor (Whisper API vs. Recall.ai-style bot vs. upload-only in v1)? | CTO | Phase 2 build |
| Q4 | Aurex autonomy ladder: which action classes can graduate from approval-gated to autonomous, and what per-workspace controls govern it? | PM + CTO | Phase 3 design |
| Q5 | Client Portal auth: same Supabase auth pool with Client role vs. separate portal auth domain? | CTO | Phase 4 kickoff |
| Q6 | Pricing model for Phase 5: pure per-seat vs. seat + AI-usage hybrid? | Founders | Phase 5 planning |
| Q7 | Do we need EU data residency (Supabase region pinning) for first external customers? | Founders | Before beta invites |
| Q8 | Slack bridge during internal transition: worth building, or hard-cutover to AurexOS notifications? | PM | Phase 2 |

---

*Changes require PM + CTO sign-off. Module sections here are summaries; conflicts between this PRD and 06_Module_Breakdown.md must be resolved in favor of this PRD's scope statements and the brief in [01_Project_Vision.md](./01_Project_Vision.md).*
