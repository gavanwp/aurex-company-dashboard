// Domain enums — mirrored 1:1 by Postgres enum types in supabase/migrations.
// Changing a value here requires a migration in the same PR (12_Project_Rules.md).

export const WORKSPACE_ROLES = [
  'owner',
  'admin',
  'project_manager',
  'member',
  'sales',
  'finance',
  'hr',
  'client',
  'guest',
] as const
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

export const MEMBER_SPECIALIZATIONS = [
  'developer',
  'designer',
  'seo',
  'content',
  'marketing',
] as const
export type MemberSpecialization = (typeof MEMBER_SPECIALIZATIONS)[number]

export const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'archived'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const TASK_STATUSES = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'canceled',
] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const CLIENT_STATUSES = ['prospect', 'active', 'paused', 'churned'] as const
export type ClientStatus = (typeof CLIENT_STATUSES)[number]

export const DEAL_STAGES = [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const
export type DealStage = (typeof DEAL_STAGES)[number]

/** Capabilities checked by can() — one per guarded operation, module-prefixed. */
export type Capability =
  | 'workspace.manage'
  | 'workspace.members.manage'
  | 'projects.view'
  | 'projects.create'
  | 'projects.edit'
  | 'projects.delete'
  | 'tasks.view'
  | 'tasks.create'
  | 'tasks.edit'
  | 'tasks.delete'
  | 'crm.view'
  | 'crm.create'
  | 'crm.edit'
  | 'crm.delete'
  | 'clients.view'
  | 'clients.create'
  | 'clients.edit'
  | 'clients.delete'
  | 'dashboard.view'
  | 'settings.view'
