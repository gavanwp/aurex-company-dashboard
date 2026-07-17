-- 0017 — Organization tier (Enterprise Identity & RBAC, step 1 of the sequence)
-- Docs: docs/architecture/EnterpriseIdentityAndRBAC.md §1.1, §9; ADR-0008.
--
-- Adds an Organization ABOVE the workspace: billing/branding/SSO/policy tenant.
-- The workspace stays the RLS + join-locality boundary (09_Scaling_Strategy.md
-- §1.2) — organizations are a parent grouping only. This migration is
-- deliberately NO-BEHAVIOR-CHANGE: every existing workspace is backfilled a
-- 1:1 organization, create_workspace is updated so new workspaces keep working,
-- and no application code reads organizations yet.

-- ── Organizations ─────────────────────────────────────────────────────────────
create table public.organizations (
  id uuid primary key default public.uuid_v7(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  -- Enterprise account facets (dormant until the SaaS phases wire them).
  plan text not null default 'free' check (plan in ('free', 'pro', 'business', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'suspended', 'cancelled')),
  billing_customer_ref text,
  -- White-label branding + SSO realm config (EnterpriseIdentityAndRBAC.md §8).
  branding jsonb not null default '{}',
  sso_config jsonb not null default '{}',
  -- Placement for the Phase-5 cell-sharding path (09_Scaling_Strategy.md §2.5).
  data_region text,
  cell_id text,
  -- Reseller / white-label hierarchies: a partner org may parent sub-orgs.
  parent_org_id uuid references public.organizations (id) on delete set null,
  owner_principal_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index organizations_parent_idx on public.organizations (parent_org_id) where deleted_at is null;
create index organizations_owner_idx on public.organizations (owner_principal_id) where deleted_at is null;

-- ── Organization membership ───────────────────────────────────────────────────
-- Coarse org role for now (owner/admin/member); the full data-driven role engine
-- lands in 0018 and will layer over this without a rewrite.
create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  principal_id uuid not null references public.profiles (id) on delete cascade,
  org_role text not null default 'member' check (org_role in ('owner', 'admin', 'member')),
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  primary key (organization_id, principal_id)
);

create index organization_members_principal_idx on public.organization_members (principal_id);

-- ── Helpers (mirror is_workspace_member / workspace_role_of, ADR-0001) ─────────
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id and principal_id = auth.uid()
  );
$$;

create or replace function public.org_role_of(org_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select org_role from public.organization_members
  where organization_id = org_id and principal_id = auth.uid();
$$;

-- ── Link workspaces to organizations ──────────────────────────────────────────
alter table public.workspaces
  add column organization_id uuid references public.organizations (id) on delete cascade;

-- ── Backfill: one organization per existing workspace (1:1) ────────────────────
do $$
declare
  w record;
  new_org uuid;
begin
  for w in select id, name, slug, created_by from public.workspaces where organization_id is null loop
    new_org := public.uuid_v7();
    insert into public.organizations (id, name, slug, owner_principal_id)
      values (new_org, w.name, w.slug, w.created_by);
    if w.created_by is not null then
      insert into public.organization_members (organization_id, principal_id, org_role, status)
        values (new_org, w.created_by, 'owner', 'active')
        on conflict do nothing;
    end if;
    update public.workspaces set organization_id = new_org where id = w.id;
  end loop;
end $$;

-- Every existing workspace member becomes a member of that workspace's org, so
-- is_org_member() is true for exactly the people it should be.
insert into public.organization_members (organization_id, principal_id, org_role, status)
select w.organization_id, m.user_id,
       case when m.role = 'owner' then 'owner' when m.role = 'admin' then 'admin' else 'member' end,
       'active'
from public.workspace_members m
join public.workspaces w on w.id = m.workspace_id
where w.organization_id is not null
on conflict (organization_id, principal_id) do nothing;

-- Now that every row is backfilled, make the link mandatory.
alter table public.workspaces alter column organization_id set not null;
create index workspaces_organization_idx on public.workspaces (organization_id) where deleted_at is null;

-- ── updated_at trigger ─────────────────────────────────────────────────────────
create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

-- ── create_workspace v2: also creates the owning organization ──────────────────
-- New workspaces must carry an organization_id (now NOT NULL). This keeps the
-- onboarding flow working unchanged from the caller's perspective — it still
-- calls create_workspace(name) and gets a workspace back.
create or replace function public.create_workspace(workspace_name text)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  final_slug text;
  suffix int := 0;
  new_org uuid;
  ws public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  base_slug := lower(regexp_replace(regexp_replace(trim(workspace_name), '[^a-zA-Z0-9\s-]', '', 'g'), '[\s_]+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  base_slug := left(coalesce(nullif(base_slug, ''), 'workspace'), 40);
  final_slug := base_slug;

  -- Slug must be unique across BOTH workspaces and organizations (they share it 1:1).
  while exists (select 1 from public.workspaces where slug = final_slug)
     or exists (select 1 from public.organizations where slug = final_slug) loop
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.organizations (name, slug, owner_principal_id)
  values (trim(workspace_name), final_slug, auth.uid())
  returning id into new_org;

  insert into public.organization_members (organization_id, principal_id, org_role, status)
  values (new_org, auth.uid(), 'owner', 'active');

  insert into public.workspaces (name, slug, created_by, organization_id)
  values (trim(workspace_name), final_slug, auth.uid(), new_org)
  returning * into ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws.id, auth.uid(), 'owner');

  return ws;
end;
$$;

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- Organizations: members read; owner/admin update. Creation happens only through
-- create_workspace() (security definer), so there is deliberately no insert policy.
create policy organizations_select on public.organizations for select
  using (public.is_org_member(id) and deleted_at is null);

create policy organizations_update on public.organizations for update
  using (public.org_role_of(id) in ('owner', 'admin'))
  with check (public.org_role_of(id) in ('owner', 'admin'));

-- Membership: members see the org roster; owner/admin manage it; anyone may leave.
create policy organization_members_select on public.organization_members for select
  using (public.is_org_member(organization_id));

create policy organization_members_insert on public.organization_members for insert
  with check (public.org_role_of(organization_id) in ('owner', 'admin'));

create policy organization_members_update on public.organization_members for update
  using (public.org_role_of(organization_id) in ('owner', 'admin'));

create policy organization_members_delete on public.organization_members for delete
  using (
    public.org_role_of(organization_id) in ('owner', 'admin')
    or principal_id = auth.uid()
  );
