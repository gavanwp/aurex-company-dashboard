-- 0010 — Meetings and Calendar modules
-- Tables: calendar_events, meetings, meeting_summaries, availability
-- Docs: 06_Module_Breakdown.md §6–7.
-- calendar_events precedes meetings (meetings.calendar_event_id references it).

-- ── Calendar events ──────────────────────────────────────────────────────────
create table public.calendar_events (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade, -- owning calendar
  title text not null check (char_length(title) between 1 and 300),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  source text not null default 'native' check (source in ('native', 'synced', 'system')),
  provider_event_id text, -- Google/Microsoft id when source = 'synced'
  -- Links to related entities (task/meeting/project refs). Governed by
  -- CalendarRelatedRefsSchema (packages/core/src/schemas/meeting.ts).
  related_refs jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (ends_at is null or ends_at >= starts_at)
);

create index calendar_events_user_time_idx on public.calendar_events (workspace_id, user_id, starts_at) where deleted_at is null;
create index calendar_events_time_idx on public.calendar_events (workspace_id, starts_at) where deleted_at is null;
create index calendar_events_provider_idx on public.calendar_events (workspace_id, provider_event_id)
  where provider_event_id is not null and deleted_at is null;

-- ── Meetings ─────────────────────────────────────────────────────────────────
create table public.meetings (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  type text not null default 'internal' check (type in ('internal', 'client', 'sales', 'standup')),
  project_id uuid references public.projects (id) on delete set null,
  deal_id uuid references public.crm_deals (id) on delete set null,
  calendar_event_id uuid references public.calendar_events (id) on delete set null,
  -- Users + external contacts. Governed by MeetingAttendeesSchema (packages/core/src/schemas/meeting.ts).
  attendees jsonb not null default '[]',
  -- Structured agenda items. Governed by MeetingAgendaSchema (packages/core/src/schemas/meeting.ts).
  agenda jsonb not null default '[]',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  recording_file_id uuid references public.files (id) on delete set null,
  transcript_file_id uuid references public.files (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index meetings_workspace_status_idx on public.meetings (workspace_id, status) where deleted_at is null;
create index meetings_project_idx on public.meetings (workspace_id, project_id) where deleted_at is null;
create index meetings_deal_idx on public.meetings (workspace_id, deal_id) where deleted_at is null;

-- ── Meeting summaries (AI-generated, human-reviewed) ─────────────────────────
create table public.meeting_summaries (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  tldr text,
  -- Decision list. Governed by MeetingDecisionsSchema (packages/core/src/schemas/meeting.ts).
  decisions jsonb not null default '[]',
  -- Proposed action items (accept → Tasks). Governed by MeetingActionItemsSchema
  -- (packages/core/src/schemas/meeting.ts).
  action_items jsonb not null default '[]',
  -- Internal-candor-stripped variant for portal sharing (share is explicit).
  client_safe_variant jsonb,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index meeting_summaries_meeting_idx on public.meeting_summaries (meeting_id) where deleted_at is null;
create index meeting_summaries_workspace_idx on public.meeting_summaries (workspace_id) where deleted_at is null;

-- ── Availability (working hours + booking rules per user) ────────────────────
create table public.availability (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Weekly working-hours grid. Governed by WorkingHoursSchema (packages/core/src/schemas/meeting.ts).
  working_hours jsonb not null default '{}',
  timezone text not null default 'UTC',
  -- Booking-page rules (buffers, notice, limits). Governed by BookingRulesSchema
  -- (packages/core/src/schemas/meeting.ts).
  booking_rules jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (workspace_id, user_id)
);

-- ── updated_at triggers ──────────────────────────────────────────────────────
create trigger calendar_events_set_updated_at before update on public.calendar_events
  for each row execute function public.set_updated_at();
create trigger meetings_set_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();
create trigger meeting_summaries_set_updated_at before update on public.meeting_summaries
  for each row execute function public.set_updated_at();
create trigger availability_set_updated_at before update on public.availability
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.calendar_events enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_summaries enable row level security;
alter table public.availability enable row level security;

create policy calendar_events_all on public.calendar_events for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy meetings_all on public.meetings for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy meeting_summaries_all on public.meeting_summaries for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy availability_all on public.availability for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
