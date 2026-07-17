'use server'

import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import { requirePermission } from '@/lib/permissions'
import { getWorkspaceContext } from '@/lib/workspace-context'

// People & Access mutations. Engine-guarded (users.user.invite); every change is
// audited. Invitations create a hashed-token row — email delivery is a follow-up
// (no mail transport wired yet), so the invite is created and listed as pending.

const InviteInput = z.object({
  email: z.string().trim().email('Enter a valid email'),
  roleId: z.string().uuid('Choose a role'),
})

function revalidateAccess(): void {
  revalidatePath('/settings/people')
}

export async function inviteUser(
  input: z.input<typeof InviteInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = InviteInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid invite' }
  }
  try {
    const ctx = await getWorkspaceContext()
    await requirePermission(ctx, 'users.user.invite')
    const { email, roleId } = parsed.data

    // The role must be a real system/org role.
    const { data: role } = await ctx.supabase
      .from('roles')
      .select('id')
      .eq('id', roleId)
      .maybeSingle()
    if (!role) return { ok: false, error: 'Unknown role' }

    // Random token → stored as a hash; the plaintext would go in the email link.
    const token = randomBytes(24).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString()

    const { data: created, error } = await ctx.supabase
      .from('invitations')
      .insert({
        organization_id: ctx.workspace.organization_id,
        workspace_id: ctx.workspace.id,
        email: email.toLowerCase(),
        role_id: roleId,
        token_hash: tokenHash,
        status: 'pending',
        invited_by: ctx.userId,
        expires_at: expiresAt,
      })
      .select('id')
      .single()
    if (error || !created) return { ok: false, error: 'Could not create the invitation' }

    await emitDomainEvent(ctx, {
      eventType: 'workspace.member.invited',
      entityType: 'invitation',
      entityId: created.id,
      payload: { email: email.toLowerCase(), roleId },
    })
    await writeAudit(ctx, {
      action: 'workspace.member.invited',
      entityType: 'invitation',
      entityId: created.id,
      after: { email: email.toLowerCase(), roleId },
    })
    revalidateAccess()
    return { ok: true, data: { id: created.id } }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error && err.message === 'forbidden' ? 'forbidden' : 'Something went wrong',
    }
  }
}

const RevokeInput = z.object({ id: z.string().uuid() })

export async function revokeInvitation(
  input: z.input<typeof RevokeInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = RevokeInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request' }
  try {
    const ctx = await getWorkspaceContext()
    await requirePermission(ctx, 'users.user.invite')
    const { error } = await ctx.supabase
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', parsed.data.id)
      .eq('organization_id', ctx.workspace.organization_id)
    if (error) return { ok: false, error: 'Could not revoke the invitation' }

    await writeAudit(ctx, {
      action: 'workspace.member.invite_revoked',
      entityType: 'invitation',
      entityId: parsed.data.id,
    })
    revalidateAccess()
    return { ok: true, data: { id: parsed.data.id } }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error && err.message === 'forbidden' ? 'forbidden' : 'Something went wrong',
    }
  }
}
