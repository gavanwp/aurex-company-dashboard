// Public surface of modules/access — People & Access administration.

export { PeopleAccess } from './components/people-access'
export {
  getRoster,
  getPendingInvitations,
  getAssignableRoles,
  type RosterRow,
  type InvitationRow,
  type AssignableRole,
} from './queries/get-access'
export { canManageAccess, canViewAccess } from './actions/access-guards'
