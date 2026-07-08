// Plain data shapes shared between server queries and client components.
// No 'server-only' here — client components import these types.

import type { ProjectStatusDb } from '@aurexos/db'

export interface ProjectOwnerRef {
  id: string
  fullName: string | null
  avatarUrl: string | null
}

export interface ProjectListRow {
  id: string
  name: string
  code: string | null
  color: string | null
  status: ProjectStatusDb
  clientId: string | null
  clientName: string | null
  startDate: string | null
  dueDate: string | null
  owner: ProjectOwnerRef | null
  /** Tasks not done/canceled (and not deleted). */
  openTasks: number
  /** All non-deleted tasks. */
  totalTasks: number
  /** Tasks in status done. */
  doneTasks: number
}

export interface ProjectDetailData {
  id: string
  name: string
  code: string | null
  color: string | null
  status: ProjectStatusDb
  description: string | null
  startDate: string | null
  dueDate: string | null
  budgetCents: number | null
  createdAt: string
  client: { id: string; name: string } | null
  owner: ProjectOwnerRef | null
}

export interface ClientOption {
  id: string
  name: string
}
