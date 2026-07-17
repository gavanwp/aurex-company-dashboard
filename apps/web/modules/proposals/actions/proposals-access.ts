import 'server-only'

import { revalidatePath } from 'next/cache'
import { ActionError } from '@/lib/action-error'
import { hasPermission, requirePermission } from '@/lib/permissions'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

// Proposal access resolves through the RBAC engine (0019 cutover, ADR-0008):
// proposals.proposal.edit to manage, proposals.proposal.view to read. The seeded
// matrix + org-owner elevation preserve pre-cutover access (Owner/Admin/Sales
// manage; all internal view; portal roles excluded).

/** Mutations (create/edit/send/expire proposals, convert to scaffold). */
export async function requireProposalManage(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  await requirePermission(ctx, 'proposals.proposal.edit')
  return ctx
}

/** Reads — every internal member may view proposals; portal roles may not. */
export async function requireProposalRead(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  await requirePermission(ctx, 'proposals.proposal.view')
  return ctx
}

/** Whether the viewer may run proposal mutations (drives UI affordances). */
export function canManageProposals(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'proposals.proposal.edit')
}

/** Whether the viewer may view proposals at all (portal roles may not). */
export function canViewProposals(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'proposals.proposal.view')
}

export function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  throw err
}

export function revalidateProposals(): void {
  revalidatePath('/proposals')
}
