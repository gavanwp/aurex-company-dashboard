// Public surface of modules/team (13_Folder_Structure.md §3). Pages and other
// modules reach this module only through this file.

export { TeamOverviewPanel } from './components/team-overview'
export { TeamDirectory } from './components/team-directory'
export { MemberDetailView } from './components/member-detail'
export { MemberProfileForm } from './components/member-profile-form'
export { LeaveBoard } from './components/leave-board'
export { LeaveRequestForm } from './components/leave-request-form'

export {
  getTeamDirectory,
  getMemberDetail,
  getLeaveRequests,
  getTeamOverview,
  getMemberOptions,
  type GetDirectoryFilters,
  type GetLeaveFilters,
} from './queries/get-team'

export { canManageTeam, canViewTeam, canViewCompensation } from './actions/team-access'

export {
  isLeaveStatusTab,
  LEAVE_STATUS_TABS,
  type DirectoryMember,
  type LeaveRow,
  type LeaveStatusTab,
  type MemberDetail,
  type MemberOption,
  type TeamOverview,
} from './types'
