import { z } from 'zod'
import { PROJECT_STATUSES } from '../types/index'

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
  name: z.string().min(1).max(160),
  code: z.string().max(12).nullable(),
  description: z.string().max(10_000).nullable(),
  status: z.enum(PROJECT_STATUSES),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  budgetCents: z.number().int().nonnegative().nullable(),
  ownerId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Project = z.infer<typeof ProjectSchema>

export const CreateProjectInput = z.object({
  name: z.string().min(1, 'Project name is required').max(160),
  clientId: z.string().uuid().nullable().optional(),
  description: z.string().max(10_000).optional(),
  status: z.enum(PROJECT_STATUSES).default('planning'),
  startDate: z.string().date().nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
  budgetCents: z.coerce.number().int().nonnegative().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})
export type CreateProjectInput = z.infer<typeof CreateProjectInput>

export const UpdateProjectInput = CreateProjectInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateProjectInput = z.infer<typeof UpdateProjectInput>
