'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { CreateDealInput, DEAL_STAGES, UpdateDealInput } from '@aurexos/core'
import type { TablesUpdate } from '@aurexos/db'
import {
  ActionError,
  emitDomainEvent,
  requireCapability,
  writeAudit,
  type ActionResult,
} from '@/lib/action-kit'

const DeleteDealInput = z.object({ id: z.string().uuid() })
const MoveDealStageInput = z.object({ id: z.string().uuid(), stage: z.enum(DEAL_STAGES) })

function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  throw err
}

function revalidateCrm(clientId?: string | null): void {
  revalidatePath('/crm')
  revalidatePath('/clients')
  if (clientId) revalidatePath(`/clients/${clientId}`)
}

export async function createDeal(
  input: z.input<typeof CreateDealInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateDealInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid deal' }
  }

  try {
    const ctx = await requireCapability('crm.create')
    const d = parsed.data
    const { data: deal, error } = await ctx.supabase
      .from('crm_deals')
      .insert({
        workspace_id: ctx.workspace.id,
        title: d.title,
        client_id: d.clientId ?? null,
        contact_id: d.contactId ?? null,
        stage: d.stage,
        value_cents: d.valueCents ?? null,
        currency: d.currency,
        probability: d.stage === 'won' ? 100 : d.stage === 'lost' ? 0 : (d.probability ?? null),
        expected_close_date: d.expectedCloseDate ?? null,
        source: d.source || null,
        owner_id: ctx.userId,
      })
      .select('*')
      .single()
    if (error || !deal) {
      return { ok: false, error: error?.message ?? 'Could not create deal' }
    }

    await writeAudit(ctx, {
      action: 'deal.created',
      entityType: 'deal',
      entityId: deal.id,
      after: deal,
    })
    await emitDomainEvent(ctx, {
      eventType: 'crm.deal.created',
      entityType: 'deal',
      entityId: deal.id,
      payload: { title: deal.title, stage: deal.stage, valueCents: deal.value_cents },
    })
    revalidateCrm(deal.client_id)
    return { ok: true, data: { id: deal.id } }
  } catch (err) {
    return failure(err)
  }
}

export async function updateDeal(input: z.input<typeof UpdateDealInput>): Promise<ActionResult> {
  const parsed = UpdateDealInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid deal' }
  }

  try {
    const ctx = await requireCapability('crm.edit')
    const { id, ...d } = parsed.data

    const { data: before } = await ctx.supabase
      .from('crm_deals')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!before) return { ok: false, error: 'Deal not found' }

    const patch: TablesUpdate<'crm_deals'> = { updated_at: new Date().toISOString() }
    if (d.title !== undefined) patch.title = d.title
    if (d.clientId !== undefined) patch.client_id = d.clientId
    if (d.contactId !== undefined) patch.contact_id = d.contactId
    if (d.stage !== undefined) patch.stage = d.stage
    if (d.valueCents !== undefined) patch.value_cents = d.valueCents
    if (d.currency !== undefined) patch.currency = d.currency
    if (d.probability !== undefined) patch.probability = d.probability
    if (d.expectedCloseDate !== undefined) patch.expected_close_date = d.expectedCloseDate
    if (d.source !== undefined) patch.source = d.source || null
    if (d.stage === 'won') patch.probability = 100
    if (d.stage === 'lost') patch.probability = 0

    const { data: after, error } = await ctx.supabase
      .from('crm_deals')
      .update(patch)
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !after) {
      return { ok: false, error: error?.message ?? 'Could not update deal' }
    }

    await writeAudit(ctx, { action: 'deal.updated', entityType: 'deal', entityId: id, before, after })
    await emitDomainEvent(ctx, {
      eventType: 'crm.deal.updated',
      entityType: 'deal',
      entityId: id,
      payload: { title: after.title, stage: after.stage },
    })
    revalidateCrm(after.client_id ?? before.client_id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

/** Dedicated stage transition — emits crm.deal.stage_changed with {from, to}. */
export async function moveDealStage(
  input: z.input<typeof MoveDealStageInput>,
): Promise<ActionResult> {
  const parsed = MoveDealStageInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid stage move' }
  }

  try {
    const ctx = await requireCapability('crm.edit')
    const { id, stage } = parsed.data

    const { data: before } = await ctx.supabase
      .from('crm_deals')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!before) return { ok: false, error: 'Deal not found' }
    if (before.stage === stage) return { ok: true, data: undefined }

    const patch: TablesUpdate<'crm_deals'> = { stage, updated_at: new Date().toISOString() }
    if (stage === 'won') patch.probability = 100
    if (stage === 'lost') patch.probability = 0

    const { data: after, error } = await ctx.supabase
      .from('crm_deals')
      .update(patch)
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !after) {
      return { ok: false, error: error?.message ?? 'Could not move deal' }
    }

    await writeAudit(ctx, {
      action: 'deal.stage_changed',
      entityType: 'deal',
      entityId: id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: 'crm.deal.stage_changed',
      entityType: 'deal',
      entityId: id,
      payload: { from: before.stage, to: stage },
    })
    revalidateCrm(before.client_id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

export async function deleteDeal(input: z.input<typeof DeleteDealInput>): Promise<ActionResult> {
  const parsed = DeleteDealInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid deal id' }

  try {
    const ctx = await requireCapability('crm.delete')
    const { data: before, error } = await ctx.supabase
      .from('crm_deals')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', parsed.data.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !before) {
      return { ok: false, error: error?.message ?? 'Deal not found' }
    }

    await writeAudit(ctx, {
      action: 'deal.deleted',
      entityType: 'deal',
      entityId: before.id,
      before,
    })
    await emitDomainEvent(ctx, {
      eventType: 'crm.deal.deleted',
      entityType: 'deal',
      entityId: before.id,
      payload: { title: before.title },
    })
    revalidateCrm(before.client_id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}
