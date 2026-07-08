# 06 — Module Breakdown

| | |
|---|---|
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Founding CTO, AurexDesigns |
| **Related** | 08_Tech_Stack.md, 05_User_Roles.md, 07_AI_Strategy.md, 08_Tech_Stack.md, 06_Module_Breakdown.md, 10_Roadmap.md |

This is the deepest document in the planning set: the functional and conceptual-data blueprint for every core module of AurexOS. It defines *what each module is*, not *how it is coded*. Physical schema lives in 06_Module_Breakdown.md; AI internals live in 07_AI_Strategy.md; phase sequencing detail lives in 10_Roadmap.md.

**Conventions used throughout:**

- Every entity implicitly carries: `id`, `workspace_id`, `created_at/by`, `updated_at/by`, `deleted_at` (soft delete). These are not repeated per table.
- Every module is behind RLS + RBAC per 05_User_Roles.md and emits domain events to the append-only `events` table — the event-driven core that powers automations, notifications, analytics, and AI context.
- Event naming: `module.entity.verb` past tense (`crm.deal.stage_changed`). Events carry `actor_user_id`, `via_ai`, `workspace_id`, entity refs, and a versioned payload.
- "Phase" refers to 10_Roadmap.md: 0 Foundation, 1 Internal MVP, 2 Agency Operations, 3 AI Layer, 4 Client Portal & Polish, 5 Commercial SaaS.

---

## Module Index

| # | Module | Phase introduced | Depends on |
|---|---|---|---|
| 1 | Dashboard | 1 | all (aggregator) |
| 2 | Aurex AI Assistant | 3 (shell in 1) | all (tool registry) |
| 3 | CRM | 1 (lite) → 2 (full) | Clients, Email, Proposals |
| 4 | Projects | 1 | Tasks, Clients, Documents |
| 5 | Tasks | 1 | Projects |
| 6 | Calendar | 2 | Meetings, Tasks, Projects |
| 7 | Meetings | 2 | Calendar, Projects, CRM |
| 8 | Email Center | 2 | CRM, Clients, Projects |
| 9 | Finance | 2 | Clients, Projects, Contracts |
| 10 | Proposals | 2 | CRM, Contracts, Finance |
| 11 | Contracts | 2 | Proposals, Clients, Finance |
| 12 | Documents | 2 | Projects, KB, Portal |
| 13 | Knowledge Base | 2 | Documents, Aurex (RAG) |
| 14 | Clients | 1 (lite) | CRM, Portal |
| 15 | Client Portal | 4 | Projects, Finance, Documents, Meetings |
| 16 | Team & HR | 2 | Settings, Calendar |
| 17 | Automation Studio | 3 | events table, n8n |
| 18 | Notifications | 1 | events table |
| 19 | Analytics & Reports | 2 (basic) → 3 (AI) | events table, all modules |
| 20 | Website Monitoring | 2 | Clients, Projects, Notifications |
| 21 | Settings & Permissions | 0–1 | all |

Cross-cutting concerns (search/command palette, notifications engine internals, audit log, file handling) are covered in §22–§25.

---

## 1. Dashboard

**Purpose.** The role-aware home surface of AurexOS: one glance answers "what needs my attention, what changed, what's at risk." It is an aggregator — it owns almost no data of its own, it composes read models produced by other modules and by the events stream.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| DashboardLayout | owner (user or role-default), widget list (type, position, size, config JSON) | belongs to user; role-default layouts belong to workspace |
| Widget (catalog, not per-user data) | type key, required permissions, source module, config schema | referenced by DashboardLayout |
| DigestSnapshot | recipient, period, generated content (structured), delivery status | produced by Aurex proactive jobs |

**Core capabilities.**
- Role-default dashboards per 05_User_Roles.md §4, personalizable by widget add/remove/rearrange; "reset to role default".
- Widgets: my tasks, project health, pipeline, AR aging, calendar peek, unread mentions, approvals queue, automation failures, website uptime, custom report pin (from Analytics).
- Every widget respects the viewer's permissions — a widget whose data source the user cannot see never renders (not even empty).
- Global "Needs attention" strip: approvals, overdue items, failing automations, at-risk projects — ranked.

**AI capabilities.**
- **Aurex Daily Digest** (Phase 3): morning briefing per user — what changed, what's due, what's at risk, suggested top-3 focus. Generated per recipient with their permissions (no leakage via digest).
- Natural-language widget creation: "show me overdue invoices over $2k as a widget" → Aurex configures a report widget (L1 draft autonomy).
- Anomaly callouts on the attention strip (sourced from Analytics anomaly detection).

**Key user flows.** Login → role dashboard → click-through to source module; customize layout; pin a report from Analytics; act on approvals inline (approve AI action, approve expense).

**Integrations with other modules.** Read models from all modules; Notifications feeds the attention strip; Aurex generates digests; Analytics provides pinnable reports.

**Events.** *Consumes:* effectively all (via materialized read models updated from the events stream). *Emits:* `dashboard.layout.updated`, `dashboard.digest.viewed` (feeds digest engagement tuning).

**Phase availability.** Phase 1: static role dashboards (tasks, projects, basic CRM). Phase 2: finance/calendar/meeting widgets. Phase 3: digests, NL widgets, anomaly strip. Phase 5: tenant-customizable role defaults.

**Open questions.** Do role-default layouts lock certain widgets (compliance widgets for Owner)? Should digest cadence be per-user or per-role default?

---

## 2. Aurex AI Assistant

**Purpose.** The conversational and agentic layer over the entire OS — the "AI as operating system" thesis made concrete. Full architecture in 07_AI_Strategy.md; this section covers its product surface and data model as a module.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| Conversation | user, title, context anchors (entity refs the chat is "about"), pinned flag | has many Messages |
| Message | role (user/assistant/tool), content, tool calls, model used, token counts | belongs to Conversation |
| AIRun | trigger (chat/proactive/automation), plan, tool invocations, autonomy level, approval ref, cost, latency, outcome | referenced by audit log |
| AIApproval | run, proposed action (typed), approver, decision, decided_at | human-in-the-loop record |
| MemoryItem | scope (user/workspace), kind (preference/fact/instruction), content, source, expiry | curated long-term memory |

**Core capabilities.**
- Omnipresent: global chat panel (⌘J), inline "Ask Aurex" on every entity (task, deal, invoice, doc), command-palette actions (§22), slash-commands in comments.
- Entity-anchored conversations: opening Aurex from a project pre-loads that project's context.
- Action execution through the typed tool registry with autonomy levels L0–L3 (07_AI_Strategy.md); approval cards render inline in chat and in the Dashboard approvals queue.
- Transparent citations: answers grounded in workspace data cite their sources (linked entities/docs).
- User-visible memory: users can view/edit/delete what Aurex remembers about them.

**AI capabilities.** (It *is* the AI module — per-module capabilities are catalogued in each module below and in 07_AI_Strategy.md §Capability Catalog.)

**Key user flows.** Ask a question grounded in workspace data → cited answer; "create a project for the Meridian rebrand with our standard web-design template" → plan preview → approve → entities created; review and approve/reject a proposed outbound email; inspect an AIRun's full trace.

**Integrations.** Every module registers tools; RAG indexes Documents/KB/meetings/emails (ACL-filtered); Automation Studio can invoke AI steps; Notifications delivers approval requests.

**Events.** *Emits:* `ai.run.started/completed/failed`, `ai.approval.requested/decided`, `ai.action.executed`, `ai.memory.updated`. *Consumes:* the entire event stream as context signals (recency-weighted).

**Phase availability.** Phase 1: UI shell + FAQ-level answers (no tools). Phase 3: full orchestrator, tools, RAG, proactive jobs. Phase 4: optional portal-scoped client Aurex. Phase 5: per-tenant model/budget config.

**Open questions.** Default autonomy ceiling for new workspaces (lean: L2)? Retention period for AIRun traces (cost vs. auditability — lean: 12 months full, summaries thereafter)?

---

## 3. CRM

