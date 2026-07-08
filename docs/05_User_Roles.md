# 05 — User Roles & RBAC Specification

| | |
|---|---|
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Founding CTO, AurexDesigns |
| **Related** | 08_Tech_Stack.md, 06_Module_Breakdown.md, 07_AI_Strategy.md, 08_Tech_Stack.md, 06_Module_Breakdown.md, 10_Roadmap.md, 05_User_Roles.md |

---

## 1. Purpose & Principles

This document is the canonical specification for identity, roles, and access control in AurexOS. Every route guard, every RLS policy, every UI visibility rule, and every AI tool invocation traces back to this document. If code and this document disagree, one of them is wrong and must be reconciled — silently diverging is not an option.

### 1.1 Design Principles

1. **Deny by default.** No permission exists until explicitly granted. New modules ship with all roles at `None` until the permission matrix is updated here first.
2. **Defense in depth — three layers, always.** (a) Postgres Row-Level Security scoped by workspace and role claims, (b) application-layer RBAC guards on every route and server action, (c) UI-level hiding. UI hiding is a courtesy, never a control. RLS is the last line and must be sufficient on its own.
3. **Workspace is the tenancy boundary.** Every permission is evaluated *within* a workspace. A user's identity is global (one Supabase auth user); their role, permissions, and data visibility are per-workspace memberships. Cross-workspace access does not exist except through explicit, separate memberships.
4. **Roles are coarse; overrides are surgical.** Roles cover 95% of cases. Granular overrides handle the rest without role explosion.
5. **AI never escalates.** Aurex acts strictly within the invoking user's effective permissions (see §8). There is no "AI service role" visible to end users.
6. **Everything sensitive is audited.** Role changes, permission overrides, impersonation, and client-portal boundary crossings are append-only audit events (see §9).

---

## 2. Role Catalog

Ten built-in roles. Roles are ordered by descending privilege; higher roles are **not** strict supersets in every module (e.g., Finance sees payroll data that Admin may not by default — see matrix notes).

### 2.1 Owner

- **Who:** Founder(s) of the workspace. Exactly one primary Owner; co-owners allowed. At AurexDesigns internally, the founding team.
- **Responsibilities:** Workspace lifecycle (create, rename, delete), billing (Phase 5), role assignment for Admins, security policy (AI autonomy levels, data retention, impersonation policy), irreversible actions (workspace deletion, hard-delete approvals).
- **Powers unique to Owner:** transfer ownership, delete workspace, manage billing, set workspace-wide AI autonomy ceiling (see 07_AI_Strategy.md §Autonomy), approve permanent deletion of soft-deleted records, configure impersonation policy.
- **On login sees:** Executive Dashboard — company-wide P&L snapshot, pipeline value, project health heatmap, team utilization, overdue invoices, Aurex daily digest, pending approvals queue (AI actions, deletions, contract signatures).

### 2.2 Admin

- **Who:** Operations leads, senior managers trusted with configuration.
- **Responsibilities:** User invitations and role assignment (below Admin), workspace settings, Automation Studio administration, integrations, notification policies, template management.
- **Cannot:** delete the workspace, manage billing, assign/remove Owner or Admin roles, override the workspace AI autonomy ceiling, approve hard deletes.
- **On login sees:** Operations Dashboard — same as Owner minus billing/financial P&L detail (finance figures shown at summary level unless also granted Finance permissions), plus admin task queues (pending invites, automation failures, integration health).

### 2.3 Project Manager (PM)

- **Who:** Delivery leads owning client engagements end to end.
- **Responsibilities:** Project setup, task assignment, timelines, client communication, meeting management, status reporting, resource requests. PMs are the primary human interface between clients and the delivery team.
- **Scope note:** PMs get Full access **on projects they manage** and View on other projects by default (configurable per workspace).
- **On login sees:** Delivery Dashboard — their projects' health, tasks due this week across their projects, blocked tasks, upcoming meetings, unread client messages, Aurex delay-risk predictions for their projects.

### 2.4 Team Member (+ Specializations)

