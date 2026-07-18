import 'server-only'

import type { WorkspaceContext } from '@/lib/workspace-context'

// Read-only org security posture for the Security Center. Aggregates existing
// data (memberships, roles, mfa_factors, api_keys, invitations, auth_events).

export interface SecurityMember {
  userId: string
  name: string
  roleName: string
}

export interface SecurityOverview {
  headcount: number
  mfaEnrolled: number
  mfaCoveragePct: number
  membersWithoutMfa: SecurityMember[]
  administrativeAccounts: SecurityMember[]
  activeApiKeys: number
  pendingInvitations: number
  failedSignins30d: number
}

export async function getSecurityOverview(ctx: WorkspaceContext): Promise<SecurityOverview> {
  const orgId = ctx.workspace.organization_id
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [
    { data: members },
    { data: verifiedFactors },
    { data: adminRoles },
    { data: apiKeys },
    { data: invites },
    { data: failures },
  ] = await Promise.all([
    ctx.supabase
      .from('workspace_members')
      .select('user_id, role_id')
      .eq('workspace_id', ctx.workspace.id),
    ctx.supabase
      .from('mfa_factors')
      .select('principal_id')
      .not('verified_at', 'is', null)
      .is('revoked_at', null),
    ctx.supabase.from('roles').select('id, name, is_administrative').eq('is_administrative', true),
    ctx.supabase.from('api_keys').select('id').eq('organization_id', orgId).is('revoked_at', null),
    ctx.supabase
      .from('invitations')
      .select('id')
      .eq('organization_id', orgId)
      .eq('status', 'pending'),
    ctx.supabase
      .from('auth_events')
      .select('id')
      .eq('organization_id', orgId)
      .eq('success', false)
      .gte('created_at', since),
  ])

  const memberRows = members ?? []
  const mfaSet = new Set((verifiedFactors ?? []).map((f) => f.principal_id))
  const adminRoleIds = new Set((adminRoles ?? []).map((r) => r.id))
  const adminRoleNames = new Map((adminRoles ?? []).map((r) => [r.id, r.name]))

  // Resolve names + role names for the two lists.
  const roleIds = [...new Set(memberRows.map((m) => m.role_id).filter((id): id is string => !!id))]
  const roleNameById = new Map<string, string>(adminRoleNames)
  if (roleIds.length > 0) {
    const { data: roles } = await ctx.supabase.from('roles').select('id, name').in('id', roleIds)
    for (const r of roles ?? []) roleNameById.set(r.id, r.name)
  }
  const userIds = memberRows.map((m) => m.user_id)
  const nameById = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profiles } = await ctx.supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)
    for (const p of profiles ?? []) nameById.set(p.id, p.full_name ?? p.email ?? 'Unknown')
  }

  const toMember = (m: { user_id: string; role_id: string | null }): SecurityMember => ({
    userId: m.user_id,
    name: nameById.get(m.user_id) ?? 'Unknown',
    roleName: m.role_id ? (roleNameById.get(m.role_id) ?? 'Unknown role') : 'No role',
  })

  const headcount = memberRows.length
  const mfaEnrolled = memberRows.filter((m) => mfaSet.has(m.user_id)).length
  const membersWithoutMfa = memberRows.filter((m) => !mfaSet.has(m.user_id)).map(toMember)
  const administrativeAccounts = memberRows
    .filter((m) => m.role_id && adminRoleIds.has(m.role_id))
    .map(toMember)

  return {
    headcount,
    mfaEnrolled,
    mfaCoveragePct: headcount > 0 ? Math.round((mfaEnrolled / headcount) * 100) : 0,
    membersWithoutMfa,
    administrativeAccounts,
    activeApiKeys: (apiKeys ?? []).length,
    pendingInvitations: (invites ?? []).length,
    failedSignins30d: (failures ?? []).length,
  }
}
