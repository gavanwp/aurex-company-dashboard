-- 0024 — Documents: enterprise file/document management (DMS)
-- Docs: 06_Module_Breakdown.md §12 (file management), StorageArchitecture.md (blobs),
-- EnterpriseIdentityAndRBAC.md §2 (permission catalog).
--
-- COEXISTENCE NOTE. The names `documents` / `document_versions` are already taken
-- by the block-based page/KB substrate (0006). This module is a distinct concept —
-- an enterprise DMS: folder hierarchy + uploaded binaries + immutable file
-- versioning + tags — so it uses its own tables (document_folders, document_files,
-- document_file_versions, document_tags, document_tag_assignments) and leaves the
-- block-doc/KB tables untouched for the future Pages/Knowledge Base module.
--
-- Blob bytes live in object storage (StorageArchitecture.md); the `files` table
-- (0006) remains the object-metadata authority, and each file version points at
-- one files row. RLS is tenant-membership (is_workspace_member); the granular
-- documents.* permissions are enforced in the action layer by the RBAC engine.
--
-- Column conventions (per spec): every table carries workspace_id, created_at,
-- updated_at, created_by, updated_by. Soft-delete (deleted_at) where recoverable;
-- document_files additionally carry archived_at (archive/restore, distinct from
-- delete/trash). Version rows are immutable in practice (only created + purged).

