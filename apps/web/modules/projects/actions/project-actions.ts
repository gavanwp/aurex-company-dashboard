'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { CreateProjectInput, slugify, UpdateProjectInput } from '@aurexos/core'
import type { Tables, TablesUpdate } from '@aurexos/db'
import {
  ActionError,
  emitDomainEvent,
  requireCapability,
  writeAudit,
  type ActionResult,
} from '@/lib/action-kit'
import type { WorkspaceContext } from '@/lib/workspace-context'

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  console.error('projects action failed:', err)
  return { ok: false, error: 'Something went wrong. Please try again.' }
}

/** Short uppercase code derived from the project name, e.g. "Aurex Site" → "AURE". */
function deriveCode(name: string): string | null {
  const code = slugify(name).replaceAll('-', '').slice(0, 4).toUpperCase()
  return code || null
}

async function getOwnedProject(ctx: WorkspaceContext, id: string): Promise<Tables<'projects'>> {
  const { data: project } = await ctx.supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!project) throw new ActionError('Project not found')
  return project
}

export async function createProject(
  input: z.input<typeof CreateProjectInput>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = CreateProjectInput.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid project' }
    }
    const ctx = await requireCapability('projects.create')

    const { data: project, error } = await ctx.supabase
      .from('projects')
      .insert({
        workspace_id: ctx.workspace.id,
        name: parsed.data.name,
        code: deriveCode(parsed.data.name),
        client_id: parsed.data.clientId ?? null,
        description: parsed.data.description ?? null,
        status: parsed.data.status,
        color: parsed.data.color ?? null,
        start_date: parsed.data.startDate ?? null,
        due_date: parsed.data.dueDate ?? null,
        budget_cents: parsed.data.budgetCents ?? null,
        owner_id: ctx.userId,
      })
      .select('*')
      .single()
    if (error || !project) return { ok: false, error: error?.message ?? 'Could not create project' }

    await writeAudit(ctx, {
      action: 'projects.project.created',
      entityType: 'project',
      entityId: project.id,
      after: project,
    })
    await emitDomainEvent(ctx, {
      eventType: 'projects.project.created',
      entityType: 'project',
      entityId: project.id,
      payload: { name: project.name, clientId: project.client_id },
    })

    revalidatePath('/projects')
    return { ok: true, data: { id: project.id } }
  } catch (err) {
    return fail(err)
  }
}

export async function updateProject(
  input: z.input<typeof UpdateProjectInput>,
): Promise<ActionResult> {
  try {
    const parsed = UpdateProjectInput.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid project' }
    }
    const ctx = await requireCapability('projects.edit')
    const before = await getOwnedProject(ctx, parsed.data.id)

    const patch: TablesUpdate<'projects'> = {}
    const v = parsed.data
    if (v.name !== undefined) patch.name = v.name
    if (v.clientId !== undefined) patch.client_id = v.clientId
    if (v.description !== undefined) patch.description = v.description ?? null
    if (v.status !== undefined) patch.status = v.status
    if (v.color !== undefined) patch.color = v.color
    if (v.startDate !== undefined) patch.start_date = v.startDate
    if (v.dueDate !== undefined) patch.due_date = v.dueDate
    if (v.budgetCents !== undefined) patch.budget_cents = v.budgetCents
    if (Object.keys(patch).length === 0) return { ok: true, data: undefined }
    patch.updated_at = new Date().toISOString()

    const { data: after, error } = await ctx.supabase
      .from('projects')
      .update(patch)
      .eq('id', before.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !after) return { ok: false, error: error?.message ?? 'Could not update project' }

    await writeAudit(ctx, {
      action: 'projects.project.updated',
      entityType: 'project',
      entityId: after.id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: 'projects.project.updated',
      entityType: 'project',
      entityId: after.id,
      payload: { fields: Object.keys(patch) },
    })

    revalidatePath('/projects')
    revalidatePath(`/projects/${after.id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    const parsed = z.string().uuid().safeParse(id)
    if (!parsed.success) return { ok: false, error: 'Invalid project id' }
    const ctx = await requireCapability('projects.delete')
    const before = await getOwnedProject(ctx, parsed.data)

    const { error } = await ctx.supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', before.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
    if (error) return { ok: false, error: error.message }

    await writeAudit(ctx, {
      action: 'projects.project.deleted',
      entityType: 'project',
      entityId: before.id,
      before,
    })
    await emitDomainEvent(ctx, {
      eventType: 'projects.project.deleted',
      entityType: 'project',
      entityId: before.id,
      payload: { name: before.name },
    })

    revalidatePath('/projects')
    revalidatePath(`/projects/${before.id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
