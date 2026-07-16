import type {
  CompPeriod,
  EmploymentType,
  HrSkill,
  LeaveStatus,
  LeaveType,
  MemberSpecialization,
  WorkspaceRole,
} from '@aurexos/core'

// Module-local view types (13_Folder_Structure.md §3): the shapes the Team UI
// renders. Domain schemas live in packages/core; these are read-model rows.

/** Compensation, surfaced only to Owner/HR/Finance (field-level rule). */
export interface MemberComp {
  amountMinor: number | null
  currency: string
  period: CompPeriod | null
}

/** One person in the directory: membership + optional HR profile, folded flat. */
export interface DirectoryMember {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  role: WorkspaceRole
  specialization: MemberSpecialization | null
  /** Present once an HR profile exists for the member. */
  hasProfile: boolean
  title: string | null
  employmentType: EmploymentType | null
  location: string | null
  timezone: string | null
  startDate: string | null
  skills: HrSkill[]
  weeklyCapacityHours: number | null
  managerId: string | null
  managerName: string | null
  /** True when the member has an approved leave covering today. */
  onLeaveToday: boolean
}

export interface MemberDetail extends DirectoryMember {
  phone: string | null
  bio: string | null
  /** Non-null only when the viewer may see compensation. */
  comp: MemberComp | null
  reports: Array<{ userId: string; name: string; title: string | null; avatarUrl: string | null }>
  leave: LeaveRow[]
}

export interface LeaveRow {
  id: string
  userId: string
  userName: string
  avatarUrl: string | null
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  status: LeaveStatus
  reason: string | null
  decidedByName: string | null
  decidedAt: string | null
  decisionNote: string | null
  createdAt: string
}

export interface TeamOverview {
  headcount: number
  profiledCount: number
  onLeaveToday: number
  pendingLeave: number
  avgWeeklyCapacity: number | null
  specializationCounts: Array<{ specialization: MemberSpecialization; count: number }>
}

export interface MemberOption {
  userId: string
  name: string
}

/** Directory tab keys — filter by specialization or leave status view. */
export const LEAVE_STATUS_TABS = ['pending', 'approved', 'all'] as const
export type LeaveStatusTab = (typeof LEAVE_STATUS_TABS)[number]

export function isLeaveStatusTab(value: string | undefined): value is LeaveStatusTab {
  return value === 'pending' || value === 'approved' || value === 'all'
}
