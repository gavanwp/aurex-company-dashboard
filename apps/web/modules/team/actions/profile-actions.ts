'use server'

import type { z } from 'zod'
import { UpsertMemberProfileInput } from '@aurexos/core'
import type { Tables } from '@aurexos/db'
import { emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import type { WorkspaceContext } from '@/lib/workspace-context'
import { canViewCompensation, failure, requireTeamManage, revalidateTeam } from './team-access'

// The mutation spine (R-A3): validate → authorize → execute → emit event → audit.
// Owner/Admin/HR may upsert an HR profile onto any workspace member; compensation
// fields are only written by roles that may also see them (Owner/HR) — the
// field-level rule of 06_Module_Breakdown.md §16 applies on write as on read.

type ProfileRow = Tables<'hr_profiles'>

async function existingProfile(ctx: WorkspaceContext, userId: string): Promise<ProfileRow | null> {
  const { data } = await ctx.supabase
    .from('hr_profiles')
    .select('*')
    .eq('workspace_id', ctx.workspace.id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle()
  return data
}

/**
 * Create or update a member's HR profile. Idempotent per (workspace, user):
 * emits hr.profile.created on first write, hr.profile.updated thereafter.
 */
export async function upsertMemberProfile(
  input: z.input<typeof UpsertMemberProfileInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = UpsertMemberProfileInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid profile' }
  }

  try {
    const ctx = await requireTeamManage()
    const d = parsed.data

    // The target must be a member of this workspace.
    const { data: member } = await ctx.supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', ctx.workspace.id)
      .eq('user_id', d.userId)
      .maybeSingle()
    if (!member) return { ok: false, error: 'Not a workspace member' }

    const canComp = await canViewCompensation(ctx)
    const existing = await existingProfile(ctx, d.userId)

    const fields = {
      title: d.title ?? null,
      employment_type: d.employmentType ?? null,
      manager_id: d.managerId ?? null,
      start_date: d.startDate ?? null,
      location: d.location ?? null,
      timezone: d.timezone ?? null,
      phone: d.phone ?? null,
      bio: d.bio ?? null,
      skills: d.skills as ProfileRow['skills'],
      weekly_capacity_hours: d.weeklyCapacityHours ?? null,
    }

    // Compensation is only written by roles allowed to see it; other managers
    // leave the existing comp untouched (never blanked by an edit they can't see).
    const compFields = canComp
      ? {
          comp_amount_minor: d.compAmountMinor ?? null,
          comp_currency: d.compCurrency,
          comp_period: d.compPeriod ?? null,
        }
      : {}

    if (existing) {
      const { error } = await ctx.supabase
        .from('hr_profiles')
        .update({ ...fields, ...compFields })
        .eq('id', existing.id)
        .eq('workspace_id', ctx.workspace.id)
      if (error) return { ok: false, error: 'Could not update profile' }

      await emitDomainEvent(ctx, {
        eventType: 'hr.profile.updated',
        entityType: 'hr_profile',
        entityId: existing.id,
        payload: { userId: d.userId },
      })
      await writeAudit(ctx, {
        action: 'hr.profile.updated',
        entityType: 'hr_profile',
        entityId: existing.id,
        before: existing,
        after: { ...existing, ...fields, ...compFields },
      })
      revalidateTeam(d.userId)
      return { ok: true, data: { id: existing.id } }
    }

    const { data: created, error } = await ctx.supabase
      .from('hr_profiles')
      .insert({
        workspace_id: ctx.workspace.id,
        user_id: d.userId,
        ...fields,
        ...compFields,
      })
      .select('id')
      .single()
    if (error || !created) return { ok: false, error: 'Could not create profile' }

    await emitDomainEvent(ctx, {
      eventType: 'hr.profile.created',
      entityType: 'hr_profile',
      entityId: created.id,
      payload: { userId: d.userId },
    })
    await writeAudit(ctx, {
      action: 'hr.profile.created',
      entityType: 'hr_profile',
      entityId: created.id,
      after: { userId: d.userId, ...fields },
    })
    revalidateTeam(d.userId)
    return { ok: true, data: { id: created.id } }
  } catch (err) {
    return failure(err)
  }
}
