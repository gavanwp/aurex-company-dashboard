// Public surface of modules/access — People & Access administration.

export { PeopleAccess } from './components/people-access'
export { RolesCatalog } from './components/roles-catalog'
export { InviteAccept } from './components/invite-accept'
export { getInvitationPreview, type InvitationPreview } from './queries/get-invitation'
export {
  getRoster,
  getPendingInvitations,
  getAssignableRoles,
  type RosterRow,
  type InvitationRow,
  type AssignableRole,
} from './queries/get-access'
export { getRolesCatalog, type RoleCatalogRow } from './queries/get-roles'
export { ApiKeysManager } from './components/api-keys-manager'
export { getApiKeys, type ApiKeyRow } from './queries/get-api-keys'
export { SessionsManager } from './components/sessions-manager'
export {
  getMySessions,
  getMyLoginHistory,
  type SessionRow,
  type LoginEventRow,
} from './queries/get-sessions'
export { MfaManager } from './components/mfa-manager'
export { getMfaStatus, type MfaStatus } from './queries/get-mfa'
export { SecurityCenter } from './components/security-center'
export {
  getSecurityOverview,
  type SecurityOverview,
  type SecurityMember,
} from './queries/get-security-overview'
export {
  canManageAccess,
  canViewAccess,
  canViewRoles,
  canManageApiKeys,
  canViewSecurityCenter,
} from './actions/access-guards'
