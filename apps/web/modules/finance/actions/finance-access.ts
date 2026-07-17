import 'server-only'

import { revalidatePath } from 'next/cache'
import { ActionError } from '@/lib/action-error'
import { hasPermission, requirePermission } from '@/lib/permissions'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

// Finance access resolves through the RBAC engine (0019 cutover, ADR-0008):
// finance.invoice.edit to manage, finance.invoice.view to read. The seeded
// matrix + org-owner elevation preserve pre-cutover access (Owner/Admin/Finance
// manage; internal view; portal roles excluded). Finance is sensitive
// (05_User_Roles.md §5) — money stays gated.

/** Mutations (create/edit invoices, record payments, approve expenses). */
export async function requireFinanceManage(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  await requirePermission(ctx, 'finance.invoice.edit')
  return ctx
}

/** Reads — every internal member may view finance; portal roles may not. */
export async function requireFinanceRead(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  await requirePermission(ctx, 'finance.invoice.view')
  return ctx
}

/** Whether the viewer may run finance mutations (drives UI affordances). */
export function canManageFinance(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'finance.invoice.edit')
}

/** Whether the viewer may view finance at all (portal roles may not). */
export function canViewFinance(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'finance.invoice.view')
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
