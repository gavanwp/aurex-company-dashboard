# Enterprise Identity, Users & RBAC — Architecture

|             |                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**  | Proposed — design complete, pre-implementation                                                                                                                                                                                                                                                                                                                                           |
| **Version** | 1.0                                                                                                                                                                                                                                                                                                                                                                                      |
| **Date**    | 2026-07-16                                                                                                                                                                                                                                                                                                                                                                               |
| **Owner**   | Chief Software Architect / Enterprise Security Engineer, AurexOS                                                                                                                                                                                                                                                                                                                         |
| **Related** | [05_User_Roles.md](../05_User_Roles.md) · [SecurityArchitecture.md](./SecurityArchitecture.md) · [AuthenticationArchitecture.md](./AuthenticationArchitecture.md) · [DatabaseArchitecture.md](./DatabaseArchitecture.md) · [09_Scaling_Strategy.md](../09_Scaling_Strategy.md) · [ADR-0008](../adr/0008_Enterprise_Identity_And_RBAC.md) · [12_Project_Rules.md](../12_Project_Rules.md) |

> This document is the **enterprise evolution** of `05_User_Roles.md`. It does not replace that spec's principles — it scales them from one agency to **thousands of agencies** by adding an Organization tier above Workspace, a platform Super-Admin plane, a fully **data-driven permission engine** (no hardcoded permissions), and the identity/security surface an enterprise SaaS demands (SSO/SCIM, MFA, sessions, devices, API keys, break-glass). Every decision preserves the two invariants that make AurexOS scale: **`workspace_id` on every tenant row** (the sharding key, `09_Scaling_Strategy.md` §1.2) and **deny-by-default RLS as the last line** (`05_User_Roles.md` §1.1).

---

## 0. Design tenets

1. **Identity is global; authority is scoped.** One human = one `principal` (one login, one MFA enrollment, one device list). _What they can do_ is a set of scoped grants, re-derived per request.
2. **Permissions are data, never code.** No `if (role === 'admin')`. A typed **permission catalog** + **roles as bundles** + **surgical overrides** resolve to an effective permission set. Adding a permission is a seed row, not a deploy.
3. **The workspace stays the tenancy boundary.** Organizations sit _above_ workspaces for billing, branding, SSO and policy — but RLS, joins, realtime channels and file keys remain workspace-keyed so the cell-sharding path (`09_Scaling_Strategy.md` §2.5) is never foreclosed.
4. **Deny-by-default, three layers, always.** RLS (Postgres) → application guard (`requirePermission`) → UI hiding. UI hiding is courtesy; RLS must be sufficient alone.
5. **Explicit DENY always wins.** Across every scope and layer. A grant can never override a deny at the same or broader scope.
6. **Everything sensitive is append-only audited.** Role changes, overrides, impersonation, MFA, API keys, session kills, ownership transfer, break-glass — all land in the immutable `audit_log`.
7. **Roles are coarse; overrides are surgical; specializations are labels.** Roles cover ~95%; overrides handle the rest without role explosion (`05_User_Roles.md` §2.4).

---

## 1. RBAC ARCHITECTURE

### 1.1 The scope hierarchy (tenancy model, evolved)

```
Platform  ── AurexOS global control plane (accounts, billing, cell map, feature flags)
   │          Principal: Super Admin + platform staff (break-glass only)
   ▼
Organization  ── the enterprise/agency account · billing entity · white-label brand · SSO realm
   │              Roles: Organization Owner, CEO, Org Admin, Billing Admin
   ▼
Workspace  ── the RLS tenancy boundary (UNCHANGED) · an operating unit / brand / client-of-agency space
   │           Roles: Operations Manager, PM, Finance/HR/Sales/Marketing Manager, Team Lead,
   │           Employee (+specializations), AI Automation Engineer, Support Agent, Client, Guest
   ├── Department  ── functional grouping (Delivery, Sales, Finance, HR, Creative) — scoping + analytics
   └── Team        ── cross-functional squad (a user may belong to many) — scoping + routing
        ▼
     Membership  ── principal ↔ workspace, carrying: role_id, department_id, team_ids[], status, overrides
        ▼
     Resource ACL ── project / document / deal / KB space grants (finest scope; Guest allowlist; portal shares)
```

**Six privilege scopes** — where a role or grant applies. A permission check names its scope; resolution walks from broad to narrow, DENY-wins:

| Scope          | Tenant key          | Who lives here                      | Example authority                                                      |
| -------------- | ------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| `platform`     | — (control plane)   | Super Admin, platform SRE/support   | Manage organizations, AI providers, feature flags, global audit        |
| `organization` | `organization_id`   | Org Owner, CEO, Org Admin, Billing  | Create workspaces, org SSO, billing, white-label, org-wide policy caps |
| `workspace`    | `workspace_id`      | Managers, Team Lead, Employee, etc. | The `05_User_Roles.md` §6 matrix, per workspace                        |
| `department`   | `department_id`     | Dept managers                       | Scope grants/analytics to a department                                 |
| `team`         | `team_id`           | Team Lead, members                  | Scope grants/routing to a team                                         |
| `resource`     | entity id           | any principal                       | Per-project / per-document / per-deal ACL                              |
| `portal`       | `client_account_id` | Client, portal-Guest                | Hard whitelist boundary (`05_User_Roles.md` §7)                        |

**Backward compatibility.** Every existing workspace is assigned a default 1:1 organization on migration (`org.name = workspace.name`, plan = current). Nothing in Phases 0–4 breaks; the org tier is dormant until an agency adds a second workspace or upgrades to an enterprise plan.

