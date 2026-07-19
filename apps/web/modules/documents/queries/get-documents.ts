import 'server-only'

import type { WorkspaceContext } from '@/lib/workspace-context'

// Read model for the Documents browser: the full folder tree (for the sidebar
// tree + breadcrumb) and the documents in the active folder. RLS scopes every
// row to the workspace; the action layer enforces the granular permissions.

export interface FolderNode {
  id: string
  parentId: string | null
  name: string
}

export interface DocumentListItem {
  id: string
  name: string
  description: string | null
  folderId: string | null
  mime: string | null
  sizeBytes: number
  currentVersion: number
  archivedAt: string | null
  updatedAt: string
  updatedByName: string | null
}

export interface DocumentsView {
  folderId: string | null
  folders: FolderNode[]
  documents: DocumentListItem[]
}

async function profileNames(
  ctx: WorkspaceContext,
  ids: (string | null)[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(ids.filter((id): id is string => !!id))]
  if (unique.length === 0) return map
  const { data } = await ctx.supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', unique)
  for (const p of data ?? []) map.set(p.id, p.full_name ?? p.email ?? 'Unknown')
  return map
}

/** The folder tree + the documents inside `folderId` (null = workspace root). */
export async function getDocumentsView(
  ctx: WorkspaceContext,
  options: { folderId: string | null; includeArchived?: boolean },
): Promise<DocumentsView> {
  const { folderId, includeArchived = false } = options

  const foldersQuery = ctx.supabase
    .from('document_folders')
    .select('id, parent_id, name')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('name')

  let docsQuery = ctx.supabase
    .from('document_files')
    .select(
      'id, name, description, folder_id, mime, size_bytes, current_version, archived_at, updated_at, updated_by',
    )
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('name')

  docsQuery =
    folderId === null ? docsQuery.is('folder_id', null) : docsQuery.eq('folder_id', folderId)
  if (!includeArchived) docsQuery = docsQuery.is('archived_at', null)

  const [{ data: folders }, { data: docs }] = await Promise.all([foldersQuery, docsQuery])

  const names = await profileNames(
    ctx,
    (docs ?? []).map((d) => d.updated_by),
  )

  return {
    folderId,
    folders: (folders ?? []).map((f) => ({ id: f.id, parentId: f.parent_id, name: f.name })),
    documents: (docs ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      folderId: d.folder_id,
      mime: d.mime,
      sizeBytes: d.size_bytes,
      currentVersion: d.current_version,
      archivedAt: d.archived_at,
      updatedAt: d.updated_at,
      updatedByName: d.updated_by ? (names.get(d.updated_by) ?? null) : null,
    })),
  }
}
