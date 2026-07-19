// Public surface of modules/settings (13_Folder_Structure.md §3).

export { WorkspaceSettings } from './components/workspace-settings'
export { SecuritySettings } from './components/security-settings'
export { ProfilePage } from './components/profile-page'
export {
  getProfileOverview,
  type ProfileOverview,
  type ProfileStat,
  type ProfileActivity,
  type ProfileConnection,
} from './queries/get-profile'
export { updateProfile } from './actions/profile-actions'
