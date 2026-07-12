'use server'

import { z } from 'zod'
import {
  CreateMeetingActionItemInput,
  CreateMeetingDecisionInput,
  CreateMeetingInput,
  UpdateMeetingActionItemInput,
  UpdateMeetingInput,
} from '@aurexos/core'
import type { Tables, TablesInsert, TablesUpdate } from '@aurexos/db'
import { ActionError, emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import type { WorkspaceContext } from '@/lib/workspace-context'
import { failure, requireMeetingAccess, revalidateMeetings } from './meetings-access'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getMeetingRow(ctx: WorkspaceContext, id: string): Promise<Tables<'meetings'>> {
  const { data } = await ctx.supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!data) throw new ActionError('Meeting not found')
  return data
}

function assertValidTimes(startsAt?: string | null, endsAt?: string | null): void {
  if (startsAt && endsAt && endsAt < startsAt) {
    throw new ActionError('End time must be after the start time')
  }
}

/**
 * Keep a meeting's linked calendar_event in step with its timing so the Calendar
 * module (which projects meetings via calendar_event_id) always renders it at
 * the right time. Creates a system event when the meeting gains a start time and
 * has none, else patches the existing one. Returns the event id (or null).
 */
async function syncCalendarEvent(
  ctx: WorkspaceContext,
  meeting: Pick<
    Tables<'meetings'>,
    'id' | 'title' | 'calendar_event_id' | 'starts_at' | 'ends_at' | 'location'
  >,
): Promise<string | null> {
  if (!meeting.starts_at) return meeting.calendar_event_id
  const relatedRefs = { meetingId: meeting.id } as TablesInsert<'calendar_events'>['related_refs']

  if (meeting.calendar_event_id) {
    await ctx.supabase
      .from('calendar_events')
      .update({
        title: meeting.title,
        starts_at: meeting.starts_at,
        ends_at: meeting.ends_at,
        location: meeting.location,
        updated_at: new Date().toISOString(),
      })
      .eq('id', meeting.calendar_event_id)
      .eq('workspace_id', ctx.workspace.id)
    return meeting.calendar_event_id
  }

  const { data: event } = await ctx.supabase
    .from('calendar_events')
    .insert({
      workspace_id: ctx.workspace.id,
      user_id: ctx.userId,
      title: meeting.title,
      starts_at: meeting.starts_at,
      ends_at: meeting.ends_at,
      all_day: false,
      location: meeting.location,
      // 'system' marks a producer-owned event (the meeting owns it) so the
      // Calendar's native-event layer leaves it to the meeting layer to render.
      source: 'system',
      related_refs: relatedRefs,
    })
    .select('id')
    .single()
  return event?.id ?? null
}

// ── Meeting lifecycle ────────────────────────────────────────────────────────

export async function createMeeting(
  input: z.input<typeof CreateMeetingInput>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = CreateMeetingInput.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid meeting' }
    }
    const ctx = await requireMeetingAccess()
    const v = parsed.data
    assertValidTimes(v.startsAt, v.endsAt)

    const { data: meeting, error } = await ctx.supabase
      .from('meetings')
      .insert({
        workspace_id: ctx.workspace.id,
        title: v.title,
        type: v.type,
        project_id: v.projectId ?? null,
        deal_id: v.dealId ?? null,
        client_id: v.clientId ?? null,
        attendees: v.attendees as TablesInsert<'meetings'>['attendees'],
        agenda: v.agenda as TablesInsert<'meetings'>['agenda'],
        status: v.status,
        starts_at: v.startsAt ?? null,
        ends_at: v.endsAt ?? null,
        location: v.location?.trim() ? v.location.trim() : null,
      })
      .select('*')
      .single()
    if (error || !meeting) return { ok: false, error: error?.message ?? 'Could not create meeting' }

    // Premium touch: mint a linked calendar event so the meeting appears on the
    // Calendar immediately (only when it has a start time).
    const calendarEventId = await syncCalendarEvent(ctx, meeting)
    if (calendarEventId && calendarEventId !== meeting.calendar_event_id) {
      await ctx.supabase
        .from('meetings')
        .update({ calendar_event_id: calendarEventId })
        .eq('id', meeting.id)
        .eq('workspace_id', ctx.workspace.id)
    }

    await writeAudit(ctx, {
      action: 'meetings.meeting.scheduled',
      entityType: 'meeting',
      entityId: meeting.id,
      after: meeting,
    })
    await emitDomainEvent(ctx, {
      eventType: 'meetings.meeting.scheduled',
      entityType: 'meeting',
      entityId: meeting.id,
      payload: { title: meeting.title, type: meeting.type, startsAt: meeting.starts_at },
    })
    if (calendarEventId && calendarEventId !== meeting.calendar_event_id) {
      await emitDomainEvent(ctx, {
        eventType: 'calendar.event.created',
        entityType: 'calendar_event',
        entityId: calendarEventId,
        payload: { title: meeting.title, startsAt: meeting.starts_at, meetingId: meeting.id },
      })
    }

    revalidateMeetings(meeting.id)
    return { ok: true, data: { id: meeting.id } }
  } catch (err) {
    return failure(err)
  }
}

