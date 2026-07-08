import { z } from 'zod'
import { MEMBER_SPECIALIZATIONS, WORKSPACE_ROLES } from '../types/index'

export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase letters, numbers and hyphens only'),
  logoUrl: z.string().url().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Workspace = z.infer<typeof WorkspaceSchema>

export const CreateWorkspaceInput = z.object({
  name: z.string().min(1, 'Workspace name is required').max(120),
})
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInput>

export const WorkspaceMemberSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(WORKSPACE_ROLES),
  specialization: z.enum(MEMBER_SPECIALIZATIONS).nullable(),
  createdAt: z.string(),
})
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>
