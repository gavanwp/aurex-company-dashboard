'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { CreateCalendarEventInput, UpdateCalendarEventInput } from '@aurexos/core'
import type { Tables, TablesInsert, TablesUpdate } from '@aurexos/db'
import { ActionError, emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  console.error('calendar action failed:', err)
  return { ok: false, error: 'Something went wrong. Please try again.' }
}

function revalidateCalendarSurfaces(): void {
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
}

/**
 * Authorize step of the action spine. The Capability map covers Phase-1
 * modules only, so calendar mirrors its RLS policy exactly (0010:
 * is_workspace_member) with read-only portal roles excluded — swap for
 * requireCapability('calendar.*') once calendar capabilities land in
 * packages/core permissions.
 */
async function requireCalendarAccess(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  if (ctx.role === 'client' || ctx.role === 'guest') {
    throw new ActionError('forbidden')
  }
  return ctx
}

/**
 * Load an event the caller may mutate: workspace-scoped, not deleted, owned by
 * the caller (calendar_events.user_id is the owning calendar), and native —
 * synced/system events are managed by their producers, not by hand.
 */
async function getEditableEvent(
  ctx: WorkspaceContext,
  id: string,
): Promise<Tables<'calendar_events'>> {
  const { data: event } = await ctx.supabase
    .from('calendar_events')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!event) throw new ActionError('Event not found')
  if (event.user_id !== ctx.userId) throw new ActionError('You can only edit your own events')
  if (event.source !== 'native') throw new ActionError('Only native events can be edited')
  return event
}

function assertValidTimes(startsAt: string, endsAt: string | null | undefined): void {
  if (endsAt && endsAt < startsAt) throw new ActionError('End time must be after the start time')
}

export async function createEvent(
  input: z.input<typeof CreateCalendarEventInput>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = CreateCalendarEventInput.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid event' }
    }
    const ctx = await requireCalendarAccess()
    assertValidTimes(parsed.data.startsAt, parsed.data.endsAt)

    const { data: event, error } = await ctx.supabase
      .from('calendar_events')
      .insert({
        workspace_id: ctx.workspace.id,
        user_id: ctx.userId,
        title: parsed.data.title,
        starts_at: parsed.data.startsAt,
        ends_at: parsed.data.endsAt ?? null,
        all_day: parsed.data.allDay,
        location: parsed.data.location?.trim() ? parsed.data.location.trim() : null,
        // Hand-created events are always native; synced/system rows are
        // written by the Google sync worker and system producers only.
        source: 'native',
        provider_event_id: null,
        related_refs: parsed.data.relatedRefs as TablesInsert<'calendar_events'>['related_refs'],
      })
      .select('*')
      .single()
    if (error || !event) return { ok: false, error: error?.message ?? 'Could not create event' }

    await writeAudit(ctx, {
      action: 'calendar.event.created',
      entityType: 'calendar_event',
      entityId: event.id,
      after: event,
    })
    await emitDomainEvent(ctx, {
      eventType: 'calendar.event.created',
      entityType: 'calendar_event',
      entityId: event.id,
      payload: { title: event.title, startsAt: event.starts_at, allDay: event.all_day },
    })

    revalidateCalendarSurfaces()
    return { ok: true, data: { id: event.id } }
  } catch (err) {
    return fail(err)
  }
}

export async function updateEvent(
  input: z.input<typeof UpdateCalendarEventInput>,
): Promise<ActionResult> {
  try {
    const parsed = UpdateCalendarEventInput.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid event' }
    }
    const ctx = await requireCalendarAccess()
    const before = await getEditableEvent(ctx, parsed.data.id)

    const patch: TablesUpdate<'calendar_events'> = {}
    const v = parsed.data
    if (v.title !== undefined) patch.title = v.title
    if (v.startsAt !== undefined) patch.starts_at = v.startsAt
    if (v.endsAt !== undefined) patch.ends_at = v.endsAt
    if (v.allDay !== undefined) patch.all_day = v.allDay
    if (v.location !== undefined) patch.location = v.location?.trim() ? v.location.trim() : null
    if (v.relatedRefs !== undefined) {
      patch.related_refs = v.relatedRefs as TablesUpdate<'calendar_events'>['related_refs']
    }
    if (Object.keys(patch).length === 0) return { ok: true, data: undefined }
    assertValidTimes(patch.starts_at ?? before.starts_at, patch.ends_at ?? before.ends_at)
    patch.updated_at = new Date().toISOString()

    const { data: after, error } = await ctx.supabase
      .from('calendar_events')
      .update(patch)
      .eq('id', before.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !after) return { ok: false, error: error?.message ?? 'Could not update event' }

    await writeAudit(ctx, {
      action: 'calendar.event.updated',
      entityType: 'calendar_event',
      entityId: after.id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: 'calendar.event.updated',
      entityType: 'calendar_event',
      entityId: after.id,
      payload: { fields: Object.keys(patch) },
    })

    revalidateCalendarSurfaces()
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  try {
    const parsed = z.string().uuid().safeParse(id)
    if (!parsed.success) return { ok: false, error: 'Invalid event id' }
    const ctx = await requireCalendarAccess()
    const before = await getEditableEvent(ctx, parsed.data)

    const { error } = await ctx.supabase
      .from('calendar_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', before.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
    if (error) return { ok: false, error: error.message }

    await writeAudit(ctx, {
      action: 'calendar.event.cancelled',
      entityType: 'calendar_event',
      entityId: before.id,
      before,
    })
    await emitDomainEvent(ctx, {
      eventType: 'calendar.event.cancelled',
      entityType: 'calendar_event',
      entityId: before.id,
      payload: { title: before.title, startsAt: before.starts_at },
    })

    revalidateCalendarSurfaces()
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
