-- ============================================================================
-- RLS smoke suite — R-D1 (RLS on every table), R-S7 (adversarial: forbidden
-- access must FAIL), tenant isolation per ADR-0001 / 08_Tech_Stack.md §8.
--
-- Plain SQL + DO-block assertions (no pgTAP dependency): any violated assert
-- raises an exception, psql exits non-zero, CI goes red.
--
-- Run:   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--          -v ON_ERROR_STOP=1 -f supabase/tests/rls_smoke.sql
-- Needs: `supabase start` (or db reset) so migrations + seed/seed.sql applied.
--
-- Everything runs inside one transaction and rolls back — the fixture tenant B
-- created below never persists.
-- ============================================================================

begin;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. R-D1 lint-as-test: EVERY table in public must have RLS enabled.
--    A migration adding a table without RLS fails here by name.
-- ────────────────────────────────────────────────────────────────────────────
do $$
declare
  offenders text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into offenders
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p') -- ordinary + partitioned tables
    and not c.relrowsecurity;

  if offenders is not null then
    raise exception 'R-D1 violation — tables without row-level security: %', offenders;
  end if;
  raise notice 'PASS: RLS enabled on every public table';
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Fixture: a second tenant (created as superuser — bypasses RLS).
--    Seed provides tenant A only:
--      user A       00000000-0000-0000-0000-000000000001 (demo@aurexdesigns.com)
--      workspace A  00000000-0000-0000-0000-00000000aa01 (AurexDesigns)
--    We add tenant B with one row in each representative table, plus a jobs
--    row in BOTH workspaces (jobs must be invisible even in your own tenant).
-- ────────────────────────────────────────────────────────────────────────────
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'rls-tenant-b@example.com',
  crypt('rls-smoke-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Tenant B Owner"}',
  now(), now()
); -- handle_new_user() trigger creates the matching public.profiles row

insert into public.workspaces (id, name, slug, created_by) values
  ('00000000-0000-0000-0000-00000000bb01', 'RLS Tenant B', 'rls-tenant-b',
   '00000000-0000-0000-0000-000000000002');

insert into public.workspace_members (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-000000000002', 'owner');

insert into public.clients (id, workspace_id, name, status) values
  ('00000000-0000-0000-0000-00000000cb01', '00000000-0000-0000-0000-00000000bb01',
   'Tenant B Confidential Client', 'active');

insert into public.projects (id, workspace_id, client_id, name, status) values
  ('00000000-0000-0000-0000-00000000fb01', '00000000-0000-0000-0000-00000000bb01',
   '00000000-0000-0000-0000-00000000cb01', 'Tenant B Secret Project', 'active');

insert into public.tasks (workspace_id, project_id, title) values
  ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-00000000fb01',
   'Tenant B secret task');

insert into public.invoices (workspace_id, client_id, number, total_minor, subtotal_minor) values
  ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-00000000cb01',
   'B-INV-0001', 990000, 990000);

insert into public.ai_conversations (workspace_id, user_id, title) values
  ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-000000000002',
   'Tenant B private conversation');

insert into public.embeddings (workspace_id, source_type, entity_ref, chunk_index, content, embedding) values
  ('00000000-0000-0000-0000-00000000bb01', 'project',
   '00000000-0000-0000-0000-00000000fb01', 0,
   'Tenant B secret retrieval chunk',
   array_fill(0, array[1536])::vector);

