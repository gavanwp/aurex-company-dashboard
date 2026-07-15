'use server'

import { z } from 'zod'
import { CreateContractInput, UpdateContractInput } from '@aurexos/core'
import type { Tables, TablesInsert, TablesUpdate } from '@aurexos/db'
import { emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import type { WorkspaceContext } from '@/lib/workspace-context'
import { failure, requireContractManage, revalidateContracts } from './contracts-access'

// Statuses from which a contract is still editable — once sent it is immutable
// (the counterparty may be reading it; the only path to change is a new version).
const EDITABLE_STATUSES = new Set(['draft', 'review'])

const idSchema = z.string().uuid()

async function getContractRow(
  ctx: WorkspaceContext,
  id: string,
): Promise<Tables<'contracts'> | null> {
  const { data } = await ctx.supabase
    .from('contracts')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  return data
}

/**
 * Create a contract. Always starts in 'draft'; the lifecycle only advances via
 * sendContract / activateContract / terminateContract. Emits
 * contracts.contract.created.
 */
export async function createContract(
  input: z.input<typeof CreateContractInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateContractInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid contract' }
  }

  try {
    const ctx = await requireContractManage()
    const d = parsed.data

    const { data: created, error } = await ctx.supabase
      .from('contracts')
      .insert({
        workspace_id: ctx.workspace.id,
        type: d.type,
        client_id: d.clientId ?? null,
        project_id: d.projectId ?? null,
        proposal_id: d.proposalId ?? null,
        title: d.title,
        status: 'draft',
        effective_date: d.effectiveDate ?? null,
        end_date: d.endDate ?? null,
        auto_renew: d.autoRenew,
        value_minor: d.valueMinor ?? null,
        currency: d.currency,
        body: d.body as TablesInsert<'contracts'>['body'],
      })
      .select('*')
      .single()
    if (error || !created) {
      return { ok: false, error: error?.message ?? 'Could not create contract' }
    }

    await writeAudit(ctx, {
      action: 'contracts.contract.created',
      entityType: 'contract',
      entityId: created.id,
      after: created,
    })
    await emitDomainEvent(ctx, {
      eventType: 'contracts.contract.created',
      entityType: 'contract',
      entityId: created.id,
      payload: { title: created.title, type: created.type, clientId: created.client_id },
    })
    revalidateContracts()
    return { ok: true, data: { id: created.id } }
  } catch (err) {
    return failure(err)
  }
}

/**
 * Edit a contract — allowed ONLY while draft / review. Once sent it is immutable.
 */
export async function updateContract(
  input: z.input<typeof UpdateContractInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = UpdateContractInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid contract' }
  }

  try {
    const ctx = await requireContractManage()
    const { id, ...d } = parsed.data

    const before = await getContractRow(ctx, id)
    if (!before) return { ok: false, error: 'Contract not found' }
    if (!EDITABLE_STATUSES.has(before.status)) {
      return { ok: false, error: 'Only draft contracts can be edited. Sent contracts are locked.' }
    }

    const patch: TablesUpdate<'contracts'> = {}
    if (d.title !== undefined) patch.title = d.title
    if (d.type !== undefined) patch.type = d.type
    if (d.clientId !== undefined) patch.client_id = d.clientId ?? null
    if (d.projectId !== undefined) patch.project_id = d.projectId ?? null
    if (d.proposalId !== undefined) patch.proposal_id = d.proposalId ?? null
    if (d.status !== undefined && EDITABLE_STATUSES.has(d.status)) patch.status = d.status
    if (d.effectiveDate !== undefined) patch.effective_date = d.effectiveDate ?? null
    if (d.endDate !== undefined) patch.end_date = d.endDate ?? null
    if (d.autoRenew !== undefined) patch.auto_renew = d.autoRenew
    if (d.valueMinor !== undefined) patch.value_minor = d.valueMinor ?? null
    if (d.currency !== undefined) patch.currency = d.currency
    if (d.body !== undefined) patch.body = d.body as TablesUpdate<'contracts'>['body']
    if (Object.keys(patch).length === 0) return { ok: true, data: { id } }

    const { data: after, error } = await ctx.supabase
      .from('contracts')
      .update(patch)
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .in('status', ['draft', 'review'])
      .select('*')
      .single()
    if (error || !after) return { ok: false, error: error?.message ?? 'Could not update contract' }

    await writeAudit(ctx, {
      action: 'contracts.contract.updated',
      entityType: 'contract',
      entityId: id,
      before,
      after,
    })
    revalidateContracts(id)
    return { ok: true, data: { id } }
  } catch (err) {
    return failure(err)
  }
}

