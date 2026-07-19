import 'server-only'

import { hasPermission } from '@/lib/permissions'
import type { WorkspaceContext } from '@/lib/workspace-context'

// Engine-backed access checks for the Documents surface (drive UI affordances).
// Kept out of the 'use server' actions file (server actions may only export async
// functions with serializable args — these take the workspace context).

export interface DocumentsAbilities {
  canView: boolean
  canCreateFolder: boolean
  canUpdateFolder: boolean
  canDeleteFolder: boolean
  canUpload: boolean
  canRename: boolean
  canMove: boolean
  canArchive: boolean
  canRestore: boolean
  canDelete: boolean
  canDownload: boolean
  canCreateVersion: boolean
}

/** Whether the viewer may open the Documents module at all. */
export function canViewDocuments(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'documents.document.read')
}

/** Resolve every documents ability once, for gating the toolbar + row actions. */
export async function getDocumentsAbilities(ctx: WorkspaceContext): Promise<DocumentsAbilities> {
  const [
    canView,
    canCreateFolder,
    canUpdateFolder,
    canDeleteFolder,
    canUpload,
    canRename,
    canMove,
    canArchive,
    canRestore,
    canDelete,
    canDownload,
    canCreateVersion,
  ] = await Promise.all([
    hasPermission(ctx, 'documents.document.read'),
    hasPermission(ctx, 'documents.folder.create'),
    hasPermission(ctx, 'documents.folder.update'),
    hasPermission(ctx, 'documents.folder.delete'),
    hasPermission(ctx, 'documents.document.upload'),
    hasPermission(ctx, 'documents.document.rename'),
    hasPermission(ctx, 'documents.document.move'),
    hasPermission(ctx, 'documents.document.archive'),
    hasPermission(ctx, 'documents.document.restore'),
    hasPermission(ctx, 'documents.document.delete'),
    hasPermission(ctx, 'documents.document.download'),
    hasPermission(ctx, 'documents.document.version.create'),
  ])
  return {
    canView,
    canCreateFolder,
    canUpdateFolder,
    canDeleteFolder,
    canUpload,
    canRename,
    canMove,
    canArchive,
    canRestore,
    canDelete,
    canDownload,
    canCreateVersion,
  }
}
