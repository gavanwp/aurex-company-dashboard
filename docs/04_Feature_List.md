# 04 — Feature List

| | |
|---|---|
| **Document** | Feature Catalog — AurexOS |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Senior Product Manager, AurexDesigns |
| **Related** | [01_Project_Vision.md](./01_Project_Vision.md) · [02_Product_Requirements_Document.md](./02_Product_Requirements_Document.md) · [03_System_Goals.md](./03_System_Goals.md) · 06_Module_Breakdown.md |

---

## How to read this catalog

- **Priority** — P0: must ship in its phase (phase is incomplete without it). P1: strongly expected in its phase; may slip one phase with PM sign-off. P2: opportunistic / fast-follow.
- **Phase** — maps to the roadmap: **0** Foundation → **1** Internal MVP → **2** Agency Operations → **3** AI Layer → **4** Client Portal & Polish → **5** Commercial SaaS. A feature listed at Phase N with P0 is a launch gate for that phase.
- Each module section ends with its **AI capabilities** (Aurex context, tools, and intelligence for that module) — these are features, DoD-gated per [03_System_Goals.md](./03_System_Goals.md) §2.
- This is the exhaustive planning catalog; behavioral detail lives in 06_Module_Breakdown.md.

---

## 1. Platform Foundation (Auth, Workspaces, Tenancy)

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Email/password + Google OAuth auth | Supabase Auth sign-up/sign-in with verified email | P0 | 1 |
| Magic-link sign-in | Passwordless login option | P1 | 1 |
| Two-factor authentication (TOTP) | Optional 2FA per user; enforceable per workspace | P1 | 2 |
| Workspace creation & switching | Multi-workspace membership with fast switcher | P0 | 1 |
| Member invitations | Invite by email with role pre-assignment; pending/expired states | P0 | 1 |
| Row-Level Security enforcement | RLS deny-by-default on every table + CI tenancy test-suite | P0 | 0 |
| Session & device management | View/revoke active sessions | P2 | 2 |
| SSO / SAML + SCIM | Enterprise identity (external tenants) | P2 | 5 |

## 2. Settings & Permissions

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Role-based access control | Owner/Admin/PM/Team Member (Dev, Designer, SEO, Content, Marketing)/Sales/Finance/HR/Client/Guest | P0 | 1 |
| Granular permission overrides | Per-user grants/revokes on top of role defaults | P1 | 1 |
| Module enable/disable | Turn modules on/off per workspace | P1 | 2 |
| Workspace profile & branding | Name, logo, brand color, locale, currency defaults | P0 | 1 |
| Feature flags | Workspace-scoped flags on every module/risky capability | P0 | 0 |
| Audit log viewer | Filterable UI over the append-only audit log (Admin+) | P1 | 2 |
| AI governance settings | Per-workspace AI budgets, provider opt-outs, autonomy ladder per action class | P0 | 3 |
| API keys & webhooks management | Customer-facing keys, scopes, webhook endpoints | P1 | 5 |

## 3. Dashboard

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Role-aware home dashboard | My Work, project health, activity feed — filtered by permissions | P0 | 1 |
| Company overview widgets | Pipeline value, active projects, cash snapshot (invoiced/paid/overdue), utilization | P0 | 2 |
| Configurable widget layout | Add/remove/rearrange widgets per user | P1 | 4 |
| Workspace activity feed | Real-time feed rendered from domain events | P0 | 1 |
| **AI: Daily briefing** | Aurex morning digest: today's priorities, risks, meetings, overdue items | P0 | 3 |
| **AI: Anomaly callouts** | "Burn rate on Project X jumped 40% this week" style dashboard insights | P2 | 4 |

