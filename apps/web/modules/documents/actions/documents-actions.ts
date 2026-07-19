'use server'

import { revalidatePath } from 'next/cache'
import {
  CreateDocumentFileVersionInput,
  CreateFolderInput,
  DeleteFolderInput,
  DocumentIdInput,
  MoveDocumentInput,
  RenameDocumentInput,
  RenameFolderInput,
  UploadDocumentInput,
} from '@aurexos/core'
import type { z } from 'zod'
import { emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import { requirePermission } from '@/lib/permissions'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

// Documents DMS mutations. Every action follows the R-A3 spine:
//   validate (Zod, core) → authorize (RBAC engine) → mutate → emit event → audit.
// RLS (0024) is the tenant backstop; the granular documents.* permissions are the
// precise gate. Blob bytes are already in storage before uploadDocument runs
// (StorageArchitecture.md); these actions persist the metadata + version rows.

const DOCS_PATH = '/documents'
const UNIQUE_VIOLATION = '23505'

function revalidateDocs(): void {
  revalidatePath(DOCS_PATH)
}

function forbiddenOr(err: unknown): ActionResult<never> {
  return {
    ok: false,
    error:
      err instanceof Error && err.message === 'forbidden' ? 'forbidden' : 'Something went wrong',
  }
}

/** Assert a folder exists, belongs to this workspace, and isn't deleted. */
async function folderExists(ctx: WorkspaceContext, folderId: string): Promise<boolean> {
  const { data } = await ctx.supabase
    .from('document_folders')
    .select('id')
    .eq('workspace_id', ctx.workspace.id)
    .eq('id', folderId)
    .is('deleted_at', null)
    .maybeSingle()
  return !!data
}

// ── Folders ───────────────────────────────────────────────────────────────────

export async function createFolder(
  input: z.input<typeof CreateFolderInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateFolderInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid folder' }
  }
  try {
    const ctx = await getWorkspaceContext()
    await requirePermission(ctx, 'documents.folder.create')
    const { name, parentId, description } = parsed.data

    if (parentId && !(await folderExists(ctx, parentId))) {
      return { ok: false, error: 'Parent folder not found' }
    }

    const { data: created, error } = await ctx.supabase
      .from('document_folders')
      .insert({
        workspace_id: ctx.workspace.id,
        parent_id: parentId,
        name,
        description: description ?? null,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      })
      .select('id')
      .single()
    if (error?.code === UNIQUE_VIOLATION) {
      return { ok: false, error: 'A folder with this name already exists here' }
    }
    if (error || !created) return { ok: false, error: 'Could not create the folder' }

    await emitDomainEvent(ctx, {
      eventType: 'documents.folder.created',
      entityType: 'document_folder',
      entityId: created.id,
      payload: { name, parentId },
    })
    await writeAudit(ctx, {
      action: 'documents.folder.created',
      entityType: 'document_folder',
      entityId: created.id,
      after: { name, parentId },
    })
    revalidateDocs()
    return { ok: true, data: { id: created.id } }
  } catch (err) {
    return forbiddenOr(err)
  }
}

export async function renameFolder(
  input: z.input<typeof RenameFolderInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = RenameFolderInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' }
  }
  try {
    const ctx = await getWorkspaceContext()
    await requirePermission(ctx, 'documents.folder.update')
    const { id, name, description } = parsed.data

    const { data: before } = await ctx.supabase
      .from('document_folders')
      .select('name, description')
      .eq('workspace_id', ctx.workspace.id)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!before) return { ok: false, error: 'Folder not found' }

    const { error } = await ctx.supabase
      .from('document_folders')
      .update({ name, description: description ?? null, updated_by: ctx.userId })
      .eq('workspace_id', ctx.workspace.id)
      .eq('id', id)
    if (error?.code === UNIQUE_VIOLATION) {
      return { ok: false, error: 'A folder with this name already exists here' }
    }
    if (error) return { ok: false, error: 'Could not rename the folder' }

    await emitDomainEvent(ctx, {
      eventType: 'documents.folder.renamed',
      entityType: 'document_folder',
      entityId: id,
      payload: { name },
    })
    await writeAudit(ctx, {
      action: 'documents.folder.renamed',
      entityType: 'document_folder',
      entityId: id,
      before,
      after: { name, description: description ?? null },
    })
    revalidateDocs()
    return { ok: true, data: { id } }
  } catch (err) {
    return forbiddenOr(err)
  }
}

