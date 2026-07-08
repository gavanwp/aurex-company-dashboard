-- 0002 — Identity, workspaces, membership (the tenancy root)
-- Every tenant table from here on references workspaces and is guarded by RLS
-- through is_workspace_member() / workspace_role_of(). See ADR-0001.

-- ── Profiles: public mirror of auth.users ──────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Workspaces ──────────────────────────────────────────────────────────────
create table public.workspaces (
  id uuid primary key default public.uuid_v7(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_url text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create type public.workspace_role as enum (
  'owner', 'admin', 'project_manager', 'member', 'sales', 'finance', 'hr', 'client', 'guest'
);

create type public.member_specialization as enum (
  'developer', 'designer', 'seo', 'content', 'marketing'
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.workspace_role not null default 'member',
  specialization public.member_specialization,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

-- ── Tenancy helpers ─────────────────────────────────────────────────────────
-- SECURITY DEFINER so policies on workspace_members don't recurse into themselves.
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role_of(ws_id uuid)
returns public.workspace_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.workspace_members
  where workspace_id = ws_id and user_id = auth.uid();
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

-- Profiles: yourself, plus anyone you share a workspace with.
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.workspace_members mine
      join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );

create policy profiles_update_self on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Workspaces: members read; owner/admin update; creation only via create_workspace().
create policy workspaces_select on public.workspaces for select
  using (public.is_workspace_member(id) and deleted_at is null);

create policy workspaces_update on public.workspaces for update
  using (public.workspace_role_of(id) in ('owner', 'admin'))
  with check (public.workspace_role_of(id) in ('owner', 'admin'));

-- Membership: members see the roster; owner/admin manage it.
create policy workspace_members_select on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

create policy workspace_members_insert on public.workspace_members for insert
  with check (public.workspace_role_of(workspace_id) in ('owner', 'admin'));

create policy workspace_members_update on public.workspace_members for update
  using (public.workspace_role_of(workspace_id) in ('owner', 'admin'));

create policy workspace_members_delete on public.workspace_members for delete
  using (
    public.workspace_role_of(workspace_id) in ('owner', 'admin')
    or user_id = auth.uid() -- anyone may leave
  );

-- ── Workspace bootstrap RPC ─────────────────────────────────────────────────
-- Atomic workspace + owner membership; the only path that creates a workspace.
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

  while exists (select 1 from public.workspaces where slug = final_slug) loop
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.workspaces (name, slug, created_by)
  values (trim(workspace_name), final_slug, auth.uid())
  returning * into ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws.id, auth.uid(), 'owner');

  return ws;
end;
$$;
