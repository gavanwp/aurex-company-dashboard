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
): Promise<ActionResult<{ id: string; token: string }>> {
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
    // The plaintext token is returned once so the inviter can copy the accept
    // link (email delivery is a follow-up); only the hash is persisted.
    return { ok: true, data: { id: created.id, token } }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error && err.message === 'forbidden' ? 'forbidden' : 'Something went wrong',
    }
  }
}

// New role key → closest legacy workspace_role enum. The engine (role_id) is the
// source of truth post-cutover; the legacy `role` column is kept in sync only so
// the RLS backstop workspace_role_of() stays consistent. Nothing maps TO 'owner'
// (workspace ownership changes via the org ownership-transfer flow, not here).
const LEGACY_ROLE: Record<string, string> = {
  operations_manager: 'admin',
  project_manager: 'project_manager',
  sales_manager: 'sales',
  marketing_manager: 'sales',
  finance_manager: 'finance',
  hr_manager: 'hr',
  team_lead: 'member',
  employee: 'member',
  designer: 'member',
  developer: 'member',
  seo_specialist: 'member',
  content_writer: 'member',
  ai_automation_engineer: 'member',
  support_agent: 'member',
  client: 'client',
  guest: 'guest',
}

const ChangeRoleInput = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
})

export async function changeMemberRole(
  input: z.input<typeof ChangeRoleInput>,
): Promise<ActionResult<{ userId: string }>> {
  const parsed = ChangeRoleInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid role change' }
  try {
    const ctx = await getWorkspaceContext()
    await requirePermission(ctx, 'users.role.assign')
    const { userId, roleId } = parsed.data

    if (userId === ctx.userId) {
      return { ok: false, error: 'You can’t change your own role' }
    }

    const { data: member } = await ctx.supabase
      .from('workspace_members')
      .select('user_id, role, role_id')
      .eq('workspace_id', ctx.workspace.id)
      .eq('user_id', userId)
      .maybeSingle()
    if (!member) return { ok: false, error: 'Not a workspace member' }
    if (member.role === 'owner') {
      return { ok: false, error: 'The workspace owner’s role is changed via ownership transfer' }
    }

    // The target must be a real, assignable system role (workspace/portal scope).
    const { data: role } = await ctx.supabase
      .from('roles')
      .select('key, scope, is_system')
      .eq('id', roleId)
      .maybeSingle()
    if (!role || !role.is_system || (role.scope !== 'workspace' && role.scope !== 'portal')) {
      return { ok: false, error: 'That role can’t be assigned here' }
    }

    const legacy = (LEGACY_ROLE[role.key] ?? 'member') as never
    const { error } = await ctx.supabase
      .from('workspace_members')
      .update({ role_id: roleId, role: legacy })
      .eq('workspace_id', ctx.workspace.id)
      .eq('user_id', userId)
    if (error) return { ok: false, error: 'Could not change the role' }

    await emitDomainEvent(ctx, {
      eventType: 'workspace.member.role_changed',
      entityType: 'workspace_member',
      entityId: userId,
      payload: { roleId, roleKey: role.key },
    })
    await writeAudit(ctx, {
      action: 'workspace.member.role_changed',
      entityType: 'workspace_member',
      entityId: userId,
      before: { roleId: member.role_id },
      after: { roleId, roleKey: role.key },
    })
    revalidateAccess()
    return { ok: true, data: { userId } }
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