/** draft → review. A soft gate before the contract goes out for signature. */
export async function markContractReview(id: string): Promise<ActionResult> {
  try {
    if (!idSchema.safeParse(id).success) return { ok: false, error: 'Invalid contract id' }
    const ctx = await requireContractManage()

    const before = await getContractRow(ctx, id)
    if (!before) return { ok: false, error: 'Contract not found' }
    if (before.status !== 'draft') {
      return { ok: false, error: 'Only a draft can be moved to review.' }
    }

    const { error } = await ctx.supabase
      .from('contracts')
      .update({ status: 'review' })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .eq('status', 'draft')
    if (error) return { ok: false, error: error.message }

    await writeAudit(ctx, {
      action: 'contracts.contract.review',
      entityType: 'contract',
      entityId: id,
      before: { status: before.status },
      after: { status: 'review' },
    })
    revalidateContracts(id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

/**
 * draft / review → sent. Stamps sent_at and surfaces the public_token (minted by
 * the 0009/0015 default), so the tokenized signing page is live the moment this
 * returns. No real email in v1 — the caller surfaces the shareable link. Emits
 * contracts.contract.sent.
 */
export async function sendContract(id: string): Promise<ActionResult<{ token: string }>> {
  try {
    if (!idSchema.safeParse(id).success) return { ok: false, error: 'Invalid contract id' }
    const ctx = await requireContractManage()

    const before = await getContractRow(ctx, id)
    if (!before) return { ok: false, error: 'Contract not found' }
    if (!EDITABLE_STATUSES.has(before.status)) {
      return { ok: false, error: 'This contract has already been sent.' }
    }

    const { data: after, error } = await ctx.supabase
      .from('contracts')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .in('status', ['draft', 'review'])
      .select('*')
      .single()
    if (error || !after) return { ok: false, error: error?.message ?? 'Could not send contract' }
    if (!after.public_token) {
      return { ok: false, error: 'Contract has no signing token — reissue and try again.' }
    }

    await writeAudit(ctx, {
      action: 'contracts.contract.sent',
      entityType: 'contract',
      entityId: id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: 'contracts.contract.sent',
      entityType: 'contract',
      entityId: id,
      payload: { title: after.title, clientId: after.client_id },
    })
    revalidateContracts(id)
    return { ok: true, data: { token: after.public_token } }
  } catch (err) {
    return failure(err)
  }
}

/** signed → active. The contract is now in force. Emits contracts.contract.activated. */
export async function activateContract(id: string): Promise<ActionResult> {
  try {
    if (!idSchema.safeParse(id).success) return { ok: false, error: 'Invalid contract id' }
    const ctx = await requireContractManage()

    const before = await getContractRow(ctx, id)
    if (!before) return { ok: false, error: 'Contract not found' }
    if (before.status !== 'signed') {
      return { ok: false, error: 'Only a signed contract can be activated.' }
    }

    const { data: after, error } = await ctx.supabase
      .from('contracts')
      .update({ status: 'active' })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .eq('status', 'signed')
      .select('*')
      .single()
    if (error || !after)
      return { ok: false, error: error?.message ?? 'Could not activate contract' }

    await writeAudit(ctx, {
      action: 'contracts.contract.activated',
      entityType: 'contract',
      entityId: id,
      before: { status: before.status },
      after: { status: 'active' },
    })
    await emitDomainEvent(ctx, {
      eventType: 'contracts.contract.activated',
      entityType: 'contract',
      entityId: id,
      payload: { title: after.title },
    })
    revalidateContracts(id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

/** Any live status → terminated (manual). Emits contracts.contract.terminated. */
export async function terminateContract(id: string): Promise<ActionResult> {
  try {
    if (!idSchema.safeParse(id).success) return { ok: false, error: 'Invalid contract id' }
    const ctx = await requireContractManage()

    const before = await getContractRow(ctx, id)
    if (!before) return { ok: false, error: 'Contract not found' }
    if (
      before.status === 'terminated' ||
      before.status === 'expired' ||
      before.status === 'draft'
    ) {
      return { ok: false, error: 'Only a live contract can be terminated.' }
    }

    const { data: after, error } = await ctx.supabase
      .from('contracts')
      .update({ status: 'terminated' })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .select('*')
      .single()
    if (error || !after)
      return { ok: false, error: error?.message ?? 'Could not terminate contract' }

    await writeAudit(ctx, {
      action: 'contracts.contract.terminated',
      entityType: 'contract',
      entityId: id,
      before: { status: before.status },
      after: { status: 'terminated' },
    })
    await emitDomainEvent(ctx, {
      eventType: 'contracts.contract.terminated',
      entityType: 'contract',
      entityId: id,
      payload: { title: after.title, from: before.status },
    })
    revalidateContracts(id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}
