-- 0003 — Clients (shared entity) + CRM module (contacts, deals)
-- Phase 1 RLS grants module access at workspace-membership level; capability
-- granularity (05_User_Roles.md matrix) is enforced by can() in server actions.
-- RLS is the tenancy backstop — a bug in the app can never cross workspaces.

create type public.client_status as enum ('prospect', 'active', 'paused', 'churned');
create type public.deal_stage as enum ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost');

create table public.clients (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  website text,
  industry text,
  status public.client_status not null default 'prospect',
  owner_id uuid references public.profiles (id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index clients_workspace_idx on public.clients (workspace_id) where deleted_at is null;

create table public.crm_contacts (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 160),
  email text,
  phone text,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index crm_contacts_workspace_idx on public.crm_contacts (workspace_id) where deleted_at is null;
create index crm_contacts_client_idx on public.crm_contacts (client_id);

create table public.crm_deals (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  contact_id uuid references public.crm_contacts (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  stage public.deal_stage not null default 'lead',
  value_cents bigint check (value_cents is null or value_cents >= 0),
  currency char(3) not null default 'USD',
  probability int check (probability is null or probability between 0 and 100),
  expected_close_date date,
  owner_id uuid references public.profiles (id),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index crm_deals_workspace_stage_idx on public.crm_deals (workspace_id, stage) where deleted_at is null;

create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger crm_contacts_set_updated_at before update on public.crm_contacts
  for each row execute function public.set_updated_at();
create trigger crm_deals_set_updated_at before update on public.crm_deals
  for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_deals enable row level security;

create policy clients_all on public.clients for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy crm_contacts_all on public.crm_contacts for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy crm_deals_all on public.crm_deals for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
