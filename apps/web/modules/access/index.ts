// Public surface of modules/access — People & Access administration.

export { PeopleAccess } from './components/people-access'
export { RolesCatalog } from './components/roles-catalog'
export {
  getRoster,
  getPendingInvitations,
  getAssignableRoles,
  type RosterRow,
  type InvitationRow,
  type AssignableRole,
} from './queries/get-access'
export { getRolesCatalog, type RoleCatalogRow } from './queries/get-roles'
export { canManageAccess, canViewAccess, canViewRoles } from './actions/access-guards'
