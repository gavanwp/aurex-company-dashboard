import { z } from 'zod'
import {
  DOCUMENT_VERSION_CAUSES,
  FILE_AV_STATUSES,
  KB_SPACE_ACL_KINDS,
  KB_VERIFICATION_STATES,
} from '../types/index'

// Governs documents.content and document_versions.snapshot (0006).
export const DocumentBlockSchema = z
  .object({
    id: z.string(),
    type: z.string().max(40),
    content: z.unknown().optional(),
    children: z.array(z.unknown()).optional(),
  })
  .passthrough()
export type DocumentBlock = z.infer<typeof DocumentBlockSchema>

export const DocumentContentSchema = z.array(DocumentBlockSchema)
export type DocumentContent = z.infer<typeof DocumentContentSchema>

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  spaceId: z.string().uuid().nullable(),
  title: z.string().min(1).max(300),
  icon: z.string().max(80).nullable(),
  content: DocumentContentSchema,
  currentVersion: z.number().int().min(1),
  isTemplate: z.boolean(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Document = z.infer<typeof DocumentSchema>

export const CreateDocumentInput = z.object({
  title: z.string().min(1, 'Document title is required').max(300),
  projectId: z.string().uuid().nullable().optional(),
  spaceId: z.string().uuid().nullable().optional(),
  icon: z.string().max(80).optional(),
  content: DocumentContentSchema.default([]),
  isTemplate: z.boolean().default(false),
})
export type CreateDocumentInput = z.infer<typeof CreateDocumentInput>

export const UpdateDocumentInput = CreateDocumentInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentInput>

export const CreateDocumentVersionInput = z.object({
  documentId: z.string().uuid(),
  cause: z.enum(DOCUMENT_VERSION_CAUSES).default('manual'),
})
export type CreateDocumentVersionInput = z.infer<typeof CreateDocumentVersionInput>

export const KbSpaceSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(160),
  purpose: z.string().max(2_000).nullable(),
  icon: z.string().max(80).nullable(),
  aclKind: z.enum(KB_SPACE_ACL_KINDS),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type KbSpace = z.infer<typeof KbSpaceSchema>

export const CreateKbSpaceInput = z.object({
  name: z.string().min(1, 'Space name is required').max(160),
  purpose: z.string().max(2_000).optional(),
  icon: z.string().max(80).optional(),
  aclKind: z.enum(KB_SPACE_ACL_KINDS).default('workspace'),
})
export type CreateKbSpaceInput = z.infer<typeof CreateKbSpaceInput>

export const UpdateKbSpaceInput = CreateKbSpaceInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateKbSpaceInput = z.infer<typeof UpdateKbSpaceInput>

export const KbPageSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  documentId: z.string().uuid(),
  spaceId: z.string().uuid(),
  verificationState: z.enum(KB_VERIFICATION_STATES),
  verifyBy: z.string().nullable(),
  ownerUserId: z.string().uuid().nullable(),
  tags: z.array(z.string().max(40)),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type KbPage = z.infer<typeof KbPageSchema>

export const CreateKbPageInput = z.object({
  documentId: z.string().uuid(),
  spaceId: z.string().uuid(),
  verificationState: z.enum(KB_VERIFICATION_STATES).default('needs_review'),
  verifyBy: z.string().date().nullable().optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().max(40)).default([]),
})
export type CreateKbPageInput = z.infer<typeof CreateKbPageInput>

export const UpdateKbPageInput = CreateKbPageInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateKbPageInput = z.infer<typeof UpdateKbPageInput>

export const FileSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  bucket: z.string().min(1),
  objectKey: z.string().min(1),
  mime: z.string().max(200).nullable(),
  sizeBytes: z.number().int().nonnegative(),
  module: z.string().min(1).max(40),
  entityType: z.string().max(40).nullable(),
  entityId: z.string().uuid().nullable(),
  avStatus: z.enum(FILE_AV_STATUSES),
  uploadedBy: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type FileMetadata = z.infer<typeof FileSchema>

export const CreateFileInput = z.object({
  bucket: z.string().min(1),
  objectKey: z.string().min(1),
  mime: z.string().max(200).optional(),
  sizeBytes: z.coerce.number().int().nonnegative().default(0),
  module: z.string().min(1).max(40),
  entityType: z.string().max(40).nullable().optional(),
  entityId: z.string().uuid().nullable().optional(),
})
export type CreateFileInput = z.infer<typeof CreateFileInput>
