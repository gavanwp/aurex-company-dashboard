'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { CreateClientInput, UpdateClientInput } from '@aurexos/core'
import type { TablesUpdate } from '@aurexos/db'
import {
  ActionError,
  emitDomainEvent,
  requireCapability,
  writeAudit,
  type ActionResult,
} from '@/lib/action-kit'

const DeleteClientInput = z.object({ id: z.string().uuid() })

function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  throw err
}

function revalidateClients(clientId?: string): void {
  revalidatePath('/clients')
  if (clientId) revalidatePath(`/clients/${clientId}`)
  revalidatePath('/crm')
}

export async function createClient(
  input: z.input<typeof CreateClientInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateClientInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid client' }
  }

  try {
    const ctx = await requireCapability('clients.create')
    const c = parsed.data
    const { data: client, error } = await ctx.supabase
      .from('clients')
      .insert({
        workspace_id: ctx.workspace.id,
        name: c.name,
        website: c.website ?? null,
        industry: c.industry || null,
        status: c.status,
        notes: c.notes || null,
        owner_id: ctx.userId,
      })
      .select('*')
      .single()
    if (error || !client) {
      return { ok: false, error: error?.message ?? 'Could not create client' }
    }

    await writeAudit(ctx, {
      action: 'client.created',
      entityType: 'client',
      entityId: client.id,
      after: client,
    })
    await emitDomainEvent(ctx, {
      eventType: 'crm.client.created',
      entityType: 'client',
      entityId: client.id,
      payload: { name: client.name, status: client.status },
    })
    revalidateClients(client.id)
    return { ok: true, data: { id: client.id } }
  } catch (err) {
    return failure(err)
  }
}

export async function updateClient(
  input: z.input<typeof UpdateClientInput>,
): Promise<ActionResult> {
  const parsed = UpdateClientInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid client' }
  }

  try {
    const ctx = await requireCapability('clients.edit')
    const { id, ...c } = parsed.data

    const { data: before } = await ctx.supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!before) return { ok: false, error: 'Client not found' }

    const patch: TablesUpdate<'clients'> = { updated_at: new Date().toISOString() }
    if (c.name !== undefined) patch.name = c.name
    if (c.website !== undefined) patch.website = c.website
    if (c.industry !== undefined) patch.industry = c.industry || null
    if (c.status !== undefined) patch.status = c.status
    if (c.notes !== undefined) patch.notes = c.notes || null

    const { data: after, error } = await ctx.supabase
      .from('clients')
      .update(patch)
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !after) {
      return { ok: false, error: error?.message ?? 'Could not update client' }
    }

    await writeAudit(ctx, {
      action: 'client.updated',
      entityType: 'client',
      entityId: id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: 'crm.client.updated',
      entityType: 'client',
      entityId: id,
      payload: { name: after.name, status: after.status },
    })
    revalidateClients(id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

export async function deleteClient(
  input: z.input<typeof DeleteClientInput>,
): Promise<ActionResult> {
  const parsed = DeleteClientInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid client id' }

  try {
    const ctx = await requireCapability('clients.delete')
    const { data: before, error } = await ctx.supabase
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', parsed.data.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !before) {
      return { ok: false, error: error?.message ?? 'Client not found' }
    }

    await writeAudit(ctx, {
      action: 'client.deleted',
      entityType: 'client',
      entityId: before.id,
      before,
    })
    await emitDomainEvent(ctx, {
      eventType: 'crm.client.deleted',
      entityType: 'client',
      entityId: before.id,
      payload: { name: before.name },
    })
    revalidateClients(before.id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}