### 1.2 The permission engine (data-driven, non-hardcoded)

Four data structures replace the hardcoded `can(role, capability)` map with `can(principal, permission, scope)`:

1. **Permission catalog** (`permissions`) — the atomic vocabulary, `module.resource.action`, seeded and versioned. The **only** source of permission strings. Examples: `users.user.suspend`, `finance.invoice.send`, `ai.agent.manage`, `settings.billing.manage`, `automation.workflow.delete`. Actions are the canonical verbs (`view, create, edit, delete, suspend, restore, manage, export, approve, send, sign, impersonate`) plus module verbs.
2. **Roles** (`roles`) — named bundles of permissions, **scope-typed** (`platform|organization|workspace|portal`). System roles are immutable templates (`is_system=true`); custom roles clone a template then edit atomically (`parent_role_id`). A role carries an `assignable_ceiling` (the highest role it may itself grant) — the anti-escalation guardrail.
3. **Role → permission** (`role_permissions`) — additive allow-grants. Roles never carry deny (deny is an override concern).
4. **Overrides & grants** — surgical, DENY-capable:
   - `user_permission_overrides` — `(principal, permission_key, effect allow|deny, scope_type, scope_id, expires_at, granted_by, reason)`. Every row needs a `reason` (shown in the review UI + audit).
   - `resource_grants` — resource-scoped ACL (project/document/deal/KB/portal share) with effect + expiry (Guest allowlists, portal shares).
   - `organization_policies` — org-level **caps** that can only remove capability from workspaces below (e.g., "org disables data export", "AI autonomy ceiling = L2", "MFA required").

**The effective-permission function** — the heart of the engine. Pure, deterministic, DENY-wins:

```
effective(principal, permission_key, scope):
  if principal.platform_role == 'super_admin':
      return ALLOW unless permission_key in BREAK_GLASS_SET      # destructive/cross-tenant needs 2-person
  grants = ∅
  for role in roles_assigned(principal, covering(scope)):        # org + workspace + team roles
      grants ∪= role_permissions(role)
  grants  = apply_org_policy_caps(grants, scope.organization)    # caps only subtract
  overrides = user_permission_overrides(principal, permission_key, covering(scope))
  if any override.effect == DENY:   return DENY                  # deny wins, always
  if permission_key ∈ grants:       decision = ALLOW
  if any override.effect == ALLOW:  decision = ALLOW
  if targets_resource(permission_key):
      decision = apply_resource_grants(decision, resource)       # ACL may allow or deny
  decision = apply_field_rules(decision, permission_key)         # comp/margin/deal-value gates
  return decision or DENY                                        # default deny
```

**Resolution layering (mirrors `05_User_Roles.md` §3.1, extended to org):**

```
effective =  org role set
           ⊕ workspace role set  (⊕ team/department role grants)
           ⊖ organization policy caps
           ± user_permission_overrides   (allow adds / deny removes)
           ± resource_grants
           ± field-level rules
           where explicit DENY at any layer wins.
```

### 1.3 Enforcement — three layers + the fast path

- **Layer 1 — RLS (Postgres, the backstop).** Every tenant table: `workspace_id` (+ `organization_id` on org-scoped tables), RLS `enabled` with policies keyed on `is_workspace_member(workspace_id)` and, for sensitive ops, `has_permission(workspace_id, 'perm.key')` — a `security definer` function that reads roles+overrides. Platform tables deny all application roles (service-role only).
- **Layer 2 — application guard.** `requirePermission('finance.invoice.send', { scope })` on every server action / route / API handler / AI tool. A handler without a declared guard **fails CI** (lint rule extends the existing `defineAction` requirement). This is "RBAC on every route" made mechanical (`05_User_Roles.md` §3.3).
- **Layer 3 — UI hiding.** Navigation, buttons and search filtered by the resolved set. Never a control.

**The fast path (claims cache, DB truth).** Resolving the full set per request would be slow at scale. Instead:

- On login / workspace-switch / role change, the engine computes a compact **permission digest** (a bitset/hash of the resolved allow-set for the active `{org, workspace}`) and embeds it in the session JWT as a custom claim alongside `{principal_id, organization_id, workspace_id, active_role_id, digest_hash, scope}`.
- Hot checks read the claim (O(1), no DB). **Sensitive actions re-verify against the DB** (roles + overrides + policies) — claims are a cache, the DB is truth (`SecurityArchitecture.md` V3).
- **Invalidation:** any change to roles, role_permissions, overrides, policies or membership bumps a per-principal `perm_epoch`; sessions whose epoch is stale revalidate within ≤ 60 s (role downgrades revoke elevated claims fast — `05_User_Roles.md` §11). At scale the epoch/digest lives in Redis (introduced only on the `09_Scaling_Strategy.md` §hot-config trigger).

### 1.4 AI as a principal (no escalation)

Aurex and AI Agents never hold standing permissions (`05_User_Roles.md` §8). Every AI tool call runs `effective(invoking_user, …)` — the same engine, the same RLS row context. AI autonomy is capped **twice**: `min(org policy ceiling, workspace ceiling, user's own permission to do it manually)`. AI mutations are attributed `actor_user_id + via_ai + ai_run_id`. **AI Automation Engineer** is a _human_ role that manages agents/workflows; the agents themselves are `service principals` with an explicit, owner-configured, default-read-only permission profile — never Owner-equivalent.

---