**Purpose.** The revenue engine: capture leads, manage relationships, run deals through pipelines, and hand won business to delivery without re-keying anything. Replaces HubSpot for an agency's needs.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| Lead | source, status (new/working/qualified/disqualified), score (AI), owner, contact info, enrichment data | converts to Contact+Company+Deal |
| Company | name, domain, size, industry, links | has Contacts, Deals; may link to Client record |
| Contact | name, email(s), phone, role/title, company | belongs to Company; linked to email threads, meetings |
| Pipeline | name, stage list (ordered, with probability %, rot-days threshold) | has Deals |
| Deal | name, value, currency, stage, expected close, owner, probability, loss reason | belongs to Pipeline, Company; links to Proposal, Project (on win) |
| Activity | type (call/email/meeting/note/task), body, occurred_at, related refs | timeline glue across Lead/Contact/Deal |

**Core capabilities.**
- Lead capture: web form endpoint, manual entry, email-in (forward to `leads@` alias), n8n connectors (LinkedIn forms, ads platforms) — all normalize to Lead with `source`.
- Kanban pipeline with drag-to-stage, weighted forecast, rot indicators (deal untouched > threshold).
- 360° record view: every email (via Email Center link), meeting, proposal, invoice, project associated with a company on one timeline.
- Deal → Project conversion wizard on win: pre-fills client, budget, scope from proposal.
- Duplicate detection on domain/email; merge tool with audit trail.

**AI capabilities.**
- **Lead qualification & scoring:** Aurex scores inbound leads (fit + intent) using enrichment data, form answers, email content; drafts a qualification summary and recommended next action (L0/L1).
- **Deal-risk signals:** flags deals likely to stall/slip based on activity cadence, stage age, and email sentiment ("no reply in 9 days, last email had pricing objection").
- **Auto-logging:** meetings and emails are summarized into Activities automatically (L3 read-only enrichment).
- Draft follow-ups and re-engagement sequences (L1; sending is L2 via Email Center).
- Natural-language pipeline queries: "deals over $10k closing this month with no activity this week."

**Key user flows.** Inbound form → lead scored → Sales reviews queue → qualify → convert to deal → proposal sent from Proposals → deal won → conversion wizard → project created, client record activated, kickoff automation fires.

**Integrations.** Email Center (thread linking, send from record), Meetings (auto-log + summaries), Proposals (deal ↔ proposal state sync), Projects (conversion), Clients (company ↔ client record), Finance (deal value → draft invoice schedule), Automation Studio (stage-change triggers).

**Events.** *Emits:* `crm.lead.created/scored/qualified/disqualified`, `crm.deal.created/stage_changed/won/lost`, `crm.contact.created`, `crm.activity.logged`. *Consumes:* `email.message.received` (thread linking), `meetings.meeting.summarized`, `proposals.proposal.accepted` (advance deal), `finance.invoice.paid` (account health).

**Phase availability.** Phase 1: CRM-lite (companies, contacts, single pipeline, manual activities). Phase 2: multi-pipeline, email/meeting linking, conversion wizard. Phase 3: scoring, risk signals, drafting.

**Open questions.** Do we model Lead as a separate entity or as a Deal in a "triage" pipeline? *Current lean: separate Lead entity — cleaner portal/marketing boundaries and scoring semantics.* Enrichment vendor choice (Clearbit-class) — build via n8n first?

---

## 4. Projects

**Purpose.** The delivery backbone: every client engagement (and internal initiative) is a Project with scope, timeline, budget, team, and health. Replaces ClickUp/Asana project layers.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| Project | name, code, client ref, status (draft/active/on-hold/completed/archived), start/target dates, budget (amount or hours), health (green/amber/red, AI-suggested + PM-confirmed), visibility (workspace/private), portal_enabled | belongs to Client; has Tasks, Milestones, Members, Documents; links to Deal, Contract, Invoices |
| Milestone | name, due date, status, client_visible | belongs to Project; groups Tasks |
| ProjectMember | user, project role (lead/member/watcher), allocation % | joins User↔Project |
| ProjectTemplate | structure snapshot (milestones, task tree, default docs, automation bindings) | instantiates Projects |
| StatusUpdate | period, narrative, health, metrics snapshot, audience (internal/client) | belongs to Project |

