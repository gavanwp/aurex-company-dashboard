import 'server-only'

import type { WorkspaceContext } from '@/lib/workspace-context'

export interface WorkspaceMemberRow {
  userId: string
  role: string
  specialization: string | null
  joinedAt: string
  fullName: string | null
  email: string
  avatarUrl: string | null
}

export async function getWorkspaceMembers(ctx: WorkspaceContext): Promise<WorkspaceMemberRow[]> {
  const { data: members } = await ctx.supabase
    .from('workspace_members')
    .select('user_id, role, specialization, created_at')
    .eq('workspace_id', ctx.workspace.id)
    .order('created_at', { ascending: true })
  if (!members || members.length === 0) return []

  const { data: profiles } = await ctx.supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in(
      'id',
      members.map((m) => m.user_id),
    )
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  return members.map((m) => {
    const profile = profileById.get(m.user_id)
    return {
      userId: m.user_id,
      role: m.role,
      specialization: m.specialization,
      joinedAt: m.created_at,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? '—',
      avatarUrl: profile?.avatar_url ?? null,
    }
  })
}
