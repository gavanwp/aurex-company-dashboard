import { z } from 'zod'

// Schemas for the Documents DMS (0024): folders, managed files, immutable file
// versions, tags. Distinct from schemas/document.ts (the block-based page/KB
// substrate). Every write action validates its input against one of the *Input
// schemas here — Zod at the boundary (R-T), owned by core.

// ── Storage object reference (a completed upload the caller records) ──────────
// The bytes are already in object storage (StorageArchitecture.md); this is the
// metadata the DMS persists as a files row + version. Keys are built server-side
// via buildObjectKey — never trusted from the client beyond shape validation.
export const DocumentUploadedObjectSchema = z.object({
  bucket: z.string().min(1).max(120),
  objectKey: z.string().min(1).max(1024),
  filename: z.string().min(1).max(400),
  mime: z.string().max(255).optional(),
  sizeBytes: z.coerce.number().int().nonnegative().default(0),
  checksum: z.string().max(128).optional(),
})
export type DocumentUploadedObject = z.infer<typeof DocumentUploadedObjectSchema>

export const DOCUMENT_FILE_VERSION_CAUSES = ['upload', 'replace', 'restore'] as const
export type DocumentFileVersionCause = (typeof DOCUMENT_FILE_VERSION_CAUSES)[number]

// ── Domain shapes (app-facing camelCase views of the rows) ───────────────────
export const DocumentFolderSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).nullable(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type DocumentFolder = z.infer<typeof DocumentFolderSchema>

export const DocumentFileSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  folderId: z.string().uuid().nullable(),
  name: z.string().min(1).max(300),
  description: z.string().max(2000).nullable(),
  currentVersion: z.number().int().min(1),
  mime: z.string().nullable(),
  sizeBytes: z.number().int().nonnegative(),
  archivedAt: z.string().nullable(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type DocumentFile = z.infer<typeof DocumentFileSchema>

// ── Input schemas (the mutation-spine validation boundary) ───────────────────
const FolderName = z.string().trim().min(1, 'Folder name is required').max(160, 'Name is too long')
const DocName = z.string().trim().min(1, 'Document name is required').max(300, 'Name is too long')
const Description = z.string().trim().max(2000).optional()

export const CreateFolderInput = z.object({
  name: FolderName,
  parentId: z.string().uuid().nullable().default(null),
  description: Description,
})
export type CreateFolderInput = z.infer<typeof CreateFolderInput>

export const RenameFolderInput = z.object({
  id: z.string().uuid(),
  name: FolderName,
  description: Description,
})
export type RenameFolderInput = z.infer<typeof RenameFolderInput>

export const DeleteFolderInput = z.object({ id: z.string().uuid() })
export type DeleteFolderInput = z.infer<typeof DeleteFolderInput>

export const UploadDocumentInput = z.object({
  name: DocName,
  folderId: z.string().uuid().nullable().default(null),
  description: Description,
  file: DocumentUploadedObjectSchema,
})
export type UploadDocumentInput = z.infer<typeof UploadDocumentInput>

export const RenameDocumentInput = z.object({
  id: z.string().uuid(),
  name: DocName,
  description: Description,
})
export type RenameDocumentInput = z.infer<typeof RenameDocumentInput>

export const MoveDocumentInput = z.object({
  id: z.string().uuid(),
  folderId: z.string().uuid().nullable(),
})
export type MoveDocumentInput = z.infer<typeof MoveDocumentInput>

export const DocumentIdInput = z.object({ id: z.string().uuid() })
export type DocumentIdInput = z.infer<typeof DocumentIdInput>

export const CreateDocumentFileVersionInput = z.object({
  documentId: z.string().uuid(),
  file: DocumentUploadedObjectSchema,
})
export type CreateDocumentFileVersionInput = z.infer<typeof CreateDocumentFileVersionInput>

// ── Tags (metadata management on documents) ──────────────────────────────────
const TagName = z.string().trim().min(1, 'Tag name is required').max(60, 'Name is too long')
const HexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #2563eb')

export const CreateTagInput = z.object({
  name: TagName,
  color: HexColor.optional(),
})
export type CreateTagInput = z.infer<typeof CreateTagInput>

export const SetDocumentTagsInput = z.object({
  documentId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()).max(50),
})
export type SetDocumentTagsInput = z.infer<typeof SetDocumentTagsInput>
