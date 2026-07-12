import 'server-only'

import { revalidatePath } from 'next/cache'
import { ActionError } from '@/lib/action-kit'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

// Capability note: the can() map only carries Phase-1 capabilities, so proposal
// guards are expressed directly by role here — exactly as finance and email
// documented for their own guards. When the capability-map expansion lands these
// become `proposals.manage` / `proposals.view` in can(); until then the roles
// below are the contract and RLS (0009) is the real backstop.
//
// Proposals are a sales artifact (05_User_Roles.md — Sales get Full on
// Proposals): Owner / Admin / Sales create and drive the lifecycle; every other
// internal role may view; portal roles (client, guest) are excluded from the
// internal surface entirely (the client's window on a proposal is the public
// tokenized page, not this module).

const MANAGE_ROLES = new Set(['owner', 'admin', 'sales'])
const READ_EXCLUDED_ROLES = new Set(['client', 'guest'])

/** Mutations (create/edit/send/expire proposals, convert to scaffold). */
export async function requireProposalManage(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  if (!MANAGE_ROLES.has(ctx.role)) {
    throw new ActionError('forbidden')
  }
  return ctx
}

/** Reads — every internal member may view proposals; portal roles may not. */
export async function requireProposalRead(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  if (READ_EXCLUDED_ROLES.has(ctx.role)) {
    throw new ActionError('forbidden')
  }
  return ctx
}

/** Whether a role may run proposal mutations (drives UI affordances). */
export function canManageProposals(role: string): boolean {
  return MANAGE_ROLES.has(role)
}

/** Whether a role may view proposals at all (portal roles may not). */
export function canViewProposals(role: string): boolean {
  return !READ_EXCLUDED_ROLES.has(role)
}

export function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  throw err
}

export function revalidateProposals(): void {
  revalidatePath('/proposals')
}
