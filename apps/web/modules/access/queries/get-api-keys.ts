import 'server-only'

import type { WorkspaceContext } from '@/lib/workspace-context'

// API keys are org-scoped and HASHED at rest (0021). The hash column is NEVER
// selected here — the plaintext key is shown exactly once, at creation.

export interface ApiKeyRow {
  id: string
  name: string
  prefix: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  createdByName: string | null
  createdAt: string
  revoked: boolean
}

export async function getApiKeys(ctx: WorkspaceContext): Promise<ApiKeyRow[]> {
  const { data } = await ctx.supabase
    .from('api_keys')
    .select(
      'id, name, prefix, scopes, last_used_at, expires_at, created_by, created_at, revoked_at',
    )
    .eq('organization_id', ctx.workspace.organization_id)
    .order('created_at', { ascending: false })
  const rows = data ?? []
  if (rows.length === 0) return []

  const creatorIds = [...new Set(rows.map((r) => r.created_by).filter((id): id is string => !!id))]
  const names = new Map<string, string>()
  if (creatorIds.length > 0) {
    const { data: profiles } = await ctx.supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', creatorIds)
    for (const p of profiles ?? []) names.set(p.id, p.full_name ?? p.email ?? '')
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    scopes: r.scopes,
    lastUsedAt: r.last_used_at,
    expiresAt: r.expires_at,
    createdByName: r.created_by ? (names.get(r.created_by) ?? null) : null,
    createdAt: r.created_at,
    revoked: r.revoked_at !== null,
  }))
}
