import { z } from 'zod'
import { CALENDAR_EVENT_SOURCES, MEETING_STATUSES, MEETING_TYPES } from '../types/index'

// Governs meetings.attendees (0010): internal users and external contacts.
export const MeetingAttendeeSchema = z.object({
  kind: z.enum(['user', 'contact', 'external']),
  id: z.string().uuid().optional(),
  name: z.string().max(200).optional(),
  email: z.string().email().optional(),
})
export type MeetingAttendee = z.infer<typeof MeetingAttendeeSchema>

export const MeetingAttendeesSchema = z.array(MeetingAttendeeSchema)
export type MeetingAttendees = z.infer<typeof MeetingAttendeesSchema>

// Governs meetings.agenda (0010).
export const MeetingAgendaItemSchema = z.object({
  title: z.string().min(1).max(300),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().max(5_000).optional(),
})
export type MeetingAgendaItem = z.infer<typeof MeetingAgendaItemSchema>

export const MeetingAgendaSchema = z.array(MeetingAgendaItemSchema)
export type MeetingAgenda = z.infer<typeof MeetingAgendaSchema>

export const MeetingSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  title: z.string().min(1).max(300),
  type: z.enum(MEETING_TYPES),
  projectId: z.string().uuid().nullable(),
  dealId: z.string().uuid().nullable(),
  calendarEventId: z.string().uuid().nullable(),
  attendees: MeetingAttendeesSchema,
  agenda: MeetingAgendaSchema,
  status: z.enum(MEETING_STATUSES),
  recordingFileId: z.string().uuid().nullable(),
  transcriptFileId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Meeting = z.infer<typeof MeetingSchema>

export const CreateMeetingInput = z.object({
  title: z.string().min(1, 'Meeting title is required').max(300),
  type: z.enum(MEETING_TYPES).default('internal'),
  projectId: z.string().uuid().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  calendarEventId: z.string().uuid().nullable().optional(),
  attendees: MeetingAttendeesSchema.default([]),
  agenda: MeetingAgendaSchema.default([]),
  status: z.enum(MEETING_STATUSES).default('scheduled'),
  // Standalone timing (0014): used when the meeting carries no calendar_event.
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  location: z.string().max(500).nullable().optional(),
})
export type CreateMeetingInput = z.infer<typeof CreateMeetingInput>

export const UpdateMeetingInput = CreateMeetingInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateMeetingInput = z.infer<typeof UpdateMeetingInput>

// ── First-class decisions + action items (0014) ─────────────────────────────
// These govern the human-curated rows in meeting_decisions / meeting_action_items
// (distinct from the AI-output jsonb on meeting_summaries above): a decision is a
// searchable log entry, an action item is trackable and convertible to a task.

export const CreateMeetingDecisionInput = z.object({
  meetingId: z.string().uuid(),
  statement: z.string().min(1, 'Decision statement is required').max(2_000),
  decidedBy: z.string().max(200).nullable().optional(),
  context: z.string().max(5_000).nullable().optional(),
})
export type CreateMeetingDecisionInput = z.infer<typeof CreateMeetingDecisionInput>

export const MEETING_ACTION_ITEM_STATUSES = [
  'proposed',
  'accepted',
  'converted',
  'dismissed',
] as const
export type MeetingActionItemStatus = (typeof MEETING_ACTION_ITEM_STATUSES)[number]

export const CreateMeetingActionItemInput = z.object({
  meetingId: z.string().uuid(),
  description: z.string().min(1, 'Action item is required').max(1_000),
  assigneeUserId: z.string().uuid().nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
})
export type CreateMeetingActionItemInput = z.infer<typeof CreateMeetingActionItemInput>

export const UpdateMeetingActionItemInput = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(1_000).optional(),
  assigneeUserId: z.string().uuid().nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
  status: z.enum(['proposed', 'accepted', 'dismissed']).optional(),
})
export type UpdateMeetingActionItemInput = z.infer<typeof UpdateMeetingActionItemInput>