- **Who:** Individual contributors. Specializations are **labels on top of the Team Member role**, not separate permission roles: **Developer, Designer, SEO Specialist, Content Writer, Marketing**.
- **Why specializations are not roles:** they drive *defaults and context* — dashboard widgets, task-type routing, Aurex tool context, Automation Studio assignment rules, capacity planning — but carry identical base permissions. This prevents a 5× multiplication of the permission matrix. If a specialization ever needs distinct permissions, it graduates to a custom role (§10).
- **Responsibilities:** Execute assigned tasks, log time, update task status, contribute to documents and knowledge base.
- **Scope note:** Team Members see only projects they are members of, plus workspace-public knowledge base and documents.
- **On login sees:** My Work Dashboard — assigned tasks by due date, today's calendar, mentions & notifications, personal Aurex briefing ("what changed since you were last here"), specialization-specific widget (e.g., Developer: linked repo/PR activity via integrations; SEO Specialist: monitored-site ranking alerts from Website Monitoring).

### 2.5 Sales

- **Who:** Business development, account executives.
- **Responsibilities:** CRM ownership — leads, contacts, deals, pipelines; proposals; discovery meetings; converting won deals into projects (handoff to PM).
- **Scope note:** Full on CRM and Proposals; View on Projects (to answer client questions and scope renewals); no access to Finance beyond invoice *status* on their own accounts (needed to chase renewals responsibly).
- **On login sees:** Pipeline Dashboard — deals by stage, deals needing action, Aurex lead-scoring queue, proposal statuses (viewed/accepted), this week's sales meetings, follow-ups due.

### 2.6 Finance

- **Who:** Bookkeeper, finance manager, or fractional CFO.
- **Responsibilities:** Invoices, expenses, payments, financial reporting, contract financial terms, payroll data in Team & HR (compensation fields only, via field-level permission — see §4.4).
- **Scope note:** Full on Finance module; View on Contracts and CRM deal values; **no default access** to project task detail, documents, or email — finance staff do not need delivery content.
- **On login sees:** Finance Dashboard — cash position, AR aging, overdue invoices with Aurex-drafted reminder queue, expense approvals pending, MRR/retainer summary, month-close checklist.

### 2.7 HR

- **Who:** People operations.
- **Responsibilities:** Team & HR module — profiles, leave, onboarding/offboarding checklists, performance review cycles, org chart. Initiates offboarding, which triggers the access-revocation automation.
- **Scope note:** Full on Team & HR (including compensation fields shared with Finance); View on Calendar (leave planning); no default access to CRM, Finance (beyond payroll), Projects.
- **On login sees:** People Dashboard — leave requests pending, upcoming anniversaries/reviews, onboarding tasks in flight, headcount and utilization summary.

### 2.8 Client (Portal-Only)

- **Who:** External client stakeholders. **Never** sees the internal app shell — clients live exclusively in the Client Portal, a separate route tree with its own layout, navigation, and hard permission boundary (see §7).
- **Responsibilities (as portal capabilities):** view their projects' status, approve deliverables, comment on shared items, view/pay invoices, sign proposals and contracts, book meetings, upload files, message the project team.
- **On login sees:** Client Portal Home — their projects with high-level status and next milestones, items awaiting their approval, open invoices, shared files, message threads, meeting scheduler.

### 2.9 Guest

- **Who:** External collaborators (freelancers, partner agencies, auditors) needing narrow access.
- **Responsibilities:** Whatever they are explicitly granted — Guest has **zero implicit access**. Every Guest grant is a resource-level allowlist entry (specific projects, documents, or KB spaces) with View or Edit, plus an expiry date (default 30 days, max 180, renewable).
- **On login sees:** A minimal dashboard listing exactly the resources shared with them and nothing else. No people directory, no search beyond granted resources, no workspace metadata.

### 2.10 Aurex (System Principal — not user-assignable)

Aurex is registered as a **system principal** for attribution: every AI-performed mutation is recorded as `actor: user X via aurex`. Aurex holds no permissions of its own — see §8. Background/scheduled AI jobs run under a designated service context with an explicit, Owner-configured permission profile, never under Owner-equivalent access.

---

## 3. Permission Model Design

### 3.1 Layered Resolution: Role → Permission Set → Overrides

