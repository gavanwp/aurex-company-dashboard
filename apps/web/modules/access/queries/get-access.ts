import 'server-only'

import type { Tables } from '@aurexos/db'
import type { WorkspaceContext } from '@/lib/workspace-context'

// Reads for the People & Access admin surface. RLS scopes everything to the
// workspace/org; roles + role_permissions are readable to resolve names.

export interface RosterRow {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  roleId: string | null
  roleName: string
  status: string
  isYou: boolean
}

export interface InvitationRow {
  id: string
  email: string
  roleName: string
  invitedByName: string | null
  expiresAt: string
  createdAt: string
}

export interface AssignableRole {
  id: string
  key: string
  name: string
  scope: string
}

async function roleNames(ctx: WorkspaceContext, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return map
  const { data } = await ctx.supabase.from('roles').select('id, name').in('id', unique)
  for (const r of data ?? []) map.set(r.id, r.name)
  return map
}

async function profileNames(
  ctx: WorkspaceContext,
  ids: string[],
): Promise<Map<string, { name: string; email: string; avatarUrl: string | null }>> {
  const map = new Map<string, { name: string; email: string; avatarUrl: string | null }>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return map
  const { data } = await ctx.supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', unique)
  for (const p of data ?? []) {
    map.set(p.id, {
      name: p.full_name ?? p.email ?? 'Unknown',
      email: p.email ?? '',
      avatarUrl: p.avatar_url,
    })
  }
  return map
}

/** The workspace roster: every member with their resolved role + status. */
export async function getRoster(ctx: WorkspaceContext): Promise<RosterRow[]> {
  const { data: members } = await ctx.supabase
    .from('workspace_members')
    .select('user_id, role_id')
    .eq('workspace_id', ctx.workspace.id)
  const rows = (members ?? []) as Pick<Tables<'workspace_members'>, 'user_id' | 'role_id'>[]
  if (rows.length === 0) return []

  const [names, roles] = await Promise.all([
    profileNames(
      ctx,
      rows.map((r) => r.user_id),
    ),
    roleNames(
      ctx,
      rows.map((r) => r.role_id).filter((id): id is string => !!id),
    ),
  ])

  return rows
    .map((r) => {
      const identity = names.get(r.user_id)
      return {
        userId: r.user_id,
        name: identity?.name ?? 'Unknown',
        email: identity?.email ?? '',
        avatarUrl: identity?.avatarUrl ?? null,
        roleId: r.role_id,
        roleName: r.role_id ? (roles.get(r.role_id) ?? 'Unknown role') : 'No role',
        status: 'active',
        isYou: r.user_id === ctx.userId,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Pending invitations for the organization. */
export async function getPendingInvitations(ctx: WorkspaceContext): Promise<InvitationRow[]> {
  const { data } = await ctx.supabase
    .from('invitations')
    .select('id, email, role_id, invited_by, expires_at, created_at')
    .eq('organization_id', ctx.workspace.organization_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  const rows = data ?? []
  if (rows.length === 0) return []

  const [roles, inviters] = await Promise.all([
    roleNames(
      ctx,
      rows.map((r) => r.role_id).filter((id): id is string => !!id),
    ),
    profileNames(
      ctx,
      rows.map((r) => r.invited_by).filter((id): id is string => !!id),
    ),
  ])

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    roleName: r.role_id ? (roles.get(r.role_id) ?? 'Unknown role') : 'Default',
    invitedByName: r.invited_by ? (inviters.get(r.invited_by)?.name ?? null) : null,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  }))
}

/** System roles assignable within a workspace (workspace + portal scoped). */
export async function getAssignableRoles(ctx: WorkspaceContext): Promise<AssignableRole[]> {
  const { data } = await ctx.supabase
    .from('roles')
    .select('id, key, name, scope')
    .eq('is_system', true)
    .in('scope', ['workspace', 'portal'])
    .is('deleted_at', null)
    .order('name')
  return (data ?? []).map((r) => ({ id: r.id, key: r.key, name: r.name, scope: r.scope }))
}
