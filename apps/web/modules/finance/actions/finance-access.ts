import 'server-only'

import { revalidatePath } from 'next/cache'
import { ActionError } from '@/lib/action-kit'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

// Capability note: the can() map only carries Phase-1 capabilities, so finance
// guards are expressed directly by role here — exactly as the email module
// documented for its own guard. When the capability-map expansion lands, these
// become `finance.manage` / `finance.view` in can(); until then the roles below
// are the contract and RLS (0008) is the real backstop.
//
// Finance is sensitive (05_User_Roles.md §5): Owner/Finance get full control,
// Admin can view, everyone else is excluded from money.

const MANAGE_ROLES = new Set(['owner', 'admin', 'finance'])
const READ_EXCLUDED_ROLES = new Set(['client', 'guest'])

/** Mutations (create/edit invoices, record payments, approve expenses). */
export async function requireFinanceManage(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  if (!MANAGE_ROLES.has(ctx.role)) {
    throw new ActionError('forbidden')
  }
  return ctx
}

/** Reads — every internal member may view finance; portal roles may not. */
export async function requireFinanceRead(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  if (READ_EXCLUDED_ROLES.has(ctx.role)) {
    throw new ActionError('forbidden')
  }
  return ctx
}

/** Whether a role may run finance mutations (drives UI affordances). */
export function canManageFinance(role: string): boolean {
  return MANAGE_ROLES.has(role)
}

/** Whether a role may view finance at all (portal roles may not). */
export function canViewFinance(role: string): boolean {
  return !READ_EXCLUDED_ROLES.has(role)
}

export function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  throw err
}

export function revalidateFinance(): void {
  revalidatePath('/finance')
  revalidatePath('/finance/invoices')
  revalidatePath('/finance/expenses')
}
