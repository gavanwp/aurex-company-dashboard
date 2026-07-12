// Public surface of modules/meetings (13_Folder_Structure.md §3) — the ONLY file
// other modules and routes may import from this module. getUpcomingMeetings +
// UpcomingMeetingRow are exported for reuse on the dashboard / calendar rail.

export { MeetingsList } from './components/meetings-list'
export type { MeetingsListProps } from './components/meetings-list'
export { MeetingForm } from './components/meeting-form'
export { MeetingDetailView } from './components/meeting-detail'
export { PreMeetingBriefPanel } from './components/pre-meeting-brief'
export { DecisionLog } from './components/decision-log'

export {
  getMeetings,
  getMeeting,
  getMeetingFormOptions,
  getDecisionLog,
  getClientMeetingTimeline,
  getPreMeetingBrief,
  getUpcomingMeetings,
  type GetMeetingsFilters,
  type UpcomingMeetingRow,
} from './queries/get-meetings'

export { canManageMeetings, canViewMeetings } from './actions/meetings-access'

export {
  isMeetingTypeTab,
  MEETING_TYPE_TABS,
  MEETING_STATUS_META,
  MEETING_TYPE_META,
  ACTION_ITEM_STATUS_META,
  type ActionItemRow,
  type AttendeeRef,
  type DecisionRow,
  type MeetingDetail,
  type MeetingFormOptions,
  type MeetingListRow,
  type MeetingMemberOption,
  type MeetingTypeTab,
  type PreMeetingBrief,
} from './types'
