// Client-safe row shapes + label/badge/template maps shared by queries (server)
// and components (client). No I/O here — safe to import from either side.

import type {
  MeetingActionItemStatus,
  MeetingAgendaItem,
  MeetingStatus,
  MeetingType,
} from '@aurexos/core'
import type { BadgeProps } from '@aurexos/ui/components/badge'

type BadgeVariant = NonNullable<BadgeProps['variant']>

// ── Agenda ──────────────────────────────────────────────────────────────────
// Agenda items live in meetings.agenda (jsonb). We extend the core item with a
// `done` flag so the live-mode checklist can be ticked off in place.
export interface AgendaItem extends MeetingAgendaItem {
  done?: boolean
}

// ── Attendees (mirrors MeetingAttendeeSchema in core) ───────────────────────
export interface AttendeeRef {
  kind: 'user' | 'contact' | 'external'
  id?: string
  name?: string
  email?: string
}

// ── List + detail rows ──────────────────────────────────────────────────────

export interface MeetingListRow {
  id: string
  title: string
  type: MeetingType
  status: MeetingStatus
  /** ISO timestamp (from starts_at or the linked calendar event); null if untimed. */
  startsAt: string | null
  endsAt: string | null
  location: string | null
  clientId: string | null
  clientName: string | null
  projectId: string | null
  projectName: string | null
  dealId: string | null
  dealName: string | null
  attendees: AttendeeRef[]
  agendaCount: number
  decisionCount: number
  actionItemCount: number
  createdAt: string
}

export interface DecisionRow {
  id: string
  meetingId: string
  statement: string
  decidedBy: string | null
  context: string | null
  createdAt: string
  /** Populated by getDecisionLog so each entry links back to its meeting. */
  meetingTitle?: string
}

export interface ActionItemRow {
  id: string
  meetingId: string
  description: string
  assigneeUserId: string | null
  assigneeName: string | null
  dueDate: string | null
  status: MeetingActionItemStatus
  taskId: string | null
  createdAt: string
}

export interface MeetingSummaryData {
  id: string
  tldr: string | null
  decisions: unknown[]
  actionItems: unknown[]
  clientSafeVariant: unknown
  model: string | null
}

export interface MeetingDetail {
  id: string
  title: string
  type: MeetingType
  status: MeetingStatus
  startsAt: string | null
  endsAt: string | null
  location: string | null
  notes: string | null
  calendarEventId: string | null
  clientId: string | null
  clientName: string | null
  projectId: string | null
  projectName: string | null
  dealId: string | null
  dealName: string | null
  attendees: AttendeeRef[]
  agenda: AgendaItem[]
  decisions: DecisionRow[]
  actionItems: ActionItemRow[]
  summary: MeetingSummaryData | null
  createdAt: string
  updatedAt: string
}

// ── Pre-meeting brief (the extraordinary feature) ───────────────────────────

export interface BriefRelationship {
  kind: 'client' | 'deal' | 'project'
  id: string
  name: string
  /** e.g. deal stage, client status, project status. */
  status: string | null
  /** Deal value in minor units, when a deal is in scope. */
  valueCents: number | null
  currency: string | null
  href: string
}

export interface BriefLastMeeting {
  id: string
  title: string
  when: string | null
  decisions: DecisionRow[]
  openActionItems: ActionItemRow[]
  href: string
}

export interface BriefOpenTask {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  assigneeName: string | null
}

export interface BriefActivityItem {
  kind: 'email' | 'event'
  id: string
  label: string
  when: string | null
  href: string | null
}

export interface BriefUpcomingItem {
  id: string
  title: string
  startsAt: string
  href: string | null
}

/**
 * Everything assembled for "walk in already knowing everything" — read-only,
 * drawn entirely from real workspace data across modules. Every field can be
 * empty; the panel renders honest empty states rather than guesses.
 */
export interface PreMeetingBrief {
  meetingId: string
  /** Whether this meeting is linked to any relationship worth briefing on. */
  hasContext: boolean
  relationships: BriefRelationship[]
  lastMeeting: BriefLastMeeting | null
  openTasks: BriefOpenTask[]
  recentActivity: BriefActivityItem[]
  upcoming: BriefUpcomingItem[]
}

// ── Picker options ──────────────────────────────────────────────────────────

export interface MeetingOption {
  id: string
  name: string
}

export interface MeetingMemberOption {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
}

export interface MeetingContactOption {
  id: string
  fullName: string
  email: string | null
  clientId: string | null
}

