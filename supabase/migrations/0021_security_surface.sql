-- 0021 — Security surface (Enterprise Identity & RBAC, step 5)
-- Docs: docs/architecture/EnterpriseIdentityAndRBAC.md §3.3; ADR-0008; SecurityArchitecture.md.
--
-- The identity/security management tables behind the admin capabilities: sessions,
-- devices, login history, MFA factors, API keys, invitations, impersonation.
--
-- Scoping model:
--  - Identity-level tables (devices, mfa_factors) are PRINCIPAL-scoped, like
--    profiles — no workspace_id; RLS gates by principal_id = auth.uid() (self)
--    with admin visibility via org membership.
--  - Tenant-level tables (api_keys, invitations) carry organization_id (R-D2).
--  - sessions / auth_events / impersonation carry the org and are principal-keyed.
--  - Secret material (api_keys.hash, mfa_factors.secret_ref) is a HASH or an
--    external vault REFERENCE — never a usable secret at rest (SecurityArchitecture
--    §4.3/§6.2). Query layers must never select these columns to a client.

-- ── Sessions (app-level management/visibility over Supabase Auth sessions) ─────
create table public.sessions (
  id uuid primary key default public.uuid_v7(),
  principal_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  active_workspace_id uuid references public.workspaces (id) on delete set null,
  device_id uuid,
  ip inet,
  user_agent text,
  -- Cache-invalidation epoch (EnterpriseIdentityAndRBAC.md §1.3): bumped on any
  -- role/override change so stale sessions revalidate ≤ 60s.
  perm_epoch bigint not null default 0,
  impersonation jsonb,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);
create index sessions_principal_idx on public.sessions (principal_id) where revoked_at is null;
create index sessions_org_idx on public.sessions (organization_id) where revoked_at is null;

-- ── Devices (per-principal device registry; trust gates step-up MFA) ──────────
create table public.devices (
  id uuid primary key default public.uuid_v7(),
  principal_id uuid not null references public.profiles (id) on delete cascade,
  fingerprint_hash text not null,
  name text,
  os text,
  last_ip inet,
  trusted boolean not null default false,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (principal_id, fingerprint_hash)
);
create index devices_principal_idx on public.devices (principal_id) where revoked_at is null;