## 4. Aurex AI Assistant

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Global chat surface | Persistent assistant panel + full-screen mode, conversation history | P0 | 3 |
| Workspace-wide RAG | Per-tenant pgvector retrieval over all modules, permission-aware, with citations | P0 | 3 |
| Typed tool execution | Aurex invokes module tools (create task, draft invoice, schedule meeting…) via validated schemas | P0 | 3 |
| Human-in-the-loop approvals | Pending-approval queue for outbound/destructive actions; approve/edit/reject | P0 | 3 |
| AI audit trail | Every tool call logged: inputs, outputs, model, cost, approver | P0 | 3 |
| Contextual entity assistant | "Ask Aurex" scoped to the open project/client/invoice/doc | P0 | 3 |
| Cross-module Q&A | "Is the Meridian account healthy?" — answers spanning CRM, tasks, finance, meetings with citations | P0 | 3 |
| Multi-step agent flows | LangGraph plans: e.g. won-deal → project + contract + kickoff-meeting scaffold, one approval | P1 | 3 |
| Provider gateway & failover | Claude primary, OpenAI secondary; model tiering by task; per-workspace budgets | P0 | 3 |
| Autonomy ladder | Graduate specific action classes from approval-gated to autonomous per workspace | P1 | 4 |
| Voice input | Dictate to Aurex | P2 | 4 |
| Scheduled AI jobs | Recurring Aurex tasks ("every Friday, draft weekly client updates") | P1 | 3 |
| Aurex in command palette | Natural-language commands from Cmd+K routed to Aurex | P1 | 3 |

## 5. CRM

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Companies & contacts | Canonical records with custom fields, tags, ownership | P0 | 1 |
| Leads & deals pipeline | Kanban by customizable stage; value, probability, expected close | P0 | 1 |
| Activity timeline | Calls, notes, emails, meetings auto-logged per contact/company/deal | P0 | 2 |
| Deal → client conversion | One action: won deal becomes Client + project/contract scaffold | P0 | 2 |
| Lead capture forms/webhook | Website form + inbound webhook → lead records | P1 | 2 |
| Follow-up reminders & rot detection | Next-step dates; flag deals with no activity in N days | P1 | 2 |
| Custom pipelines | Multiple pipelines (e.g. services vs. retainers) | P2 | 2 |
| **AI: Lead enrichment & scoring** | Enrich from public data; score fit against ICP | P1 | 3 |
| **AI: Next-step suggestions** | Proposed follow-up actions/drafts from full relationship history | P0 | 3 |
| **AI: Deal-risk signals** | Stalled-deal detection with reasoning | P2 | 3 |

## 6. Projects

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Project CRUD linked to clients | Status, health, dates, description, team, tags | P0 | 1 |
| Project templates | Instantiate phases, task lists, milestones, roles from a template | P0 | 1 |
| Milestones & phases | Deadline-bearing milestones; phase grouping; progress roll-up | P0 | 1 |
| Project overview page | Single pane: status, tasks, docs, files, activity, finance summary | P0 | 1 |
| Budgets & burn | Budget (fixed/hourly) vs. logged time + expenses | P1 | 2 |
| Deliverables & client approvals | Versioned deliverable entities with approval workflow (surfaces in Portal, Phase 4) | P1 | 2 |
| Time tracking | Timers + manual entries on tasks; feeds utilization & profitability | P1 | 2 |
| Project archive & post-mortem | Archive flow with retro doc template | P2 | 2 |
| **AI: Status narrative** | Draft client-ready weekly status from tasks/milestones/blockers | P0 | 3 |
| **AI: Risk radar** | Overdue trends, burn vs. progress, silent-client detection | P1 | 3 |
| **AI: Scope-to-plan** | Paste a proposal/SOW → draft project plan (phases, tasks, estimates) | P1 | 3 |