export async function updateMeeting(
  input: z.input<typeof UpdateMeetingInput>,
): Promise<ActionResult> {
  try {
    const parsed = UpdateMeetingInput.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid meeting' }
    }
    const ctx = await requireMeetingAccess()
    const before = await getMeetingRow(ctx, parsed.data.id)
    const v = parsed.data

    const patch: TablesUpdate<'meetings'> = {}
    if (v.title !== undefined) patch.title = v.title
    if (v.type !== undefined) patch.type = v.type
    if (v.projectId !== undefined) patch.project_id = v.projectId
    if (v.dealId !== undefined) patch.deal_id = v.dealId
    if (v.clientId !== undefined) patch.client_id = v.clientId
    if (v.attendees !== undefined) {
      patch.attendees = v.attendees as TablesUpdate<'meetings'>['attendees']
    }
    if (v.agenda !== undefined) patch.agenda = v.agenda as TablesUpdate<'meetings'>['agenda']
    if (v.status !== undefined) patch.status = v.status
    if (v.startsAt !== undefined) patch.starts_at = v.startsAt
    if (v.endsAt !== undefined) patch.ends_at = v.endsAt
    if (v.location !== undefined) patch.location = v.location?.trim() ? v.location.trim() : null
    if (Object.keys(patch).length === 0) return { ok: true, data: undefined }
    assertValidTimes(patch.starts_at ?? before.starts_at, patch.ends_at ?? before.ends_at)
    patch.updated_at = new Date().toISOString()

    const { data: after, error } = await ctx.supabase
      .from('meetings')
      .update(patch)
      .eq('id', before.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !after) return { ok: false, error: error?.message ?? 'Could not update meeting' }

    // Keep the linked calendar event in step with any timing change.
    const calendarEventId = await syncCalendarEvent(ctx, after)
    if (calendarEventId && calendarEventId !== after.calendar_event_id) {
      await ctx.supabase
        .from('meetings')
        .update({ calendar_event_id: calendarEventId })
        .eq('id', after.id)
        .eq('workspace_id', ctx.workspace.id)
    }

    await writeAudit(ctx, {
      action: 'meetings.meeting.updated',
      entityType: 'meeting',
      entityId: after.id,
      before,
      after,
    })

    revalidateMeetings(after.id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

async function transitionStatus(
  id: string,
  to: Tables<'meetings'>['status'],
  event: 'started' | 'completed' | 'cancelled',
): Promise<ActionResult> {
  const ctx = await requireMeetingAccess()
  const before = await getMeetingRow(ctx, id)

  const { data: after, error } = await ctx.supabase
    .from('meetings')
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq('id', before.id)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .select('*')
    .single()
  if (error || !after) return { ok: false, error: error?.message ?? 'Could not update meeting' }

  await writeAudit(ctx, {
    action: `meetings.meeting.${event}`,
    entityType: 'meeting',
    entityId: after.id,
    before: { status: before.status },
    after: { status: to },
  })

  if (event === 'completed') {
    await emitDomainEvent(ctx, {
      eventType: 'meetings.meeting.completed',
      entityType: 'meeting',
      entityId: after.id,
      payload: { title: after.title, type: after.type },
    })
  }
  if (event === 'cancelled' && after.calendar_event_id) {
    // Soft-cancel the linked calendar event so it drops off the calendar too.
    await ctx.supabase
      .from('calendar_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', after.calendar_event_id)
      .eq('workspace_id', ctx.workspace.id)
    await emitDomainEvent(ctx, {
      eventType: 'calendar.event.cancelled',
      entityType: 'calendar_event',
      entityId: after.calendar_event_id,
      payload: { meetingId: after.id },
    })
  }

  revalidateMeetings(after.id)
  return { ok: true, data: undefined }
}

const idSchema = z.string().uuid()

export async function startMeeting(id: string): Promise<ActionResult> {
  try {
    if (!idSchema.safeParse(id).success) return { ok: false, error: 'Invalid meeting id' }
    return await transitionStatus(id, 'in_progress', 'started')
  } catch (err) {
    return failure(err)
  }
}

export async function completeMeeting(id: string): Promise<ActionResult> {
  try {
    if (!idSchema.safeParse(id).success) return { ok: false, error: 'Invalid meeting id' }
    return await transitionStatus(id, 'completed', 'completed')
  } catch (err) {
    return failure(err)
  }
}

export async function cancelMeeting(id: string): Promise<ActionResult> {
  try {
    if (!idSchema.safeParse(id).success) return { ok: false, error: 'Invalid meeting id' }
    return await transitionStatus(id, 'cancelled', 'cancelled')
  } catch (err) {
    return failure(err)
  }
}

// ── Notes (autosave-friendly) ────────────────────────────────────────────────

const SaveNotesInput = z.object({ id: z.string().uuid(), notes: z.string().max(50_000) })

export async function saveNotes(input: z.input<typeof SaveNotesInput>): Promise<ActionResult> {
  try {
    const parsed = SaveNotesInput.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Invalid notes' }
    const ctx = await requireMeetingAccess()
    const before = await getMeetingRow(ctx, parsed.data.id)

    const notes = parsed.data.notes
    if ((before.notes ?? '') === notes) return { ok: true, data: undefined }

    const { error } = await ctx.supabase
      .from('meetings')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', before.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
    if (error) return { ok: false, error: error.message }

    revalidateMeetings(before.id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

// ── Agenda item toggle (check off in live mode) ──────────────────────────────

const ToggleAgendaInput = z.object({
  id: z.string().uuid(),
  index: z.number().int().nonnegative(),
  done: z.boolean(),
})

export async function toggleAgendaItem(
  input: z.input<typeof ToggleAgendaInput>,
): Promise<ActionResult> {
  try {
    const parsed = ToggleAgendaInput.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Invalid agenda toggle' }
    const ctx = await requireMeetingAccess()
    const before = await getMeetingRow(ctx, parsed.data.id)

    const agenda = Array.isArray(before.agenda) ? [...(before.agenda as unknown[])] : []
    const item = agenda[parsed.data.index]
    if (!item || typeof item !== 'object') return { ok: false, error: 'Agenda item not found' }
    agenda[parsed.data.index] = { ...(item as Record<string, unknown>), done: parsed.data.done }

    const { error } = await ctx.supabase
      .from('meetings')
      .update({
        agenda: agenda as TablesUpdate<'meetings'>['agenda'],
        updated_at: new Date().toISOString(),
      })
      .eq('id', before.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
    if (error) return { ok: false, error: error.message }

    revalidateMeetings(before.id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

// ── Decisions ────────────────────────────────────────────────────────────────

export async function addDecision(
  input: z.input<typeof CreateMeetingDecisionInput>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = CreateMeetingDecisionInput.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid decision' }
    }
    const ctx = await requireMeetingAccess()
    // Confirm the meeting exists in this workspace (RLS also enforces this).
    await getMeetingRow(ctx, parsed.data.meetingId)

    const { data: decision, error } = await ctx.supabase
      .from('meeting_decisions')
      .insert({
        workspace_id: ctx.workspace.id,
        meeting_id: parsed.data.meetingId,
        statement: parsed.data.statement,
        decided_by: parsed.data.decidedBy?.trim() ? parsed.data.decidedBy.trim() : null,
        context: parsed.data.context?.trim() ? parsed.data.context.trim() : null,
      })
      .select('id')
      .single()
    if (error || !decision) return { ok: false, error: error?.message ?? 'Could not add decision' }

    await writeAudit(ctx, {
      action: 'meetings.decision.recorded',
      entityType: 'meeting_decision',
      entityId: decision.id,
      after: { meetingId: parsed.data.meetingId, statement: parsed.data.statement },
    })
    await emitDomainEvent(ctx, {
      eventType: 'meetings.decision.recorded',
      entityType: 'meeting_decision',
      entityId: decision.id,
      payload: { meetingId: parsed.data.meetingId },
    })

    revalidateMeetings(parsed.data.meetingId)
    return { ok: true, data: { id: decision.id } }
  } catch (err) {
    return failure(err)
  }
}

export async function removeDecision(id: string): Promise<ActionResult> {
  try {
    if (!idSchema.safeParse(id).success) return { ok: false, error: 'Invalid decision id' }
    const ctx = await requireMeetingAccess()
    const { data: before } = await ctx.supabase
      .from('meeting_decisions')
      .select('id, meeting_id')
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!before) return { ok: false, error: 'Decision not found' }

    const { error } = await ctx.supabase
      .from('meeting_decisions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
    if (error) return { ok: false, error: error.message }

    revalidateMeetings(before.meeting_id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

// ── Action items ─────────────────────────────────────────────────────────────

export async function addActionItem(
  input: z.input<typeof CreateMeetingActionItemInput>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = CreateMeetingActionItemInput.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid action item' }
    }
    const ctx = await requireMeetingAccess()
    await getMeetingRow(ctx, parsed.data.meetingId)

    const { data: item, error } = await ctx.supabase
      .from('meeting_action_items')
      .insert({
        workspace_id: ctx.workspace.id,
        meeting_id: parsed.data.meetingId,
        description: parsed.data.description,
        assignee_user_id: parsed.data.assigneeUserId ?? null,
        due_date: parsed.data.dueDate ?? null,
        status: 'proposed',
      })
      .select('id')
      .single()
    if (error || !item) return { ok: false, error: error?.message ?? 'Could not add action item' }

    await writeAudit(ctx, {
      action: 'meetings.action_item.created',
      entityType: 'meeting_action_item',
      entityId: item.id,
      after: { meetingId: parsed.data.meetingId, description: parsed.data.description },
    })
    await emitDomainEvent(ctx, {
      eventType: 'meetings.action_item.created',
      entityType: 'meeting_action_item',
      entityId: item.id,
      payload: { meetingId: parsed.data.meetingId },
    })

    revalidateMeetings(parsed.data.meetingId)
    return { ok: true, data: { id: item.id } }
  } catch (err) {
    return failure(err)
  }
}

export async function updateActionItem(
  input: z.input<typeof UpdateMeetingActionItemInput>,
): Promise<ActionResult> {
  try {
    const parsed = UpdateMeetingActionItemInput.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Invalid action item' }
    const ctx = await requireMeetingAccess()
    const { data: before } = await ctx.supabase
      .from('meeting_action_items')
      .select('*')
      .eq('id', parsed.data.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!before) return { ok: false, error: 'Action item not found' }
    if (before.status === 'converted') {
      return { ok: false, error: 'This item was converted to a task and can no longer be edited.' }
    }

    const patch: TablesUpdate<'meeting_action_items'> = {}
    const v = parsed.data
    if (v.description !== undefined) patch.description = v.description
    if (v.assigneeUserId !== undefined) patch.assignee_user_id = v.assigneeUserId
    if (v.dueDate !== undefined) patch.due_date = v.dueDate
    if (v.status !== undefined) patch.status = v.status
    if (Object.keys(patch).length === 0) return { ok: true, data: undefined }
    patch.updated_at = new Date().toISOString()

    const { error } = await ctx.supabase
      .from('meeting_action_items')
      .update(patch)
      .eq('id', before.id)
      .eq('workspace_id', ctx.workspace.id)
    if (error) return { ok: false, error: error.message }

    revalidateMeetings(before.meeting_id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

export async function removeActionItem(id: string): Promise<ActionResult> {
  try {
    if (!idSchema.safeParse(id).success) return { ok: false, error: 'Invalid action item id' }
    const ctx = await requireMeetingAccess()
    const { data: before } = await ctx.supabase
      .from('meeting_action_items')
      .select('id, meeting_id')
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!before) return { ok: false, error: 'Action item not found' }

    const { error } = await ctx.supabase
      .from('meeting_action_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
    if (error) return { ok: false, error: error.message }

    revalidateMeetings(before.meeting_id)
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

// ── The flagship: convert an action item to a task (human-in-the-loop) ────────

export interface ConvertActionItemResult {
  taskId: string
  alreadyConverted: boolean
}

/**
 * Turn a meeting action item into a real, tracked task. Mirrors the proposals
 * convert pattern: a workspace-scoped, RLS-backstopped direct write to tasks
 * (the tasks module exports no server-side creator yet), emitting the tasks
 * domain event AND the meetings conversion event, then linking the two records.
 * Idempotent — a second call returns the task the first one created.
 */
export async function convertActionItemToTask(
  actionItemId: string,
): Promise<ActionResult<ConvertActionItemResult>> {
  try {
    if (!idSchema.safeParse(actionItemId).success) {
      return { ok: false, error: 'Invalid action item id' }
    }
    const ctx = await requireMeetingAccess()

    const { data: item } = await ctx.supabase
      .from('meeting_action_items')
      .select('*')
      .eq('id', actionItemId)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!item) return { ok: false, error: 'Action item not found' }

    // Idempotency: already converted → return the existing task link.
    if (item.status === 'converted' && item.task_id) {
      return { ok: true, data: { taskId: item.task_id, alreadyConverted: true } }
    }

    // The task inherits the meeting's project so it lands in the right place.
    const { data: meeting } = await ctx.supabase
      .from('meetings')
      .select('id, project_id, title')
      .eq('id', item.meeting_id)
      .eq('workspace_id', ctx.workspace.id)
      .maybeSingle()

    const { data: task, error: taskError } = await ctx.supabase
      .from('tasks')
      .insert({
        workspace_id: ctx.workspace.id,
        project_id: meeting?.project_id ?? null,
        title: item.description,
        description: meeting ? `From meeting: ${meeting.title}` : null,
        status: 'todo',
        priority: 'none',
        assignee_id: item.assignee_user_id,
        reporter_id: ctx.userId,
        due_date: item.due_date,
        labels: [],
      })
      .select('id')
      .single()
    if (taskError || !task) {
      return { ok: false, error: taskError?.message ?? 'Could not create task' }
    }

    const { error: linkError } = await ctx.supabase
      .from('meeting_action_items')
      .update({ status: 'converted', task_id: task.id, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .eq('workspace_id', ctx.workspace.id)
    if (linkError) return { ok: false, error: linkError.message }

    await writeAudit(ctx, {
      action: 'tasks.task.created',
      entityType: 'task',
      entityId: task.id,
      after: { title: item.description, source: 'meeting_action_item', actionItemId: item.id },
    })
    await emitDomainEvent(ctx, {
      eventType: 'tasks.task.created',
      entityType: 'task',
      entityId: task.id,
      payload: {
        title: item.description,
        projectId: meeting?.project_id ?? null,
        actionItemId: item.id,
      },
    })
    await emitDomainEvent(ctx, {
      // Past-tense verb per the R-Q2 event-naming contract (verb ends in -ed).
      eventType: 'meetings.action_item.converted',
      entityType: 'meeting_action_item',
      entityId: item.id,
      payload: { taskId: task.id, meetingId: item.meeting_id },
    })

    revalidateMeetings(item.meeting_id)
    return { ok: true, data: { taskId: task.id, alreadyConverted: false } }
  } catch (err) {
    return failure(err)
  }
}
