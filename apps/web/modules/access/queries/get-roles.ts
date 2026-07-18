import 'server-only'

import type { WorkspaceContext } from '@/lib/workspace-context'

// Read model for the Roles catalog / matrix. System roles are immutable templates
// (ADR-0008); this surface is read-only until custom-role editing lands.

export interface RolePermissionGroup {
  module: string
  actions: string[]
}

export interface RoleCatalogRow {
  id: string
  key: string
  name: string
  scope: string
  description: string | null
  isAdministrative: boolean
  permissionCount: number
  memberCount: number
  /** Permissions grouped by module for display. */
  groups: RolePermissionGroup[]
}

const SCOPE_ORDER: Record<string, number> = {
  platform: 0,
  organization: 1,
  workspace: 2,
  portal: 3,
}

export async function getRolesCatalog(ctx: WorkspaceContext): Promise<RoleCatalogRow[]> {
  const [{ data: roles }, { data: grants }, { data: members }] = await Promise.all([
    ctx.supabase
      .from('roles')
      .select('id, key, name, scope, description, is_administrative')
      .eq('is_system', true)
      .is('deleted_at', null),
    ctx.supabase.from('role_permissions').select('role_id, permission_key'),
    ctx.supabase.from('workspace_members').select('role_id').eq('workspace_id', ctx.workspace.id),
  ])

  const permsByRole = new Map<string, string[]>()
  for (const g of grants ?? []) {
    const list = permsByRole.get(g.role_id) ?? []
    list.push(g.permission_key)
    permsByRole.set(g.role_id, list)
  }

  const memberCountByRole = new Map<string, number>()
  for (const m of members ?? []) {
    if (m.role_id) memberCountByRole.set(m.role_id, (memberCountByRole.get(m.role_id) ?? 0) + 1)
  }

  return (roles ?? [])
    .map((r): RoleCatalogRow => {
      const keys = permsByRole.get(r.id) ?? []
      const byModule = new Map<string, string[]>()
      for (const key of keys) {
        const [module = key, , action] = key.split('.')
        const actions = byModule.get(module) ?? []
        actions.push(action ?? key)
        byModule.set(module, actions)
      }
      const groups = [...byModule.entries()]
        .map(([module, actions]) => ({ module, actions: [...new Set(actions)].sort() }))
        .sort((a, b) => a.module.localeCompare(b.module))
      return {
        id: r.id,
        key: r.key,
        name: r.name,
        scope: r.scope,
        description: r.description,
        isAdministrative: r.is_administrative,
        permissionCount: keys.length,
        memberCount: memberCountByRole.get(r.id) ?? 0,
        groups,
      }
    })
    .sort(
      (a, b) =>
        (SCOPE_ORDER[a.scope] ?? 9) - (SCOPE_ORDER[b.scope] ?? 9) ||
        b.permissionCount - a.permissionCount,
    )
}
