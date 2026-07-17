import 'server-only'

import { cache } from 'react'
import { ActionError } from '@/lib/action-error'
import type { WorkspaceContext } from '@/lib/workspace-context'

// The in-process RBAC resolver (ADR-0008 / EnterpriseIdentityAndRBAC.md §1.2-1.3).
// Parity with the SQL has_permission() function (0019): it resolves the acting
// principal's effective permission set for the active workspace ONCE per request
// (React cache), then checks are O(1) in memory. DB is truth; this reads the
// engine tables via the caller's RLS-scoped client.
//
// Resolution (DENY-wins):
//   workspace role grant                       → allow
//   ⊕ org owner/admin → organization_owner set  → allow (preserves pre-cutover owner access)
//   ± user_permission_overrides                 → allow adds / deny removes (deny wins)

/** Resolve and cache the acting principal's effective permission keys. */
export const getEffectivePermissions = cache(
  async (ctx: WorkspaceContext): Promise<ReadonlySet<string>> => {
    const orgId = ctx.workspace.organization_id

    // The member's workspace role, the org membership (for owner/admin elevation),
    // and this principal's overrides — resolved together.
    const [membership, orgMembership, overridesResult] = await Promise.all([
      ctx.supabase
        .from('workspace_members')
        .select('role_id')
        .eq('workspace_id', ctx.workspace.id)
        .eq('user_id', ctx.userId)
        .maybeSingle(),
      ctx.supabase
        .from('organization_members')
        .select('org_role')
        .eq('organization_id', orgId)
        .eq('principal_id', ctx.userId)
        .maybeSingle(),
      ctx.supabase
        .from('user_permission_overrides')
        .select('permission_key, effect, workspace_id, expires_at')
        .eq('principal_id', ctx.userId)
        .eq('organization_id', orgId),
    ])

    const roleId = membership.data?.role_id ?? null
    const isOrgElevated =
      orgMembership.data?.org_role === 'owner' || orgMembership.data?.org_role === 'admin'

    // Gather the role ids whose grants apply: the workspace role + (for org
    // owner/admin) the organization_owner template.
    const roleIds: string[] = []
    if (roleId) roleIds.push(roleId)
    if (isOrgElevated) {
      const { data: orgOwnerRole } = await ctx.supabase
        .from('roles')
        .select('id')
        .eq('key', 'organization_owner')
        .eq('is_system', true)
        .is('deleted_at', null)
        .maybeSingle()
      if (orgOwnerRole?.id) roleIds.push(orgOwnerRole.id)
    }

    const set = new Set<string>()
    if (roleIds.length > 0) {
      const { data: grants } = await ctx.supabase
        .from('role_permissions')
        .select('permission_key')
        .in('role_id', roleIds)
      for (const g of grants ?? []) set.add(g.permission_key)
    }

    // Overrides: allow adds, deny removes. Scope: global (workspace_id null) or
    // this workspace; expired overrides are ignored. Deny is applied last so it
    // always wins over any grant or allow at the same or broader scope.
    const now = Date.now()
    const applicable = (overridesResult.data ?? []).filter(
      (o) =>
        (o.workspace_id === null || o.workspace_id === ctx.workspace.id) &&
        (o.expires_at === null || Date.parse(o.expires_at) > now),
    )
    for (const o of applicable) if (o.effect === 'allow') set.add(o.permission_key)
    for (const o of applicable) if (o.effect === 'deny') set.delete(o.permission_key)

    return set
  },
)

/** True if the acting principal holds `permissionKey` in the active workspace. */
export async function hasPermission(
  ctx: WorkspaceContext,
  permissionKey: string,
): Promise<boolean> {
  return (await getEffectivePermissions(ctx)).has(permissionKey)
}

/** True if the principal holds ALL of the given permissions. */
export async function hasAllPermissions(
  ctx: WorkspaceContext,
  permissionKeys: readonly string[],
): Promise<boolean> {
  const set = await getEffectivePermissions(ctx)
  return permissionKeys.every((k) => set.has(k))
}

/**
 * Guard: throws ActionError('forbidden') unless the principal holds the
 * permission. The engine-backed replacement for role-set guards (0019 cutover).
 */
export async function requirePermission(
  ctx: WorkspaceContext,
  permissionKey: string,
): Promise<void> {
  if (!(await hasPermission(ctx, permissionKey))) {
    throw new ActionError('forbidden')
  }
}
