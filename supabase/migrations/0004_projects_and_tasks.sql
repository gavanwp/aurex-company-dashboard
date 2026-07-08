-- 0004 — Projects and Tasks modules

create type public.project_status as enum ('planning', 'active', 'on_hold', 'completed', 'archived');
create type public.task_status as enum ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'canceled');
create type public.task_priority as enum ('none', 'low', 'medium', 'high', 'urgent');

create table public.projects (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  name text not null check (char_length(name) between 1 and 160),
  code text check (code is null or char_length(code) <= 12),
  description text,
  status public.project_status not null default 'planning',
  color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  start_date date,
  due_date date,
  budget_cents bigint check (budget_cents is null or budget_cents >= 0),
  owner_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index projects_workspace_idx on public.projects (workspace_id, status) where deleted_at is null;

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.tasks (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null check (char_length(title) between 1 and 300),
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'none',
  assignee_id uuid references public.profiles (id) on delete set null,
  reporter_id uuid references public.profiles (id) on delete set null,
  due_date date,
  estimate_hours numeric(6, 2) check (estimate_hours is null or estimate_hours >= 0),
  position double precision not null default 0,
  labels text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tasks_workspace_status_idx on public.tasks (workspace_id, status) where deleted_at is null;
create index tasks_project_idx on public.tasks (project_id) where deleted_at is null;
create index tasks_assignee_idx on public.tasks (workspace_id, assignee_id) where deleted_at is null;

create table public.task_comments (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index task_comments_task_idx on public.task_comments (task_id) where deleted_at is null;

create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger task_comments_set_updated_at before update on public.task_comments
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;

create policy projects_all on public.projects for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy project_members_all on public.project_members for all
  using (exists (
    select 1 from public.projects p
    where p.id = project_members.project_id and public.is_workspace_member(p.workspace_id)
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = project_members.project_id and public.is_workspace_member(p.workspace_id)
  ));

create policy tasks_all on public.tasks for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy task_comments_all on public.task_comments for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
