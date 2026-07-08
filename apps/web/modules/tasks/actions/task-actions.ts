'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { CreateTaskInput, TASK_STATUSES, UpdateTaskInput } from '@aurexos/core'
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
  console.error('tasks action failed:', err)
  return { ok: false, error: 'Something went wrong. Please try again.' }
}

function revalidateTaskSurfaces(projectIds: (string | null)[]): void {
  revalidatePath('/tasks')
  revalidatePath('/projects')
  for (const id of new Set(projectIds)) {
    if (id) revalidatePath(`/projects/${id}`)
  }
}

async function getOwnedTask(ctx: WorkspaceContext, id: string): Promise<Tables<'tasks'>> {
  const { data: task } = await ctx.supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!task) throw new ActionError('Task not found')
  return task
}

export async function createTask(
  input: z.input<typeof CreateTaskInput>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = CreateTaskInput.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid task' }
    }
    const ctx = await requireCapability('tasks.create')

    const { data: task, error } = await ctx.supabase
      .from('tasks')
      .insert({
        workspace_id: ctx.workspace.id,
        project_id: parsed.data.projectId ?? null,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: parsed.data.status,
        priority: parsed.data.priority,
        assignee_id: parsed.data.assigneeId ?? null,
        reporter_id: ctx.userId,
        due_date: parsed.data.dueDate ?? null,
        estimate_hours: parsed.data.estimateHours ?? null,
        labels: parsed.data.labels,
      })
      .select('*')
      .single()
    if (error || !task) return { ok: false, error: error?.message ?? 'Could not create task' }

    await writeAudit(ctx, {
      action: 'tasks.task.created',
      entityType: 'task',
      entityId: task.id,
      after: task,
    })
    await emitDomainEvent(ctx, {
      eventType: 'tasks.task.created',
      entityType: 'task',
      entityId: task.id,
      payload: { title: task.title, projectId: task.project_id },
    })

    revalidateTaskSurfaces([task.project_id])
    return { ok: true, data: { id: task.id } }
  } catch (err) {
    return fail(err)
  }
}

export async function updateTask(input: z.input<typeof UpdateTaskInput>): Promise<ActionResult> {
  try {
    const parsed = UpdateTaskInput.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid task' }
    }
    const ctx = await requireCapability('tasks.edit')
    const before = await getOwnedTask(ctx, parsed.data.id)

    const patch: TablesUpdate<'tasks'> = {}
    const v = parsed.data
    if (v.title !== undefined) patch.title = v.title
    if (v.description !== undefined) patch.description = v.description ?? null
    if (v.projectId !== undefined) patch.project_id = v.projectId
    if (v.status !== undefined) patch.status = v.status
    if (v.priority !== undefined) patch.priority = v.priority
    if (v.assigneeId !== undefined) patch.assignee_id = v.assigneeId
    if (v.dueDate !== undefined) patch.due_date = v.dueDate
    if (v.estimateHours !== undefined) patch.estimate_hours = v.estimateHours
    if (v.labels !== undefined) patch.labels = v.labels
    if (Object.keys(patch).length === 0) return { ok: true, data: undefined }
    patch.updated_at = new Date().toISOString()

    const { data: after, error } = await ctx.supabase
      .from('tasks')
      .update(patch)
      .eq('id', before.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !after) return { ok: false, error: error?.message ?? 'Could not update task' }

    await writeAudit(ctx, {
      action: 'tasks.task.updated',
      entityType: 'task',
      entityId: after.id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: 'tasks.task.updated',
      entityType: 'task',
      entityId: after.id,
      payload: { fields: Object.keys(patch) },
    })
    if (v.assigneeId !== undefined && before.assignee_id !== after.assignee_id) {
      await emitDomainEvent(ctx, {
        eventType: 'tasks.task.assigned',
        entityType: 'task',
        entityId: after.id,
        payload: { from: before.assignee_id, to: after.assignee_id },
      })
    }

    revalidateTaskSurfaces([before.project_id, after.project_id])
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

const ChangeTaskStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(TASK_STATUSES),
})

export async function changeTaskStatus(
  input: z.input<typeof ChangeTaskStatusInput>,
): Promise<ActionResult> {
  try {
    const parsed = ChangeTaskStatusInput.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid status' }
    }
    const ctx = await requireCapability('tasks.edit')
    const before = await getOwnedTask(ctx, parsed.data.id)
    if (before.status === parsed.data.status) return { ok: true, data: undefined }

    const { data: after, error } = await ctx.supabase
      .from('tasks')
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq('id', before.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !after) return { ok: false, error: error?.message ?? 'Could not update status' }

    await writeAudit(ctx, {
      action: 'tasks.task.status_changed',
      entityType: 'task',
      entityId: after.id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: 'tasks.task.status_changed',
      entityType: 'task',
      entityId: after.id,
      payload: { from: before.status, to: after.status },
    })

    revalidateTaskSurfaces([before.project_id])
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    const parsed = z.string().uuid().safeParse(id)
    if (!parsed.success) return { ok: false, error: 'Invalid task id' }
    const ctx = await requireCapability('tasks.delete')
    const before = await getOwnedTask(ctx, parsed.data)

    const { error } = await ctx.supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', before.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
    if (error) return { ok: false, error: error.message }

    await writeAudit(ctx, {
      action: 'tasks.task.deleted',
      entityType: 'task',
      entityId: before.id,
      before,
    })
    await emitDomainEvent(ctx, {
      eventType: 'tasks.task.deleted',
      entityType: 'task',
      entityId: before.id,
      payload: { title: before.title },
    })

    revalidateTaskSurfaces([before.project_id])
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
