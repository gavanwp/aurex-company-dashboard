import 'server-only'

import { hasPermission } from '@/lib/permissions'
import type { WorkspaceContext } from '@/lib/workspace-context'

// Engine-backed access checks for the People & Access surface. Kept out of the
// 'use server' actions file (server actions may only export async functions with
// serializable args — these take the workspace context).

/** Whether the viewer may invite / manage members (drives UI affordances). */
export function canManageAccess(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'users.user.invite')
}

/** Whether the viewer may see the People & Access surface. */
export function canViewAccess(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'users.user.view')
}

/** Whether the viewer may see the Roles catalog (anyone who assigns roles). */
export function canViewRoles(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'users.role.assign')
}

/** Whether the viewer may manage API keys. */
export function canManageApiKeys(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'settings.apikey.manage')
}
