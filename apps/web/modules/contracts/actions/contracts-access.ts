import 'server-only'

import { revalidatePath } from 'next/cache'
import { ActionError } from '@/lib/action-error'
import { requirePermission } from '@/lib/permissions'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

// Capability note: the can() map only carries Phase-1 capabilities, so contract
// guards are expressed directly by role here — exactly as finance, proposals and
// meetings documented for their own guards. When the capability-map expansion
// lands these become `contracts.manage` / `contracts.view` in can(); until then
// the roles below are the contract and RLS (0009, is_workspace_member) is the
// real backstop.
//
// Contracts are the legal artifact that bridges sales and billing (05_User_Roles
// — Sales draft, Finance own the financial terms, Owner/Admin/PM view). v1 gates
// mutations to Owner / Admin / Sales (mirroring Proposals, the direct analog);
// Finance-only financial-term editing is a later refinement. Every other
// internal role may view; portal roles (client, guest) are excluded from the
// internal surface entirely — the client's window on a contract is the public
// tokenized signing page, not this module.

const MANAGE_ROLES = new Set(['owner', 'admin', 'sales'])
const READ_EXCLUDED_ROLES = new Set(['client', 'guest'])

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

/** Whether a role may run contract mutations (drives UI affordances). */
export function canManageContracts(role: string): boolean {
  return MANAGE_ROLES.has(role)
}

/** Whether a role may view contracts at all (portal roles may not). */
export function canViewContracts(role: string): boolean {
  return !READ_EXCLUDED_ROLES.has(role)
}

export function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  throw err
}

export function revalidateContracts(contractId?: string): void {
  revalidatePath('/contracts')
  if (contractId) revalidatePath(`/contracts/${contractId}`)
}
