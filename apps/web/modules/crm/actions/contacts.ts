'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { CreateContactInput, UpdateContactInput } from '@aurexos/core'
import type { TablesUpdate } from '@aurexos/db'
import {
  ActionError,
  emitDomainEvent,
  requireCapability,
  writeAudit,
  type ActionResult,
} from '@/lib/action-kit'

const DeleteContactInput = z.object({ id: z.string().uuid() })

function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  throw err
}

function revalidateContacts(clientId?: string | null): void {
  revalidatePath('/crm')
  revalidatePath('/clients')
  if (clientId) revalidatePath(`/clients/${clientId}`)
}

export async function createContact(
  input: z.input<typeof CreateContactInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateContactInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid contact' }
  }

  try {
    const ctx = await requireCapability('crm.create')
    const c = parsed.data
    const { data: contact, error } = await ctx.supabase
      .from('crm_contacts')
      .insert({
        workspace_id: ctx.workspace.id,
        full_name: c.fullName,
        client_id: c.clientId ?? null,
        email: c.email ?? null,
        phone: c.phone || null,
        title: c.title || null,
      })
      .select('*')
      .single()
    if (error || !contact) {
      return { ok: false, error: error?.message ?? 'Could not create contact' }
    }

    await writeAudit(ctx, {
      action: 'contact.created',
      entityType: 'contact',
      entityId: contact.id,
      after: contact,
    })
    await emitDomainEvent(ctx, {
      eventType: 'crm.contact.created',
      entityType: 'contact',
      entityId: contact.id,
      payload: { fullName: contact.full_name },
    })
    revalidateContacts(contact.client_id)
    return { ok: true, data: { id: contact.id } }
  } catch (err) {
    return failure(err)
  }
}

export async function updateContact(
  input: z.input<typeof UpdateContactInput>,
): Promise<ActionResult> {
  const parsed = UpdateContactInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid contact' }
  }

  try {
    const ctx = await requireCapability('crm.edit')
    const { id, ...c } = parsed.data

    const { data: before } = await ctx.supabase
      .from('crm_contacts')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!before) return { ok: false, error: 'Contact not found' }

    const patch: TablesUpdate<'crm_contacts'> = { updated_at: new Date().toISOString() }
    if (c.fullName !== undefined) patch.full_name = c.fullName
    if (c.clientId !== undefined) patch.client_id = c.clientId
    if (c.email !== undefined) patch.email = c.email
    if (c.phone !== undefined) patch.phone = c.phone || null
    if (c.title !== undefined) patch.title = c.title || null

    const { data: after, error } = await ctx.supabase
      .from('crm_contacts')
      .update(patch)
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !after) {
      return { ok: false, error: error?.message ?? 'Could not update contact' }
    }

    await writeAudit(ctx, {
      action: 'contact.updated',
      entityType: 'contact',
      entityId: id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: 'crm.contact.updated',
      entityType: 'contact',
      entityId: id,
      payload: { fullName: after.full_name },
    })
    revalidateContacts(after.client_id ?? before.client_id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

export async function deleteContact(
  input: z.input<typeof DeleteContactInput>,
): Promise<ActionResult> {
  const parsed = DeleteContactInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid contact id' }

  try {
    const ctx = await requireCapability('crm.delete')
    const { data: before, error } = await ctx.supabase
      .from('crm_contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', parsed.data.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !before) {
      return { ok: false, error: error?.message ?? 'Contact not found' }
    }

    await writeAudit(ctx, {
      action: 'contact.deleted',
      entityType: 'contact',
      entityId: before.id,
      before,
    })
    await emitDomainEvent(ctx, {
      eventType: 'crm.contact.deleted',
      entityType: 'contact',
      entityId: before.id,
      payload: { fullName: before.full_name },
    })
    revalidateContacts(before.client_id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}
