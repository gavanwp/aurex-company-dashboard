import 'server-only'

import { revalidatePath } from 'next/cache'
import { ActionError } from '@/lib/action-error'
import { requirePermission } from '@/lib/permissions'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

// Automations touch the whole workspace and run with their creator's
// permissions (06_Module_Breakdown.md §17), so authoring is gated to Owner/Admin.
// Every internal member may view them and use the AI assistant; portal roles
// (client, guest) are excluded from the internal surface entirely. RLS on
// automations / automation_runs (0011) is the database backstop.

const MANAGE_ROLES = new Set(['owner', 'admin'])
const READ_EXCLUDED_ROLES = new Set(['client', 'guest'])

export async function requireAutomationManage(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  await requirePermission(ctx, 'automation.workflow.create')
  return ctx
}

export async function requireAutomationRead(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  await requirePermission(ctx, 'automation.workflow.view')
  return ctx
}

export function canManageAutomations(role: string): boolean {
  return MANAGE_ROLES.has(role)
}

export function canViewAutomations(role: string): boolean {
  return !READ_EXCLUDED_ROLES.has(role)
}

export function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  throw err
}

export function revalidateAutomations(id?: string): void {
  revalidatePath('/automations')
  if (id) revalidatePath(`/automations/${id}`)
}
