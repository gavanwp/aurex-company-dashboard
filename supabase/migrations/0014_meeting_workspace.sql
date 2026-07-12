-- 0014 — Meeting workspace (first-class decisions + action items + notes/timing)
-- Tables: meeting_decisions, meeting_action_items
-- Alters:  meetings (notes, location, starts_at, ends_at)
-- Docs: 06_Module_Breakdown.md §7 (Decision / ActionItem are first-class per spec).
--
-- 0010 shipped the meeting shell plus meeting_summaries, whose jsonb columns hold
-- AI-GENERATED, human-reviewed output (the Phase-3 seam). This migration adds the
-- HUMAN-curated, first-class records that make the decision log searchable and
-- action items individually trackable and convertible to tasks — they are rows,
-- not jsonb, so they can be indexed, filtered, and foreign-keyed to tasks.
--
-- pgcrypto lives in the `extensions` schema; uuid_v7() / set_updated_at() /
-- is_workspace_member() are public helpers from 0001. RLS clones 0010's
-- deny-by-default is_workspace_member shape. No new functions are defined here,
-- so there is no search_path to pin.

-- ── Meetings: collaborative notes, call location, standalone timing ───────────
-- starts_at / ends_at give a meeting its own timing when it is NOT projected off
-- a calendar_events row (calendar_event_id). The Calendar module continues to
-- read time from the linked calendar_event; these columns are the fallback for
-- meetings created without one. All nullable — nothing here is required.
alter table public.meetings add column if not exists notes text;
alter table public.meetings add column if not exists location text;
alter table public.meetings add column if not exists starts_at timestamptz;
alter table public.meetings add column if not exists ends_at timestamptz;
-- 0010 reaches a meeting's client only through project_id/deal_id. A direct,
-- nullable client_id lets a meeting link straight to a client (e.g. a check-in
-- with no active deal or project) and keeps the pre-meeting-brief and client
-- timeline queries a single hop instead of two. FK set null, like project/deal.
alter table public.meetings add column if not exists client_id uuid
  references public.clients (id) on delete set null;
create index if not exists meetings_client_idx
  on public.meetings (workspace_id, client_id) where deleted_at is null;

-- ── Meeting decisions (first-class decision log) ─────────────────────────────
create table public.meeting_decisions (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  statement text not null check (char_length(statement) between 1 and 2000),
  -- Free text or a member name — decisions are attributed, not FK-owned, so a
  -- decision survives a member leaving and can credit an external stakeholder.
  decided_by text,
  context text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- The decision log is workspace-wide and reverse-chronological ("what did we
-- decide about X"); search is ilike over statement/context in v1 (a tsvector or
-- pg_trgm index is a fast-follow if the log grows large).
create index meeting_decisions_workspace_time_idx
  on public.meeting_decisions (workspace_id, created_at desc) where deleted_at is null;
create index meeting_decisions_meeting_idx
  on public.meeting_decisions (workspace_id, meeting_id) where deleted_at is null;

-- ── Meeting action items (trackable, convertible to tasks) ───────────────────
create table public.meeting_action_items (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 1000),
  -- Assignee is an internal member (mirrors tasks.assignee_id → profiles, 0004).
  assignee_user_id uuid references public.profiles (id) on delete set null,
  due_date date,
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'converted', 'dismissed')),
  -- Set when convertActionItemToTask mints a task; on task delete this clears
  -- (set null) so the action item survives with its converted history intact.
  task_id uuid references public.tasks (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index meeting_action_items_workspace_time_idx
  on public.meeting_action_items (workspace_id, created_at desc) where deleted_at is null;
create index meeting_action_items_meeting_idx
  on public.meeting_action_items (workspace_id, meeting_id) where deleted_at is null;
create index meeting_action_items_assignee_idx
  on public.meeting_action_items (workspace_id, assignee_user_id) where deleted_at is null;

-- ── updated_at triggers ──────────────────────────────────────────────────────
create trigger meeting_decisions_set_updated_at before update on public.meeting_decisions
  for each row execute function public.set_updated_at();
create trigger meeting_action_items_set_updated_at before update on public.meeting_action_items
  for each row execute function public.set_updated_at();

-- ── RLS (deny-by-default, workspace-scoped — clones 0010's meetings_all) ─────
alter table public.meeting_decisions enable row level security;
alter table public.meeting_action_items enable row level security;

create policy meeting_decisions_all on public.meeting_decisions for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy meeting_action_items_all on public.meeting_action_items for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
