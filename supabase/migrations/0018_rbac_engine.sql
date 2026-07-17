-- 0018 — Data-driven RBAC engine (Enterprise Identity & RBAC, step 2 of the sequence)
-- Docs: docs/architecture/EnterpriseIdentityAndRBAC.md §1.2, §2, §3.2; ADR-0008.
--
-- Introduces the engine that replaces the hardcoded can(role, capability) map:
--   permissions (catalog) → roles (bundles) → role_permissions
--   ± user_permission_overrides ± resource_grants ± organization_policies.
--
-- NO BEHAVIOR CHANGE: these tables are seeded but nothing reads them yet. The
-- application keeps using packages/core/permissions can() until the 0019 cutover.
-- workspace_members gains a backfilled role_id link for that cutover.

-- ══════════════════════════════════════════════════════════════════════════════
-- A. Tables
-- ══════════════════════════════════════════════════════════════════════════════

-- Permission catalog — the ONLY permission strings that exist. Global, seeded,
-- immutable keys (module.resource.action). Not tenant data → no workspace_id.
create table public.permissions (
  key text primary key check (key ~ '^[a-z]+(?:_[a-z]+)*(?:\.[a-z]+(?:_[a-z]+)*){1,3}$'),
  module text not null,
  resource text not null,
  action text not null,
  label text not null,
  description text,
  is_field_level boolean not null default false,
  is_dangerous boolean not null default false,
  created_at timestamptz not null default now()
);
create index permissions_module_idx on public.permissions (module);

-- Roles — named permission bundles, scope-typed. System roles are global
-- immutable templates (organization_id null); custom roles clone a template.
create table public.roles (
  id uuid primary key default public.uuid_v7(),
  organization_id uuid references public.organizations (id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  scope text not null check (scope in ('platform', 'organization', 'workspace', 'portal')),
  is_system boolean not null default false,
  parent_role_id uuid references public.roles (id) on delete set null,
  -- Highest role key this role may itself grant (anti-escalation guardrail).
  assignable_ceiling text,
  is_administrative boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
-- System role keys are globally unique; custom role keys unique within an org.
create unique index roles_system_key_uidx on public.roles (key) where is_system and deleted_at is null;
create unique index roles_org_key_uidx on public.roles (organization_id, key) where not is_system and deleted_at is null;
create index roles_org_idx on public.roles (organization_id) where deleted_at is null;

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role_id, permission_key)
);