**Core capabilities.**
- Views: portfolio overview (health heatmap), per-project board/list/timeline (Gantt-lite), workload view across projects.
- Templates: "Website Build", "Brand Sprint", "SEO Retainer" — instantiate full structure in one action.
- Budget tracking: hours or fixed-fee burn vs. logged time and linked expenses (Finance integration).
- Status updates: weekly PM ritual, with distinct internal and client-facing variants.
- Retainers: recurring-cycle projects with period rollover (auto-create next period's task set).

**AI capabilities.**
- **Delay prediction:** Aurex predicts slippage per milestone/project from task velocity, blocked-task age, scope additions, and team availability; explains its reasoning ("3 critical-path tasks blocked 5+ days") (L0).
- Drafts status updates from the week's events — both internal and client-safe versions (L1).
- Scope-creep detection: flags when task volume grows materially beyond the template/proposal baseline.
- Project setup from a brief: paste/attach a brief, Aurex proposes template + task plan customization (L1, apply is L2).
- Health suggestion: proposes green/amber/red with rationale; PM confirms (keeps human accountability for health).

**Key user flows.** Won deal → conversion wizard → template selection → team assignment → kickoff automation (channels/docs/meeting) → weekly status flow → milestone delivery → client approval (Portal) → completion → post-mortem doc generated in KB.

**Integrations.** Tasks (contained), Clients (belongs), Finance (budget vs. invoices/expenses), Documents (project drive), Calendar/Meetings (project events), Portal (shared views), Analytics (delivery metrics), Automation Studio (kickoff/rollover), Website Monitoring (delivered sites).

**Events.** *Emits:* `projects.project.created/status_changed/health_changed/completed/archived`, `projects.milestone.completed/slipped`, `projects.member.added/removed`, `projects.status_update.published`. *Consumes:* `tasks.task.*` (health inputs), `finance.expense.approved` (burn), `crm.deal.won` (creation), `portal.deliverable.approved`.

**Phase availability.** Phase 1: projects, members, milestones, board views, manual health. Phase 2: budgets, templates, status updates, retainers. Phase 3: delay prediction, drafting, scope detection. Phase 4: portal surfaces.

**Open questions.** Time tracking: first-class module vs. task field + report? *Lean: task-level time entries from Phase 2, no standalone module yet.* Should health be fully AI-automated at high maturity, or permanently human-confirmed? *Lean: permanently human-confirmed.*

---

## 5. Tasks

**Purpose.** The atomic unit of work. Fast, keyboard-first task management with dependencies and rich context — the Linear-feel core of daily use.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| Task | title, description (rich text), status (backlog/todo/in-progress/in-review/blocked/done/cancelled), priority, assignee, due date, estimate, labels, task type (maps to specializations), client_visible flag, recurrence rule | belongs to Project (optional for personal tasks) and Milestone; has Subtasks, Comments, Attachments, TimeEntries, Dependencies |
| Subtask | title, done flag, assignee | belongs to Task |
| Dependency | blocking task → blocked task, type (finish-start) | Task↔Task |
| Comment | body (rich text, @mentions), internal-only flag | polymorphic (tasks, docs, deals…) — shared commenting system |
| TimeEntry | user, duration, date, billable flag, note | belongs to Task; rolls up to Project budget |

**Core capabilities.**
- Views: My Work (cross-project), project board/list, saved filters; bulk edit; keyboard-first (Linear-grade shortcuts); statuses configurable per workspace within a canonical state machine (every custom status maps to a canonical category so analytics and AI stay coherent).
- Dependencies with blocked-state propagation and critical-path awareness (feeds delay prediction).
- Recurring tasks (retainer rhythms: "monthly SEO report").
- `client_visible` flag controls the Portal boundary per 05_User_Roles.md §7.

**AI capabilities.**
- NL task creation anywhere: "remind me to send Meridian the sitemap Friday" → task with assignee/date parsed (L2 — created after one-tap confirm; L3 configurable).
- Task breakdown: Aurex decomposes a large task into subtasks with estimates based on similar past tasks (L1).
- Smart assignment suggestions from specialization, workload, and past similar work (L0).
- Stale/blocked triage: weekly sweep proposing closures, re-prioritization, and unblock actions (L1).
- Estimate calibration: compares estimates vs. actuals per person/task-type and adjusts suggestions.

**Key user flows.** Morning: My Work → pick top task → move to in-progress → comment/@mention → log time → in-review → PM review → done (event fires → notifications, project burn update, health recompute).

**Integrations.** Projects (containment, health), Calendar (due dates surface), Meetings (action items → tasks), Aurex (creation/breakdown), Portal (client_visible), Automation Studio (status triggers), Email (convert email → task).

**Events.** *Emits:* `tasks.task.created/assigned/status_changed/completed/blocked/unblocked/overdue` (overdue via scheduled sweep), `tasks.comment.added`, `tasks.time_logged`. *Consumes:* `meetings.action_items.extracted`, `email.message.converted_to_task`, automation-driven mutations.

**Phase availability.** Phase 1: full core (tasks, subtasks, comments, board/list, My Work). Phase 2: dependencies, time entries, recurrence. Phase 3: all AI capabilities.

**Open questions.** Sprint/iteration support for the dev specialization — Phase 3 or never (labels + saved views may suffice)? Story points vs. hour estimates? *Lean: hours only; agencies bill time.*

---

## 6. Calendar

**Purpose.** Unified time layer: personal calendars, project timelines, meetings, deadlines, and leave in one place, two-way synced with Google/Microsoft calendars.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| CalendarAccount | provider (google/microsoft), sync state, user | belongs to User |
| CalendarEvent | title, start/end, all-day, location/URL, attendees (internal + external), visibility, source (native/synced/system-generated), related refs (task/meeting/project) | may link to Meeting; syncs to provider |
| Availability | user, working hours, timezone, booking rules | drives scheduling + booking pages |
| BookingPage | owner (user/team), event type, duration, buffer, form questions, portal-enabled flag | creates CalendarEvents/Meetings |

**Core capabilities.**
- Views: personal, team (availability overlay), project calendar (milestones, deadlines, meetings auto-projected).
- Two-way sync (Google first, Microsoft Phase 2 late) with conflict resolution rules (provider wins on time, AurexOS wins on metadata/links).
- Scheduling assistant: find-a-slot across internal attendees respecting working hours, timezones, and leave (from Team & HR).
- Booking pages (Calendly-class) for sales calls and client check-ins; portal-embedded for clients.

**AI capabilities.**
- NL scheduling: "book 45 min with Sarah and the Meridian client next week, avoid Mondays" → proposed slots → confirm (L2).
- Focus-time protection: suggests blocking deep-work time based on task load and estimates (L1).
- Meeting-load hygiene: flags overload weeks and low-value recurring meetings (declined/short attendance patterns) (L0).

**Key user flows.** Connect Google account → events sync in; PM schedules client review via find-a-slot → Meeting entity auto-created → invites out; client books via portal booking page → CRM activity + meeting created.

**Integrations.** Meetings (every meeting has a calendar event), Tasks (due dates), Projects (milestones), Team & HR (leave blocks availability), CRM (booking → activity), Portal (booking pages).

**Events.** *Emits:* `calendar.event.created/updated/cancelled`, `calendar.booking.created`, `calendar.sync.failed`. *Consumes:* `hr.leave.approved` (availability), `projects.milestone.slipped` (deadline events move), `meetings.meeting.scheduled`.

**Phase availability.** Phase 2: sync, views, scheduling assistant, booking pages. Phase 3: AI scheduling and hygiene. Phase 4: portal booking.

**Open questions.** Build native recurring-event engine or lean entirely on provider recurrence and mirror? *Lean: mirror provider recurrence; native recurrence only for system events.*

---

## 7. Meetings

**Purpose.** Make meetings pay for themselves: agendas, notes, recordings, AI summaries, decisions, and action items that land in the right modules automatically.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| Meeting | title, type (internal/client/sales/standup), calendar event ref, attendees (users + contacts), agenda (structured), status, recording ref, transcript ref | links to Project or Deal; has Notes, Decisions, ActionItems |
| Transcript | source (bot/upload/manual), segments (speaker, ts, text), language | belongs to Meeting; ingested to RAG (ACL-scoped) |
| MeetingSummary | TL;DR, decisions, action items, risks, client-safe variant, model/version | generated per Meeting |
| Decision | statement, decided_by, context ref | belongs to Meeting; surfaced in project/KB search |
| ActionItem | description, proposed assignee/due, status (proposed/accepted→Task ref) | converts to Task on acceptance |

**Core capabilities.**
- Agenda templates per meeting type; collaborative notes during the meeting; decision log as a first-class list (searchable: "what did we decide about X?").
- Recording/transcript ingestion: meeting-bot integration via n8n (Recall.ai-class) or manual upload; transcripts stored in R2, indexed per-tenant.
- Action-item review screen: accept/edit/reject proposed items before they become Tasks (human-in-the-loop by design).

**AI capabilities.**
- **Summarization:** TL;DR, decisions, risks, action items with proposed assignees/dates (L1 — always reviewed for client-facing sends).
- Client-safe summary variant (internal candor stripped) for portal sharing (L1, share is explicit).
- Pre-meeting brief: Aurex assembles context — last meeting's actions, open tasks, recent emails, deal state — 30 minutes before (L3 read-only, delivered as notification).
- Cross-meeting recall: "what has this client said about budget across all calls?"

**Key user flows.** Schedule via Calendar → agenda from template → meet → transcript ingested → summary drafted → PM reviews, accepts action items (→ Tasks), shares client-safe summary to Portal → decisions searchable forever.

**Integrations.** Calendar (events), Tasks (action items), CRM (sales-call logging), Projects (linkage + status update inputs), KB/RAG (decision memory), Portal (shared summaries), Email (send summary).

**Events.** *Emits:* `meetings.meeting.scheduled/started/completed`, `meetings.transcript.ingested`, `meetings.meeting.summarized`, `meetings.action_items.extracted`, `meetings.decision.recorded`. *Consumes:* `calendar.event.created` (meeting-typed), `calendar.booking.created`.

**Phase availability.** Phase 2: meetings, agendas, notes, decisions, manual action items. Phase 3: transcripts, summaries, briefs, extraction. Phase 4: portal sharing.

**Open questions.** Build our own bot vs. vendor via n8n? *Lean: vendor via n8n until volume justifies otherwise.* Default retention for recordings (storage cost + privacy) — 12 months?

---

## 8. Email Center

**Purpose.** Bring client email into the OS: connected mailboxes, shared visibility where appropriate, CRM/project threading, and AI drafting — replacing the Gmail-tab-plus-CRM-logging mess. It is an *email workspace*, not a mail server: Gmail/Microsoft 365 remain the transport.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| MailboxConnection | provider, address, owner, OAuth state, sync cursor, sharing policy | belongs to User (personal) or workspace (shared inbox, e.g. hello@) |
| EmailThread | subject, participants, last activity, links (Contact/Deal/Project/Invoice), status (open/waiting/closed) for shared inboxes | has Messages |
| EmailMessage | from/to/cc, body (sanitized render), attachments (→ Files), direction, provider message id | belongs to Thread |
| EmailDraft | thread ref or new, body, generated_by (user/aurex), approval state | becomes sent Message |
| SequenceEnrollment (Phase 3) | contact, sequence template, step, state | CRM follow-up automation |

**Core capabilities.**
- OAuth mailbox connect (Gmail first); privacy default: **personal mailboxes are private**; per-thread sharing and auto-share rules (e.g., "threads with contacts of Project X visible to its PM") per 05_User_Roles.md §3.2.
- Shared inboxes with assignment, status, and collision detection ("Priya is replying").
- Automatic thread↔entity linking by sender/domain; manual re-linking.
- Convert email → task; attach email to deal/project timeline; send from CRM/Client record.
- Templates and snippets with variables.

**AI capabilities.**
- **Reply drafting:** context-aware drafts using thread history, related project/deal state, and workspace tone-of-voice profile (L1; send is L2 — outbound email always requires human approval per engineering rules until a workspace explicitly raises specific low-risk categories to L3).
- Triage & prioritization: classify (client-urgent / action-needed / FYI / newsletter), summarize long threads, surface "waiting on you" queue (L3 read-only).
- Entity extraction: detects commitments and dates in emails, proposes tasks/calendar holds (L1).
- Sentiment/health signal to CRM (client frustration detection feeding deal/account risk).
- **Prompt-injection defense:** email content is untrusted input to the AI layer — see 07_AI_Strategy.md §Safety; email-derived text never carries tool-invoking authority.

**Key user flows.** Connect mailbox → threads auto-link to CRM/projects → morning triage queue → open thread with Aurex-drafted reply → edit → send → activity logged on deal. Shared inbox: new lead email → auto-create Lead → assign → respond.

**Integrations.** CRM (activities, sequences), Clients/Projects (thread linking), Tasks (conversion), Finance (invoice send/receipt threading), Meetings (summary sending), Files (attachments), Notifications.

**Events.** *Emits:* `email.message.received/sent`, `email.thread.linked`, `email.thread.status_changed`, `email.draft.approved`, `email.message.converted_to_task`. *Consumes:* `finance.invoice.sent` (thread creation), `crm.sequence.step_due`.

**Phase availability.** Phase 2: connections, threading, linking, templates, shared inbox basics. Phase 3: drafting, triage, extraction, sequences.

**Open questions.** Full-body storage vs. metadata + on-demand fetch (storage, privacy, and RAG trade-off)? *Lean: store sanitized bodies for linked threads only; metadata for the rest.* Deliverability ownership for sequences (SPF/DKIM guidance is on the customer's domain).

---

## 9. Finance (Invoices, Expenses, Payments)

**Purpose.** Agency money ops: invoice clients, track expenses, record payments, watch cash — replacing standalone invoicing tools and spreadsheets. Bookkeeping/GL remains in an accounting system (sync via n8n); AurexOS is the operational layer.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| Invoice | number (sequenced per workspace), client, project, line items, currency, tax config, issue/due dates, status (draft/sent/viewed/partial/paid/overdue/void), payment link, pdf ref | belongs to Client; links to Project, Contract; has Payments |
| InvoiceSchedule | source (contract/retainer/milestones), cadence, next issue date, template | generates draft Invoices |
| Expense | vendor, amount, currency, category, date, receipt file, submitted_by, billable flag, project ref, approval state | belongs to Project (optional); approval chain |
| Payment | invoice ref, amount, method (Stripe/bank/manual), received date, fees, external ref | belongs to Invoice |
| TaxRate / Currency config | jurisdiction rates; base + display currencies with rate snapshots | workspace settings |

**Core capabilities.**
- Invoice lifecycle with branded PDF + hosted pay page (Stripe); partial payments; credit notes; automatic overdue state; reminder schedules (Automation Studio templates).
- Retainer/milestone billing via InvoiceSchedule (draft auto-generated → Finance approves → send).
- Expense submission (mobile-friendly receipt capture) → approval chain (manager → Finance above threshold) → project burn.
- AR dashboard: aging buckets, DSO, expected cash-in; export to accounting (Xero/QuickBooks via n8n).
- Immutability rule: sent invoices are never edited — void & reissue only (audit integrity).

**AI capabilities.**
- **Expense auto-categorization:** OCR receipt → vendor/amount/date/category proposed; learns workspace-specific mapping (L1 propose, L2 auto-file below a configurable amount with weekly review digest).
- Invoice drafting from context: "invoice Meridian for May retainer plus the extra landing page" → draft with correct line items from contract + approved scope additions (L1).
- Collections assistant: drafts escalating, relationship-aware reminders using payment history and thread tone (L1 draft; L2 send with approval; never L3).
- Cash-flow forecast: projected cash-in from invoice aging patterns + pipeline-weighted revenue (L0 analytical).
- Anomaly detection: duplicate expenses, unusual vendor amounts, margin outliers per project (L0).

**Key user flows.** Contract signed → schedule created → monthly draft → Finance approves → sent (email thread created) → client pays via portal link (Stripe webhook → Payment recorded → status paid → events fire → CRM account health, project revenue updated). Expense: snap receipt → Aurex categorizes → approval → burn updates.

**Integrations.** Clients/Projects (attribution), Contracts (billing terms → schedules), Proposals (accepted pricing → first invoice), Email (sending/reminders), Portal (view/pay), Stripe (payments), accounting sync (n8n), Analytics (P&L, margins).

**Events.** *Emits:* `finance.invoice.created/sent/viewed/paid/partially_paid/overdue/voided`, `finance.expense.submitted/approved/rejected`, `finance.payment.recorded/failed`. *Consumes:* `contracts.contract.signed` (schedule creation), `portal.invoice.viewed`, Stripe webhooks (via edge function → events).

**Phase availability.** Phase 2: full invoice/expense/payment core, Stripe, AR dashboard. Phase 3: AI categorization, drafting, collections, forecasting. Phase 4: portal payment surfaces polished. Phase 5: multi-entity/tax maturity for SaaS customers.

**Open questions.** Multi-currency depth at Phase 2 (display-only conversion vs. true multi-currency AR)? *Lean: invoice in any currency, report in base with rate snapshots.* Do we ever build GL/double-entry? *Lean: no — integrate.*

---

## 10. Proposals

**Purpose.** Win work faster: assemble branded, interactive proposals from blocks, track engagement, capture acceptance — feeding Contracts and Finance with zero re-keying.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| Proposal | title, deal ref, client/contact, status (draft/internal-review/sent/viewed/accepted/declined/expired), valid-until, version chain, accept method (e-sign/checkbox), public token | belongs to Deal; composed of ProposalSections; links to Contract, Invoice |
| ProposalSection | type (cover/problem/approach/scope/pricing/timeline/team/terms/case-study), content (rich blocks), order | belongs to Proposal |
| PricingTable | line items (description, qty, rate, optional flag), packages (good/better/best), discounts, totals | section payload; selected options flow to Contract/Invoice |
| ProposalView | viewer (token session), timestamps, per-section dwell time | engagement analytics |
| ProposalTemplate | section set + default content per service line | instantiates Proposals |

**Core capabilities.**
- Block-based editor with brand theming; reusable section library (case studies, team bios, standard terms).
- Interactive pricing: client selects optional line items/packages; totals recompute; selection recorded at acceptance.
- Hosted proposal page (tokenized link or portal), view tracking with per-section engagement.
- Internal review/approval step before send (configurable threshold, e.g. discounts >15% require Owner approval).
- Acceptance → snapshot PDF archived (immutable), deal advanced, contract generation offered.

**AI capabilities.**
- **First-draft generation:** from deal context, discovery-call summaries (Meetings), and the KB service catalog, Aurex drafts a full proposal in workspace voice (L1 — flagship AI moment for agencies).
- Case-study selection: recommends the most relevant past work from KB/Projects for this prospect's industry and scope.
- Pricing guidance: suggests pricing from similar won/lost deals and current utilization (L0 advisory — never auto-prices).
- Win/loss insight: engagement patterns + outcomes → "proposals with X section shown before pricing convert better" (Analytics surface).

**Key user flows.** Deal reaches "Proposal" stage → Aurex drafts from template + call summaries → Sales edits → internal approval → send → engagement notifications ("client spent 4 min on pricing") → accepted → contract + deal-won flows trigger.

**Integrations.** CRM (deal state sync), Meetings (discovery context), KB (case studies, service catalog), Contracts (terms handoff), Finance (pricing → invoice schedule), Email (send + follow-ups), Portal (delivery surface), Analytics.

**Events.** *Emits:* `proposals.proposal.sent/viewed/section_viewed/accepted/declined/expired`, `proposals.approval.requested/granted`. *Consumes:* `crm.deal.stage_changed`, `meetings.meeting.summarized` (context refresh on linked deal).

**Phase availability.** Phase 2: editor, templates, hosted pages, tracking, acceptance. Phase 3: AI drafting, case-study selection, pricing guidance.

**Open questions.** E-signature on proposals: legal-grade signature vs. click-to-accept + audit record? *Lean: click-to-accept for proposals, legal-grade e-sign lives in Contracts.* Version comparison UI priority?

---

## 11. Contracts

**Purpose.** The legal spine: MSAs, SOWs, NDAs, retainer agreements, and employment contracts — templated, e-signed, tracked for renewals and obligations.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| Contract | type (MSA/SOW/NDA/retainer/employment/custom), counterparty (client or employee), status (draft/review/sent/signed/active/expiring/expired/terminated), effective/end dates, auto-renew terms, value, signed pdf ref | links to Proposal, Project(s), InvoiceSchedule; employment contracts link to Team & HR profile |
| ContractTemplate | body with merge fields, clause slots, approval rules | instantiates Contracts |
| Clause | category (liability/IP/payment/termination…), text, risk notes, approved-by-counsel flag | clause library composing templates |
| SignatureRequest | signers (ordered), provider ref (e-sign vendor) or native flow, state per signer, evidence bundle (IP, timestamps, hash) | belongs to Contract |
| Obligation | description (e.g., "monthly report by 5th", "90-day termination notice"), due rule, owner, source clause | extracted per Contract; drives reminders |

**Core capabilities.**
- Template + clause-library drafting with merge fields from CRM/Proposal (party names, pricing, scope).
- Review workflow (internal legal-review checklist) → send for signature (vendor integration via n8n first; native later) → signed artifact stored immutably (hash-verified) in R2.
- Renewal radar: expiring-contract queue with lead-time alerts (90/60/30 days).
- Obligation tracker: extracted commitments become scheduled reminders/tasks.
- Employment contracts scoped to HR visibility per 05_User_Roles.md.

**AI capabilities.**
- Drafting from templates + deal context (L1; **legal review is a mandatory human gate — no contract is ever sent without explicit human approval, regardless of workspace autonomy settings**).
- **Clause deviation analysis:** diff a counterparty-edited contract against our standard clauses; flag risk deltas in plain language (L0).
- Obligation extraction from signed contracts (L1 propose → human confirm → reminders created).
- Plain-language summary ("what did we agree to?") on every contract for non-lawyers.
- Renewal recommendation: combines contract end date with account health (CRM) and project performance to suggest renew/renegotiate posture (L0).

**Key user flows.** Proposal accepted → generate SOW from template (merged) → internal review → e-sign flow → signed → obligations extracted → invoice schedule created → project linked. Renewal: 90-day alert → Aurex renewal brief → Sales engages.

**Integrations.** Proposals (handoff), CRM (counterparty, renewal → deal), Finance (schedules, value), Projects (SOW linkage), Team & HR (employment docs), KB (clause library knowledge), Notifications (renewal/obligation alerts).

**Events.** *Emits:* `contracts.contract.sent/signed/activated/expiring/expired/terminated`, `contracts.obligation.due/completed`, `contracts.deviation.flagged`. *Consumes:* `proposals.proposal.accepted`, `crm.deal.won`.

**Phase availability.** Phase 2: templates, drafting, vendor e-sign, storage, renewal alerts. Phase 3: deviation analysis, obligation extraction, summaries.

**Open questions.** Native e-signature (with evidence bundle meeting ESIGN/eIDAS) vs. staying on a vendor long-term? *Lean: vendor through Phase 4; revisit for Phase 5 margin.* Jurisdiction-specific template packs for SaaS customers?

---

## 12. Documents

**Purpose.** The collaborative document layer — briefs, specs, notes, reports — with block-based editing (Notion-feel), living inside projects and spaces rather than a separate silo.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| Document | title, icon, block content (structured JSON), container (project/KB space/personal), share settings, template flag, current version | has Blocks, Versions, Comments; ACL per 05_User_Roles.md §3.2 |
| Block | type (text/heading/list/table/toggle/embed/file/synced-block/ai-block), content, order, children | belongs to Document |
| DocumentVersion | snapshot, author, cause (manual save point/major edit) | belongs to Document |
| ShareLink | audience (user/role/portal/public), permission (view/comment/edit), expiry, token | belongs to Document |

**Core capabilities.**
- Real-time collaborative block editor (Supabase Realtime presence + CRDT-based merge), comments with resolution, @mentions, version history with restore.
- Templates (brief, spec, meeting notes, post-mortem, SOP); synced blocks (single-source content reused across docs).
- Embeds: tasks, project status, pricing tables, files — live entity embeds, not screenshots.
- Every document is RAG-ingestible (respecting ACLs) — documents are the primary knowledge substrate for Aurex.

**AI capabilities.**
- Inline AI blocks: draft/expand/rewrite/summarize/translate in-place with workspace tone (L1 by nature — user accepts each output).
- Doc Q&A: "summarize this 40-page brief"; "what's unresolved in this spec?"
- Auto-drafts from events: post-mortem skeleton on project completion; status-report drafts (delivered as Document drafts, L1).
- Cross-doc consistency: flags contradictions between a spec and its brief (L0, on-demand).

**Key user flows.** Create brief from template inside project → collaborate → share to portal for client comment → approved version snapshotted → referenced by tasks → ingested to RAG → cited in future Aurex answers.

**Integrations.** Projects (containment), KB (promotion of docs into spaces), Portal (sharing), Tasks (embeds, doc-to-task), Meetings (notes are documents), Aurex/RAG, Files (attachments).

**Events.** *Emits:* `documents.document.created/published/shared/version_saved`, `documents.comment.added/resolved`. *Consumes:* `projects.project.completed` (post-mortem draft), `meetings.meeting.completed` (notes doc).

**Phase availability.** Phase 2: editor, templates, versions, comments, sharing. Phase 3: AI blocks, Q&A, auto-drafts. Phase 4: portal commenting polish.

**Open questions.** CRDT library choice (Yjs-class) and offline story — how much offline is worth pre-Phase 5? Public docs (marketing use) — allow `public` share links at all before Phase 5 hardening?

---

## 13. Knowledge Base

**Purpose.** The agency's institutional memory: SOPs, playbooks, service catalog, case studies, onboarding guides — organized in spaces, quality-managed, and the highest-signal RAG source for Aurex.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| Space | name, purpose, ACL (workspace-public/role/member-list/client-facing), icon | contains Pages (Documents specialized as KB pages) |
| KBPage | document ref, verification state (verified/needs-review/stale), verify-by date, owner, tags | belongs to Space; hierarchical tree |
| Glossary entry | term, definition, aliases | powers inline term tooltips + AI grounding |

**Core capabilities.**
- Spaces with distinct ACLs including **client-facing spaces** (the only KB content visible in the Portal).
- Verification workflow: pages carry owners and review-by dates; stale content is flagged and excluded/down-weighted from AI answers until re-verified — this is the quality lever that keeps RAG trustworthy.
- Page tree, cross-links, tags; page analytics (views, search hits, "was this helpful").

**AI capabilities.**
- **Answer-with-citations:** KB is the top-priority RAG corpus; Aurex cites pages and their verification state.
- Gap detection: recurring questions with no good KB answer → suggested new-page briefs to space owners (L1).
- SOP drafting from observed patterns: "you've run 6 website kickoffs; here's a draft kickoff SOP from what actually happened" (L1).
- Auto-linking: suggests glossary links and related pages while editing (L0).
- Staleness prediction: flags pages contradicted by newer decisions/docs (L0).

**Key user flows.** New hire onboarding: HR checklist points to KB onboarding space → questions asked to Aurex answered from verified pages with citations. Quarterly: owners clear their review queues.

**Integrations.** Documents (pages are documents), Aurex/RAG (primary corpus), Portal (client-facing spaces), Team & HR (onboarding), Meetings (decisions promoted to pages), Analytics (content usage).

**Events.** *Emits:* `kb.page.published/verified/flagged_stale`, `kb.gap.detected`. *Consumes:* `ai.question.unanswered` (gap signal), `meetings.decision.recorded`.

**Phase availability.** Phase 2: spaces, pages, verification, glossary. Phase 3: full RAG integration, gap detection, drafting. Phase 4: client-facing spaces in portal.

**Open questions.** Should verification be blocking for client-facing spaces (unverified pages cannot be portal-visible)? *Lean: yes.*

---

## 14. Clients

**Purpose.** The master record for organizations we serve — the bridge between CRM (pre-sale) and delivery/finance (post-sale). One Client record aggregates everything about a relationship.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| Client | name, company ref (CRM), status (prospect/active/paused/churned), tier, account owner, billing profile (address, tax IDs, payment terms, default currency), health score (AI) | has ClientContacts, Projects, Invoices, Contracts, portal ClientAccount |
| ClientContact | contact ref (CRM), portal access flag, portal role (viewer/approver/billing), notification prefs | joins Contact↔Client; is the portal identity anchor |
| ClientAccount (portal) | client ref, branding overrides, enabled portal features | scopes all portal RLS |
| AccountNote | body, visibility (account team/workspace) | relationship intelligence |

**Core capabilities.**
- 360° account view: projects, invoices (with AR status), contracts (with renewal dates), meetings, key contacts, recent email activity, health trend — one screen.
- Lifecycle management: prospect → active (on first won deal, auto) → paused/churned with reasons.
- Billing profile as single source for Finance defaults.
- Portal access management per contact (invite, roles, revoke).

**AI capabilities.**
- **Account health score:** composite of payment behavior, project health, meeting/email sentiment, engagement recency — with explanation, trend, and "what would improve it" (L0).
- Churn-risk alerts with recommended interventions (L0/L1 draft outreach).
- Account brief on demand: "brief me on Meridian before this call" → relationship summary, open items, risks, opportunities (L3 read-only).
- Upsell detection: signals from meetings/emails suggesting new needs → suggested deal creation (L1).

**Key user flows.** Deal won → Client activated from Company record → billing profile completed → portal contacts invited → account owner monitors health → renewal/upsell motions fed back into CRM.

**Integrations.** CRM (company/contact identity), Projects/Finance/Contracts (aggregation), Portal (account scope), Email/Meetings (activity + sentiment), Analytics (account profitability).

**Events.** *Emits:* `clients.client.activated/paused/churned`, `clients.health_changed`, `clients.portal_access.granted/revoked`. *Consumes:* `crm.deal.won`, `finance.invoice.overdue/paid`, `projects.project.health_changed`, `meetings.meeting.summarized`.

**Phase availability.** Phase 1: lite (record, contacts, project linkage). Phase 2: billing profile, 360° view, lifecycle. Phase 3: health scoring, briefs. Phase 4: portal account management.

**Open questions.** Health score transparency to the whole workspace vs. account team only? *Lean: account team + leadership.* Client mergers/rebrands — merge tool priority?

---

## 15. Client Portal

**Purpose.** The client-facing face of AurexOS: a clean, branded, deliberately minimal surface where clients see status, approve work, pay invoices, sign documents, and talk to the team. Portal boundary rules are normative in 05_User_Roles.md §7; this section covers the product.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| PortalShare | entity ref (project/doc/file/report/meeting summary), client account, shared_by, expiry | the explicit visibility record (nothing implicit) |
| ApprovalRequest | deliverable ref, description, due date, state (pending/approved/changes-requested), decision note, decided_by (client contact) | belongs to Project; visible in portal |
| PortalThread / PortalMessage | project-scoped messaging between client contacts and team | mirrored to internal notifications |
| PortalBranding | logo, colors, custom domain (Phase 5) | per ClientAccount / workspace |

**Core capabilities.**
- Home per 05_User_Roles.md §2.8; project pages (status, milestones, client-visible tasks, shared files, updates); approvals with request-changes loop; invoices with Stripe pay; proposals/contracts view-accept-sign; booking pages; client-facing KB; messaging.
- Approval evidence: every approval records who/when/what-version — dispute-proof deliverable acceptance.
- Notifications to clients via email (portal-deep-linked), respecting client notification prefs.

**AI capabilities.**
- Client-safe auto-updates: portal status drafts generated from internal activity, always PM-approved before publishing (L1 hard rule for anything client-visible).
- Optional Portal Aurex (Phase 4/5 decision, see 05_User_Roles.md open questions): answers client questions strictly from portal-visible data with a restricted tool registry — no internal context, ever.
- Smart nudges to the team: "client viewed the proposal 3× but hasn't approved — follow up?"

**Key user flows.** Client invited → magic-link auth (Supabase) → home → reviews milestone deliverable → requests changes with comment → team notified → revised → approved → invoice issued → paid in portal.

**Integrations.** Projects, Finance, Proposals, Contracts, Documents, KB (client spaces), Meetings (booking + shared summaries), Website Monitoring (uptime badge), Notifications.

**Events.** *Emits:* `portal.session.started`, `portal.deliverable.approved/changes_requested`, `portal.invoice.viewed/paid`, `portal.message.sent`, `portal.file.uploaded`. *Consumes:* share/publish events from source modules.

**Phase availability.** Phase 4 (flagship). Minimal invoice-pay + proposal-view pages may ship earlier attached to Finance/Proposals (Phase 2) as standalone tokenized pages, then unify into the portal.

**Open questions.** Custom domains per client account at Phase 4 or 5? Client-side mobile expectations (responsive web only — confirmed, no native app before Phase 5+).

---

## 16. Team & HR

**Purpose.** People operations for a growing agency: profiles, skills, capacity, leave, onboarding/offboarding, reviews — feeding availability into delivery and access control into Settings.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| PersonProfile | user ref, role/title, specialization(s), skills (tagged, leveled), start date, employment type, manager, comp fields (field-level restricted), documents (employment contract refs) | extends workspace membership |
| LeaveRequest | type, dates, status, approver | affects Calendar availability |
| Capacity | weekly hours, allocations (project %), effective dates | feeds workload views + AI assignment |
| ChecklistRun | template (onboarding/offboarding), assignee tasks, progress | orchestrates lifecycle flows |
| ReviewCycle | period, participants, forms, status | performance reviews (lightweight) |

**Core capabilities.**
- Directory + org chart; skills matrix ("who knows Webflow?"); capacity and allocation vs. actual logged time.
- Leave management with approval + calendar/availability integration.
- Onboarding/offboarding checklists that orchestrate other modules (create accounts, grant roles, assign KB reading; offboarding triggers access revocation per 05_User_Roles.md §11).
- Compensation fields visible only to Owner/HR/Finance (field-level rules).

**AI capabilities.**
- Capacity intelligence: overload/under-allocation flags; hiring-need signals from sustained utilization + pipeline (L0).
- Skills-aware staffing suggestions for new projects (L0, feeds Projects/Tasks assignment).
- Onboarding copilot: new-hire Aurex mode that prioritizes KB onboarding content and answers "how do we do X here?"
- Review-cycle assistance: drafts self-review skeletons from a person's actual shipped work (tasks/projects) — never drafts manager judgments (L1, tightly scoped).

**Key user flows.** Hire → HR creates profile + onboarding run → accounts/roles granted → 30-day check-in scheduled. Leave: request → manager approves → calendar blocks → capacity adjusts → delivery views update.

**Integrations.** Settings & Permissions (membership lifecycle), Calendar (leave/availability), Projects/Tasks (capacity, staffing), Contracts (employment docs), KB (onboarding), Finance (comp data shared view).

**Events.** *Emits:* `hr.member.onboarding_started/completed`, `hr.leave.requested/approved`, `hr.capacity.changed`, `hr.offboarding.initiated/completed`. *Consumes:* `settings.member.role_changed`, `tasks.time_logged` (utilization).

**Phase availability.** Phase 2: profiles, directory, leave, checklists, capacity. Phase 3: AI capacity/staffing. Reviews: Phase 3–4 (lightweight).

**Open questions.** How deep into HRIS territory (payroll integration, compliance docs) before "integrate, don't build" kicks in? *Lean: never build payroll; n8n-sync to a payroll provider.*

---

## 17. Automation Studio

**Purpose.** The no-code automation layer over the event-driven core: internal automations run natively on the domain events table; external integrations run through n8n. Replaces Zapier for the agency's own operations.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| Automation | name, status (draft/active/paused), trigger (event type + filter), condition graph, action list, error policy, owner, scope (workspace/project/module) | has Runs; versioned |
| AutomationRun | trigger event ref, per-step results, status, duration, error detail | belongs to Automation; feeds monitoring |
| ActionDefinition (registry) | type key, module owner, input schema, required permission, autonomy classification | actions declare the permission they exercise |
| N8nBinding | automation ref, n8n workflow id, credential ref, direction | external leg |
| RecipeTemplate | packaged automation (trigger+conditions+actions) with setup wizard | gallery; Phase 5 marketplace seed |

**Core capabilities.**
- Visual builder: pick trigger event → add condition branches → add actions (native module actions from the registry, delays, approvals-as-steps, AI steps, n8n handoff).
- **Permission model:** an automation runs with the *creator's* permissions, re-validated on each run; if the creator loses the permission, the automation pauses and notifies (no orphaned-privilege execution). Admin can re-own.
- Run log with replay (idempotency keys on actions), failure alerting, circuit breaker (auto-pause after N consecutive failures), loop protection (event-chain depth limit + same-entity throttle).
- Recipe gallery: "on deal won → create project from template X, kickoff doc, schedule kickoff meeting, notify team."

**AI capabilities.**
- **NL automation building:** "when an invoice is 7 days overdue, draft a polite reminder and ask Finance to approve it" → Aurex composes the automation for review (L1 — automations are never activated without human review).
- AI steps inside automations: classify, summarize, draft, extract — each AI step's output can gate branches; outbound/destructive AI steps inherit the approval rules of 07_AI_Strategy.md regardless of automation ownership.
- Automation suggestions from observed repetition: "you've manually done these 4 steps after every deal-won — automate?" (L0).
- Failure diagnosis in plain language with proposed fixes (L1).

**Key user flows.** Admin builds reminder automation from recipe → test-run against a sampled historical event → activate → monitor runs → tweak conditions. PM builds project-scoped automation ("when a client_visible task completes → draft portal update").

**Integrations.** Consumes the entire events table (it is the primary internal consumer); every module's ActionDefinitions; n8n for external SaaS (Slack, ads platforms, accounting, enrichment); Notifications (failures, approval steps); Aurex (AI steps, NL building).

**Events.** *Emits:* `automation.run.started/completed/failed`, `automation.activated/paused`, `automation.circuit_broken`. *Consumes:* everything (that is its job) — with system-level guard: automations cannot trigger on `automation.*` events beyond depth 3.

**Phase availability.** Phase 3 (flagship). Hardcoded system automations (overdue sweeps, kickoff bundle) exist from Phase 1–2 and are migrated into visible Studio recipes at Phase 3.

**Open questions.** Should project-scoped automation creation be open to Team Members (currently PM+)? Rate limits per workspace for Phase 5 (noisy-tenant protection) — proposal in 09_Scaling_Strategy.md.

---

## 18. Notifications

**Purpose.** One respectful notification system for the whole OS: everything noteworthy flows through a single engine with per-user preferences, batching, and digests — no module ships its own ad-hoc notifications. (Engine internals in §23.)

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| Notification | recipient, type key, source event ref, entity refs, title/body (rendered), read/seen state, channel deliveries | belongs to User |
| NotificationPreference | user, type key or category, channel matrix (in-app/email/push/digest-only/off), quiet hours, digest cadence | per user |
| NotificationPolicy | workspace defaults per role, mandatory types (security, approvals — cannot be muted) | workspace settings |

**Core capabilities.**
- Channels: in-app inbox (realtime), email, browser push, daily/weekly digest folding; Slack channel delivery via n8n during the transition period (until internal Slack is retired).
- Batching and coalescing ("Priya completed 6 tasks in Meridian" not 6 rows); quiet hours; mandatory categories (security alerts, approval requests) that cannot be muted.
- Deep links to the exact entity + comment; mark-as-done actions inline where safe (approve expense from the notification).

**AI capabilities.**
- Priority scoring: learns what each user acts on and orders/folds accordingly (L3 read-only ranking — content is never altered).
- Digest narration: the daily digest is composed by Aurex per recipient (permission-filtered) rather than a raw list.
- Noise reports: "you dismiss 92% of X notifications — mute or fold into digest?" (L1 one-tap).

**Key user flows.** Event fires → engine matches subscription rules → renders per recipient → routes per preference → user acts inline or clicks through; weekly: user tunes preferences from the noise report.

**Integrations.** Every module emits; Dashboard attention strip reads from it; Automation Studio uses it as an action; Portal has its own client-facing subset.

**Events.** *Emits:* `notifications.notification.delivered/read/actioned` (feeds priority learning). *Consumes:* all subscribed event types.

**Phase availability.** Phase 1: in-app + email, core types, preferences. Phase 2: batching, digests, push. Phase 3: AI ranking, narration.

**Open questions.** Mobile push before a proper PWA exists — defer push to Phase 3 alongside PWA work?

---

## 19. Analytics & Reports

**Purpose.** Decision-grade answers about the business: delivery performance, sales funnel, finance health, team utilization, client profitability — computed from the events stream and module data, not hand-built spreadsheets.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| MetricDefinition | key, formula/source description, grain, owner module | versioned semantic layer |
| Report | name, type (canned/custom), query config, visualizations, schedule, audience | pinnable to Dashboard; shareable (perm-checked) |
| ReportSnapshot | report ref, period, rendered data, generated_at | immutable history (what we saw when we decided) |
| AnomalyAlert | metric, expected vs. actual, severity, explanation, state | feeds attention strip |

**Core capabilities.**
- Canned report packs: Delivery (on-time %, cycle time, throughput, blocked age), Sales (funnel conversion, velocity, win rate, pipeline coverage), Finance (revenue, AR aging, margin per project/client, cash runway), People (utilization, capacity vs. plan), Client (health distribution, NPS-ready hooks).
- Custom report builder over the semantic layer (guard-railed — users compose defined metrics, not raw SQL).
- Scheduled delivery (email/notification), report snapshots for auditability, CSV export (permission: `analytics.report.export`).
- Read-model architecture: metrics computed into materialized read models from the events table — analytics never hammers transactional tables.

**AI capabilities.**
- **NL analytics:** "what was our average project margin on website builds this year vs. last?" → answer + chart + the metric lineage used (L0; the flagship "ChatGPT for your agency data" moment).
- **Anomaly detection:** expense spikes, velocity drops, funnel-stage conversion shifts, unusual AR aging — with plain-language explanations (L0).
- Narrated reports: monthly business review draft combining metric movements with causes drawn from events ("margin dipped: two projects overran, see …") (L1).
- Forecasts: revenue (pipeline-weighted + retainers), delivery load, cash (with Finance) — always labeled with confidence and inputs.

**Key user flows.** Owner opens Monthly Business Review draft → drills into a flagged margin anomaly → root-cause links to project overruns → creates follow-up tasks from the report. Sales lead pins funnel report to dashboard.

**Integrations.** Consumes read models fed by all modules' events; Dashboard (widgets/pins), Notifications (schedules, anomalies), Aurex (NL layer), Finance/CRM/Projects (deep links).

**Events.** *Emits:* `analytics.anomaly.detected`, `analytics.report.generated/shared`. *Consumes:* the full event stream (via read-model projections).

**Phase availability.** Phase 2: canned packs + snapshots. Phase 3: NL analytics, anomalies, narration, custom builder. Phase 5: tenant-facing usage analytics.

**Open questions.** Semantic-layer implementation (in-house metric registry vs. lightweight cube library)? When does the events table need a columnar sidecar (DuckDB/ClickHouse-class) — trigger metric defined in 08_Tech_Stack.md capacity notes.

---

## 20. Website Monitoring

**Purpose.** Post-delivery value and retainer glue: monitor the websites we build and manage — uptime, SSL, domain expiry, performance, and basic SEO health — turning incidents into tasks and client trust into renewals.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| MonitoredSite | url, client ref, project ref, check config (uptime interval, regions), SSL/domain expiry tracking, performance budget, portal_visible flag | belongs to Client/Project; has Checks, Incidents |
| CheckResult | site, type (uptime/ssl/domain/performance/seo-snapshot), status, metrics, checked_at | time-series (aggressively rolled up) |
| Incident | site, type, started/resolved, severity, acknowledgement, linked task ref, client-notified flag | belongs to MonitoredSite |
| SEOSnapshot | site, core vitals, indexation basics, broken links count, captured_at | periodic (weekly) |

**Core capabilities.**
- Uptime checks (external probe via edge/worker + n8n scheduled jobs), SSL and domain expiry alerts (30/14/7 days), Core Web Vitals snapshots, broken-link sweeps.
- Incident lifecycle: detect → alert (Notifications; severity-based escalation) → acknowledge → auto-create task for the responsible team → resolve → optional client notice (portal badge/update).
- Status overview per client (portfolio grid) and portal-visible uptime badge for their properties.

**AI capabilities.**
- Incident triage: probable cause classification from response codes/patterns (DNS vs. origin vs. cert) and suggested first actions (L0/L1 task draft).
- Monthly site-health report per client, narrated and client-safe, feeding retainer reporting (L1 → PM approves → portal/email).
- Renewal signal: degrading unmanaged site + no active retainer → upsell suggestion into CRM (L1).

**Key user flows.** Project completed (website) → site auto-suggested for monitoring → configured → incident at 02:00 → severity rules page the on-call channel → acknowledged → task created → resolved → included in monthly health report.

**Integrations.** Clients/Projects (ownership), Tasks (incident tasks), Notifications (alerts/escalation), Portal (badges, reports), CRM (upsell signals), n8n (probes, Lighthouse-class checks).

**Events.** *Emits:* `monitoring.incident.detected/acknowledged/resolved`, `monitoring.ssl.expiring`, `monitoring.domain.expiring`, `monitoring.performance.degraded`. *Consumes:* `projects.project.completed` (onboarding suggestion).

**Phase availability.** Phase 2: uptime/SSL/domain + incidents. Phase 3: performance/SEO snapshots, AI triage, narrated reports. Phase 4: portal surfaces.

**Open questions.** Probe infrastructure: own workers vs. vendor API via n8n? *Lean: vendor via n8n first (speed), own probes if unit cost bites at SaaS scale.*

---

## 21. Settings & Permissions

**Purpose.** The control plane: workspace configuration, membership and roles, security policy, AI governance, billing (Phase 5), and feature flags — the administrative root of everything.

**Key entities.**

| Entity | Key fields | Relationships |
|---|---|---|
| Workspace | name, slug, branding, locale/timezone/currency defaults, plan (Phase 5) | root tenant entity |
| WorkspaceMember | user, role, specializations, status (invited/active/deactivated), joined_at | per 05_User_Roles.md |
| PermissionSet / PermissionOverride | per 05_User_Roles.md §3 | |
| AIGovernancePolicy | autonomy ceiling, per-action-category levels, token budget, model tier prefs, data-handling flags | consumed by AI gateway (07_AI_Strategy.md) |
| FeatureFlag | key, scope (global/workspace/role/user), state, rollout % | evaluated everywhere |
| Integration | provider, credentials ref (vault), scopes, health, connected_by | n8n bindings, OAuth apps |
| ApiToken (Phase 5) | name, scopes, hashed secret, expiry, last_used | public API access |

**Core capabilities.**
- Member lifecycle (invite/role/deactivate) with the audit and claims-refresh behavior of 05_User_Roles.md §11; access-review checklist generation (quarterly).
- Security policy: MFA enforcement, session length, impersonation policy, IP notes (full detail in 05_User_Roles.md).
- AI governance panel: autonomy ceiling, per-category approvals, budget, data flags — the Owner-facing surface of 07_AI_Strategy.md.
- Integrations manager with credential vaulting and health checks; feature-flag admin (internal until Phase 5).
- Workspace data lifecycle: export (full JSON/CSV), soft-delete retention windows, hard-delete approval flow (Owner + cooling period).

**AI capabilities.** Deliberately minimal — the control plane stays human. Aurex may *explain* settings ("what does autonomy L2 mean?") and *summarize* access reviews ("3 dormant members, 2 expiring guest grants"), but never mutates settings, roles, or policies at any autonomy level. Settings mutations are permanently human-only.

**Key user flows.** Owner onboards workspace → invites team with roles → configures AI governance → connects Google Workspace + Stripe → quarterly access review from generated checklist.

**Integrations.** Everything reads from it; Team & HR drives membership lifecycle events into it; Supabase Auth underneath.

**Events.** *Emits:* `settings.member.*`, `settings.role_changed`, `settings.policy_changed`, `settings.integration.connected/failed`, `settings.flag_changed` — all mirrored into the audit log. *Consumes:* `hr.offboarding.initiated` (revocation flow).

**Phase availability.** Phase 0–1: workspace, members, roles, flags (internal). Phase 2: integrations manager. Phase 3: AI governance panel. Phase 5: billing, API tokens, tenant self-serve.

**Open questions.** Multi-workspace users' default-workspace UX; environment-level vs. workspace-level feature flag precedence rules (proposal: environment wins).

---

# Cross-Cutting Concerns

## 22. Global Search & Command Palette

**Purpose.** ⌘K is the OS's front door: find anything, do anything, ask anything — search, actions, and Aurex in one surface.

**Design.**
- **Three intents, one input:** (1) *Find* — entity search across all modules (tasks, docs, deals, invoices, people, KB…) with type filters; (2) *Do* — action registry ("create task", "new invoice", "go to Meridian project") drawing from the same typed action definitions as Automation Studio and Aurex tools; (3) *Ask* — free-text falls through to Aurex with current-screen context.
- **Index:** Postgres FTS (tsvector) per entity type from Phase 1; hybrid with pgvector semantic search from Phase 3 (shared infrastructure with RAG, same ACL post-filtering). Index updates are event-driven (search indexer is an events consumer).
- **Permissions:** results filtered by effective permissions before ranking; a user never sees even the *existence* of an entity they cannot view (no "1 result hidden"). Portal users get a separate, portal-scoped search.
- **Ranking:** recency + interaction affinity (entities you touch rank higher) + type priors per role (Sales sees deals first).
- **Phases:** 1: entity search + navigation actions. 2: full action registry, filters. 3: semantic/hybrid + Ask-Aurex fallthrough.

## 23. Notifications Engine (Internals)

The delivery machinery behind §18:

- **Pipeline:** event → subscription matcher (type + entity watchers + @mentions + policy) → recipient resolution → permission check (recipient must be able to view the source entity — notifications never leak titles of invisible entities) → template render (i18n-ready) → preference router → channel adapters (in-app via Realtime, email via provider, push, digest queue) → delivery record.
- **Coalescing:** a folding window (default 10 min) merges same-actor/same-entity-group notifications; digests fold everything below a priority threshold.
- **Reliability:** at-least-once with idempotent delivery records; channel adapter failures retry with backoff; email provider webhooks (bounce/complaint) update deliverability state.
- **Watchers model:** every major entity supports watch/unwatch; assignment/mention auto-watches; module events fan out to watchers by default.

## 24. Audit Log

- **Model:** append-only `audit_log` distinct from the domain `events` table. Events power features; audit powers accountability. Audit rows: actor (user/system/Aurex-via-user), action, entity ref, before/after digest (for sensitive fields, hashes not values), IP/session ref, `via_ai` + `ai_run_id`, timestamp. Insert-only enforced at the Postgres privilege level (no UPDATE/DELETE granted to any app role).
- **What is always audited:** everything in 05_User_Roles.md §10, plus: all deletes (soft and hard), all sends (invoice/proposal/contract/email), all portal shares, all exports, all settings/policy changes, all AI actions L2+.
- **Access:** Owner full; Admin view; Finance/HR scoped slices (05_User_Roles.md matrix). Audit reads are themselves audited.
- **Retention:** 7 years finance/contract events, 2 years default, never below floor; Phase 5 adds per-tenant export and (jurisdiction-dependent) WORM archival to R2.

## 25. File Handling

- **Storage:** Cloudflare R2, path-namespaced per workspace (`{workspace_id}/{module}/{entity}/…`); metadata rows in Postgres under RLS (a file's visibility = its metadata row's visibility). Direct-to-R2 uploads via presigned URLs from an edge function that enforces permission, size, and MIME policy first.
- **Access:** short-lived signed download URLs only — no public buckets, ever; portal file access flows through the same signing path with PortalShare checks.
- **Pipeline (event-driven):** upload → `files.file.uploaded` → async workers: antivirus scan (quarantine on hit), thumbnail/preview generation, text extraction (PDF/docx/images-OCR) → extraction feeds the RAG ingestion queue (ACL-tagged, per 07_AI_Strategy.md).
- **Versioning & lifecycle:** files attached to versioned entities (documents, contracts) keep version chains; soft-deleted files follow workspace retention then hard-purge with audit record. Contract PDFs and invoice PDFs are immutable (content-hash verified).
- **Limits:** per-file and per-workspace quota (plan-based at Phase 5); image optimization for portal-served assets.

---

## Appendix A — Event Catalog Governance

- Every event type is declared in a versioned registry (name, payload schema, emitting module, PII classification). CI validates emitted payloads against the registry.
- Payload changes are additive; breaking changes require a new version suffix (`crm.deal.stage_changed.v2`) and a deprecation window.
- Consumers (automations, notifications, analytics projections, AI context, webhooks at Phase 5) must tolerate unknown fields.
- The events table is the integration spine for Phase 5 public webhooks — designing payloads as if external customers will read them, from day one.