-- jobs in both tenants: service-role only, zero policies (migration 0011).
insert into public.jobs (workspace_id, queue, job_key) values
  ('00000000-0000-0000-0000-00000000aa01', 'rls_smoke', 'rls-smoke-tenant-a'),
  ('00000000-0000-0000-0000-00000000bb01', 'rls_smoke', 'rls-smoke-tenant-b');

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Impersonate user A (authenticated). auth.uid() reads the JWT claims GUC —
--    same mechanism PostgREST uses — so RLS evaluates exactly as in production.
-- ────────────────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  n bigint;
begin
  -- Positive control first: if user A saw nothing at all, the zero-row
  -- assertions below would pass vacuously. A must see their own tenant.
  select count(*) into n from public.workspaces
    where id = '00000000-0000-0000-0000-00000000aa01';
  if n <> 1 then
    raise exception 'CONTROL FAIL: user A cannot see their own workspace (claims wiring broken?)';
  end if;

  select count(*) into n from public.projects
    where workspace_id = '00000000-0000-0000-0000-00000000aa01';
  if n < 1 then
    raise exception 'CONTROL FAIL: user A sees no rows in their own projects';
  end if;
  raise notice 'PASS: positive control — user A sees workspace A data';

  -- Adversarial: user A must see ZERO rows from workspace B, table by table.
  select count(*) into n from public.workspaces
    where id = '00000000-0000-0000-0000-00000000bb01';
  if n <> 0 then raise exception 'RLS FAIL: workspaces leaks tenant B to user A'; end if;

  select count(*) into n from public.projects
    where workspace_id = '00000000-0000-0000-0000-00000000bb01';
  if n <> 0 then raise exception 'RLS FAIL: projects leaks tenant B to user A'; end if;

  select count(*) into n from public.tasks
    where workspace_id = '00000000-0000-0000-0000-00000000bb01';
  if n <> 0 then raise exception 'RLS FAIL: tasks leaks tenant B to user A'; end if;

  select count(*) into n from public.invoices
    where workspace_id = '00000000-0000-0000-0000-00000000bb01';
  if n <> 0 then raise exception 'RLS FAIL: invoices leaks tenant B to user A'; end if;

  select count(*) into n from public.ai_conversations
    where workspace_id = '00000000-0000-0000-0000-00000000bb01';
  if n <> 0 then raise exception 'RLS FAIL: ai_conversations leaks tenant B to user A'; end if;

  select count(*) into n from public.embeddings
    where workspace_id = '00000000-0000-0000-0000-00000000bb01';
  if n <> 0 then raise exception 'RLS FAIL: embeddings leaks tenant B to user A'; end if;
  raise notice 'PASS: user A sees zero tenant-B rows across representative tables';

  -- jobs is service-role only (0011): deny-by-default — zero rows visible to
  -- ANY authenticated user, including in their own workspace.
  select count(*) into n from public.jobs;
  if n <> 0 then raise exception 'RLS FAIL: jobs visible to authenticated role (must be service-role only)'; end if;
  raise notice 'PASS: jobs table returns zero rows for authenticated users';
end $$;

-- Adversarial write path: user A must not be able to INSERT into workspace B.
do $$
begin
  begin
    insert into public.projects (workspace_id, name)
    values ('00000000-0000-0000-0000-00000000bb01', 'intruder project');
    raise exception 'RLS FAIL: cross-tenant INSERT into projects was allowed';
  exception
    when insufficient_privilege then
      raise notice 'PASS: cross-tenant INSERT rejected by RLS (42501)';
  end;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Anonymous role: no claims, no rows. Deny-by-default for the unauthenticated.
-- ────────────────────────────────────────────────────────────────────────────
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
declare
  n bigint;
begin
  select count(*) into n from public.workspaces;
  if n <> 0 then raise exception 'RLS FAIL: anon can read workspaces'; end if;

  select count(*) into n from public.projects;
  if n <> 0 then raise exception 'RLS FAIL: anon can read projects'; end if;

  select count(*) into n from public.invoices;
  if n <> 0 then raise exception 'RLS FAIL: anon can read invoices'; end if;

  select count(*) into n from public.jobs;
  if n <> 0 then raise exception 'RLS FAIL: anon can read jobs'; end if;
  raise notice 'PASS: anon sees zero rows everywhere';
end $$;

reset role;

do $$ begin raise notice 'RLS smoke suite: ALL PASSED'; end $$;

-- Fixtures are test-local only.
rollback;
