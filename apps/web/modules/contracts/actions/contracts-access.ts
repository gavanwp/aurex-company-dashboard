import 'server-only'

import { revalidatePath } from 'next/cache'
import { ActionError } from '@/lib/action-error'
import { hasPermission, requirePermission } from '@/lib/permissions'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

// Contract access resolves through the data-driven RBAC engine (0019 cutover,
// ADR-0008): contracts.contract.edit to manage, contracts.contract.view to read.
// The seeded matrix + org-owner elevation preserve the pre-cutover access
// (Owner/Admin/Sales manage; all internal view; portal roles excluded).

/** Mutations (create/edit/send/activate/terminate; obligations; convert). */
export async function requireContractManage(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  await requirePermission(ctx, 'contracts.contract.edit')
  return ctx
}

/** Reads — every internal member may view contracts; portal roles may not. */
export async function requireContractRead(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  await requirePermission(ctx, 'contracts.contract.view')
  return ctx
}

/** Whether the viewer may run contract mutations (drives UI affordances). */
export function canManageContracts(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'contracts.contract.edit')
}

/** Whether the viewer may view contracts at all (portal roles may not). */
export function canViewContracts(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'contracts.contract.view')
}

export function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  throw err
}

export function revalidateContracts(contractId?: string): void {
  revalidatePath('/contracts')
  if (contractId) revalidatePath(`/contracts/${contractId}`)
}
