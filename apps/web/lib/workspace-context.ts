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
export const getWorkspaceContext = cache(async (): Promise<WorkspaceContext> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Profile and memberships both depend only on user.id and are independent of
  // each other, so they run concurrently — this saves one cross-region DB
  // round-trip on every authenticated page load (getWorkspaceContext gates all
  // of them). Redirect checks keep their original order (auth before onboarding).
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ])
  if (!profile) redirect('/login')
  if (!memberships || memberships.length === 0) redirect('/onboarding')

  // Soft-deleted workspaces are already excluded by RLS (workspaces_select
  // requires deleted_at IS NULL); the filter here is an explicit backstop.
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .in(
      'id',
      memberships.map((m) => m.workspace_id),
    )
    .is('deleted_at', null)
  if (!workspaces || workspaces.length === 0) redirect('/onboarding')

  const workspaceById = new Map(workspaces.map((w) => [w.id, w]))

  const cookieStore = await cookies()
  const preferredId = cookieStore.get(WORKSPACE_COOKIE)?.value

  const membership =
    (preferredId &&
      workspaceById.has(preferredId) &&
      memberships.find((m) => m.workspace_id === preferredId)) ||
    memberships.find((m) => workspaceById.has(m.workspace_id))
  const workspace = membership ? workspaceById.get(membership.workspace_id) : undefined
  if (!membership || !workspace) redirect('/onboarding')

  return {
    supabase,
    userId: user.id,
    profile,
    workspace,
    role: membership.role,
  }
})
