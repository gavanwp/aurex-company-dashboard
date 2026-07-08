-- 0005 — Platform tables: domain events, audit log, notifications
-- domain_events and audit_log are APPEND-ONLY: insert + select policies exist,
-- update/delete policies deliberately do not (12_Project_Rules.md).

create table public.domain_events (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index domain_events_workspace_time_idx on public.domain_events (workspace_id, created_at desc);
create index domain_events_type_idx on public.domain_events (workspace_id, event_type);

create table public.audit_log (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_workspace_time_idx on public.audit_log (workspace_id, created_at desc);

create table public.notifications (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);

alter table public.domain_events enable row level security;
alter table public.audit_log enable row level security;
alter table public.notifications enable row level security;

create policy domain_events_insert on public.domain_events for insert
  with check (public.is_workspace_member(workspace_id) and actor_id = auth.uid());

create policy domain_events_select on public.domain_events for select
  using (public.is_workspace_member(workspace_id));

create policy audit_log_insert on public.audit_log for insert
  with check (public.is_workspace_member(workspace_id) and actor_id = auth.uid());

create policy audit_log_select on public.audit_log for select
  using (public.workspace_role_of(workspace_id) in ('owner', 'admin'));

create policy notifications_select on public.notifications for select
  using (user_id = auth.uid());

create policy notifications_update on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_insert on public.notifications for insert
  with check (public.is_workspace_member(workspace_id));
