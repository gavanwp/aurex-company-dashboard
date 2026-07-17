import 'server-only'

import { revalidatePath } from 'next/cache'
import { ActionError } from '@/lib/action-kit'
import { hasPermission, requirePermission } from '@/lib/permissions'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

// Team & HR access — migrated to the data-driven RBAC engine (0019 cutover,
// ADR-0008). Guards now resolve atomic permissions from the engine tables
// instead of hardcoded role sets:
//   manage profiles / decide leave → hr.profile.manage
//   view the directory             → team.member.view
//   see compensation (field-level) → hr.compensation.view
// The seeded matrix + org-owner elevation preserve who had access before the
// cutover (owner/admin/HR manage; owner/HR/finance see comp; all internal view).

/** Mutations that manage other people: profile edits, leave decisions. */
export async function requireTeamManage(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  await requirePermission(ctx, 'hr.profile.manage')
  return ctx
}

/** Reads — every internal member may view the team; portal roles may not. */
export async function requireTeamRead(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  await requirePermission(ctx, 'team.member.view')
  return ctx
}

export function canManageTeam(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'hr.profile.manage')
}

export function canViewTeam(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'team.member.view')
}

/** Whether the viewer may see compensation figures (field-level rule). */
export function canViewCompensation(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'hr.compensation.view')
}

export function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  throw err
}

export function revalidateTeam(memberId?: string): void {
  revalidatePath('/team')
  revalidatePath('/team/leave')
  if (memberId) revalidatePath(`/team/${memberId}`)
}