export interface MeetingFormOptions {
  clients: MeetingOption[]
  projects: MeetingOption[]
  deals: MeetingOption[]
  members: MeetingMemberOption[]
  contacts: MeetingContactOption[]
}

// ── Filter tabs ─────────────────────────────────────────────────────────────

export const MEETING_TYPE_TABS = ['all', 'internal', 'client', 'sales', 'standup'] as const
export type MeetingTypeTab = (typeof MEETING_TYPE_TABS)[number]

export function isMeetingTypeTab(value: string | undefined): value is MeetingTypeTab {
  return !!value && (MEETING_TYPE_TABS as readonly string[]).includes(value)
}

// ── Label + badge maps (soft variants only; the label carries the state) ─────

export const MEETING_TYPE_META: Record<MeetingType, { label: string; variant: BadgeVariant }> = {
  internal: { label: 'Internal', variant: 'secondary' },
  client: { label: 'Client', variant: 'info-soft' },
  sales: { label: 'Sales', variant: 'accent-soft' },
  standup: { label: 'Standup', variant: 'outline' },
}

export const MEETING_STATUS_META: Record<MeetingStatus, { label: string; variant: BadgeVariant }> =
  {
    scheduled: { label: 'Scheduled', variant: 'secondary' },
    in_progress: { label: 'In progress', variant: 'warning-soft' },
    completed: { label: 'Completed', variant: 'success-soft' },
    cancelled: { label: 'Cancelled', variant: 'outline' },
  }

export const ACTION_ITEM_STATUS_META: Record<
  MeetingActionItemStatus,
  { label: string; variant: BadgeVariant }
> = {
  proposed: { label: 'Proposed', variant: 'secondary' },
  accepted: { label: 'Accepted', variant: 'info-soft' },
  converted: { label: 'Converted to task', variant: 'success-soft' },
  dismissed: { label: 'Dismissed', variant: 'outline' },
}

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  internal: 'Internal',
  client: 'Client',
  sales: 'Sales',
  standup: 'Standup',
}

// ── Agenda templates (prefilled per type in the meeting form) ────────────────
// Each entry is a ready-to-edit agenda for that meeting shape. Durations sum to
// a realistic meeting length; the user reorders/edits freely after prefill.

export interface MeetingTemplate {
  key: string
  label: string
  type: MeetingType
  description: string
  agenda: MeetingAgendaItem[]
}

export const MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    key: 'client-kickoff',
    label: 'Client kickoff',
    type: 'client',
    description: 'First working session with a new client engagement.',
    agenda: [
      { title: 'Introductions and roles', durationMinutes: 10 },
      { title: 'Goals and success criteria', durationMinutes: 15 },
      { title: 'Scope walkthrough', durationMinutes: 20 },
      { title: 'Timeline and milestones', durationMinutes: 10 },
      { title: 'Communication and next steps', durationMinutes: 5 },
    ],
  },
  {
    key: 'weekly-standup',
    label: 'Weekly standup',
    type: 'standup',
    description: 'Fast, recurring team sync.',
    agenda: [
      { title: 'Wins since last week', durationMinutes: 5 },
      { title: 'In progress', durationMinutes: 10 },
      { title: 'Blockers', durationMinutes: 10 },
      { title: 'This week’s focus', durationMinutes: 5 },
    ],
  },
  {
    key: 'sales-discovery',
    label: 'Sales discovery',
    type: 'sales',
    description: 'Qualify a prospect and map their needs.',
    agenda: [
      { title: 'Rapport and agenda', durationMinutes: 5 },
      { title: 'Current situation and pain', durationMinutes: 15 },
      { title: 'Desired outcomes', durationMinutes: 15 },
      { title: 'Budget, authority, timeline', durationMinutes: 10 },
      { title: 'Next steps', durationMinutes: 5 },
    ],
  },
  {
    key: 'project-review',
    label: 'Project review',
    type: 'internal',
    description: 'Mid-engagement checkpoint on delivery health.',
    agenda: [
      { title: 'Progress against plan', durationMinutes: 15 },
      { title: 'Risks and issues', durationMinutes: 15 },
      { title: 'Budget and scope', durationMinutes: 10 },
      { title: 'Decisions needed', durationMinutes: 10 },
      { title: 'Actions and owners', durationMinutes: 10 },
    ],
  },
]

export function templateFor(key: string | undefined): MeetingTemplate | undefined {
  return MEETING_TEMPLATES.find((t) => t.key === key)
}
