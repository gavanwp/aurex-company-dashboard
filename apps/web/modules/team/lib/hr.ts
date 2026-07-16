import type {
  EmploymentType,
  HrSkill,
  LeaveStatus,
  LeaveType,
  MemberSpecialization,
  SkillLevel,
} from '@aurexos/core'
import { HrSkillsSchema } from '@aurexos/core'

// Pure display + parsing helpers for Team & HR. No I/O.

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contractor: 'Contractor',
  intern: 'Intern',
}

const SPECIALIZATION_LABELS: Record<MemberSpecialization, string> = {
  developer: 'Developer',
  designer: 'Designer',
  seo: 'SEO',
  content: 'Content',
  marketing: 'Marketing',
}

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: 'Vacation',
  sick: 'Sick',
  personal: 'Personal',
  unpaid: 'Unpaid',
  other: 'Other',
}

const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
}

/** 1 (beginner) … 4 (expert) — drives the skill strength meter. */
const SKILL_LEVEL_STRENGTH: Record<SkillLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
}

export function employmentLabel(type: EmploymentType | null): string {
  return type ? EMPLOYMENT_LABELS[type] : '—'
}

export function specializationLabel(spec: MemberSpecialization | null): string {
  return spec ? SPECIALIZATION_LABELS[spec] : 'Unassigned'
}

export function leaveTypeLabel(type: LeaveType): string {
  return LEAVE_TYPE_LABELS[type]
}

export function leaveStatusLabel(status: LeaveStatus): string {
  return LEAVE_STATUS_LABELS[status]
}

export function skillLevelLabel(level: SkillLevel): string {
  return SKILL_LEVEL_LABELS[level]
}

export function skillStrength(level: SkillLevel): number {
  return SKILL_LEVEL_STRENGTH[level]
}

/** Soft badge variant per leave status (color never carries meaning alone). */
export function leaveStatusVariant(
  status: LeaveStatus,
): 'success-soft' | 'warning-soft' | 'destructive-soft' | 'secondary' {
  switch (status) {
    case 'approved':
      return 'success-soft'
    case 'pending':
      return 'warning-soft'
    case 'rejected':
      return 'destructive-soft'
    case 'cancelled':
      return 'secondary'
  }
}

/** Inclusive whole-day span between two ISO dates. */
export function leaveDays(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0
  return Math.round((end - start) / 86_400_000) + 1
}

/** Whether an approved leave range covers `todayISO` (YYYY-MM-DD). */
export function coversToday(startDate: string, endDate: string, todayISO: string): boolean {
  return startDate <= todayISO && endDate >= todayISO
}

/** Parse the hr_profiles.skills jsonb defensively into typed skills. */
export function parseSkills(value: unknown): HrSkill[] {
  const parsed = HrSkillsSchema.safeParse(value)
  return parsed.success ? parsed.data : []
}

/** Format an ISO date as a short, locale-stable label ("15 Jul 2026"). */
export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.parse(iso.length <= 10 ? `${iso}T00:00:00Z` : iso)
  if (Number.isNaN(ms)) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(ms)
}

/** Compact date range for a leave row ("15–19 Jul" / "28 Jul – 2 Aug"). */
export function formatDateRange(startISO: string, endISO: string): string {
  if (startISO === endISO) return formatDate(startISO)
  return `${formatDate(startISO)} – ${formatDate(endISO)}`
}

/** Tenure in whole months/years from a start date, for the profile header. */
export function tenureLabel(startDate: string | null, todayISO: string): string | null {
  if (!startDate) return null
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const today = Date.parse(`${todayISO}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(today) || today < start) return null
  const months = Math.floor((today - start) / (30.44 * 86_400_000))
  if (months < 1) return 'New this month'
  if (months < 12) return `${months} mo`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem === 0 ? `${years} yr` : `${years} yr ${rem} mo`
}