export async function deleteFolder(
  input: z.input<typeof DeleteFolderInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = DeleteFolderInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request' }
  try {
    const ctx = await getWorkspaceContext()
    await requirePermission(ctx, 'documents.folder.delete')
    const { id } = parsed.data

    if (!(await folderExists(ctx, id))) return { ok: false, error: 'Folder not found' }

    // Block deletion of a non-empty folder — reassign/clear its contents first.
    const [{ count: childFolders }, { count: childDocs }] = await Promise.all([
      ctx.supabase
        .from('document_folders')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', ctx.workspace.id)
        .eq('parent_id', id)
        .is('deleted_at', null),
      ctx.supabase
        .from('document_files')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', ctx.workspace.id)
        .eq('folder_id', id)
        .is('deleted_at', null),
    ])
    if ((childFolders ?? 0) > 0 || (childDocs ?? 0) > 0) {
      return { ok: false, error: 'Folder isn’t empty — move or delete its contents first' }
    }

    const { error } = await ctx.supabase
      .from('document_folders')
      .update({ deleted_at: new Date().toISOString(), updated_by: ctx.userId })
      .eq('workspace_id', ctx.workspace.id)
      .eq('id', id)
    if (error) return { ok: false, error: 'Could not delete the folder' }

    await emitDomainEvent(ctx, {
      eventType: 'documents.folder.deleted',
      entityType: 'document_folder',
      entityId: id,
      payload: {},
    })
    await writeAudit(ctx, {
      action: 'documents.folder.deleted',
      entityType: 'document_folder',
      entityId: id,
    })
    revalidateDocs()
    return { ok: true, data: { id } }
  } catch (err) {
    return forbiddenOr(err)
  }
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function uploadDocument(
  input: z.input<typeof UploadDocumentInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = UploadDocumentInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid upload' }
  }
  try {
    const ctx = await getWorkspaceContext()
    await requirePermission(ctx, 'documents.document.upload')
    const { name, folderId, description, file } = parsed.data

    if (folderId && !(await folderExists(ctx, folderId))) {
      return { ok: false, error: 'Target folder not found' }
    }

    // 1. The managed document (points at its current version once written).
    const { data: doc, error: docErr } = await ctx.supabase
      .from('document_files')
      .insert({
        workspace_id: ctx.workspace.id,
        folder_id: folderId,
        name,
        description: description ?? null,
        current_version: 1,
        mime: file.mime ?? null,
        size_bytes: file.sizeBytes,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      })
      .select('id')
      .single()
    if (docErr || !doc) return { ok: false, error: 'Could not create the document' }

    // 2. The stored-object metadata row (files, 0006 — the object authority).
    const { data: fileRow, error: fileErr } = await ctx.supabase
      .from('files')
      .insert({
        workspace_id: ctx.workspace.id,
        bucket: file.bucket,
        object_key: file.objectKey,
        mime: file.mime ?? null,
        size_bytes: file.sizeBytes,
        module: 'documents',
        entity_type: 'document',
        entity_id: doc.id,
        uploaded_by: ctx.userId,
      })
      .select('id')
      .single()
    if (fileErr || !fileRow) {
      // Compensate: no object row → the document is unusable, remove it.
      await ctx.supabase.from('document_files').delete().eq('id', doc.id)
      return { ok: false, error: 'Could not record the uploaded file' }
    }

    // 3. Version 1, then point the document at it.
    const { data: version, error: verErr } = await ctx.supabase
      .from('document_file_versions')
      .insert({
        workspace_id: ctx.workspace.id,
        document_id: doc.id,
        version: 1,
        file_id: fileRow.id,
        filename: file.filename,
        mime: file.mime ?? null,
        size_bytes: file.sizeBytes,
        checksum: file.checksum ?? null,
        cause: 'upload',
        created_by: ctx.userId,
        updated_by: ctx.userId,
      })
      .select('id')
      .single()
    if (verErr || !version) {
      await ctx.supabase.from('files').delete().eq('id', fileRow.id)
      await ctx.supabase.from('document_files').delete().eq('id', doc.id)
      return { ok: false, error: 'Could not create the initial version' }
    }
    await ctx.supabase
      .from('document_files')
      .update({ current_version_id: version.id })
      .eq('id', doc.id)

    await emitDomainEvent(ctx, {
      eventType: 'documents.document.uploaded',
      entityType: 'document_file',
      entityId: doc.id,
      payload: { name, folderId, sizeBytes: file.sizeBytes, mime: file.mime ?? null },
    })
    await writeAudit(ctx, {
      action: 'documents.document.uploaded',
      entityType: 'document_file',
      entityId: doc.id,
      after: { name, folderId, filename: file.filename, sizeBytes: file.sizeBytes },
    })
    revalidateDocs()
    return { ok: true, data: { id: doc.id } }
  } catch (err) {
    return forbiddenOr(err)
  }
}

