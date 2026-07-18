import 'server-only'

import type { WorkspaceContext } from '@/lib/workspace-context'

// The signed-in user's own sessions + recent login history (0021). RLS already
// scopes both to the principal; these are self-service security surfaces.

export interface SessionRow {
  id: string
  userAgent: string | null
  ip: string | null
  createdAt: string
  lastActiveAt: string
}

export interface LoginEventRow {
  id: string
  type: string
  method: string | null
  success: boolean
  ip: string | null
  createdAt: string
}

export async function getMySessions(ctx: WorkspaceContext): Promise<SessionRow[]> {
  const { data } = await ctx.supabase
    .from('sessions')
    .select('id, user_agent, ip, created_at, last_active_at')
    .eq('principal_id', ctx.userId)
    .is('revoked_at', null)
    .order('last_active_at', { ascending: false })
    .limit(50)
  return (data ?? []).map((r) => ({
    id: r.id,
    userAgent: r.user_agent,
    ip: r.ip,
    createdAt: r.created_at,
    lastActiveAt: r.last_active_at,
  }))
}

export async function getMyLoginHistory(ctx: WorkspaceContext): Promise<LoginEventRow[]> {
  const { data } = await ctx.supabase
    .from('auth_events')
    .select('id, type, method, success, ip, created_at')
    .eq('principal_id', ctx.userId)
    .order('created_at', { ascending: false })
    .limit(15)
  return (data ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    method: r.method,
    success: r.success,
    ip: r.ip,
    createdAt: r.created_at,
  }))
}
