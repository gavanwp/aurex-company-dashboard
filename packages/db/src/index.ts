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
} from './database.types.js'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types.js'

/** The one client type every query helper and server action accepts. */
export type DbClient = SupabaseClient<Database>
