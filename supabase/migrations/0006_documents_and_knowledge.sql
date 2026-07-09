-- 0006 — Documents and Knowledge Base modules, plus shared file metadata
-- Tables: kb_spaces, documents, document_versions, kb_pages, files
-- Docs: 06_Module_Breakdown.md §12–13, §25; architecture/DatabaseArchitecture.md §4.3
-- (files is a sanctioned user of the polymorphic entity_type/entity_id pattern).
-- New status-ish columns use text + CHECK, not native enums, per
-- DatabaseArchitecture.md C11 (native enum alteration fights expand/contract).

-- ── KB spaces ────────────────────────────────────────────────────────────────
create table public.kb_spaces (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  purpose text,
  icon text,
  -- client_facing spaces are the only KB content ever visible in the Portal.
  acl_kind text not null default 'workspace'
    check (acl_kind in ('workspace', 'role', 'members', 'client_facing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index kb_spaces_workspace_idx on public.kb_spaces (workspace_id) where deleted_at is null;

-- ── Documents ────────────────────────────────────────────────────────────────
create table public.documents (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  space_id uuid references public.kb_spaces (id) on delete set null,
  title text not null check (char_length(title) between 1 and 300),
  icon text,
  -- Block-based content. Governed by DocumentContentSchema (packages/core/src/schemas/document.ts).
  content jsonb not null default '[]',
  current_version int not null default 1 check (current_version >= 1),
  is_template boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index documents_workspace_idx on public.documents (workspace_id) where deleted_at is null;
create index documents_project_idx on public.documents (workspace_id, project_id) where deleted_at is null;
create index documents_space_idx on public.documents (workspace_id, space_id) where deleted_at is null;

-- ── Document versions ────────────────────────────────────────────────────────
-- Snapshots are immutable once written (restore creates a new version); rows
-- are only removed by retention purges, so there is no updated_at trigger and
-- no user-facing UPDATE path beyond the standard member policy.
create table public.document_versions (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  version int not null check (version >= 1),
  -- Frozen block content at save time. Governed by DocumentContentSchema (packages/core).
  snapshot jsonb not null,
  cause text not null default 'manual'
    check (cause in ('manual', 'major_edit', 'publish', 'restore')),
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (document_id, version)
);

create index document_versions_document_idx on public.document_versions (document_id) where deleted_at is null;
create index document_versions_workspace_idx on public.document_versions (workspace_id) where deleted_at is null;

-- ── KB pages (documents specialized as knowledge-base pages) ─────────────────
create table public.kb_pages (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  space_id uuid not null references public.kb_spaces (id) on delete restrict,
  -- Verification is the RAG quality lever: stale pages are down-weighted/excluded.
  verification_state text not null default 'needs_review'
    check (verification_state in ('verified', 'needs_review', 'stale')),
  verify_by date,
  owner_user_id uuid references public.profiles (id) on delete set null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index kb_pages_space_idx on public.kb_pages (workspace_id, space_id) where deleted_at is null;
create index kb_pages_verification_idx on public.kb_pages (workspace_id, verification_state) where deleted_at is null;
create index kb_pages_document_idx on public.kb_pages (document_id) where deleted_at is null;

-- ── Files (storage metadata; objects live in R2/Supabase Storage) ────────────
-- Sanctioned polymorphic attachment table (DatabaseArchitecture.md §4.3):
-- entity_type is CHECK-constrained to the registered list; adding a type
-- requires updating this constraint (and the entityRef helper in packages/core).
create table public.files (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  bucket text not null,
  object_key text not null,
  mime text,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  module text not null,
  entity_type text check (entity_type is null or entity_type in (
    'workspace', 'client', 'contact', 'deal', 'project', 'task', 'document',
    'kb_page', 'invoice', 'expense', 'proposal', 'contract', 'meeting'
  )),
  entity_id uuid,
  av_status text not null default 'pending'
    check (av_status in ('pending', 'clean', 'infected', 'quarantined')),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (bucket, object_key)
);

create index files_workspace_idx on public.files (workspace_id) where deleted_at is null;
create index files_entity_idx on public.files (workspace_id, entity_type, entity_id) where deleted_at is null;

-- ── updated_at triggers ──────────────────────────────────────────────────────
create trigger kb_spaces_set_updated_at before update on public.kb_spaces
  for each row execute function public.set_updated_at();
create trigger documents_set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();
create trigger kb_pages_set_updated_at before update on public.kb_pages
  for each row execute function public.set_updated_at();
create trigger files_set_updated_at before update on public.files
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.kb_spaces enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.kb_pages enable row level security;
alter table public.files enable row level security;

create policy kb_spaces_all on public.kb_spaces for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy documents_all on public.documents for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy document_versions_all on public.document_versions for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy kb_pages_all on public.kb_pages for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy files_all on public.files for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
