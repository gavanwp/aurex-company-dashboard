import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { DbClient, Tables } from '@aurexos/db'
import type { WorkspaceRole } from '@aurexos/core'
import { createClient } from '@/lib/supabase/server'

/** Cookie holding the id of the workspace the user last worked in. */
export const WORKSPACE_COOKIE = 'aurex-workspace'

export interface WorkspaceContext {
  supabase: DbClient
  userId: string
  profile: Tables<'profiles'>
  workspace: Tables<'workspaces'>
  role: WorkspaceRole
}

/**
 * The ONE way feature code obtains tenancy context (13_Folder_Structure.md).
 * Wrapped in React cache() so layout + page + nested components within a
 * single request share one resolution — call it freely.
 *
 * Redirects (never returns) when: unauthenticated → /login; authenticated but
 * without any workspace membership → /onboarding.
 */
/** A membership row with its workspace folded in via inner join. */
interface MembershipWithWorkspace {
  workspace_id: string
  role: WorkspaceRole
  workspaces: Tables<'workspaces'>
}

export const getWorkspaceContext = cache(async (): Promise<WorkspaceContext> => {
  const supabase = await createClient()

  // getClaims() verifies the JWT LOCALLY (no network round-trip) when the
  // project uses asymmetric signing keys — and the middleware already ran the
  // authoritative network getUser() on this request, with every query below
  // RLS-gated by the same JWT. That makes this safe and removes one
  // cross-region auth hop from every page load. (Legacy symmetric keys fall
  // back to getUser internally, i.e. no worse than before.)
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims.sub
  if (!userId) redirect('/login')

  // profile and the membership+workspace join both depend only on user.id and
  // run concurrently; embedding the workspace via an inner join collapses what
  // was a third sequential query into one — two cross-region round-trips saved.
  // RLS on workspaces (deleted_at IS NULL) still applies to the embed, and the
  // inner join drops memberships whose workspace is hidden/soft-deleted.
  const [{ data: profile }, { data: membershipRows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('workspace_members')
      .select('workspace_id, role, workspaces!inner(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ])
  if (!profile) redirect('/login')

  // The hand-maintained db types don't model PostgREST embeds, so the joined
  // shape is asserted here (the select string is the contract).
  const memberships = (membershipRows ?? []) as unknown as MembershipWithWorkspace[]
  if (memberships.length === 0) redirect('/onboarding')

  const cookieStore = await cookies()
  const preferredId = cookieStore.get(WORKSPACE_COOKIE)?.value

  const membership =
    (preferredId && memberships.find((m) => m.workspace_id === preferredId)) || memberships[0]
  if (!membership) redirect('/onboarding')

  return {
    supabase,
    userId,
    profile,
    workspace: membership.workspaces,
    role: membership.role,
  }
})