```
Effective permission =
    base role permission set        (workspace-level, from matrix in §6)
  ± workspace role customization    (Owner/Admin may tune a role's set per workspace)
  ± user-level module overrides     (grant or revoke module actions for one user)
  ± resource-level grants/denies    (specific project, document, KB space, deal)
  where explicit DENY always wins over any grant at the same or lower layer.
```

- **Permission sets** are named bundles of atomic permissions. Each built-in role maps to one versioned permission set (`role:pm@v3`). Sets are data, not code — stored in `permission_sets`, cached, and invalidated on change.
- **Atomic permissions** follow `module.resource.action` naming: `projects.project.create`, `finance.invoice.send`, `crm.deal.change_stage`, `hr.compensation.view`. Actions are the canonical verb list: `view`, `create`, `edit`, `delete` (soft), `manage` (settings/membership of the resource), plus module-specific verbs (`send`, `approve`, `sign`, `export`, `impersonate`).
- **Overrides** are stored as explicit `(principal, permission, effect: allow|deny, scope, expires_at, granted_by, reason)` rows. Every override requires a `reason` string — it appears in the audit log and in the permissions review UI.

### 3.2 Resource-Level Permissions

Some resources carry their own ACLs layered on module permissions:

| Resource | Access model |
|---|---|
| Project | Membership list (PM/lead, members, watchers). Non-members with module `view` see title/status only if project is "workspace-visible"; private projects are invisible to non-members. |
| Document | Inherits container (project/KB space) by default; per-document share overrides (user, role, client-portal, public-link with expiry). |
| Knowledge Base space | Space-level ACL: workspace-public, role-restricted, or member-list. |
| CRM record | Workspace-visible to Sales/Admin/Owner by default; optional "private deal" flag restricting to deal team. |
| Email thread | Visible to connected-mailbox owner + explicitly shared users + PMs of the linked project (configurable). Email is the most privacy-sensitive module; default is narrow. |

### 3.3 Workspace Scoping & Enforcement

- Every tenant table carries `workspace_id`; RLS policies require `workspace_id = current_workspace()` derived from the session JWT claims (Supabase Auth custom claims refreshed on membership change).
- Role and permission-set digests are embedded in JWT claims for fast checks; **claims are a cache, the database is truth** — sensitive actions re-verify against `workspace_members` and `permission_overrides` server-side.
- Server actions and API routes declare their required permission via a typed guard (`requirePermission("finance.invoice.send")`). A route without a declared guard fails CI (lint rule). This is the "RBAC on every route" engineering rule made mechanical.

### 3.4 Field-Level Permissions

A small, fixed set of field-level rules (not a general engine, to keep RLS tractable):

- `hr.compensation.*` — salary/comp fields visible only to Owner, HR, Finance.
- `finance.invoice.margin` — cost/margin breakdown hidden from Sales and Team Members.
- `crm.deal.value` — deal values hidden from Team Member by default (configurable).

Implemented via column-omitting views + application DTO shaping, with the sensitive columns additionally protected by security-definer accessor functions.

---

## 4. What Each Role Sees on Login (Summary Table)

| Role | Landing surface | Primary widgets |
|---|---|---|
| Owner | Executive Dashboard | P&L, pipeline, project health, approvals queue, Aurex digest |
| Admin | Operations Dashboard | Ops health, invites, automations, integration status |
| Project Manager | Delivery Dashboard | My projects, blocked tasks, client messages, delay predictions |
| Team Member | My Work Dashboard | Assigned tasks, today's calendar, mentions, Aurex briefing |
| Sales | Pipeline Dashboard | Deals by stage, lead scores, proposal status, follow-ups |
| Finance | Finance Dashboard | Cash, AR aging, reminder queue, expense approvals |
| HR | People Dashboard | Leave requests, reviews, onboarding, headcount |
| Client | Client Portal Home | Project status, approvals, invoices, files, messages |
| Guest | Minimal shared-items list | Granted resources only |

---

## 5. Permission Semantics

Matrix values in §6:

- **Full** — all actions including create, edit, delete (soft), manage/configure, module-specific verbs.
- **Edit** — create and edit records; no delete, no module configuration, no dangerous verbs (send invoice, sign contract) unless the verb column says otherwise.
- **View** — read-only, subject to resource-level ACLs and field-level rules.
- **None** — module is invisible: not in navigation, not in search results, not in Aurex answers.
- **Scoped(x)** — the value applies only within the noted scope (own projects, own records, portal subset).

---

## 6. Permission Matrix (Modules × Roles)

| Module | Owner | Admin | PM | Team Member | Sales | Finance | HR | Client | Guest |
|---|---|---|---|---|---|---|---|---|---|
| Dashboard | Full | Full | Full (own view) | Full (own view) | Full (own view) | Full (own view) | Full (own view) | Portal home only | Minimal |
| Aurex AI Assistant | Full | Full | Full | Full | Full | Full | Full | Portal-scoped (opt-in) | None |
| CRM | Full | Full | View | None | Full | View (deal values) | None | None | None |
| Projects | Full | Full | Full (managed) / View (others) | Edit Scoped(member projects) | View | None | None | View Scoped(portal) | View/Edit Scoped(granted) |
| Tasks | Full | Full | Full (managed projects) | Edit Scoped(assigned/member) | View (linked to deals) | None | None | View Scoped(shared tasks) | Edit Scoped(granted) |
| Calendar | Full | Full | Edit | Edit (own + project) | Edit (own) | View | View | Booking page only | None |
| Meetings | Full | Full | Full (own/project) | Edit (own) | Edit (own) | View | View | Scoped(their meetings + shared summaries) | None |
| Email Center | Full | Full | Edit Scoped(own mailbox + shared threads) | Edit Scoped(own mailbox) | Edit Scoped(own mailbox) | Edit Scoped(own mailbox) | Edit Scoped(own mailbox) | None (clients email normally) | None |
| Finance — Invoices | Full | View | View Scoped(own projects) | None | View Scoped(status, own accounts) | Full | None | View/Pay Scoped(their invoices) | None |
| Finance — Expenses | Full | View | Edit Scoped(own projects' expenses) | Create (submit own) | Create (submit own) | Full | Create (submit own) | None | None |
| Finance — Payments | Full | View | None | None | None | Full | None | View Scoped(their payments) | None |
| Proposals | Full | Full | Edit Scoped(own projects) | None | Full | View | None | View/Accept Scoped(sent to them) | None |
| Contracts | Full | Full | View Scoped(own projects) | None | Edit (draft from templates) | View (financial terms) | View (employment contracts: Full) | View/Sign Scoped(theirs) | None |
| Documents | Full | Full | Full Scoped(own projects) | Edit Scoped(member projects) | Edit Scoped(CRM-linked) | View Scoped(finance docs) | View Scoped(HR docs: Full) | View Scoped(shared) | View/Edit Scoped(granted) |
| Knowledge Base | Full | Full | Edit | Edit | Edit | View | Edit (HR space: Full) | View Scoped(client-facing KB only) | View Scoped(granted spaces) |
| Clients (records) | Full | Full | Edit Scoped(own clients) | View Scoped(project clients, contact info only) | Full | View (billing info) | None | n/a | None |
| Client Portal (config) | Full | Full | Edit Scoped(own projects' portals) | None | None | None | None | (is the user) | None |
| Team & HR | Full | Edit (no compensation) | View (directory, availability) | View (directory) | View (directory) | View + compensation | Full | None | None |
| Automation Studio | Full | Full | Edit Scoped(own projects' automations) | View (automations affecting them) | Edit Scoped(CRM automations) | Edit Scoped(finance automations) | Edit Scoped(HR automations) | None | None |
| Notifications (own prefs) | Full | Full | Full | Full | Full | Full | Full | Full (portal prefs) | Full (minimal) |
| Analytics & Reports | Full | Full | View Scoped(own projects + team) | View Scoped(own metrics) | View Scoped(sales analytics) | View Scoped(finance analytics) | View Scoped(people analytics) | View Scoped(their project reports) | None |
| Website Monitoring | Full | Full | View Scoped(own projects' sites) | View Scoped(assigned sites) | View | None | None | View Scoped(their sites, uptime summary) | None |
| Settings & Permissions | Full | Edit (no billing, no role≥Admin, no AI ceiling) | None | None | None | None | None | None | None |
| Audit Log | Full | View | None | None | None | View Scoped(finance events) | View Scoped(HR events) | None | None |

**Matrix governance:** this table is the source of truth. Changes require a PR touching this file plus the seeded `permission_sets` migration, reviewed by the CTO. The matrix is exported as a typed constant consumed by both the seed migration and the permission-guard test suite, so drift fails CI.

---

## 7. Client Portal Boundary

The Client Portal is a **hard boundary**, not a filtered view. Separate route tree (`/portal`), separate navigation, separate session context flag, and RLS policies that whitelist rather than blacklist.

### 7.1 Clients CAN see

- Projects explicitly shared to their client account: name, description, status, milestones, progress %, and **only tasks flagged `client_visible`** (title, status, due date — never assignee workload, internal comments, or time logs).
- Deliverables shared for review, with approve/request-changes flow.
- Their invoices, payment history, and payment links.
- Proposals and contracts sent to them (view, comment, accept/sign).
- Files and documents explicitly shared to the portal.
- Client-facing Knowledge Base spaces (e.g., "How we work", handover docs).
- Message threads with the project team (portal messaging, mirrored to team notifications).
- Meeting booking pages and their own meeting history; meeting summaries only when explicitly shared.
- High-level Website Monitoring status for their own properties (uptime badge, incident notices) when enabled.

### 7.2 Clients can NEVER see

- Internal comments, internal task fields, assignees' names/workload (assignee display in portal is "AurexDesigns team" unless the workspace opts into names), time tracking, estimates vs. actuals.
- Costs, margins, expenses, other clients' anything.
- CRM data — including their own lead record, deal notes, and lead score.
- Team & HR, Automation Studio, Analytics beyond their own project report, Email Center, internal Knowledge Base, audit logs, settings.
- Other clients' existence: portal queries are scoped by `client_account_id`; no cross-client enumeration is possible even with a tampered request, because RLS whitelists by client account.
- Aurex internal context: if portal Aurex is enabled (Phase 4, workspace opt-in), it answers only from portal-visible data with a separate, restricted tool registry (see 07_AI_Strategy.md).

### 7.3 Portal enforcement rules

- Every portal-visible entity carries an explicit share record (`portal_shares`): nothing is portal-visible by inheritance alone except tasks flagged `client_visible` within a shared project.
- Sharing to the portal is an audited action, performable by PM (own projects), Admin, Owner.
- Aurex refuses to summarize or answer across the boundary in either direction *for portal users*; for internal users it may reference portal activity ("client approved X").

---

## 8. AI Permission Inheritance

Full architecture in 07_AI_Strategy.md; the binding rules live here:

1. **Invoker's permissions, never more.** Every Aurex tool call executes with the invoking user's effective permission context. Tool inputs/outputs pass through the same guards and RLS as human requests — the AI layer holds no bypass credentials, and tool handlers run with the user's row-level context, not a service role.
2. **No aggregation leakage.** Aurex must not answer a question whose answer requires data the user cannot view (e.g., a Team Member asking "what's our profit margin this month" gets a permission-aware refusal, not a summary "hint").
3. **RAG respects ACLs at query time.** Vector search results are post-filtered by the invoker's document ACLs before entering context (see 07_AI_Strategy.md §RAG). Embedding a document never widens its audience.
4. **Autonomy is capped twice.** Effective AI autonomy = min(workspace ceiling set by Owner, per-action level, user's own permission to perform that action manually). A user who cannot send invoices cannot instruct Aurex to send one at any autonomy level.
5. **Attribution.** AI-performed mutations are logged as `actor_user_id + via_ai: true + ai_run_id`, linking to the full AI audit trail (prompt, tools called, model, approval record).
6. **Scheduled/proactive AI** (digests, delay predictions) runs under a per-workspace service context whose permission profile is explicitly configured and defaults to read-only over workspace-visible data. Proactive outputs are delivered *per recipient* filtered to that recipient's permissions (two users get different digests).

---

## 9. Impersonation & Support Access

### 9.1 Internal impersonation ("View as")

- **Who:** Owner and Admin may "View as" any lower role or specific user **in read-only mode** — for debugging permissions and previewing the Client Portal.
- Read-only is enforced server-side: impersonated sessions carry an `impersonation` claim; all mutating guards reject it. No writes as another user. Ever.
- Impersonation sessions are time-boxed (30 min), visually banner-flagged, and every impersonated page view is audited (`impersonator_id`, `target_id`, resources viewed).
- Email Center is **excluded** from impersonation — private mailboxes are never viewable via "View as".

### 9.2 Vendor/support access (Phase 5, commercial SaaS)

- AurexDesigns support staff have **zero standing access** to customer workspaces.
- Access requires: (a) customer Owner/Admin grants a support session (scoped: modules, duration ≤ 72h, read-only by default), (b) support engineer identity verified, (c) session fully audited and visible to the customer in their audit log, (d) auto-expiry and one-click revocation.
- Break-glass access (legal/incident) requires two-person authorization inside AurexDesigns, is logged to an immutable store, and triggers customer notification per policy in 05_User_Roles.md.

---

## 10. Audit Requirements

All events land in the append-only `audit_log` (see 06_Module_Breakdown.md §Audit Log). Mandatory RBAC-related events:

| Event | Payload highlights |
|---|---|
| `member.invited / joined / removed / offboarded` | role, inviter, expiry for Guests |
| `member.role_changed` | old role, new role, changed_by, reason |
| `permission.override_granted / revoked` | permission, effect, scope, expiry, reason |
| `permission_set.modified` | diff of atomic permissions, version bump |
| `portal.share_created / revoked` | entity, client account, shared_by |
| `impersonation.started / ended` | impersonator, target, duration, pages viewed |
| `support_session.granted / used / expired` | grantor, scope, actions |
| `ai.action_executed` | actor, ai_run_id, tool, autonomy level, approval ref |
| `auth.login / mfa_change / api_key_created` | device, IP (retention per 05_User_Roles.md) |

Rules: audit rows are insert-only (no UPDATE/DELETE grants, enforced at the Postgres role level); retention minimum 7 years for finance/contract events, 2 years otherwise (configurable upward, never downward below floor); Owner can export; audit access is itself audited.

---

## 11. Lifecycle Rules

- **Invitation:** invites carry role + optional overrides; accepting creates the membership. Guest invites require expiry.
- **Role change:** takes effect immediately (JWT claims refresh + realtime session revalidation). Downgrades revoke cached sessions' elevated claims within 60 seconds.
- **Offboarding:** HR-initiated flow — disable login, revoke sessions and API tokens, reassign owned resources (wizard), preserve authorship attribution (soft model: user becomes `deactivated`, never deleted, preserving audit integrity).
- **Dormancy:** memberships inactive 90+ days are flagged for review in the quarterly access review checklist (Owner/Admin task generated automatically).

---

## 12. Future: Custom Roles (Phase 5)

For commercial SaaS, workspaces will define custom roles:

- A custom role = named permission set cloned from a built-in role, then edited atomically. Built-in roles remain immutable templates.
- **Guardrails:** custom roles cannot exceed Admin's set (Owner powers are not grantable); cannot cross the Client Portal boundary (a role is either internal or portal-side, never both); a role cannot grant `settings.permissions.manage` without also being flagged "administrative" (surfaced in access reviews).
- Migration path: specialization labels (§2.4) may be promoted to custom roles per workspace without data migration, since specializations already exist as membership attributes.
- Marketplace consideration: templates/agents from the marketplaces (see 06_Module_Breakdown.md) declare required permissions; installation prompts show the diff against the installing user's grants.

---

## 13. Open Questions

1. Should PMs see workspace-wide project financial summaries (revenue per project) by default, or only with a Finance-granted override? *Current lean: override only.*
2. Portal Aurex (client-facing assistant) — Phase 4 opt-in or Phase 5? Safety review in 07_AI_Strategy.md must close first.
3. Do we need per-pipeline CRM permissions (e.g., partnerships pipeline hidden from junior sales) before Phase 5 custom roles? *Deferred until a real internal need appears.*
4. Guest write access to tasks: keep, or restrict Guests to comment-only on tasks and reserve Edit for documents? *Revisit after first 3 months of internal usage data.*