export async function renameDocument(
  input: z.input<typeof RenameDocumentInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = RenameDocumentInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' }
  }
  try {
    const ctx = await getWorkspaceContext()
    await requirePermission(ctx, 'documents.document.rename')
    const { id, name, description } = parsed.data

    const { data: before } = await ctx.supabase
      .from('document_files')
      .select('name, description')
      .eq('workspace_id', ctx.workspace.id)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!before) return { ok: false, error: 'Document not found' }

    const { error } = await ctx.supabase
      .from('document_files')
      .update({ name, description: description ?? null, updated_by: ctx.userId })
      .eq('workspace_id', ctx.workspace.id)
      .eq('id', id)
    if (error) return { ok: false, error: 'Could not rename the document' }

    await emitDomainEvent(ctx, {
      eventType: 'documents.document.renamed',
      entityType: 'document_file',
      entityId: id,
      payload: { name },
    })
    await writeAudit(ctx, {
      action: 'documents.document.renamed',
      entityType: 'document_file',
      entityId: id,
      before,
      after: { name, description: description ?? null },
    })
    revalidateDocs()
    return { ok: true, data: { id } }
  } catch (err) {
    return forbiddenOr(err)
  }
}

export async function moveDocument(
  input: z.input<typeof MoveDocumentInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = MoveDocumentInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request' }
  try {
    const ctx = await getWorkspaceContext()
    await requirePermission(ctx, 'documents.document.move')
    const { id, folderId } = parsed.data

    const { data: before } = await ctx.supabase
      .from('document_files')
      .select('folder_id')
      .eq('workspace_id', ctx.workspace.id)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!before) return { ok: false, error: 'Document not found' }
    if (folderId && !(await folderExists(ctx, folderId))) {
      return { ok: false, error: 'Target folder not found' }
    }

    const { error } = await ctx.supabase
      .from('document_files')
      .update({ folder_id: folderId, updated_by: ctx.userId })
      .eq('workspace_id', ctx.workspace.id)
      .eq('id', id)
    if (error) return { ok: false, error: 'Could not move the document' }

    await emitDomainEvent(ctx, {
      eventType: 'documents.document.moved',
      entityType: 'document_file',
      entityId: id,
      payload: { folderId },
    })
    await writeAudit(ctx, {
      action: 'documents.document.moved',
      entityType: 'document_file',
      entityId: id,
      before: { folderId: before.folder_id },
      after: { folderId },
    })
    revalidateDocs()
    return { ok: true, data: { id } }
  } catch (err) {
    return forbiddenOr(err)
  }
}

/** Shared archive/restore/delete state transition on a document. */
async function setDocumentState(
  permission:
    'documents.document.archive' | 'documents.document.restore' | 'documents.document.delete',
  eventType:
    'documents.document.archived' | 'documents.document.restored' | 'documents.document.deleted',
  patch: { archived_at?: string | null; deleted_at?: string | null },
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getWorkspaceContext()
  await requirePermission(ctx, permission)

  const { data: existing } = await ctx.supabase
    .from('document_files')
    .select('id, archived_at, deleted_at')
    .eq('workspace_id', ctx.workspace.id)
    .eq('id', id)
    .maybeSingle()
  // Delete acts on live docs; restore may act on an archived OR trashed doc.
  const visible =
    permission === 'documents.document.restore'
      ? !!existing
      : existing && existing.deleted_at === null
  if (!visible) return { ok: false, error: 'Document not found' }

  const { error } = await ctx.supabase
    .from('document_files')
    .update({ ...patch, updated_by: ctx.userId })
    .eq('workspace_id', ctx.workspace.id)
    .eq('id', id)
  if (error) return { ok: false, error: 'Could not update the document' }

  await emitDomainEvent(ctx, { eventType, entityType: 'document_file', entityId: id, payload: {} })
  await writeAudit(ctx, { action: eventType, entityType: 'document_file', entityId: id })
  revalidateDocs()
  return { ok: true, data: { id } }
}