## 7. Tasks

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Task CRUD with rich fields | Assignee, priority, due/start dates, estimates, labels, description | P0 | 1 |
| Views: list, board, timeline, calendar | Per-project and global saved views with filters/grouping | P0 (list, board) / P1 (timeline, calendar) | 1 |
| Subtasks & checklists | Nested breakdown with progress roll-up | P0 | 1 |
| Dependencies | Blocks/blocked-by with visualization on timeline | P1 | 1 |
| Comments & @mentions | Threaded discussion per task; mentions notify | P0 | 1 |
| My Work queue | Cross-project personal queue by priority/due date | P0 | 1 |
| Recurring tasks | Schedule-based regeneration (retainer deliverables) | P1 | 2 |
| GitHub linkage | Link branches/PRs; status sync to task | P1 | 2 |
| Bulk actions & multi-select | Keyboard-driven bulk edit/move/assign | P1 | 1 |
| **AI: Natural-language task creation** | "Remind Dana to send homepage v2 to Meridian Friday" → structured task | P0 | 3 |
| **AI: Auto-triage & estimates** | Suggested assignee, priority, estimate from history | P1 | 3 |
| **AI: Standup digest** | Per-team async summary of done/doing/blocked | P1 | 3 |

## 8. Calendar

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Unified workspace calendar | Meetings, milestones, task due dates, invoice dates projected onto one calendar | P0 | 2 |
| Google Calendar 2-way sync | Per-user OAuth sync of events | P0 | 2 |
| Personal vs. team overlays | Toggle teammates/projects layers | P1 | 2 |
| Scheduling links | Calendly-style booking pages honoring availability | P1 | 2 |
| **AI: Scheduling assistant** | "Find 45 min with Marco and the Meridian contact next week" → proposed slots + invites (approval-gated) | P1 | 3 |

## 9. Meetings

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Meeting records | Linked to client/project/deal; attendees, agenda, video-call link | P0 | 2 |
| Collaborative notes | Shared notes doc per meeting | P0 | 2 |
| Transcript ingestion | Upload/auto-ingest transcript (vendor per PRD Q3) | P1 | 2 |
| Decision log | First-class decisions register per project/client | P2 | 2 |
| **AI: Summary & action items** | Summarize transcript; extract action items → tasks with approval | P0 | 3 |
| **AI: Pre-meeting brief** | Auto-brief from relationship history 30 min before the call | P1 | 3 |

## 10. Email Center

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Gmail OAuth connection | Per-user mailbox connection | P0 | 2 |
| Client communication timeline | Emails auto-associated to contacts/clients/deals/projects | P0 | 2 |
| Send from AurexOS | Compose/reply in-context; templates with merge fields | P0 | 2 |
| Shared visibility rules | Control which threads are workspace-visible vs. private | P1 | 2 |
| Open/link tracking | Optional tracking for sales sequences | P2 | 2 |
| **AI: Draft replies** | Context-aware drafts (project status, invoice state, history) — approval-gated send | P0 | 3 |
| **AI: Inbox triage** | Classify/prioritize client email; suggest actions (task, meeting, CRM update) | P1 | 3 |

## 11. Finance (Invoices, Expenses, Payments)

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Invoice builder | Fixed / milestone / retainer / recurring; line items from tasks/contracts; branded PDF | P0 | 2 |
| Invoice lifecycle | Draft → sent → viewed → partial → paid → overdue; numbering per workspace | P0 | 2 |
| Stripe payment links | Online payment; auto-reconciliation on webhook | P0 | 2 |
| Overdue reminder automation | Scheduled reminders (AI-drafted, approval-gated per §12 rules) | P0 | 2 |
| Expense capture | Receipt upload, categories, billable flag, approval flow | P1 | 2 |
| Payments & reconciliation ledger | Record/match payments incl. manual/bank transfer | P0 | 2 |
| Project profitability | Revenue vs. time cost + expenses per project/client | P1 | 2 |
| Multi-currency | Per-client currency; workspace base-currency reporting | P1 | 2 |
| Tax/VAT handling | Configurable tax rates per line/invoice | P0 | 2 |
| Accounting export | CSV/QuickBooks-compatible export (we are not the GL) | P1 | 2 |
| **AI: Receipt OCR extraction** | Vendor/amount/date/category from receipt images | P1 | 3 |
| **AI: Cash-flow narrative** | Monthly finance summary with anomalies and forecast | P2 | 3 |
| **AI: Collections drafting** | Escalating overdue sequences drafted from tone rules | P1 | 3 |

