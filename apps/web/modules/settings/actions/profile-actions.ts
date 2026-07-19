'use server'

import { revalidatePath } from 'next/cache'
import { UpdateProfileInput } from '@aurexos/core'
import type { z } from 'zod'
import { emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import { getWorkspaceContext } from '@/lib/workspace-context'

// Update the acting member's own profile. Authorization is identity-level: a
// member may always edit themselves (RLS profiles_update_self, 0002), so the
// spine's authorize step is the self-scope of the write (id = ctx.userId) rather
// than a permission key. validate → authorize (self) → mutate → emit → audit.

export async function updateProfile(
  input: z.input<typeof UpdateProfileInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = UpdateProfileInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid profile' }
  }
  try {
    const ctx = await getWorkspaceContext()
    const { fullName, title, timezone, location } = parsed.data

    const before = {
      fullName: ctx.profile.full_name,
      title: ctx.profile.title,
      timezone: ctx.profile.timezone,
      location: ctx.profile.location,
    }

    const { error } = await ctx.supabase
      .from('profiles')
      .update({
        full_name: fullName,
        title: title || null,
        timezone: timezone || null,
        location: location || null,
      })
      .eq('id', ctx.userId)
    if (error) return { ok: false, error: 'Could not save your profile' }

    await emitDomainEvent(ctx, {
      eventType: 'workspace.member.profile_updated',
      entityType: 'profile',
      entityId: ctx.userId,
      payload: { fullName },
    })
    await writeAudit(ctx, {
      action: 'workspace.member.profile_updated',
      entityType: 'profile',
      entityId: ctx.userId,
      before,
      after: {
        fullName,
        title: title || null,
        timezone: timezone || null,
        location: location || null,
      },
    })
    revalidatePath('/settings/profile')
    return { ok: true, data: { id: ctx.userId } }
  } catch {
    return { ok: false, error: 'Something went wrong' }
  }
}
