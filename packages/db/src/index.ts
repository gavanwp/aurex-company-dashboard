export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  WorkspaceRoleDb,
  MemberSpecializationDb,
  ClientStatusDb,
  DealStageDb,
  ProjectStatusDb,
  TaskStatusDb,
  TaskPriorityDb,
} from './database.types'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/** The one client type every query helper and server action accepts. */
export type DbClient = SupabaseClient<Database>

// Background jobs — PgEnqueuer + worker claim/complete/fail (ADR-0005).
export { PgEnqueuer, claimJobs, completeJob, failJob } from './jobs'

// Storage providers — the only bucket-SDK call sites (StorageArchitecture.md §2.4).
export { SupabaseStorageProvider, R2StorageProvider, createStorageProviders } from './storage'