// Governs meeting_summaries.decisions (0010).
export const MeetingDecisionSchema = z.object({
  statement: z.string().min(1).max(2_000),
  decidedBy: z.string().max(200).optional(),
})
export type MeetingDecision = z.infer<typeof MeetingDecisionSchema>

export const MeetingDecisionsSchema = z.array(MeetingDecisionSchema)
export type MeetingDecisions = z.infer<typeof MeetingDecisionsSchema>

// Governs meeting_summaries.action_items (0010): proposed items pending review.
export const MeetingActionItemSchema = z.object({
  description: z.string().min(1).max(1_000),
  proposedAssigneeId: z.string().uuid().nullable().optional(),
  proposedDueDate: z.string().date().nullable().optional(),
  status: z.enum(['proposed', 'accepted', 'rejected']).default('proposed'),
  taskId: z.string().uuid().nullable().optional(),
})
export type MeetingActionItem = z.infer<typeof MeetingActionItemSchema>

export const MeetingActionItemsSchema = z.array(MeetingActionItemSchema)
export type MeetingActionItems = z.infer<typeof MeetingActionItemsSchema>

export const MeetingSummarySchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  meetingId: z.string().uuid(),
  tldr: z.string().max(10_000).nullable(),
  decisions: MeetingDecisionsSchema,
  actionItems: MeetingActionItemsSchema,
  clientSafeVariant: z.unknown().nullable(),
  model: z.string().max(120).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type MeetingSummary = z.infer<typeof MeetingSummarySchema>

// Governs calendar_events.related_refs (0010).
export const CalendarRelatedRefsSchema = z
  .object({
    taskId: z.string().uuid().optional(),
    meetingId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
  })
  .passthrough()
export type CalendarRelatedRefs = z.infer<typeof CalendarRelatedRefsSchema>

export const CalendarEventSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(300),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  allDay: z.boolean(),
  location: z.string().max(500).nullable(),
  source: z.enum(CALENDAR_EVENT_SOURCES),
  providerEventId: z.string().max(300).nullable(),
  relatedRefs: CalendarRelatedRefsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type CalendarEvent = z.infer<typeof CalendarEventSchema>

export const CreateCalendarEventInput = z.object({
  title: z.string().min(1, 'Event title is required').max(300),
  startsAt: z.string(),
  endsAt: z.string().nullable().optional(),
  allDay: z.boolean().default(false),
  location: z.string().max(500).optional(),
  source: z.enum(CALENDAR_EVENT_SOURCES).default('native'),
  providerEventId: z.string().max(300).nullable().optional(),
  relatedRefs: CalendarRelatedRefsSchema.default({}),
})
export type CreateCalendarEventInput = z.infer<typeof CreateCalendarEventInput>

export const UpdateCalendarEventInput = CreateCalendarEventInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateCalendarEventInput = z.infer<typeof UpdateCalendarEventInput>

// Governs availability.working_hours (0010): weekday → list of HH:MM ranges.
export const WorkingHoursSchema = z.record(
  z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  z.array(z.object({ start: z.string(), end: z.string() })),
)
export type WorkingHours = z.infer<typeof WorkingHoursSchema>

// Governs availability.booking_rules (0010).
export const BookingRulesSchema = z
  .object({
    bufferMinutes: z.number().int().nonnegative().optional(),
    minNoticeHours: z.number().int().nonnegative().optional(),
    maxPerDay: z.number().int().positive().optional(),
  })
  .passthrough()
export type BookingRules = z.infer<typeof BookingRulesSchema>

export const AvailabilitySchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  workingHours: WorkingHoursSchema,
  timezone: z.string().max(80),
  bookingRules: BookingRulesSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Availability = z.infer<typeof AvailabilitySchema>

export const UpsertAvailabilityInput = z.object({
  workingHours: WorkingHoursSchema.default({}),
  timezone: z.string().max(80).default('UTC'),
  bookingRules: BookingRulesSchema.default({}),
})
export type UpsertAvailabilityInput = z.infer<typeof UpsertAvailabilityInput>
