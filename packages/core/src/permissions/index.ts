import type { Capability, WorkspaceRole } from '../types/index.js'

// RBAC capability map per 05_User_Roles.md. Server actions call can() before every
// mutation; RLS in supabase/migrations is the database backstop — always both.

const FULL_MODULE_ACCESS: Capability[] = [
  'dashboard.view',
  'projects.view',
  'projects.create',
  'projects.edit',
  'projects.delete',
  'tasks.view',
  'tasks.create',
  'tasks.edit',
  'tasks.delete',
  'crm.view',
  'crm.create',
  'crm.edit',
  'crm.delete',
  'clients.view',
  'clients.create',
  'clients.edit',
  'clients.delete',
  'settings.view',
]

const ROLE_CAPABILITIES: Record<WorkspaceRole, ReadonlySet<Capability>> = {
  owner: new Set<Capability>([...FULL_MODULE_ACCESS, 'workspace.manage', 'workspace.members.manage']),
  admin: new Set<Capability>([...FULL_MODULE_ACCESS, 'workspace.manage', 'workspace.members.manage']),
  project_manager: new Set<Capability>(FULL_MODULE_ACCESS),
  member: new Set<Capability>([
    'dashboard.view',
    'projects.view',
    'projects.create',
    'projects.edit',
    'tasks.view',
    'tasks.create',
    'tasks.edit',
    'clients.view',
    'settings.view',
  ]),
  sales: new Set<Capability>([
    'dashboard.view',
    'projects.view',
    'tasks.view',
    'tasks.create',
    'tasks.edit',
    'crm.view',
    'crm.create',
    'crm.edit',
    'crm.delete',
    'clients.view',
    'clients.create',
    'clients.edit',
    'settings.view',
  ]),
  finance: new Set<Capability>([
    'dashboard.view',
    'projects.view',
    'tasks.view',
    'crm.view',
    'clients.view',
    'settings.view',
  ]),
  hr: new Set<Capability>(['dashboard.view', 'tasks.view', 'tasks.create', 'tasks.edit', 'settings.view']),
  // Client and guest surfaces are read-only slices; the client portal (Phase 4)
  // further restricts WHAT rows they see — that scoping lives in RLS, not here.
  client: new Set<Capability>(['dashboard.view', 'projects.view', 'tasks.view']),
  guest: new Set<Capability>(['dashboard.view', 'projects.view', 'tasks.view']),
}

export function can(role: WorkspaceRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].has(capability)
}

export function capabilitiesFor(role: WorkspaceRole): Capability[] {
  return [...ROLE_CAPABILITIES[role]]
}

/** Roles allowed to manage workspace membership — used by invite/removal flows. */
export const MEMBER_MANAGER_ROLES: WorkspaceRole[] = ['owner', 'admin']
