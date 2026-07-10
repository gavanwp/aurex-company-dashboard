-- Deterministic demo seed (13_Folder_Structure.md: supabase/seed/).
-- Local/dev ONLY — creates a demo login and a populated workspace.
--   email: demo@aurexdesigns.com   password: aurexos-demo
-- Fixed UUIDs so tests and docs can reference entities stably.

-- ── Demo user (auth) ─────────────────────────────────────────────────────────
-- Token columns must be '' (not NULL): GoTrue scans them as strings, and a
-- NULL breaks every login for the row with "Database error querying schema".
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'demo@aurexdesigns.com',
  crypt('aurexos-demo', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Demo Founder"}',
  now(), now(),
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"demo@aurexdesigns.com","email_verified":true}',
  'email', now(), now()
) on conflict (provider_id, provider) do nothing;

-- ── Workspace + membership ───────────────────────────────────────────────────
insert into public.workspaces (id, name, slug, created_by)
values ('00000000-0000-0000-0000-00000000aa01', 'AurexDesigns', 'aurexdesigns',
        '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.workspace_members (workspace_id, user_id, role)
values ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-000000000001', 'owner')
on conflict do nothing;

-- ── Clients ──────────────────────────────────────────────────────────────────
insert into public.clients (id, workspace_id, name, website, industry, status, owner_id) values
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000aa01',
   'Meridian Retail Group', 'https://meridianretail.example.com', 'E-commerce', 'active',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-00000000aa01',
   'Northwind Legal', 'https://northwindlegal.example.com', 'Legal services', 'active',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-00000000c003', '00000000-0000-0000-0000-00000000aa01',
   'Bloom Wellness Co', 'https://bloomwellness.example.com', 'Health & wellness', 'prospect',
   '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- ── CRM contacts + deals ─────────────────────────────────────────────────────
insert into public.crm_contacts (id, workspace_id, client_id, full_name, email, title) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000aa01',
   '00000000-0000-0000-0000-00000000c001', 'Sarah Mitchell', 'sarah@meridianretail.example.com', 'Marketing Director'),
  ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000aa01',
   '00000000-0000-0000-0000-00000000c002', 'James Okafor', 'james@northwindlegal.example.com', 'Managing Partner'),
  ('00000000-0000-0000-0000-00000000d003', '00000000-0000-0000-0000-00000000aa01',
   '00000000-0000-0000-0000-00000000c003', 'Priya Raman', 'priya@bloomwellness.example.com', 'Founder')
on conflict (id) do nothing;

insert into public.crm_deals (id, workspace_id, client_id, contact_id, title, stage, value_cents, probability, expected_close_date, owner_id, source) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000aa01',
   '00000000-0000-0000-0000-00000000c003', '00000000-0000-0000-0000-00000000d003',
   'Bloom Wellness — brand + website', 'proposal', 1850000, 60, current_date + 21,
   '00000000-0000-0000-0000-000000000001', 'Referral'),
  ('00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000aa01',
   '00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000d001',
   'Meridian — AI chatbot rollout', 'qualified', 3200000, 40, current_date + 45,
   '00000000-0000-0000-0000-000000000001', 'Existing client'),
  ('00000000-0000-0000-0000-00000000e003', '00000000-0000-0000-0000-00000000aa01',
   '00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-00000000d002',
   'Northwind — SEO retainer', 'negotiation', 900000, 75, current_date + 10,
   '00000000-0000-0000-0000-000000000001', 'Outbound')
on conflict (id) do nothing;

-- ── Projects + tasks ─────────────────────────────────────────────────────────
insert into public.projects (id, workspace_id, client_id, name, code, description, status, color, start_date, due_date, budget_cents, owner_id) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000aa01',
   '00000000-0000-0000-0000-00000000c001', 'Meridian storefront redesign', 'MER',
   'Full redesign and rebuild of the Meridian e-commerce storefront.', 'active', '#6366f1',
   current_date - 30, current_date + 40, 4500000, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000aa01',
   '00000000-0000-0000-0000-00000000c002', 'Northwind SEO program', 'NWL',
   'Technical SEO fixes and a six-month content program.', 'active', '#10b981',
   current_date - 14, current_date + 120, 900000, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-00000000f003', '00000000-0000-0000-0000-00000000aa01',
   null, 'AurexOS internal build', 'AOS',
   'Building the AI operating system this workspace runs on.', 'active', '#f59e0b',
   current_date - 7, null, null, '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.tasks (workspace_id, project_id, title, status, priority, assignee_id, reporter_id, due_date, position, labels) values
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-00000000f001',
   'Design homepage hero concepts', 'in_review', 'high', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001', current_date + 2, 1, '{design}'),
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-00000000f001',
   'Implement product listing page', 'in_progress', 'high', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001', current_date + 7, 2, '{frontend}'),
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-00000000f001',
   'Set up checkout analytics events', 'todo', 'medium', null,
   '00000000-0000-0000-0000-000000000001', current_date + 14, 3, '{analytics}'),
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-00000000f002',
   'Fix crawl errors from site audit', 'in_progress', 'urgent', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001', current_date + 1, 1, '{seo}'),
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-00000000f002',
   'Draft pillar article: contract law FAQs', 'todo', 'medium', null,
   '00000000-0000-0000-0000-000000000001', current_date + 10, 2, '{content,seo}'),
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-00000000f003',
   'Ship Phase 1 MVP', 'in_progress', 'urgent', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001', current_date + 30, 1, '{internal}');
