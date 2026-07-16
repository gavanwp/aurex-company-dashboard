-- 0016 — Team & HR module
-- Tables: hr_profiles, hr_leave_requests
-- Docs: 06_Module_Breakdown.md §16; 12_Project_Rules.md R-D1/R-D2/R-D8.
--
-- hr_profiles ENRICHES workspace_members (0002) rather than replacing it: the
-- roster and RBAC role still live on workspace_members; this row adds the HR
-- facets (title, skills, capacity, employment, compensation). The directory is
-- a left join so every member shows even before HR fills in their profile.
--
-- Compensation columns are workspace-member readable at the row level (RLS);
-- field-level restriction to Owner/HR/Finance (06_Module_Breakdown.md §16) is
-- enforced in the query layer, which omits comp_* for unauthorized roles.

-- ── HR profiles ──────────────────────────────────────────────────────────────
create table public.hr_profiles (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text check (title is null or char_length(title) between 1 and 160),
  employment_type text
    check (employment_type in ('full_time', 'part_time', 'contractor', 'intern')),
  manager_id uuid references public.profiles (id) on delete set null,
  start_date date,
  location text check (location is null or char_length(location) <= 160),
  timezone text check (timezone is null or char_length(timezone) <= 64),
  phone text check (phone is null or char_length(phone) <= 40),
  bio text check (bio is null or char_length(bio) <= 2000),
  -- Tagged, leveled skills. Governed by HrSkillSchema (packages/core/src/schemas/hr.ts):
  -- an array of { name, level } where level ∈ beginner|intermediate|advanced|expert.
  skills jsonb not null default '[]',
  weekly_capacity_hours int check (weekly_capacity_hours is null
    or (weekly_capacity_hours >= 0 and weekly_capacity_hours <= 168)),
  -- Compensation (R-D8: integer minor units + explicit currency). Field-level
  -- restricted at the query layer; never sent to unauthorized roles.
  comp_amount_minor bigint check (comp_amount_minor is null or comp_amount_minor >= 0),
  comp_currency char(3) not null default 'USD',
  comp_period text check (comp_period in ('hourly', 'monthly', 'annual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- One live HR profile per member per workspace.
create unique index hr_profiles_member_uidx
  on public.hr_profiles (workspace_id, user_id) where deleted_at is null;
create index hr_profiles_workspace_idx on public.hr_profiles (workspace_id) where deleted_at is null;
create index hr_profiles_manager_idx on public.hr_profiles (workspace_id, manager_id) where deleted_at is null;

-- ── Leave requests ───────────────────────────────────────────────────────────
create table public.hr_leave_requests (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('vacation', 'sick', 'personal', 'unpaid', 'other')),
  start_date date not null,
  end_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reason text check (reason is null or char_length(reason) <= 1000),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint hr_leave_dates_ordered check (end_date >= start_date)
);

create index hr_leave_workspace_status_idx
  on public.hr_leave_requests (workspace_id, status) where deleted_at is null;
create index hr_leave_user_idx
  on public.hr_leave_requests (workspace_id, user_id) where deleted_at is null;
create index hr_leave_range_idx
  on public.hr_leave_requests (workspace_id, start_date, end_date) where deleted_at is null;

-- ── updated_at triggers ──────────────────────────────────────────────────────
create trigger hr_profiles_set_updated_at before update on public.hr_profiles
  for each row execute function public.set_updated_at();
create trigger hr_leave_requests_set_updated_at before update on public.hr_leave_requests
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.hr_profiles enable row level security;
alter table public.hr_leave_requests enable row level security;

-- Profiles: every workspace member may read the directory; only Owner/Admin/HR
-- may create or edit HR profiles (06_Module_Breakdown.md §16 — HR owns people ops).
create policy hr_profiles_select on public.hr_profiles for select
  using (public.is_workspace_member(workspace_id));

create policy hr_profiles_insert on public.hr_profiles for insert
  with check (public.workspace_role_of(workspace_id) in ('owner', 'admin', 'hr'));

create policy hr_profiles_update on public.hr_profiles for update
  using (public.workspace_role_of(workspace_id) in ('owner', 'admin', 'hr'))
  with check (public.workspace_role_of(workspace_id) in ('owner', 'admin', 'hr'));

create policy hr_profiles_delete on public.hr_profiles for delete
  using (public.workspace_role_of(workspace_id) in ('owner', 'admin', 'hr'));

-- Leave: members see who is out (feeds Calendar availability) and file their own
-- requests; Owner/Admin/HR decide any request. A member may cancel their own.
create policy hr_leave_select on public.hr_leave_requests for select
  using (public.is_workspace_member(workspace_id));

create policy hr_leave_insert on public.hr_leave_requests for insert
  with check (
    public.is_workspace_member(workspace_id)
    and (user_id = auth.uid() or public.workspace_role_of(workspace_id) in ('owner', 'admin', 'hr'))
  );

create policy hr_leave_update on public.hr_leave_requests for update
  using (
    public.workspace_role_of(workspace_id) in ('owner', 'admin', 'hr')
    or user_id = auth.uid()
  )
  with check (
    public.workspace_role_of(workspace_id) in ('owner', 'admin', 'hr')
    or user_id = auth.uid()
  );
