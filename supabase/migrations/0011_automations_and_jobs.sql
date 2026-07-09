-- 0011 — Automation Studio and the background job queue
-- Tables: automations, automation_runs, jobs
-- Docs: 06_Module_Breakdown.md §17; ADR-0005 (Background Jobs Postgres-First).
-- automation_runs is run history (append + system-updated only; no user UPDATE,
-- no soft delete). jobs rows are transient work items: no deleted_at, a status
-- lifecycle instead, and service-role-only access.

-- ── Automations ──────────────────────────────────────────────────────────────
create table public.automations (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  trigger_event_type text not null,
  -- Trigger predicate over the event payload. Governed by
  -- AutomationTriggerFilterSchema (packages/core/src/schemas/automation.ts).
  trigger_filter jsonb not null default '{}',
  -- Condition branches. Governed by AutomationConditionGraphSchema (packages/core).
  condition_graph jsonb not null default '{}',
  -- Ordered action list (registry action keys + inputs). Governed by
  -- AutomationActionsSchema (packages/core/src/schemas/automation.ts).
  actions jsonb not null default '[]',
  -- Retry/circuit-breaker policy. Governed by AutomationErrorPolicySchema (packages/core).
  error_policy jsonb not null default '{}',
  -- Automations run with the creator's permissions, re-validated per run; if the
  -- owner loses the permission (or is removed → null), the automation pauses.
  owner_user_id uuid references public.profiles (id) on delete set null,
  scope text not null default 'workspace' check (scope in ('workspace', 'project', 'module')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index automations_workspace_status_idx on public.automations (workspace_id, status) where deleted_at is null;
create index automations_trigger_idx on public.automations (workspace_id, trigger_event_type)
  where status = 'active' and deleted_at is null;

-- ── Automation runs (history stream: insert + system update, never user-edited)
create table public.automation_runs (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  automation_id uuid not null references public.automations (id) on delete cascade,
  -- References domain_events.id. Deliberately no FK: the event stream is
  -- partitioned/archived on its own lifecycle (DatabaseArchitecture.md §10) and
  -- run history must survive event archival.
  trigger_event_id uuid,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'cancelled')),
  -- Per-step outcomes. Governed by AutomationStepResultsSchema (packages/core).
  step_results jsonb not null default '[]',
  error jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index automation_runs_automation_idx on public.automation_runs (automation_id, started_at desc);
create index automation_runs_workspace_status_idx on public.automation_runs (workspace_id, status, started_at desc);

create trigger automations_set_updated_at before update on public.automations
  for each row execute function public.set_updated_at();
create trigger automation_runs_set_updated_at before update on public.automation_runs
  for each row execute function public.set_updated_at();

-- ── Jobs (Postgres-first queue, ADR-0005) ────────────────────────────────────
-- Transient work items with a status lifecycle (no deleted_at; succeeded/dead
-- rows are pruned by a retention job). Workers claim work with:
--   select ... from jobs
--   where queue = $1 and status = 'pending' and run_at <= now()
--   order by run_at
--   for update skip locked limit $n;
-- (workspace_id, job_key) is the idempotency key: enqueueing the same logical
-- job twice is a no-op via ON CONFLICT DO NOTHING.
create table public.jobs (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  queue text not null,
  job_key text not null,
  -- Job input. Governed by the per-queue payload schema registered in packages/core.
  payload jsonb not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'running', 'succeeded', 'failed', 'dead')),
  attempts int not null default 0 check (attempts >= 0),
  max_attempts int not null default 5 check (max_attempts >= 1),
  run_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, job_key)
);

-- Worker-claim index. Deliberately NOT workspace-leading: workers drain queues
-- across all workspaces (the one sanctioned cross-tenant scan, executed only by
-- the service role through the packages/db admin wrapper).
create index jobs_claim_idx on public.jobs (queue, status, run_at);
create index jobs_workspace_status_idx on public.jobs (workspace_id, status);

create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.automations enable row level security;
alter table public.automation_runs enable row level security;
alter table public.jobs enable row level security;

create policy automations_all on public.automations for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Run history: members can read and the engine (running in a user's context)
-- can insert; there is deliberately no UPDATE or DELETE policy — status/step
-- updates are performed by the system via the service role only.
create policy automation_runs_select on public.automation_runs for select
  using (public.is_workspace_member(workspace_id));

create policy automation_runs_insert on public.automation_runs for insert
  with check (public.is_workspace_member(workspace_id));

-- jobs: SERVICE-ROLE ONLY. RLS is enabled with zero policies — deny-by-default
-- means no application role can read or write jobs. Workers use the service
-- role (which bypasses RLS) exclusively through the packages/db admin wrapper,
-- whose API makes workspace_id a mandatory predicate (DatabaseArchitecture.md
-- §5.4); user-facing job status surfaces are built as read models, not by
-- opening this table.
