import 'server-only'

import { revalidatePath } from 'next/cache'
import { ActionError } from '@/lib/action-kit'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

// Capability note: the can() map carries only Phase-1 capabilities, so Team & HR
// guards are expressed by role here — the same approach finance, proposals,
// meetings and contracts documented for their own guards. RLS on hr_profiles /
// hr_leave_requests (0016) is the database backstop. When the capability-map
// expansion lands these become team.view / team.manage in can().
//
// People ops belong to Owner / Admin / HR (06_Module_Breakdown.md §16): they
// manage profiles and decide leave. Every internal member may view the directory
// and file their own leave. Portal roles (client, guest) never see the team.

const MANAGE_ROLES = new Set(['owner', 'admin', 'hr'])
const READ_EXCLUDED_ROLES = new Set(['client', 'guest'])
// Compensation is field-level restricted to Owner / HR / Finance (§16).
const COMP_ROLES = new Set(['owner', 'hr', 'finance'])

/** Mutations that manage other people: profile edits, leave decisions. */
export async function requireTeamManage(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  if (!MANAGE_ROLES.has(ctx.role)) {
    throw new ActionError('forbidden')
  }
  return ctx
}

/** Reads — every internal member may view the team; portal roles may not. */
export async function requireTeamRead(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  if (READ_EXCLUDED_ROLES.has(ctx.role)) {
    throw new ActionError('forbidden')
  }
  return ctx
}

export function canManageTeam(role: string): boolean {
  return MANAGE_ROLES.has(role)
}

export function canViewTeam(role: string): boolean {
  return !READ_EXCLUDED_ROLES.has(role)
}

/** Whether a role may see compensation figures (field-level rule). */
export function canViewCompensation(role: string): boolean {
  return COMP_ROLES.has(role)
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