## 12. Proposals

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Proposal builder | Block-based editor; sections, pricing tables, options | P0 | 2 |
| Templates & service catalog | Reusable templates; priced service items | P0 | 2 |
| CRM merge fields | Auto-fill client/deal data | P0 | 2 |
| Web proposal links | Trackable hosted view (opens, time-on-section) | P1 | 2 |
| E-acceptance | Click-to-accept with identity + timestamp record | P0 | 2 |
| Accepted → scaffold | Acceptance spawns project + contract + invoice skeletons | P1 | 2 |
| **AI: Proposal drafting** | Generate a proposal from deal notes + service catalog + similar past wins | P0 | 3 |
| **AI: Pricing sanity check** | Compare against historical scope/margin outcomes | P2 | 4 |

## 13. Contracts

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Contract records & templates | MSA/SOW/NDA templates with merge fields; versioning | P0 | 2 |
| E-signature | Embedded signing (provider per PRD Q1) | P0 | 2 |
| Renewal & expiry reminders | Automated alerts ahead of key dates | P1 | 2 |
| Linkage | Contract ↔ client, project, invoices, proposal | P0 | 2 |
| **AI: Clause explain & diff** | Plain-English summary; diff vs. our standard template | P2 | 3 |

## 14. Documents

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Block-based editor | Notion-feel docs: headings, lists, tables, embeds, code, images | P0 | 2 |
| Folders & permissions | Workspace/project/private scopes; share to Portal | P0 | 2 |
| Comments & mentions | Inline threaded comments | P1 | 2 |
| Version history | Browse/restore versions | P1 | 2 |
| Doc templates | Briefs, retros, SOPs, meeting notes | P1 | 2 |
| File storage | Attachments via Supabase Storage; large assets via Cloudflare R2 | P0 | 2 |
| **AI: Writing assistant** | Draft/rewrite/summarize within the editor with workspace context | P0 | 3 |
| **AI: Doc Q&A** | Ask questions across any document set | P1 | 3 |

## 15. Knowledge Base

| Feature | Description | Priority | Phase |
|---|---|---|---|
| KB articles & lifecycle | Draft → review → published; owners and review dates | P0 | 2 |
| Collections & taxonomy | SOPs, playbooks, client profiles, tech notes | P0 | 2 |
| KB as RAG backbone | Published KB weighted highest in Aurex retrieval, with citation-back | P0 | 3 |
| **AI: Answer-from-KB with sources** | Grounded answers linking the exact article/section | P0 | 3 |
| **AI: Stale-content detection** | Flag articles contradicted by newer events/docs | P2 | 4 |
| **AI: Knowledge capture** | Suggest KB articles from repeated questions & meeting decisions | P1 | 4 |

## 16. Clients (Hub)

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Client 360 page | One hub: company, contacts, projects, invoices, contracts, docs, meetings, emails, activity | P0 | 1 (lite) / 2 (full) |
| Client health score | Composite: delivery status, payment behavior, communication recency, sentiment | P1 | 4 |
| Client lifecycle stages | Prospect → active → retainer → dormant → churned | P1 | 2 |
| **AI: Account summary** | On-demand narrative: state of the relationship, open items, risks | P0 | 3 |
| **AI: Churn-risk alerts** | Early-warning on negative signals across modules | P2 | 4 |

## 17. Client Portal

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Scoped client login | Client role sees only their entities; per-client guest contacts | P0 | 4 |
| Project status view | Milestones, progress, shared timeline (agency-curated visibility) | P0 | 4 |
| Deliverable review & approval | Approve/reject with comments; audit-trailed | P0 | 4 |
| Invoices & online payment | View, download, pay invoices | P0 | 4 |
| Shared documents & files | Agency-published docs/deliverables | P0 | 4 |
| Portal messaging | Structured request/response threads (not email) | P1 | 4 |
| Client onboarding forms | Intake questionnaires feeding client record | P1 | 4 |
| White-label portal | Custom domain + full branding for external tenants | P1 | 5 |
| **AI: Client-scoped Aurex** | Portal assistant answering only within the client's permission boundary | P2 | 4 |

