import 'server-only'

import { revalidatePath } from 'next/cache'
import { ActionError } from '@/lib/action-error'
import { requirePermission } from '@/lib/permissions'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

// Capability note: the can() map only carries Phase-1 capabilities, so meeting
// guards are expressed directly by role here — exactly as finance, proposals and
// calendar documented for their own guards. When the capability-map expansion
// lands these become `meetings.manage` / `meetings.view` in can(); until then the
// roles below are the contract and RLS (0010/0014, is_workspace_member) is the
// real backstop.
//
// Meetings are an internal collaboration surface (05_User_Roles.md — most
// internal roles run meetings): every internal role may create and drive
// meetings; portal roles (client, guest) are excluded from the internal surface
// entirely. This is deliberately broader than finance/proposals, which gate
// mutations to a subset of roles, because meeting workflow (agenda, notes,
// decisions, action items) is core team work rather than a sensitive artifact.

const PORTAL_ROLES = new Set(['client', 'guest'])

/** Mutations — every internal member may run meeting workflow; portal roles may not. */
export async function requireMeetingAccess(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  await requirePermission(ctx, 'meetings.meeting.edit')
  return ctx
}

/** Reads — every internal member may view meetings; portal roles may not. */
export async function requireMeetingRead(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  await requirePermission(ctx, 'meetings.meeting.view')
  return ctx
}

/** Whether a role may run meeting mutations (drives UI affordances). */
export function canManageMeetings(role: string): boolean {
  return !PORTAL_ROLES.has(role)
}

/** Whether a role may view meetings at all (portal roles may not). */
export function canViewMeetings(role: string): boolean {
  return !PORTAL_ROLES.has(role)
}

export function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  console.error('meetings action failed:', err)
  return { ok: false, error: 'Something went wrong. Please try again.' }
}

export function revalidateMeetings(meetingId?: string): void {
  revalidatePath('/meetings')
  revalidatePath('/meetings/decisions')
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
  if (meetingId) revalidatePath(`/meetings/${meetingId}`)
}