export async function archiveDocument(
  input: z.input<typeof DocumentIdInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = DocumentIdInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request' }
  try {
    return await setDocumentState(
      'documents.document.archive',
      'documents.document.archived',
      { archived_at: new Date().toISOString() },
      parsed.data.id,
    )
  } catch (err) {
    return forbiddenOr(err)
  }
}

export async function restoreDocument(
  input: z.input<typeof DocumentIdInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = DocumentIdInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request' }
  try {
    // Restore reverses both archive and trash — the document returns to active.
    return await setDocumentState(
      'documents.document.restore',
      'documents.document.restored',
      { archived_at: null, deleted_at: null },
      parsed.data.id,
    )
  } catch (err) {
    return forbiddenOr(err)
  }
}

export async function deleteDocument(
  input: z.input<typeof DocumentIdInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = DocumentIdInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request' }
  try {
    return await setDocumentState(
      'documents.document.delete',
      'documents.document.deleted',
      { deleted_at: new Date().toISOString() },
      parsed.data.id,
    )
  } catch (err) {
    return forbiddenOr(err)
  }
}

export async function createDocumentVersion(
  input: z.input<typeof CreateDocumentFileVersionInput>,
): Promise<ActionResult<{ id: string; version: number }>> {
  const parsed = CreateDocumentFileVersionInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request' }
  try {
    const ctx = await getWorkspaceContext()
    await requirePermission(ctx, 'documents.document.version.create')
    const { documentId, file } = parsed.data

    const { data: doc } = await ctx.supabase
      .from('document_files')
      .select('id, current_version')
      .eq('workspace_id', ctx.workspace.id)
      .eq('id', documentId)
      .is('deleted_at', null)
      .maybeSingle()
    if (!doc) return { ok: false, error: 'Document not found' }
    const nextVersion = doc.current_version + 1

    const { data: fileRow, error: fileErr } = await ctx.supabase
      .from('files')
      .insert({
        workspace_id: ctx.workspace.id,
        bucket: file.bucket,
        object_key: file.objectKey,
        mime: file.mime ?? null,
        size_bytes: file.sizeBytes,
        module: 'documents',
        entity_type: 'document',
        entity_id: documentId,
        uploaded_by: ctx.userId,
      })
      .select('id')
      .single()
    if (fileErr || !fileRow) return { ok: false, error: 'Could not record the uploaded file' }

    const { data: version, error: verErr } = await ctx.supabase
      .from('document_file_versions')
      .insert({
        workspace_id: ctx.workspace.id,
        document_id: documentId,
        version: nextVersion,
        file_id: fileRow.id,
        filename: file.filename,
        mime: file.mime ?? null,
        size_bytes: file.sizeBytes,
        checksum: file.checksum ?? null,
        cause: 'replace',
        created_by: ctx.userId,
        updated_by: ctx.userId,
      })
      .select('id')
      .single()
    if (verErr || !version) {
      await ctx.supabase.from('files').delete().eq('id', fileRow.id)
      return { ok: false, error: 'Could not create the version' }
    }

    await ctx.supabase
      .from('document_files')
      .update({
        current_version: nextVersion,
        current_version_id: version.id,
        mime: file.mime ?? null,
        size_bytes: file.sizeBytes,
        updated_by: ctx.userId,
      })
      .eq('id', documentId)

    await emitDomainEvent(ctx, {
      eventType: 'documents.document.versioned',
      entityType: 'document_file',
      entityId: documentId,
      payload: { version: nextVersion, sizeBytes: file.sizeBytes },
    })
    await writeAudit(ctx, {
      action: 'documents.document.versioned',
      entityType: 'document_file',
      entityId: documentId,
      after: { version: nextVersion, filename: file.filename },
    })
    revalidateDocs()
    return { ok: true, data: { id: documentId, version: nextVersion } }
  } catch (err) {
    return forbiddenOr(err)
  }
}