## 18. Team & HR

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Team directory & profiles | Roles, specializations, skills, contacts | P0 | 2 |
| Onboarding checklists | Templated task sequences for new hires | P1 | 2 |
| Leave management | Request/approve; calendar integration | P1 | 2 |
| Capacity & utilization | Availability vs. assigned load; feeds planning | P1 | 2 |
| Team member docs | Contracts, reviews (HR-scoped permissions) | P2 | 2 |
| **AI: Workload balancing suggestions** | Flag over/under-allocation with reassignment proposals | P2 | 3 |

## 19. Automation Studio

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Trigger → condition → action builder | Visual builder over domain events and typed module tools | P0 | 3 |
| Automation templates gallery | Curated recipes (overdue chase, won-deal handoff, retainer task generation) | P0 | 3 |
| Run history & error handling | Per-run logs, retries, failure alerts | P0 | 3 |
| n8n bridge | Fire events to / receive from self-hosted n8n for external SaaS automation | P1 | 3 |
| Scheduled triggers | Cron-style time triggers | P0 | 3 |
| **AI: English → automation** | Describe a workflow in plain language → drafted automation for review | P1 | 3 |
| **AI steps in automations** | Automation actions may invoke Aurex (summarize, draft, classify) | P1 | 3 |

## 20. Notifications

| Feature | Description | Priority | Phase |
|---|---|---|---|
| In-app notification inbox | Unified, filterable, mark-read/unread; realtime | P0 | 1 |
| Email notifications & digests | Instant vs. daily-digest per category | P0 | 1 |
| Web push | Browser push for mentions/approvals/alerts | P1 | 4 |
| Granular preferences | Per-user, per-module, per-event-type controls | P1 | 2 |
| Smart batching | Coalesce bursts; quiet hours | P1 | 4 |
| Slack bridge (transitional) | Mirror critical notifications during internal migration (per PRD Q8) | P2 | 2 |
| **AI: Priority inbox** | Rank notifications by personal relevance; summarize the backlog | P2 | 4 |

## 21. Analytics & Reports

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Domain dashboards | Pipeline, delivery, finance, team utilization — built on the event stream | P0 | 4 |
| Report builder | Composable charts/tables over permitted entities; saved reports | P1 | 4 |
| Scheduled reports | Email/portal delivery on schedule | P1 | 4 |
| Client-facing reports | Publish curated reports to the Portal | P1 | 4 |
| **AI: Narrative insights** | "What changed this month and why" annotations on every dashboard | P1 | 4 |
| **AI: Ask-the-data** | Natural-language questions → charts with the underlying query shown | P2 | 4 |

## 22. Website Monitoring

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Uptime checks | HTTP checks with alerting per client site | P0 | 4 |
| SSL & domain expiry alerts | Ahead-of-expiry warnings | P0 | 4 |
| Core Web Vitals snapshots | Scheduled Lighthouse-style performance tracking | P1 | 4 |
| Incident timeline | Downtime history per site; portal-visible status (P1) | P1 | 4 |
| **AI: Incident summaries & fixes** | Explain the failure; propose a task with suggested remediation | P2 | 4 |

