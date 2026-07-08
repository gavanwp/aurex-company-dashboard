import { z } from 'zod'
import { TASK_PRIORITIES, TASK_STATUSES } from '../types/index'

export const TaskSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  title: z.string().min(1).max(300),
  description: z.string().max(20_000).nullable(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  assigneeId: z.string().uuid().nullable(),
  reporterId: z.string().uuid().nullable(),
  dueDate: z.string().nullable(),
  estimateHours: z.number().nonnegative().nullable(),
  position: z.number(),
  labels: z.array(z.string().max(40)),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Task = z.infer<typeof TaskSchema>

export const CreateTaskInput = z.object({
  title: z.string().min(1, 'Task title is required').max(300),
  projectId: z.string().uuid().nullable().optional(),
  description: z.string().max(20_000).optional(),
  status: z.enum(TASK_STATUSES).default('todo'),
  priority: z.enum(TASK_PRIORITIES).default('none'),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
  estimateHours: z.coerce.number().nonnegative().nullable().optional(),
  labels: z.array(z.string().max(40)).default([]),
})
export type CreateTaskInput = z.infer<typeof CreateTaskInput>

export const UpdateTaskInput = CreateTaskInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>

export const CreateTaskCommentInput = z.object({
  taskId: z.string().uuid(),
  body: z.string().min(1).max(20_000),
})
export type CreateTaskCommentInput = z.infer<typeof CreateTaskCommentInput>
