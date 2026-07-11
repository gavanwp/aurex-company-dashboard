-- 0012 — Email Center module (Phase 2 foundation: manual logging + timeline)
-- Tables: mailbox_connections, email_threads, email_messages
-- Docs: 06_Module_Breakdown.md §8; 05_User_Roles.md §3.2 (email threads are the
-- most privacy-sensitive resource — default visibility is NARROW);
-- SecurityArchitecture.md §4.3 / register S4 (OAuth tokens app-layer encrypted,
-- never logged, never in domain_events payloads).
-- Live provider sync (Gmail OAuth worker) lands later; the 'manual' provider
-- backs v1 manual logging, and the schema is the seam the sync worker fills.

-- ── Mailbox connections ──────────────────────────────────────────────────────
create table public.mailbox_connections (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade, -- owning mailbox
  provider text not null default 'manual' check (provider in ('gmail', 'microsoft', 'manual')),
  address text not null check (char_length(address) between 3 and 320),
  display_name text check (display_name is null or char_length(display_name) <= 160),
  status text not null default 'connected'
    check (status in ('connected', 'error', 'disconnected')),
  sync_cursor text,
  -- Privacy default per 06_Module_Breakdown.md §8: personal mailboxes are private.
  sharing_policy text not null default 'private' check (sharing_policy in ('private', 'shared')),
  -- App-layer encrypted OAuth token bundle (SecurityArchitecture.md §4.3):
  -- ciphertext only, encryption key lives outside the database, value is never
  -- logged and never selected by default views/queries — decryption happens
  -- only in the server-only sync integration module.
  oauth_token_ciphertext text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on column public.mailbox_connections.oauth_token_ciphertext is
  'App-layer encrypted (key outside DB). Never plaintext, never logged, never selected by default views.';

create index mailbox_connections_user_idx on public.mailbox_connections (workspace_id, user_id) where deleted_at is null;

-- ── Email threads ────────────────────────────────────────────────────────────
create table public.email_threads (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 500),
  snippet text check (snippet is null or char_length(snippet) <= 500),
  -- Participant list ({name?, email}). Governed by EmailParticipantsSchema
  -- (packages/core/src/schemas/email.ts).
  participants jsonb not null default '[]',
  last_message_at timestamptz,
  message_count int not null default 0 check (message_count >= 0),
  status text not null default 'open' check (status in ('open', 'waiting', 'closed')),
  -- Privacy default per 05_User_Roles.md §3.2: threads start private (visible
  -- to the linked mailbox owner only); sharing to the workspace is explicit.
  visibility text not null default 'private' check (visibility in ('private', 'workspace')),
  mailbox_connection_id uuid references public.mailbox_connections (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  contact_id uuid references public.crm_contacts (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  deal_id uuid references public.crm_deals (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index email_threads_workspace_time_idx on public.email_threads (workspace_id, last_message_at desc) where deleted_at is null;
create index email_threads_workspace_status_idx on public.email_threads (workspace_id, status) where deleted_at is null;
create index email_threads_client_idx on public.email_threads (workspace_id, client_id) where deleted_at is null;
create index email_threads_deal_idx on public.email_threads (workspace_id, deal_id) where deleted_at is null;
create index email_threads_project_idx on public.email_threads (workspace_id, project_id) where deleted_at is null;
create index email_threads_mailbox_idx on public.email_threads (mailbox_connection_id) where deleted_at is null;

-- ── Email messages ───────────────────────────────────────────────────────────
create table public.email_messages (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  thread_id uuid not null references public.email_threads (id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  from_address text not null check (char_length(from_address) between 3 and 320),
  -- Address lists (["a@b.com", ...]). Governed by EmailAddressListSchema
  -- (packages/core/src/schemas/email.ts).
  to_addresses jsonb not null default '[]',
  cc_addresses jsonb not null default '[]',
  subject text check (subject is null or char_length(subject) <= 500),
  body_text text,
  -- Sanitized at ingest (server-side allowlist sanitizer); the raw provider
  -- HTML is never stored. UI renders body_text; sanitized HTML is a
  -- progressive enhancement for synced mail.
  body_html_sanitized text,
  provider_message_id text,
  sent_at timestamptz,
  is_draft boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on column public.email_messages.body_html_sanitized is
  'Sanitized at ingest; raw provider HTML is never stored.';

create index email_messages_thread_idx on public.email_messages (thread_id, sent_at) where deleted_at is null;
create index email_messages_workspace_idx on public.email_messages (workspace_id) where deleted_at is null;
create index email_messages_provider_idx on public.email_messages (workspace_id, provider_message_id)
  where provider_message_id is not null and deleted_at is null;

-- ── updated_at triggers ──────────────────────────────────────────────────────
create trigger mailbox_connections_set_updated_at before update on public.mailbox_connections
  for each row execute function public.set_updated_at();
create trigger email_threads_set_updated_at before update on public.email_threads
  for each row execute function public.set_updated_at();
create trigger email_messages_set_updated_at before update on public.email_messages
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.mailbox_connections enable row level security;
alter table public.email_threads enable row level security;
alter table public.email_messages enable row level security;

-- Mailbox connections are personal: owner-only, workspace-scoped (same shape
-- as ai_conversations in 0007). Shared-inbox visibility arrives with the sync
-- phase as an additive policy keyed on sharing_policy = 'shared'.
create policy mailbox_connections_all on public.mailbox_connections for all
  using (public.is_workspace_member(workspace_id) and user_id = auth.uid())
  with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

-- Threads: workspace-shared rows are visible (and workable) for every member.
create policy email_threads_workspace on public.email_threads for all
  using (public.is_workspace_member(workspace_id) and visibility = 'workspace')
  with check (public.is_workspace_member(workspace_id) and visibility = 'workspace');

-- Threads: the linked-mailbox owner always sees and manages their own threads
-- (this is the policy that covers private threads, and the one that lets the
-- owner flip visibility in either direction).
create policy email_threads_owner on public.email_threads for all
  using (
    public.is_workspace_member(workspace_id)
    and exists (
      select 1 from public.mailbox_connections m
      where m.id = email_threads.mailbox_connection_id and m.user_id = auth.uid()
    )
  )
  with check (
    public.is_workspace_member(workspace_id)
    and exists (
      select 1 from public.mailbox_connections m
      where m.id = email_threads.mailbox_connection_id and m.user_id = auth.uid()
    )
  );

-- Messages inherit thread visibility: the EXISTS subquery runs under the
-- caller's email_threads policies, so a message is reachable exactly when its
-- thread is.
create policy email_messages_all on public.email_messages for all
  using (
    public.is_workspace_member(workspace_id)
    and exists (
      select 1 from public.email_threads t
      where t.id = email_messages.thread_id
    )
  )
  with check (
    public.is_workspace_member(workspace_id)
    and exists (
      select 1 from public.email_threads t
      where t.id = email_messages.thread_id
    )
  );