-- Surgical, DENY-capable per-principal overrides. Org-keyed for RLS; optional
-- workspace scope. Every row carries a mandatory reason (audited, shown in UI).
create table public.user_permission_overrides (
  id uuid primary key default public.uuid_v7(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  principal_id uuid not null references public.profiles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  effect text not null check (effect in ('allow', 'deny')),
  scope_type text not null default 'workspace'
    check (scope_type in ('organization', 'workspace', 'department', 'team', 'resource')),
  scope_id uuid,
  reason text not null check (char_length(reason) between 1 and 500),
  granted_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index user_perm_overrides_principal_idx on public.user_permission_overrides (principal_id, permission_key);
create index user_perm_overrides_workspace_idx on public.user_permission_overrides (workspace_id);

-- Resource-level ACL: project/document/deal/KB grants, Guest allowlists, portal shares.
create table public.resource_grants (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  resource_type text not null,
  resource_id uuid not null,
  principal_id uuid references public.profiles (id) on delete cascade,
  role_id uuid references public.roles (id) on delete cascade,
  client_account_id uuid,
  effect text not null default 'allow' check (effect in ('allow', 'deny')),
  capability text not null default 'view',
  reason text,
  granted_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (principal_id is not null or role_id is not null or client_account_id is not null)
);
create index resource_grants_resource_idx on public.resource_grants (workspace_id, resource_type, resource_id) where deleted_at is null;
create index resource_grants_principal_idx on public.resource_grants (principal_id) where deleted_at is null;

-- Organization policy caps — can only ever SUBTRACT capability from workspaces below.
create table public.organization_policies (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  policy_key text not null,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (organization_id, policy_key)
);

-- Link existing memberships to the new role model (backfilled below).
alter table public.workspace_members add column role_id uuid references public.roles (id);

create trigger roles_set_updated_at before update on public.roles
  for each row execute function public.set_updated_at();
create trigger resource_grants_set_updated_at before update on public.resource_grants
  for each row execute function public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- B. Seed — permission catalog (module.resource.action)
-- ══════════════════════════════════════════════════════════════════════════════
insert into public.permissions (key, module, resource, action, label, is_field_level, is_dangerous) values
  -- Users & access administration
  ('users.user.view','users','user','view','View users',false,false),
  ('users.user.create','users','user','create','Create users',false,false),
  ('users.user.invite','users','user','invite','Invite users',false,false),
  ('users.user.edit','users','user','edit','Edit users',false,false),
  ('users.user.suspend','users','user','suspend','Suspend users',false,true),
  ('users.user.restore','users','user','restore','Restore users',false,false),
  ('users.user.delete','users','user','delete','Delete users',false,true),
  ('users.role.assign','users','role','assign','Assign roles',false,true),
  ('users.role.manage','users','role','manage','Create & edit roles',false,true),
  ('users.permission.override','users','permission','override','Override permissions',false,true),
  -- Organization
  ('org.workspace.create','org','workspace','create','Create workspaces',false,false),
  ('org.ownership.transfer','org','ownership','transfer','Transfer ownership',false,true),
  ('org.policy.manage','org','policy','manage','Manage org policies',false,true),
  ('org.sso.manage','org','sso','manage','Manage SSO/SCIM',false,true),
  ('org.billing.manage','org','billing','manage','Manage billing',false,true),
  ('org.branding.manage','org','branding','manage','Manage branding',false,false),
  -- Dashboard
  ('dashboard.dashboard.view','dashboard','dashboard','view','View dashboard',false,false),
  -- CRM
  ('crm.crm.view','crm','crm','view','View CRM',false,false),
  ('crm.crm.edit','crm','crm','edit','Edit CRM',false,false),
  ('crm.crm.export','crm','crm','export','Export CRM',false,false),
  ('crm.crm.delete','crm','crm','delete','Delete CRM records',false,true),
  ('crm.lead.edit','crm','lead','edit','Edit leads',false,false),
  ('crm.campaign.manage','crm','campaign','manage','Manage campaigns',false,false),
  ('crm.deal.change_stage','crm','deal','change_stage','Change deal stage',false,false),
  ('crm.deal.value.view','crm','deal_value','view','View deal values',true,false),
  -- Projects & tasks
  ('projects.project.view','projects','project','view','View projects',false,false),
  ('projects.project.create','projects','project','create','Create projects',false,false),
  ('projects.project.edit','projects','project','edit','Edit projects',false,false),
  ('projects.project.assign','projects','project','assign','Assign projects',false,false),
  ('projects.project.archive','projects','project','archive','Archive projects',false,false),
  ('projects.project.delete','projects','project','delete','Delete projects',false,true),
  ('tasks.task.view','tasks','task','view','View tasks',false,false),
  ('tasks.task.create','tasks','task','create','Create tasks',false,false),
  ('tasks.task.edit','tasks','task','edit','Edit tasks',false,false),
  ('tasks.task.assign','tasks','task','assign','Assign tasks',false,false),
  ('tasks.task.delete','tasks','task','delete','Delete tasks',false,true),
  -- Finance
  ('finance.invoice.view','finance','invoice','view','View invoices',false,false),
  ('finance.invoice.create','finance','invoice','create','Create invoices',false,false),
  ('finance.invoice.edit','finance','invoice','edit','Edit invoices',false,false),
  ('finance.invoice.send','finance','invoice','send','Send invoices',false,true),
  ('finance.invoice.void','finance','invoice','void','Void invoices',false,true),
  ('finance.invoice.margin.view','finance','invoice_margin','view','View invoice margin',true,false),
  ('finance.expense.view','finance','expense','view','View expenses',false,false),
  ('finance.expense.create','finance','expense','create','Submit expenses',false,false),
  ('finance.expense.approve','finance','expense','approve','Approve expenses',false,false),
  ('finance.payment.view','finance','payment','view','View payments',false,false),
  ('finance.payment.record','finance','payment','record','Record payments',false,false),
  ('finance.report.view','finance','report','view','View financial reports',false,false),
  ('finance.report.export','finance','report','export','Export financial reports',false,false),
  -- Proposals & contracts
  ('proposals.proposal.view','proposals','proposal','view','View proposals',false,false),
  ('proposals.proposal.edit','proposals','proposal','edit','Edit proposals',false,false),
  ('proposals.proposal.send','proposals','proposal','send','Send proposals',false,true),
  ('contracts.contract.view','contracts','contract','view','View contracts',false,false),
  ('contracts.contract.edit','contracts','contract','edit','Edit contracts',false,false),
  ('contracts.contract.send','contracts','contract','send','Send contracts',false,true),
  ('contracts.contract.sign','contracts','contract','sign','Sign contracts',false,true),
  -- Documents & KB
  ('documents.document.view','documents','document','view','View documents',false,false),
  ('documents.document.upload','documents','document','upload','Upload documents',false,false),
  ('documents.document.edit','documents','document','edit','Edit documents',false,false),
  ('documents.document.delete','documents','document','delete','Delete documents',false,true),
  ('documents.document.share','documents','document','share','Share documents',false,false),
  ('documents.document.approve','documents','document','approve','Approve documents',false,false),
  ('kb.page.view','kb','page','view','View knowledge base',false,false),
  ('kb.page.edit','kb','page','edit','Edit knowledge base',false,false),
  -- Automation & AI
  ('automation.workflow.view','automation','workflow','view','View automations',false,false),
  ('automation.workflow.create','automation','workflow','create','Create automations',false,false),
  ('automation.workflow.edit','automation','workflow','edit','Edit automations',false,false),
  ('automation.workflow.delete','automation','workflow','delete','Delete automations',false,true),
  ('ai.workspace.use','ai','workspace','use','Use the AI workspace',false,false),
  ('ai.agent.manage','ai','agent','manage','Manage AI agents',false,false),
  ('ai.memory.manage','ai','memory','manage','Manage AI memory',false,false),
  ('ai.kb.manage','ai','kb','manage','Manage AI knowledge base',false,false),
  -- Team & HR
  ('team.member.view','team','member','view','View the team',false,false),
  ('hr.profile.view','hr','profile','view','View HR profiles',false,false),
  ('hr.profile.manage','hr','profile','manage','Manage HR profiles',false,false),
  ('hr.leave.request','hr','leave','request','Request leave',false,false),
  ('hr.leave.approve','hr','leave','approve','Approve leave',false,false),
  ('hr.compensation.view','hr','compensation','view','View compensation',true,false),
  ('hr.compensation.edit','hr','compensation','edit','Edit compensation',true,true),
  -- Analytics
  ('analytics.dashboard.view','analytics','dashboard','view','View analytics',false,false),
  ('analytics.report.export','analytics','report','export','Export reports',false,false),
  ('analytics.marketing.view','analytics','marketing','view','View marketing analytics',false,false),
  -- Client portal (portal side)
  ('portal.project.view','portal','project','view','Portal: view projects',false,false),
  ('portal.file.upload','portal','file','upload','Portal: upload files',false,false),
  ('portal.proposal.approve','portal','proposal','approve','Portal: approve proposals',false,false),
  ('portal.message.send','portal','message','send','Portal: send messages',false,false),
  ('portal.meeting.schedule','portal','meeting','schedule','Portal: schedule meetings',false,false),
  ('portal.invoice.pay','portal','invoice','pay','Portal: view & pay invoices',false,false),
  -- Settings
  ('settings.workspace.manage','settings','workspace','manage','Manage workspace settings',false,false),
  ('settings.security.manage','settings','security','manage','Manage security settings',false,true),
  ('settings.integrations.manage','settings','integrations','manage','Manage integrations',false,false),
  ('settings.apikey.manage','settings','apikey','manage','Manage API keys',false,true),
  -- Security administration
  ('security.session.manage','security','session','manage','Manage sessions',false,true),
  ('security.device.manage','security','device','manage','Manage devices',false,true),
  ('security.mfa.manage','security','mfa','manage','Manage MFA',false,true),
  ('security.audit.view','security','audit','view','View audit logs',false,false),
  -- Platform (super admin control plane)
  ('platform.org.manage','platform','org','manage','Manage organizations',false,true),
  ('platform.billing.manage','platform','billing','manage','Manage platform billing',false,true),
  ('platform.role.manage','platform','role','manage','Manage global roles/permissions',false,true),
  ('platform.provider.manage','platform','provider','manage','Manage AI providers',false,true),
  ('platform.flag.manage','platform','flag','manage','Manage feature flags',false,true),
  ('platform.marketplace.manage','platform','marketplace','manage','Manage marketplace',false,true),
  ('platform.audit.view','platform','audit','view','View global audit',false,false);

-- ══════════════════════════════════════════════════════════════════════════════
-- C. Seed — the 19 system roles (immutable templates)
-- ══════════════════════════════════════════════════════════════════════════════
insert into public.roles (key, name, scope, is_system, is_administrative, assignable_ceiling, description) values
  ('super_admin','Super Admin','platform',true,true,'super_admin','Operates the AurexOS platform; zero standing tenant-data access.'),
  ('organization_owner','Organization Owner','organization',true,true,'organization_owner','Owns the enterprise account: workspaces, billing, SSO, policy, ownership transfer.'),
  ('ceo','CEO','organization',true,false,null,'Executive visibility and steering across the organization; read/advise.'),
  ('operations_manager','Operations Manager','workspace',true,true,'project_manager','Runs the workspace: users, settings, automation, integrations.'),
  ('project_manager','Project Manager','workspace',true,false,'employee','Owns client delivery: projects, tasks, timelines, client comms.'),
  ('hr_manager','HR Manager','workspace',true,false,null,'People operations: profiles, leave, onboarding, compensation.'),
  ('finance_manager','Finance Manager','workspace',true,false,null,'Invoices, expenses, payments, financial reporting.'),
  ('sales_manager','Sales Manager','workspace',true,false,null,'CRM, pipeline, proposals, deal→project handoff.'),
  ('marketing_manager','Marketing Manager','workspace',true,false,null,'Demand gen, campaigns, content ops, marketing analytics.'),
  ('team_lead','Team Lead','workspace',true,false,null,'Leads a team/squad; assigns and reviews team work.'),
  ('employee','Employee','workspace',true,false,null,'Individual contributor: assigned work, documents, AI assistant.'),
  ('designer','Designer','workspace',true,false,null,'Employee specialization — design work and assets.'),
  ('developer','Developer','workspace',true,false,null,'Employee specialization — engineering work.'),
  ('seo_specialist','SEO Specialist','workspace',true,false,null,'Employee specialization — technical & on-page SEO.'),
  ('content_writer','Content Writer','workspace',true,false,null,'Employee specialization — content and copy.'),
  ('ai_automation_engineer','AI Automation Engineer','workspace',true,false,null,'Builds and operates the AI/automation layer.'),
  ('support_agent','Support Agent','workspace',true,false,null,'Internal help-desk / client success.'),
  ('client','Client','portal',true,false,null,'External client stakeholder — portal-only hard boundary.'),
  ('guest','Guest','workspace',true,false,null,'External collaborator — zero implicit access, allowlist grants only.');

-- Specialization templates inherit Employee.
update public.roles t set parent_role_id = e.id
from public.roles e where e.key='employee' and e.is_system
  and t.is_system and t.key in ('designer','developer','seo_specialist','content_writer');

-- ══════════════════════════════════════════════════════════════════════════════
-- D. Seed — role_permissions (the matrix, 05_User_Roles.md §6, extended)
--    Expressed as composable grants; refined + guarded by the test suite at 0019.
-- ══════════════════════════════════════════════════════════════════════════════
-- Helper convention: r() resolves a system role id by key.
-- Super Admin — platform control plane only.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r, public.permissions p
where r.key='super_admin' and r.is_system and p.module='platform';

-- Organization Owner — everything except the platform plane.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r, public.permissions p
where r.key='organization_owner' and r.is_system and p.module <> 'platform';

-- CEO — read/export across business modules; no administration.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r, public.permissions p
where r.key='ceo' and r.is_system
  and p.action in ('view','export')
  and p.is_field_level = false
  and p.module in ('dashboard','crm','projects','tasks','finance','proposals','contracts','documents','kb','analytics','hr','team','automation');

-- Operations Manager — full workspace administration minus org/billing/branding/role-authoring.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r, public.permissions p
where r.key='operations_manager' and r.is_system
  and p.module not in ('platform')
  and p.key not like 'org.%'
  and p.key not in ('org.branding.manage','org.billing.manage','users.role.manage','hr.compensation.edit','hr.compensation.view')
  and p.key <> 'users.user.delete'
  or (r.key='operations_manager' and r.is_system and p.key='org.workspace.create');

-- Project Manager — delivery + client comms.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r, public.permissions p
where r.key='project_manager' and r.is_system and p.key in (
  'dashboard.dashboard.view','crm.crm.view','crm.deal.value.view',
  'projects.project.view','projects.project.create','projects.project.edit','projects.project.assign','projects.project.archive',
  'tasks.task.view','tasks.task.create','tasks.task.edit','tasks.task.assign','tasks.task.delete',
  'proposals.proposal.view','proposals.proposal.edit','contracts.contract.view',
  'documents.document.view','documents.document.upload','documents.document.edit','documents.document.share','documents.document.approve',
  'kb.page.view','kb.page.edit','team.member.view','ai.workspace.use',
  'automation.workflow.view','automation.workflow.create','automation.workflow.edit',
  'analytics.dashboard.view','finance.invoice.view','finance.expense.view','finance.expense.create',
  'hr.leave.request');

-- HR Manager
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r, public.permissions p
where r.key='hr_manager' and r.is_system and (
  p.module='hr' or p.key in (
    'dashboard.dashboard.view','team.member.view','ai.workspace.use',
    'documents.document.view','kb.page.view','kb.page.edit','analytics.dashboard.view',
    'contracts.contract.view','hr.leave.request'));

-- Finance Manager
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r, public.permissions p
where r.key='finance_manager' and r.is_system and (
  p.module='finance' or p.key in (
    'dashboard.dashboard.view','crm.crm.view','crm.deal.value.view','contracts.contract.view',
    'hr.compensation.view','team.member.view','ai.workspace.use',
    'analytics.dashboard.view','analytics.report.export','documents.document.view','hr.leave.request',
    'finance.invoice.margin.view'));

-- Sales Manager
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r, public.permissions p
where r.key='sales_manager' and r.is_system and (
  p.module='crm' or p.module='proposals' or p.key in (
    'dashboard.dashboard.view','projects.project.view','contracts.contract.view','contracts.contract.edit',
    'finance.invoice.view','ai.workspace.use','analytics.dashboard.view','team.member.view',
    'documents.document.view','documents.document.upload','automation.workflow.view','automation.workflow.edit',
    'hr.leave.request'));

-- Marketing Manager
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r, public.permissions p
where r.key='marketing_manager' and r.is_system and p.key in (
  'dashboard.dashboard.view','crm.crm.view','crm.lead.edit','crm.campaign.manage',
  'kb.page.view','kb.page.edit','documents.document.view','documents.document.upload','documents.document.edit',
  'analytics.dashboard.view','analytics.marketing.view','analytics.report.export',
  'automation.workflow.view','automation.workflow.create','automation.workflow.edit',
  'ai.workspace.use','team.member.view','hr.leave.request');

-- Team Lead — Employee ⊕ team assignment/approval.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r, public.permissions p
where r.key='team_lead' and r.is_system and p.key in (
  'dashboard.dashboard.view','projects.project.view','projects.project.edit',
  'tasks.task.view','tasks.task.create','tasks.task.edit','tasks.task.assign',
  'documents.document.view','documents.document.upload','documents.document.edit',
  'kb.page.view','kb.page.edit','team.member.view','ai.workspace.use',
  'analytics.dashboard.view','hr.leave.request','hr.leave.approve','automation.workflow.view');

-- Employee (and, via identical grants, the four specialization templates).
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r, public.permissions p
where r.key in ('employee','designer','developer','seo_specialist','content_writer') and r.is_system and p.key in (
  'dashboard.dashboard.view','projects.project.view',
  'tasks.task.view','tasks.task.create','tasks.task.edit',
  'documents.document.view','documents.document.upload','documents.document.edit',
  'kb.page.view','kb.page.edit','team.member.view','ai.workspace.use',
  'analytics.dashboard.view','hr.leave.request');

-- AI Automation Engineer
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r, public.permissions p
where r.key='ai_automation_engineer' and r.is_system and (
  p.module='automation' or p.module='ai' or p.key in (
    'dashboard.dashboard.view','projects.project.view','tasks.task.view',
    'documents.document.view','kb.page.view','kb.page.edit','team.member.view',
    'analytics.dashboard.view','settings.integrations.manage','hr.leave.request'));

-- Support Agent
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r, public.permissions p
where r.key='support_agent' and r.is_system and p.key in (
  'dashboard.dashboard.view','projects.project.view','tasks.task.view',
  'crm.crm.view','portal.message.send','kb.page.view','kb.page.edit',
  'team.member.view','ai.workspace.use','hr.leave.request');

-- Client — portal capabilities only.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r, public.permissions p
where r.key='client' and r.is_system and p.module='portal';

-- Guest — zero implicit permissions (access is entirely via resource_grants).

-- ══════════════════════════════════════════════════════════════════════════════
-- E. Backfill workspace_members.role_id from the legacy role enum
-- ══════════════════════════════════════════════════════════════════════════════
update public.workspace_members m
set role_id = r.id
from public.roles r
where r.is_system and r.deleted_at is null
  and r.key = case
    when m.role = 'owner' then 'operations_manager'
    when m.role = 'admin' then 'operations_manager'
    when m.role = 'project_manager' then 'project_manager'
    when m.role = 'sales' then 'sales_manager'
    when m.role = 'finance' then 'finance_manager'
    when m.role = 'hr' then 'hr_manager'
    when m.role = 'client' then 'client'
    when m.role = 'guest' then 'guest'
    when m.role = 'member' then case m.specialization
        when 'developer' then 'developer'
        when 'designer' then 'designer'
        when 'seo' then 'seo_specialist'
        when 'content' then 'content_writer'
        else 'employee'
      end
    else 'employee'
  end;

-- ══════════════════════════════════════════════════════════════════════════════
-- F. RLS
-- ══════════════════════════════════════════════════════════════════════════════
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.resource_grants enable row level security;
alter table public.organization_policies enable row level security;

-- Catalog + roles + role_permissions are configuration (not tenant data): any
-- authenticated principal may read them to resolve access. Writes to system rows
-- are service-role only (no policy); custom-role write policies land with the UI.
create policy permissions_select on public.permissions for select
  using (auth.uid() is not null);

create policy roles_select on public.roles for select
  using (auth.uid() is not null and (is_system or public.is_org_member(organization_id)));

create policy role_permissions_select on public.role_permissions for select
  using (auth.uid() is not null);

-- Overrides: org members read; org owner/admin (or the future permission holder) write.
create policy user_perm_overrides_select on public.user_permission_overrides for select
  using (public.is_org_member(organization_id));
create policy user_perm_overrides_write on public.user_permission_overrides for all
  using (public.org_role_of(organization_id) in ('owner', 'admin'))
  with check (public.org_role_of(organization_id) in ('owner', 'admin'));

-- Resource grants: workspace members read; workspace owner/admin manage.
create policy resource_grants_select on public.resource_grants for select
  using (public.is_workspace_member(workspace_id));
create policy resource_grants_write on public.resource_grants for all
  using (public.workspace_role_of(workspace_id) in ('owner', 'admin', 'project_manager'))
  with check (public.workspace_role_of(workspace_id) in ('owner', 'admin', 'project_manager'));

-- Org policies: org members read; org owner/admin manage.
create policy organization_policies_select on public.organization_policies for select
  using (public.is_org_member(organization_id));
create policy organization_policies_write on public.organization_policies for all
  using (public.org_role_of(organization_id) in ('owner', 'admin'))
  with check (public.org_role_of(organization_id) in ('owner', 'admin'));