## 23. Commercial SaaS Platform (Phase 5)

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Self-serve signup & onboarding | Workspace creation wizard, sample data, guided setup | P0 | 5 |
| Stripe subscription billing | Seat-based plans, trials, upgrades, invoices, dunning | P0 | 5 |
| Importers | Notion, ClickUp/Asana, HubSpot, CSV → canonical entities | P0 | 5 |
| Full workspace export | Complete data export (anti-lock-in commitment, [03_System_Goals.md](./03_System_Goals.md) §11.7) | P0 | 5 |
| Workspace templates | "Agency starter" presets per agency type | P1 | 5 |
| Template Marketplace | Publish/install project, proposal, automation templates | P1 | 5 |
| Integration Marketplace | Curated third-party connectors on the n8n/gateway seam | P1 | 5 |
| AI Agents Marketplace | Third-party Aurex agents using the internal tool-registration mechanism | P2 | 5 |
| Public API & webhooks | Scoped keys; event webhooks for customers | P1 | 5 |
| Usage & plan analytics | Per-workspace seat/AI usage visibility for admins | P1 | 5 |
| Password Manager module | Team credential vault (future, behind flag; security review gate) | P2 | 5 (future) |

## 24. Cross-Cutting Features

| Feature | Description | Priority | Phase |
|---|---|---|---|
| Command palette (Cmd+K) | Navigate anywhere, run actions, create entities, invoke Aurex from one keystroke | P0 | 1 |
| Global search | Instant permission-aware search across all entities; recent + fuzzy | P0 | 1 |
| Keyboard-first UX | Shortcuts for all frequent actions; shortcut help overlay (?) | P0 | 1 |
| Dark + light mode | System-following themes, WCAG AA contrast in both | P0 | 0 |
| Design system | Tailwind + shadcn/ui token-based system; Framer Motion with reduced-motion support | P0 | 0 |
| Soft delete & trash | `deleted_at` everywhere; trash with restore per module | P0 | 1 |
| Append-only audit log | Auth, permissions, finance, exports, all AI actions — immutable | P0 | 1 |
| Domain event stream | Typed events on every state change powering feeds/automation/analytics/AI | P0 | 0 |
| Import/export (CSV) | Per-module CSV import/export from the start (full importers in Phase 5) | P1 | 2 |
| Offline-tolerant UX | Optimistic updates, mutation retry queue, clear connectivity states — never silent data loss | P1 | 1 |
| Realtime collaboration | Live presence and updates on boards/docs via Supabase Realtime | P1 | 2 |
| Undo | Undo for destructive/bulk actions (toast + Cmd+Z where feasible) | P1 | 2 |
| Entity linking & backlinks | @-link any entity from any rich-text surface; backlink panel | P1 | 2 |
| Custom fields | Admin-defined fields on core entities (clients, projects, tasks, deals) | P1 | 2 |
| Saved views & filters | Personal + shared saved views on every list/board | P1 | 1 |
| Accessibility (WCAG 2.1 AA) | Keyboard operability, focus management, ARIA-correct widgets, axe in CI | P0 | 0 |
| i18n-ready strings | Externalized ICU strings, locale-aware formats (English-only UI in v1) | P1 | 0 |
| Onboarding & empty states | Guided first-run per module; useful empty states with sample actions | P1 | 1 |
| PWA install | Installable app shell with icon/splash | P2 | 4 |

---

## Phase gate summary

| Phase | P0 gate (phase is done when…) |
|---|---|
| **0** | Docs suite approved; design system + tokens; schema + RLS foundation; event table; CI/CD; feature flags; dark/light; a11y baseline |
| **1** | AurexDesigns runs projects/tasks/CRM-lite/dashboard/notifications daily; Cmd+K, search, audit log, soft deletes live |
| **2** | Finance, proposals, contracts, documents, KB, calendar, meetings, email, Team & HR operational; ≥ 6 legacy tools retired |
| **3** | Aurex live with RAG + tools + approvals + audit; Automation Studio replacing Zapier chains; all P0 AI rows above shipped |
| **4** | Client Portal live with ≥ 80% active-client adoption; analytics, monitoring, notification polish shipped |
| **5** | External agency can sign up, import, pay, and operate with zero founder involvement |

*Additions to this catalog require PM sign-off; anything added must carry priority + phase and be reconciled with [02_Product_Requirements_Document.md](./02_Product_Requirements_Document.md) scope and [03_System_Goals.md](./03_System_Goals.md) anti-goals.*