-- ══════════════════════════════════════════════════════════════════════════════
-- A. Tables
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Folders (adjacency-list tree) ─────────────────────────────────────────────
create table public.document_folders (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  parent_id uuid references public.document_folders (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  description text check (description is null or char_length(description) <= 2000),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
-- Sibling folder names are unique within a parent (root = the nil-uuid bucket).
create unique index document_folders_sibling_name_uidx
  on public.document_folders (
    workspace_id,
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  )
  where deleted_at is null;
create index document_folders_parent_idx
  on public.document_folders (workspace_id, parent_id) where deleted_at is null;

-- ── Documents (a managed file living in a folder; null folder = root) ──────────
create table public.document_files (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  folder_id uuid references public.document_folders (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 300),
  description text check (description is null or char_length(description) <= 2000),
  -- Pointer to the latest version (FK added after document_file_versions exists).
  current_version_id uuid,
  current_version int not null default 1 check (current_version >= 1),
  -- Denormalized from the current version for list rendering.
  mime text,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);
create index document_files_folder_idx
  on public.document_files (workspace_id, folder_id) where deleted_at is null;
create index document_files_active_idx
  on public.document_files (workspace_id) where deleted_at is null and archived_at is null;

-- ── Versions (immutable snapshots; each points at one stored object) ───────────
create table public.document_file_versions (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  document_id uuid not null references public.document_files (id) on delete cascade,
  version int not null check (version >= 1),
  -- The stored object (files, 0006). Null only in the brief pre-commit window.
  file_id uuid references public.files (id) on delete set null,
  filename text not null check (char_length(filename) between 1 and 400),
  mime text,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  checksum text,
  cause text not null default 'upload' check (cause in ('upload', 'replace', 'restore')),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (document_id, version)
);
create index document_file_versions_document_idx
  on public.document_file_versions (document_id) where deleted_at is null;
create index document_file_versions_workspace_idx
  on public.document_file_versions (workspace_id) where deleted_at is null;

-- Close the current-version pointer now that the versions table exists.
alter table public.document_files
  add constraint document_files_current_version_fk
  foreign key (current_version_id)
  references public.document_file_versions (id) on delete set null;

-- ── Tags + assignments ────────────────────────────────────────────────────────
create table public.document_tags (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  -- Optional UI chip color (hex like #2563eb); validated in the app layer.
  color text check (color is null or char_length(color) <= 16),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index document_tags_name_uidx
  on public.document_tags (workspace_id, lower(name)) where deleted_at is null;

create table public.document_tag_assignments (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  document_id uuid not null references public.document_files (id) on delete cascade,
  tag_id uuid not null references public.document_tags (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, tag_id)
);
create index document_tag_assignments_document_idx
  on public.document_tag_assignments (workspace_id, document_id);
create index document_tag_assignments_tag_idx
  on public.document_tag_assignments (tag_id);

-- ── updated_at triggers ───────────────────────────────────────────────────────
create trigger document_folders_set_updated_at before update on public.document_folders
  for each row execute function public.set_updated_at();
create trigger document_files_set_updated_at before update on public.document_files
  for each row execute function public.set_updated_at();
create trigger document_file_versions_set_updated_at before update on public.document_file_versions
  for each row execute function public.set_updated_at();
create trigger document_tags_set_updated_at before update on public.document_tags
  for each row execute function public.set_updated_at();
create trigger document_tag_assignments_set_updated_at before update on public.document_tag_assignments
  for each row execute function public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- B. RLS — tenant membership is the backstop; granular documents.* permissions
--    are enforced in the action layer by the RBAC engine (matches 0006 documents).
-- ══════════════════════════════════════════════════════════════════════════════
alter table public.document_folders enable row level security;
alter table public.document_files enable row level security;
alter table public.document_file_versions enable row level security;
alter table public.document_tags enable row level security;
alter table public.document_tag_assignments enable row level security;

create policy document_folders_all on public.document_folders for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy document_files_all on public.document_files for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy document_file_versions_all on public.document_file_versions for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy document_tags_all on public.document_tags for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy document_tag_assignments_all on public.document_tag_assignments for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ══════════════════════════════════════════════════════════════════════════════
-- C. Permission catalog — the granular DMS keys (EnterpriseIdentityAndRBAC.md §2).
--    documents.document.upload / .delete already exist (0018); only add the rest.
--    Version keys are 4-segment (resource = document_version).
-- ══════════════════════════════════════════════════════════════════════════════
insert into public.permissions (key, module, resource, action, label, is_field_level, is_dangerous) values
  ('documents.folder.read','documents','folder','read','View folders',false,false),
  ('documents.folder.create','documents','folder','create','Create folders',false,false),
  ('documents.folder.update','documents','folder','update','Rename folders',false,false),
  ('documents.folder.delete','documents','folder','delete','Delete folders',false,true),
  ('documents.document.read','documents','document','read','View documents',false,false),
  ('documents.document.rename','documents','document','rename','Rename documents',false,false),
  ('documents.document.move','documents','document','move','Move documents',false,false),
  ('documents.document.archive','documents','document','archive','Archive documents',false,false),
  ('documents.document.restore','documents','document','restore','Restore documents',false,false),
  ('documents.document.download','documents','document','download','Download documents',false,false),
  ('documents.document.version.read','documents','document_version','read','View document versions',false,false),
  ('documents.document.version.create','documents','document_version','create','Create document versions',false,false)
on conflict (key) do nothing;

-- ══════════════════════════════════════════════════════════════════════════════
-- D. Role grants (mirrors the pre-existing documents access shape, 0018).
--    on conflict do nothing → safe against the org_owner upload/delete grants
--    already seeded in 0018.
-- ══════════════════════════════════════════════════════════════════════════════
-- Read + download: every internal role (organization/workspace scope) except the
-- platform operator. Portal roles (client, guest) are excluded here (portal.* only).
insert into public.role_permissions (role_id, permission_key)
select r.id, k.key
from public.roles r
cross join (values
  ('documents.folder.read'),
  ('documents.document.read'),
  ('documents.document.version.read'),
  ('documents.document.download')
) as k(key)
where r.is_system and r.scope in ('organization', 'workspace') and r.key <> 'super_admin'
on conflict (role_id, permission_key) do nothing;

-- Contribute (create/upload/rename/move + new versions): internal contributor roles.
insert into public.role_permissions (role_id, permission_key)
select r.id, k.key
from public.roles r
cross join (values
  ('documents.folder.create'),
  ('documents.folder.update'),
  ('documents.document.upload'),
  ('documents.document.rename'),
  ('documents.document.move'),
  ('documents.document.version.create')
) as k(key)
where r.is_system and r.key in (
  'organization_owner','operations_manager','project_manager','team_lead','employee',
  'designer','developer','seo_specialist','content_writer','marketing_manager',
  'sales_manager','ai_automation_engineer'
)
on conflict (role_id, permission_key) do nothing;

-- Curate (archive/restore + delete folder/document): workspace admins + PM only.
insert into public.role_permissions (role_id, permission_key)
select r.id, k.key
from public.roles r
cross join (values
  ('documents.document.archive'),
  ('documents.document.restore'),
  ('documents.folder.delete'),
  ('documents.document.delete')
) as k(key)
where r.is_system and r.key in ('organization_owner','operations_manager','project_manager')
on conflict (role_id, permission_key) do nothing;
