// Plain data shapes shared between server queries and client components.
// No 'server-only' here — client components import these types.

import type { TaskPriorityDb, TaskStatusDb } from '@aurexos/db'

export interface TaskProjectRef {
  id: string
  name: string
  color: string | null
}

export interface TaskAssigneeRef {
  id: string
  fullName: string | null
  avatarUrl: string | null
}

export interface TaskRow {
  id: string
  projectId: string | null
  title: string
  description: string | null
  status: TaskStatusDb
  priority: TaskPriorityDb
  assigneeId: string | null
  dueDate: string | null
  labels: string[]
  position: number
  createdAt: string
  project: TaskProjectRef | null
  assignee: TaskAssigneeRef | null
}

export interface MemberOption {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
}

export interface ProjectOption {
  id: string
  name: string
  color: string | null
}