-- ── Auth events (login history — INSERT-ONLY, no update/delete) ───────────────
create table public.auth_events (
  id uuid primary key default public.uuid_v7(),
  principal_id uuid references public.profiles (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete cascade,
  type text not null check (type in ('login','logout','mfa_challenge','mfa_enrolled','failure','password_reset','token_refresh')),
  method text,
  ip inet,
  geo text,
  device_id uuid,
  success boolean not null default true,
  risk_score int,
  created_at timestamptz not null default now()
);
create index auth_events_principal_idx on public.auth_events (principal_id, created_at desc);
create index auth_events_org_idx on public.auth_events (organization_id, created_at desc);

-- ── MFA factors (registry; actual verification is Supabase Auth) ──────────────
create table public.mfa_factors (
  id uuid primary key default public.uuid_v7(),
  principal_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('totp','webauthn','sms')),
  label text,
  -- Reference into the secret store / Supabase Auth factor id — never a raw secret.
  secret_ref text,
  verified_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index mfa_factors_principal_idx on public.mfa_factors (principal_id) where revoked_at is null;

-- ── API keys (org-scoped; HASHED at rest, scoped to permissions) ──────────────
create table public.api_keys (
  id uuid primary key default public.uuid_v7(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  -- Public prefix shown in the UI to identify the key; the full key is shown once.
  prefix text not null,
  -- SHA-256 of the secret. A leak-from-DB is inert (SecurityArchitecture §6.2).
  hash text not null,
  -- Permission keys this key may exercise (subset of the catalog).
  scopes text[] not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index api_keys_org_idx on public.api_keys (organization_id) where revoked_at is null;
create unique index api_keys_prefix_uidx on public.api_keys (prefix);

-- ── Invitations (email invite → membership) ───────────────────────────────────
create table public.invitations (
  id uuid primary key default public.uuid_v7(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role_id uuid references public.roles (id) on delete set null,
  -- Optional per-invite permission overrides applied on acceptance.
  overrides jsonb not null default '[]',
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index invitations_org_status_idx on public.invitations (organization_id, status);
create index invitations_email_idx on public.invitations (lower(email));
create unique index invitations_token_uidx on public.invitations (token_hash);

-- ── Impersonation sessions ("View as" — read-only, time-boxed, audited) ───────
create table public.impersonation_sessions (
  id uuid primary key default public.uuid_v7(),
  organization_id uuid references public.organizations (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  impersonator_id uuid not null references public.profiles (id) on delete cascade,
  target_principal_id uuid not null references public.profiles (id) on delete cascade,
  read_only boolean not null default true,
  pages jsonb not null default '[]',
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  revoked_at timestamptz
);
create index impersonation_impersonator_idx on public.impersonation_sessions (impersonator_id, started_at desc);

-- ── updated_at not needed on these (append/lifecycle rows); RLS ───────────────
alter table public.sessions enable row level security;
alter table public.devices enable row level security;
alter table public.auth_events enable row level security;
alter table public.mfa_factors enable row level security;
alter table public.api_keys enable row level security;
alter table public.invitations enable row level security;
alter table public.impersonation_sessions enable row level security;

-- Sessions: a principal sees/revokes their own; org owner/admin manage members'.
create policy sessions_select on public.sessions for select
  using (principal_id = auth.uid() or public.org_role_of(organization_id) in ('owner','admin'));
create policy sessions_write on public.sessions for all
  using (principal_id = auth.uid() or public.org_role_of(organization_id) in ('owner','admin'))
  with check (principal_id = auth.uid() or public.org_role_of(organization_id) in ('owner','admin'));

-- Devices + MFA: self-service identity data; owner/admin may view (not create).
create policy devices_self on public.devices for all
  using (principal_id = auth.uid()) with check (principal_id = auth.uid());
create policy devices_admin_select on public.devices for select
  using (exists (
    select 1 from public.organization_members om
    where om.principal_id = public.devices.principal_id
      and public.org_role_of(om.organization_id) in ('owner','admin')));

create policy mfa_self on public.mfa_factors for all
  using (principal_id = auth.uid()) with check (principal_id = auth.uid());
create policy mfa_admin_select on public.mfa_factors for select
  using (exists (
    select 1 from public.organization_members om
    where om.principal_id = public.mfa_factors.principal_id
      and public.org_role_of(om.organization_id) in ('owner','admin')));

-- Auth events: insert-only history. Self + org admin read; anyone authenticated
-- may insert their own event (login flow). No update/delete policies.
create policy auth_events_select on public.auth_events for select
  using (principal_id = auth.uid() or public.org_role_of(organization_id) in ('owner','admin'));
create policy auth_events_insert on public.auth_events for insert
  with check (principal_id = auth.uid() or auth.uid() is not null);

-- API keys: org owner/admin manage. (Query layer must never select `hash`.)
create policy api_keys_all on public.api_keys for all
  using (public.org_role_of(organization_id) in ('owner','admin'))
  with check (public.org_role_of(organization_id) in ('owner','admin'));

-- Invitations: org owner/admin manage; workspace admins may invite to their ws.
create policy invitations_all on public.invitations for all
  using (
    public.org_role_of(organization_id) in ('owner','admin')
    or (workspace_id is not null and public.workspace_role_of(workspace_id) in ('owner','admin'))
  )
  with check (
    public.org_role_of(organization_id) in ('owner','admin')
    or (workspace_id is not null and public.workspace_role_of(workspace_id) in ('owner','admin'))
  );

-- Impersonation: the impersonator and org admins read; org admins create.
create policy impersonation_select on public.impersonation_sessions for select
  using (impersonator_id = auth.uid() or public.org_role_of(organization_id) in ('owner','admin'));
create policy impersonation_write on public.impersonation_sessions for all
  using (public.org_role_of(organization_id) in ('owner','admin'))
  with check (public.org_role_of(organization_id) in ('owner','admin'));
