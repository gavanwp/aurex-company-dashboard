import type { WorkspaceRole } from '@aurexos/core'

/** Human labels for workspace roles, sentence case (design system §naming). */
export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  project_manager: 'Project manager',
  member: 'Member',
  sales: 'Sales',
  finance: 'Finance',
  hr: 'HR',
  client: 'Client',
  guest: 'Guest',
}
