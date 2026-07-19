import 'server-only'

import type { WorkspaceContext } from '@/lib/workspace-context'

// Read model for the metadata + version + activity panels of a single document.

export interface DocumentVersionRow {
  id: string
  version: number
  filename: string
  mime: string | null
  sizeBytes: number
  cause: string
  createdAt: string
  createdByName: string | null
  isCurrent: boolean
}

export interface DocumentTagRow {
  id: string
  name: string
  color: string | null
}

export interface DocumentActivityRow {
  id: string
  action: string
  actorName: string | null
  at: string
}

export interface DocumentDetail {
  id: string
  name: string
  description: string | null
  folderId: string | null
  mime: string | null
  sizeBytes: number
  currentVersion: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  createdByName: string | null
  updatedByName: string | null
  versions: DocumentVersionRow[]
  tags: DocumentTagRow[]
  activity: DocumentActivityRow[]
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

/** Full detail for one document, or null if it doesn't exist / isn't visible. */
export async function getDocumentDetail(
  ctx: WorkspaceContext,
  documentId: string,
): Promise<DocumentDetail | null> {
  const { data: doc } = await ctx.supabase
    .from('document_files')
    .select(
      'id, name, description, folder_id, mime, size_bytes, current_version, current_version_id, archived_at, created_at, updated_at, created_by, updated_by',
    )
    .eq('workspace_id', ctx.workspace.id)
    .eq('id', documentId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!doc) return null

  const [{ data: versions }, { data: tagLinks }, { data: activity }] = await Promise.all([
    ctx.supabase
      .from('document_file_versions')
      .select('id, version, filename, mime, size_bytes, cause, created_at, created_by')
      .eq('document_id', documentId)
      .is('deleted_at', null)
      .order('version', { ascending: false }),
    ctx.supabase
      .from('document_tag_assignments')
      .select('tag_id, document_tags(id, name, color, deleted_at)')
      .eq('document_id', documentId),
    ctx.supabase
      .from('audit_log')
      .select('id, action, actor_id, created_at')
      .eq('workspace_id', ctx.workspace.id)
      .eq('entity_type', 'document_file')
      .eq('entity_id', documentId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const names = await profileNames(ctx, [
    doc.created_by,
    doc.updated_by,
    ...(versions ?? []).map((v) => v.created_by),
    ...(activity ?? []).map((a) => a.actor_id),
  ])

  // The tag embed is a nested row; the hand-maintained types don't model PostgREST
  // embeds, so narrow the shape explicitly (the select string is the contract).
  const tags: DocumentTagRow[] = (
    (tagLinks ?? []) as unknown as {
      document_tags: {
        id: string
        name: string
        color: string | null
        deleted_at: string | null
      } | null
    }[]
  )
    .map((t) => t.document_tags)
    .filter(
      (t): t is { id: string; name: string; color: string | null; deleted_at: string | null } =>
        t !== null && t.deleted_at === null,
    )
    .map((t) => ({ id: t.id, name: t.name, color: t.color }))

  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    folderId: doc.folder_id,
    mime: doc.mime,
    sizeBytes: doc.size_bytes,
    currentVersion: doc.current_version,
    archivedAt: doc.archived_at,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    createdByName: doc.created_by ? (names.get(doc.created_by) ?? null) : null,
    updatedByName: doc.updated_by ? (names.get(doc.updated_by) ?? null) : null,
    versions: (versions ?? []).map((v) => ({
      id: v.id,
      version: v.version,
      filename: v.filename,
      mime: v.mime,
      sizeBytes: v.size_bytes,
      cause: v.cause,
      createdAt: v.created_at,
      createdByName: v.created_by ? (names.get(v.created_by) ?? null) : null,
      isCurrent: v.id === doc.current_version_id,
    })),
    tags,
    activity: (activity ?? []).map((a) => ({
      id: a.id,
      action: a.action,
      actorName: a.actor_id ? (names.get(a.actor_id) ?? null) : null,
      at: a.created_at,
    })),
  }
}