## 2. ROLE CATALOG (19 defaults + unlimited custom)

### 2.1 How the 19 map cleanly onto the engine

The requested 19 are not 19 permission sets — that would explode the matrix. They resolve into **three classes**, which is _why_ the engine scales:

| Class                                               | Members                                                                                                                                                                                                | Modeled as                                                                                                                                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Platform role**                                   | Super Admin                                                                                                                                                                                            | 1 `platform`-scoped system role                                                                                                                                                                                                              |
| **Permission-roles** (distinct sets)                | Organization Owner, CEO, Operations Manager, Project Manager, HR Manager, Finance Manager, Sales Manager, Marketing Manager, Team Lead, Employee, AI Automation Engineer, Support Agent, Client, Guest | `organization`/`workspace`/`portal` system roles                                                                                                                                                                                             |
| **Specialization templates** (share Employee's set) | Designer, Developer, SEO Specialist, Content Writer                                                                                                                                                    | seeded **custom roles cloned from Employee** — selectable in the picker, but identical base permissions; the specialization is an _attribute_ driving dashboards, task routing, AI tool context, capacity planning (`05_User_Roles.md` §2.4) |

> **Architect's note (the key reconciliation).** The brief lists Designer/Developer/SEO/Content as "default roles," while doctrine says specializations are _labels_ to avoid a 5× matrix. We satisfy both: they ship as **first-class seeded roles in the role picker**, so an admin assigns "Developer" naturally — but they _are_ Employee's permission set plus a `specialization` attribute. The moment one genuinely needs different permissions, it graduates to a real custom role with **zero data migration** (the attribute already exists). This is the anti-role-explosion invariant preserved while honoring the product's language.

### 2.2 Per-role specification

Each role below states: **Purpose · Responsibilities · Modules · Permissions · Dashboard · AI · Notifications · Reports · Restrictions.** Permissions reference the matrix (`05_User_Roles.md` §6, extended per §2.3 here). Scope in brackets.

**1. Super Admin** `[platform]` — _Purpose:_ operate the AurexOS platform. _Responsibilities:_ organizations, subscriptions/billing, global roles & permission catalog, marketplace, integrations registry, AI providers, feature flags, global audit, security posture. _Modules:_ platform control plane only (never tenant product data by default). _Permissions:_ `platform.*`. _Dashboard:_ Platform Ops — tenant health, MRR, incident/security feed, provider status, feature-flag board. _AI:_ platform copilot (fleet analytics, anomaly triage) — **never** reads tenant business data. _Notifications:_ SEV incidents, billing failures, abuse signals, provider outages. _Reports:_ platform KPIs, tenant growth, cost/usage. _Restrictions:_ **zero standing access to any customer workspace's business data**; entering a tenant requires an audited, customer-granted support session or two-person break-glass (`05_User_Roles.md` §9.2).

**2. Organization Owner** `[organization]` — _Purpose:_ own the enterprise account. _Responsibilities:_ org lifecycle, create/delete workspaces, billing & plan, white-label branding, org SSO/SCIM, org-wide security policy (MFA required, autonomy ceiling, data residency), **ownership transfer**. _Modules:_ all workspaces in the org + org settings. _Permissions:_ everything at `organization` + `workspace` scope (bounded by law/compliance holds). _Dashboard:_ Org Executive — cross-workspace P&L roll-up, seat usage, security posture, approvals. _AI:_ Org CEO Briefing across workspaces (permission-filtered). _Notifications:_ billing, security, ownership, workspace lifecycle. _Reports:_ org-wide financial & utilization. _Restrictions:_ cannot exceed platform policy (e.g., plan seat caps); destructive org deletion is two-step + audited.

**3. CEO** `[organization]` — _Purpose:_ executive visibility & steering. _Responsibilities:_ strategy, cross-department oversight; not day-to-day config. _Modules:_ read-heavy across workspaces + Analytics + Finance summaries. _Permissions:_ `*.view` at org scope + Analytics/Finance report export; **no** user/role management, **no** billing edit (view only) unless also Org Owner. _Dashboard:_ **Executive Dashboard** — revenue, company KPIs, department performance, pipeline, project-health heatmap, **AI CEO Briefing**. _AI:_ AI CEO Briefing (daily narrative synthesis, permission-filtered), NL analytics ("margin by department this quarter"). _Notifications:_ KPI anomalies, big-deal/at-risk-account alerts, board-report readiness. _Reports:_ BI, financial, department scorecards. _Restrictions:_ read/advise, not administer; cannot change permissions or delete data.

**4. Operations Manager** `[workspace]` (≈ Admin) — _Purpose:_ run the workspace. _Responsibilities:_ invite users, assign roles below Admin, workspace settings, automation admin, integrations, templates, departments/teams. _Modules:_ all workspace modules (finance at summary unless also Finance). _Permissions:_ `workspace.*` except billing, role≥Admin assignment, org policy, hard-delete approval. _Dashboard:_ Operations — ops health, invites, automation failures, integration status, approvals queue. _AI:_ ops copilot (bottleneck detection, staffing suggestions). _Notifications:_ invites, automation/integration health, capacity flags. _Reports:_ delivery & utilization ops reports. _Restrictions:_ no billing, no Owner/Admin role grants, no autonomy-ceiling override.

**5. Project Manager** `[workspace]` — _Purpose:_ own client delivery. _Responsibilities:_ projects, tasks, timelines, meetings, client comms, risk/workload, portal config for own projects. _Modules:_ Projects/Tasks/Meetings/Calendar/Documents/Client-Portal (managed), CRM view. _Permissions:_ Full on managed projects, View elsewhere (`05` §6). _Dashboard:_ **Delivery Dashboard** — project health, blocked tasks, client messages, delay-risk. _AI:_ delay prediction, status-update drafting, meeting briefs, workload balancing. _Notifications:_ blockers, client replies, milestone slips, approvals. _Reports:_ project/portfolio delivery. _Restrictions:_ no finance/HR admin, no cross-project write on unmanaged projects.

**6. HR Manager** `[workspace]` (≈ HR) — Team & HR (profiles, leave, onboarding/offboarding, reviews, org chart, **compensation** field-level), initiates offboarding→access-revocation. _Modules:_ Team & HR (Full), Calendar (view). _Permissions:_ `hr.*` incl. `hr.compensation.*`. _Dashboard:_ People — leave, reviews, onboarding, headcount. _AI:_ self-review skeletons, capacity intelligence, onboarding copilot. _Notifications:_ leave approvals, review cycles, anniversaries. _Reports:_ people analytics. _Restrictions:_ no CRM/Finance (beyond payroll)/delivery content.

**7. Finance Manager** `[workspace]` (≈ Finance) — Invoices/Expenses/Payments/Reports, contract financial terms, payroll fields. _Permissions:_ `finance.*`, `hr.compensation.view`, `crm.deal.value.view`. _Dashboard:_ Finance — cash, AR aging, reminder queue, approvals, month-close. _AI:_ expense categorization, collections drafting, cash-flow forecast, anomaly detection. _Notifications:_ overdue, expense approvals, payment events. _Reports:_ P&L, AR, margins. _Restrictions:_ no delivery/task detail, documents, email.

**8. Sales Manager** `[workspace]` (≈ Sales) — CRM/pipeline/proposals, deal→project handoff. _Permissions:_ `crm.*`, `proposals.*`, Projects view, invoice status on own accounts. _Dashboard:_ Pipeline — deals by stage, lead scores, proposal status, follow-ups. _AI:_ lead scoring, deal-risk, follow-up drafting, proposal first-draft. _Notifications:_ new leads, stage changes, proposal viewed/accepted. _Reports:_ sales analytics/forecast. _Restrictions:_ no finance beyond status, no HR.

**9. Marketing Manager** `[workspace]` (**new** vs `05`; clone of Sales minus deal-close) — _Purpose:_ demand gen, brand, campaigns, content ops. _Modules:_ CRM (leads/campaigns view+edit), Content/KB, Analytics (marketing), Automation (marketing), Documents. _Permissions:_ `crm.lead.*`, `crm.campaign.*` (new sub-resource), `kb.*`, `analytics.marketing.view`, `automation.workflow.*` scoped to marketing; **no** deal-value or pipeline-close, **no** finance. _Dashboard:_ Growth — funnel, campaign performance, content calendar, lead source ROI. _AI:_ content strategy, campaign copy drafting, channel-mix analysis. _Notifications:_ campaign milestones, lead-volume anomalies, content approvals. _Reports:_ marketing analytics, attribution. _Restrictions:_ no closing deals, no finance, no HR.

**10. Team Lead** `[workspace/team]` — _Purpose:_ lead a team/squad within delivery. _Responsibilities:_ assign/triage work within their team, approve team leave (delegated), review output. _Modules:_ Projects/Tasks (team scope), Team (view + team approvals). _Permissions:_ Employee set ⊕ `tasks.task.assign`, `projects.project.edit` (team-scoped), `hr.leave.approve` (team-delegated). _Dashboard:_ Team — team workload, sprint/board, blockers, team capacity. _AI:_ workload balancing, standup summaries, review assist. _Notifications:_ team blockers, leave requests, review due. _Restrictions:_ scoped to their team(s); no workspace admin.

**11. Employee** `[workspace]` (≈ Team Member) — assigned tasks, projects (member), calendar, AI assistant, documents, time tracking. _Permissions:_ `05` §6 Team-Member row. _Dashboard:_ **My Work** — tasks by due date, calendar, mentions, personal Aurex briefing, specialization widget. _AI:_ task breakdown, drafting in documents, personal briefing. _Notifications:_ assignments, mentions, due-soon. _Reports:_ own metrics. _Restrictions:_ only member projects + workspace-public content.

**12–15. Designer / Developer / SEO Specialist / Content Writer** `[workspace]` — **specialization templates of Employee.** Identical base permissions; differ by `specialization` attribute driving: dashboard widgets (Developer→repo/PR activity; SEO→ranking alerts; Designer→design tasks/assets; Content→content pipeline), task-type routing, Aurex tool context, Automation assignment, capacity planning. _Restrictions:_ Employee's. _Graduation:_ promote to a real custom role anytime, zero migration.

**16. AI Automation Engineer** `[workspace]` (**new**) — _Purpose:_ build & operate the AI/automation layer. _Responsibilities:_ design workflows, manage AI Agents, curate AI Memory & Knowledge Base, tune prompts/tools, monitor runs. _Modules:_ Automation Studio (Full), AI Workspace/Agents/Memory/KB (Full), Analytics (automation), Documents/KB. _Permissions:_ `automation.workflow.*`, `ai.workspace.*`, `ai.agent.*`, `ai.memory.*`, `ai.kb.*`, `settings.integrations.view`. _Dashboard:_ Automation Ops — active workflows, run success/failure, agent activity, AI spend. _AI:_ meta — builds and supervises agents (agents still run at the _invoking user's_ permissions). _Notifications:_ run failures, agent errors, budget thresholds. _Reports:_ automation/AI usage & cost. _Restrictions:_ cannot grant itself business-data permissions; agent actions never exceed the human owner's grants; outbound/destructive agent steps require approval (R-AI3).

**17. Support Agent** `[workspace]` (**new**) — _Purpose:_ internal help-desk / client success. _Responsibilities:_ triage client-portal messages, answer tickets, escalate, view (not edit) delivery context. _Modules:_ Client-Portal messages (respond), Projects/Tasks (view), Clients (view contact), KB (view+suggest). _Permissions:_ `portal.message.send` (internal side), `projects.*.view`, `clients.contact.view`, `kb.view`. _Dashboard:_ Support — open threads, SLA timers, escalations. _AI:_ reply drafting (tone-matched, approval to send), ticket summarization, KB deflection. _Notifications:_ new messages, SLA breaches, escalations. _Reports:_ support volume/CSAT. _Restrictions:_ no finance/HR, no edit to delivery, no data export.

**18. Client** `[portal]` — portal-only hard boundary (`05` §7). View assigned projects, upload files, approve proposals, view/pay invoices, sign contracts, message team, book/track. _Dashboard:_ **Client Portal Home**. _AI:_ optional portal Aurex (Phase 4 opt-in), portal-visible data only, restricted tool registry. _Notifications:_ approval requests, invoice due, new shared items, messages. _Reports:_ their project reports only. _Restrictions:_ **never** internal data — no CRM (incl. own lead), costs/margins, other clients, team workload, internal comments, settings, audit.

**19. Guest** `[workspace, allowlist]` — zero implicit access; every grant is a `resource_grants` allowlist entry (specific project/doc/KB) with View/Edit + expiry (default 30d, max 180d). _Dashboard:_ minimal shared-items list. _AI:_ none. _Notifications:_ only on granted resources. _Restrictions:_ no directory, no search beyond grants, no metadata, auto-expiry.

### 2.3 New permission sub-resources this introduces

To support the new roles/modules cleanly (all data rows in `permissions`, no code):
`users.user.{view,create,invite,edit,suspend,restore,delete}`, `users.role.{assign,manage}`, `users.permission.override`, `org.{workspace.create,ownership.transfer,policy.manage,sso.manage,billing.manage,branding.manage}`, `crm.campaign.*`, `ai.{workspace,agent,memory,kb}.*`, `security.{session.manage,device.manage,apikey.manage,mfa.manage,audit.view}`, `analytics.{dashboard.view,report.export,marketing.view}`, `platform.*`.

---

## 3. DATABASE SCHEMA

All tables: **UUIDv7 PK** (R-D5), `snake_case` (R-D6), `created_at/updated_at`, `deleted_at` on user-facing entities (R-D3 soft delete), **RLS enabled with policies** (R-D1), and `workspace_id` on workspace-scoped rows / `organization_id` on org-scoped rows (R-D2). Money is integer minor units (R-D8). Below shows the shape + scope + RLS intent (not full DDL — that lands in migrations `0017+`).

### 3.1 Identity & tenancy

| Table                                    | Key columns                                                                                                                                                                                  | Scope / RLS                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `principals` (⟵ `profiles`/`auth.users`) | `id`=auth uid, `email`, `full_name`, `avatar_url`, `status(active/suspended/deactivated)`, `mfa_enrolled`, `last_seen_at`                                                                    | global identity; readable to those sharing a workspace                              |
| `organizations`                          | `id`, `name`, `slug`, `plan`, `status`, `billing_customer_ref`, `branding jsonb`, `sso_config jsonb`, `data_region`, `cell_id`, `parent_org_id` (reseller/white-label), `owner_principal_id` | org root; RLS: member of org                                                        |
| `organization_members`                   | `organization_id`, `principal_id`, `org_role_id`, `status`                                                                                                                                   | RLS: `is_org_member(organization_id)`                                               |
| `workspaces` (**+`organization_id`**)    | existing + `organization_id`, `department_scheme`, `visibility`                                                                                                                              | RLS: `is_workspace_member(id)` (unchanged)                                          |
| `departments`                            | `id`, `workspace_id`, `name`, `lead_principal_id`, `parent_department_id`                                                                                                                    | RLS: workspace member; edit: `has_permission('users.role.manage')`                  |
| `teams`                                  | `id`, `workspace_id`, `department_id?`, `name`, `lead_principal_id`                                                                                                                          | RLS: workspace member                                                               |
| `team_members`                           | `team_id`, `principal_id`, `role_in_team`                                                                                                                                                    | RLS: workspace member                                                               |
| `memberships` (⟵ `workspace_members`)    | `workspace_id`, `principal_id`, `role_id`, `department_id?`, `specialization?`, `status(invited/active/suspended/deactivated)`, `perm_epoch`                                                 | RLS: workspace member; write: `users.role.assign` (bounded by `assignable_ceiling`) |

### 3.2 The permission engine

| Table                               | Key columns                                                                                                                                                                      | Notes                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `permissions`                       | `key` (PK, `module.resource.action`), `module`, `resource`, `action`, `label`, `description`, `is_field_level`, `is_dangerous`                                                   | **the catalog** — global, seeded, immutable keys; the only permission strings that exist                    |
| `roles`                             | `id`, `organization_id?` (null=system/global), `key`, `name`, `scope(platform/org/workspace/portal)`, `is_system`, `parent_role_id`, `assignable_ceiling`, `is_administrative`   | system roles global+immutable; custom roles per-org clone a template                                        |
| `role_permissions`                  | `role_id`, `permission_key`, (allow only)                                                                                                                                        | additive bundle; unique(`role_id`,`permission_key`)                                                         |
| `user_permission_overrides`         | `id`, `principal_id`, `permission_key`, `effect(allow/deny)`, `scope_type`, `scope_id`, `granted_by`, `reason`, `expires_at`                                                     | surgical; **deny wins**; `reason` mandatory                                                                 |
| `resource_grants`                   | `id`, `workspace_id`, `resource_type`, `resource_id`, `principal_id?`/`role_id?`/`client_account_id?`, `effect`, `capability(view/edit/…)`, `expires_at`, `granted_by`, `reason` | project/doc/deal/KB ACLs, Guest allowlists, portal shares                                                   |
| `organization_policies`             | `organization_id`, `policy_key`, `value jsonb`                                                                                                                                   | caps only (mfa_required, autonomy_ceiling, export_disabled, session_max_age, ip_allowlist, password_policy) |
| `permission_matrix` (seed artifact) | typed constant → seed + guard-test                                                                                                                                               | the `05` §6 matrix exported; drift fails CI                                                                 |

### 3.3 Security, sessions & access

| Table                         | Key columns                                                                                                                                                                                       | Notes                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `sessions`                    | `id`, `principal_id`, `organization_id`, `active_workspace_id`, `device_id`, `ip`, `user_agent`, `perm_epoch`, `impersonation jsonb?`, `created_at`, `last_active_at`, `revoked_at`, `expires_at` | JWT ↔ row; revocable; `perm_epoch` drives ≤60s revalidation                                    |
| `devices`                     | `id`, `principal_id`, `fingerprint_hash`, `name`, `os`, `last_ip`, `trusted`, `first_seen_at`, `last_seen_at`, `revoked_at`                                                                       | device management, trust for step-up MFA                                                       |
| `auth_events` (login history) | `id`, `principal_id`, `organization_id?`, `type(login/logout/mfa_challenge/failure/password_reset)`, `method`, `ip`, `geo`, `device_id`, `success`, `risk_score`, `created_at`                    | insert-only; login history + anomaly signals                                                   |
| `mfa_factors`                 | `id`, `principal_id`, `type(totp/webauthn/sms)`, `label`, `secret_ref`, `verified_at`, `last_used_at`, `revoked_at`                                                                               | secrets in vault, not raw in DB                                                                |
| `api_keys`                    | `id`, `organization_id`, `workspace_id?`, `name`, `prefix`, `hash`, `scopes text[]`, `created_by`, `last_used_at`, `expires_at`, `revoked_at`                                                     | **hashed at rest** (leak-from-DB inert, `SecurityArchitecture.md` §6.2); scoped to permissions |
| `invitations`                 | `id`, `organization_id`, `workspace_id?`, `email`, `role_id`, `overrides jsonb`, `token_hash`, `invited_by`, `expires_at`, `accepted_at`, `revoked_at`                                            | email invite flow; Guest invites require expiry                                                |
| `impersonation_sessions`      | `id`, `impersonator_id`, `target_principal_id`, `workspace_id`, `started_at`, `ends_at`, `pages jsonb`, `read_only=true`                                                                          | read-only, time-boxed, fully audited (`05` §9.1)                                               |
| `support_sessions`            | `id`, `organization_id`, `grantor_id`, `grantee_platform_id`, `scope jsonb`, `read_only`, `granted_at`, `expires_at`, `revoked_at`                                                                | Phase-5 vendor access, customer-granted, audited (`05` §9.2)                                   |

### 3.4 Audit & activity — two distinct streams

| Table                | Purpose                                                         | Rules                                                                                                                                                                                                    |
| -------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `audit_log` (exists) | **immutable compliance record**                                 | insert-only (no UPDATE/DELETE grant at the Postgres-role level); actor/workspace/entity/before-after/reason/ip/request_id; 7-yr finance retention; partition by month at ~100M rows (`09` §partitioning) |
| `activity_logs`      | **user-facing "what happened" feed** (per user & per workspace) | derived from `domain_events`; readable per RLS + permission; prunable (90d default); powers the Activity Logs UI                                                                                         |

_Distinction:_ `audit_log` answers "prove who did what" (security/compliance, tamper-proof); `activity_logs` answers "show me recent activity" (product surface). Both exist; they are not the same table.

---

## 4. API DESIGN

Two surfaces: **internal** (Next.js Server Actions via `defineAction` + `requirePermission`, the default for the app UI) and a **public REST API** (Phase 5, API-key auth, versioned `/{org}/api/v1`, per-key scopes). Every endpoint declares a required permission; undeclared = CI failure. All list endpoints are **keyset-paginated** (unlimited users), filterable, and RLS-scoped.

**Users & lifecycle**

```
GET    /api/v1/users                      users.user.view      (keyset, filter by role/status/dept/team)
POST   /api/v1/users                      users.user.create
POST   /api/v1/users/invite               users.user.invite    (email + role + overrides)
GET    /api/v1/users/:id                  users.user.view
PATCH  /api/v1/users/:id                  users.user.edit
POST   /api/v1/users/:id/suspend          users.user.suspend
POST   /api/v1/users/:id/restore          users.user.restore
DELETE /api/v1/users/:id                  users.user.delete    (soft; hard-delete = Owner + 2-step)
POST   /api/v1/users/:id/reset-password   security.mfa.manage  (issues reset; never sets a password directly)
POST   /api/v1/users/:id/deactivate       users.user.suspend   (offboarding wizard: revoke sessions/keys, reassign)
```

**Roles, permissions, overrides**

```
GET/POST/PATCH/DELETE /api/v1/roles                 users.role.manage   (custom roles; system roles read-only)
GET    /api/v1/permissions                          users.role.manage   (the catalog)
PUT    /api/v1/roles/:id/permissions                users.role.manage   (edit bundle; ≤ assignable_ceiling)
POST   /api/v1/users/:id/roles                       users.role.assign
POST   /api/v1/users/:id/overrides                   users.permission.override  (reason required)
DELETE /api/v1/users/:id/overrides/:permKey          users.permission.override
GET    /api/v1/users/:id/effective-permissions       users.user.view     (resolved set + provenance — the "why")
```

**Departments & teams**

```
GET/POST/PATCH/DELETE /api/v1/departments            users.role.manage
GET/POST/PATCH/DELETE /api/v1/teams                  users.role.manage
POST   /api/v1/teams/:id/members                      users.role.assign
```

**Ownership & org**

```
POST   /api/v1/organizations/:id/transfer-ownership   org.ownership.transfer   (Owner only; 2-step + email confirm)
GET/PATCH /api/v1/organizations/:id                    org.policy.manage / org.branding.manage
POST   /api/v1/workspaces                              org.workspace.create
GET/PATCH /api/v1/organizations/:id/sso                org.sso.manage           (SAML/OIDC + SCIM token)
```

**Sessions, devices, MFA, keys, audit**

```
GET    /api/v1/users/:id/sessions      security.session.manage
DELETE /api/v1/sessions/:id            security.session.manage   (revoke; ≤60s propagation)
GET    /api/v1/users/:id/devices       security.device.manage
DELETE /api/v1/devices/:id             security.device.manage
POST   /api/v1/users/:id/mfa           security.mfa.manage       (enable/disable/reset)
GET/POST/DELETE /api/v1/api-keys        security.apikey.manage
GET    /api/v1/audit-logs               security.audit.view       (keyset, export = analytics.report.export)
GET    /api/v1/activity                 dashboard.view            (RLS-scoped feed)
GET    /api/v1/login-history            security.audit.view
```

**Provisioning (enterprise)**: SCIM 2.0 `/{org}/scim/v2/Users|Groups` (bearer per-org token) → maps IdP groups → roles/teams. **Webhooks** (signed both ways) for `user.*`, `role.*`, `session.revoked` so external systems react.

---

## 5. UI DESIGN

All pages follow the design system (border-first cards, one accent, WCAG AA, sentence case) under a **Settings → People & Access** hub. Motion per ADR-0007.

- **Users** — keyset table (avatar, name, email, role chip, department, status, last active) + right-side filters (role/status/dept/team/MFA) + bulk actions (suspend/assign role/export). Row → **User detail** with tabs: _Overview_ (profile, org/workspace memberships), _Roles & Permissions_ (assigned roles + overrides + **"effective permissions" viewer showing provenance** — which role/override granted each), _Sessions_ (active sessions, revoke), _Devices_ (trust/revoke), _Activity_ (their feed), _API keys_, _Security_ (MFA status, reset password, suspend/deactivate).
- **Roles** — role list (system vs custom badge) → **Role editor**: clone-from-template, the **permission matrix editor** (modules × actions grid with tri-state allow/inherit/deny, live "who has this" count, `assignable_ceiling` guardrail, diff-vs-template). Immutable system roles are read-only with a "Clone to customize" CTA.
- **Permissions** — the catalog browser (grouped by module), each permission showing description, which roles include it, danger flag.
- **Departments / Teams** — org-chart view + list; drag to reparent; assign lead; membership management.
- **Invite Users** — email(s) + role + optional overrides + department/team; preview of granted access ("this person will be able to…") before send; bulk CSV invite.
- **Activity Logs** — filterable feed (actor, module, action, time); per-user and workspace-wide.
- **Audit Logs** — compliance table (immutable), advanced filters, export, retention notice; access is itself audited.
- **Profile** — self-service: name/avatar, password, **MFA enrollment (TOTP/WebAuthn)**, active sessions & devices (self-revoke), connected accounts (OAuth/SSO), API keys.
- **Organization Settings** — general, **branding/white-label**, **SSO/SCIM**, security policies (MFA required, session max-age, IP allowlist, password policy, AI autonomy ceiling), billing/plan/seats, workspaces, ownership transfer.
- **Security Center** — posture overview: MFA coverage %, stale/dormant accounts, over-privileged accounts (accounts flagged `is_administrative`), pending access reviews, recent security events.

---

## 6. SCALABILITY

- **The tenancy model is the scaling model** (`09` §1.2). Every RBAC row carries `workspace_id`/`organization_id`; when the primary saturates, orgs route to **cells** (`09` §2.5) with a thin control-plane DB holding `organizations`, `roles` (system), `permissions`, billing and the cell map. Workspaces never span cells → permission resolution always joins locally.
- **O(1) hot checks.** The resolved **permission digest** rides in the JWT claim; the common path never touches the DB. The `permissions` catalog and `system roles` are small, immutable and cache-friendly (edge/Redis at the `09` hot-config trigger). Only sensitive actions re-resolve.
- **Bounded resolution.** A principal's effective set = (few role bundles) ⊕ (few overrides). Even with thousands of users, resolution is per-_principal_, not per-user-times-permissions; invalidation is a single `perm_epoch` bump, not a cache sweep.
- **Unlimited users.** All admin lists are **keyset-paginated** and index-backed (`memberships(workspace_id, status, role_id)`); no offset scans. Bulk ops chunk. Directory search is index/`pg_trgm`-backed, workspace-scoped.
- **Audit at volume.** `audit_log`/`auth_events` partition by month at ~100M rows; old partitions detach to cold storage (`09` §partitioning) — retention preserved, OLTP unaffected.
- **AI-first extraction.** AI/usage tables leave the primary first (`09` §1.4); the permission engine is provider-agnostic and unaffected.

---

## 7. SECURITY

Enterprise defense-in-depth, consolidating `SecurityArchitecture.md`:

- **RBAC** — the data-driven engine above; three layers; deny-by-default; DENY-wins; `requirePermission` on every route (CI-enforced).
- **Permission matrix** — single source of truth (`05` §6, extended); exported as a typed constant feeding both seed and the guard-test suite → drift fails CI.
- **Authentication** — Supabase Auth; **MFA** TOTP + **WebAuthn/passkeys** (SMS only as fallback); **step-up MFA** on risk (new device/geo, `auth_events.risk_score`); org policy can _require_ MFA.
- **SSO-ready / OAuth-ready** — org-level **SAML 2.0 & OIDC** realms + **SCIM 2.0** provisioning (IdP groups → roles/teams, auto-deprovision on IdP disable); social OAuth for SMB. JIT provisioning maps to a default role.
- **Sessions** — JWT ↔ `sessions` row; revocable individually or all-devices; role downgrade revokes elevated claims ≤ 60 s; `SameSite=Lax`, `HttpOnly`, `Secure`; configurable max-age; impersonation is read-only, time-boxed, banner-flagged, audited (email excluded).
- **Devices** — fingerprinted, trust state gates step-up; per-device revocation.
- **API keys** — hashed at rest (leak-from-DB inert), per-key permission scopes, prefix-identified, rotating, revocable; per-key rate limits.
- **Rate limiting** — layered per **IP / principal / workspace / org / API-key**; tighter budgets on auth + portal surfaces (`SecurityArchitecture.md` §8); automation/AI execution budgeted.
- **Password policies** — org-configurable (length/complexity/rotation/breach-check via HaveIBeenPwned k-anon); reset issues a single-use short-TTL link, never sets a password server-side.
- **Audit & login history** — immutable `audit_log` (insert-only at the DB-role level) + `auth_events`; audit access is itself audited; export gated + logged.
- **Soft delete + GDPR** — `deleted_at` everywhere user-facing; deactivation preserves authorship for audit integrity; hard delete only via retention/erasure jobs cascading to vectors/memory/logs (`SecurityArchitecture.md` §GDPR).
- **Break-glass & least privilege** — Super Admin has **zero standing tenant-data access**; entry needs customer-granted support session or two-person break-glass to an immutable store with customer notification (`05` §9.2). Quarterly access reviews auto-generated; dormant (90d) and over-privileged accounts flagged.

---

## 8. FUTURE SaaS EXPANSION

The org tier + data-driven engine make these additive, not rewrites:

- **White-label** — `organizations.branding` (logo, palette, email-from) + **custom domains** per org/portal; `parent_org_id` enables **reseller/partner hierarchies** (a partner org white-labels sub-orgs it manages).
- **Billing & plans** — seat-based per org, plan → feature flags and seat caps enforced as `organization_policies` (caps only ever subtract). Usage metering (AI spend, API calls, storage) per org.
- **Marketplace** — templates/agents/roles declare required permissions; install shows the **diff against the installer's grants** before consent (`05` §12).
- **Public API + developer portal** — versioned REST, per-key scopes mapped to the same permission catalog, webhooks, SDKs; the API _is_ the RBAC engine, so third-party apps can never exceed a key's scope.
- **Enterprise provisioning** — SAML/OIDC/SCIM (above), audit export/SIEM streaming, data residency via cell placement, custom retention, DPA/compliance packs (SOC 2, GDPR, ISO 27001 groundwork already designed-in).
- **Custom roles at scale** — every org composes unlimited roles from the catalog within guardrails (can't exceed Admin, can't cross the portal boundary, `is_administrative` roles surface in reviews).

---

## 9. Migration path (how we get here without a rewrite)

1. **`0017` — org tier:** create `organizations`, `organization_members`; add `workspaces.organization_id`; backfill a default 1:1 org per workspace. No behavior change.
2. **`0018` — engine tables:** `permissions`, `roles`, `role_permissions`, `user_permission_overrides`, `resource_grants`, `organization_policies`; seed the catalog + system roles from the `05` §6 matrix (typed constant). Rename `workspace_members`→`memberships` (view alias for compatibility), add `role_id`, backfill from current `role` enum.
3. **`0019` — engine cutover:** replace `packages/core/permissions` `can(role, capability)` with `can(principal, permission, scope)` backed by resolved sets + `has_permission()` RLS function; keep the old signature as a thin shim during transition. Guard lint flips to `requirePermission`.
4. **`0020` — security surface:** `sessions`, `devices`, `auth_events`, `mfa_factors`, `api_keys`, `invitations`, `impersonation_sessions`; wire management UIs.
5. **`0021+` — departments/teams, SSO/SCIM, custom roles UI, public API** — trigger-gated per the roadmap.

Each step is independently shippable, RLS-complete, and reversible-forward.
