import 'server-only'

import { revalidatePath } from 'next/cache'
import { ActionError } from '@/lib/action-error'
import { hasPermission, requirePermission } from '@/lib/permissions'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

// Automation access resolves through the RBAC engine (0019 cutover, ADR-0008):
// automation.workflow.create to manage, automation.workflow.view to read.
// Automations run with their creator's permissions (06_Module_Breakdown.md §17);
// RLS on automations / automation_runs (0011) is the database backstop.

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

export function canManageAutomations(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'automation.workflow.create')
}

export function canViewAutomations(ctx: WorkspaceContext): Promise<boolean> {
  return hasPermission(ctx, 'automation.workflow.view')
}

export function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  throw err
}

export function revalidateAutomations(id?: string): void {
  revalidatePath('/automations')
  if (id) revalidatePath(`/automations/${id}`)
}
