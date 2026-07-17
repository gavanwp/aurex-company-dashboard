-- 0020 — Permission catalog: clients + meetings (RBAC guard migration support)
-- Docs: docs/architecture/EnterpriseIdentityAndRBAC.md §2.3; ADR-0008.
--
-- The 0018 catalog covered the brief's modules; the guard migration (0019-cutover
-- continued) also needs permission keys for the existing Clients and Meetings
-- modules. Adds those atomic permissions and grants them to the system roles so
-- the engine reproduces the pre-cutover access for those modules.

insert into public.permissions (key, module, resource, action, label, is_field_level, is_dangerous) values
  ('clients.client.view','clients','client','view','View clients',false,false),
  ('clients.client.edit','clients','client','edit','Create & edit clients',false,false),
  ('clients.client.delete','clients','client','delete','Delete clients',false,true),
  ('meetings.meeting.view','meetings','meeting','view','View meetings',false,false),
  ('meetings.meeting.edit','meetings','meeting','edit','Run meetings (agenda, notes, decisions)',false,false);

-- ── Clients grants ─────────────────────────────────────────────────────────────
-- View: every internal delivery/sales/finance role (matches the pre-cutover map).
insert into public.role_permissions (role_id, permission_key)
select r.id, 'clients.client.view' from public.roles r
where r.is_system and r.key in (
  'organization_owner','operations_manager','project_manager','sales_manager','marketing_manager',
  'finance_manager','team_lead','employee','designer','developer','seo_specialist','content_writer',
  'ai_automation_engineer','support_agent');
-- Edit: managers who own client relationships.
insert into public.role_permissions (role_id, permission_key)
select r.id, 'clients.client.edit' from public.roles r
where r.is_system and r.key in (
  'organization_owner','operations_manager','project_manager','sales_manager','marketing_manager');
-- Delete: workspace admins only.
insert into public.role_permissions (role_id, permission_key)
select r.id, 'clients.client.delete' from public.roles r
where r.is_system and r.key in ('organization_owner','operations_manager');

-- ── Meetings grants ────────────────────────────────────────────────────────────
-- Meetings are broad internal team work (05_User_Roles.md): every internal role
-- may view and run them; portal roles (client, guest) are excluded.
insert into public.role_permissions (role_id, permission_key)
select r.id, k.key from public.roles r
cross join (values ('meetings.meeting.view'), ('meetings.meeting.edit')) as k(key)
where r.is_system and r.scope in ('organization','workspace')
  and r.key not in ('super_admin');
