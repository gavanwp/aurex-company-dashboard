// Public surface of modules/projects (13_Folder_Structure.md §3) — the ONLY
// file other modules and routes may import from this module.

export { ProjectsView } from './components/projects-view'
export { ProjectCreateDialog } from './components/project-create-dialog'
export { ProjectDetail } from './components/project-detail'
export { ProjectStatusBadge } from './components/project-status-badge'
export { getProjects, getProject, getClientOptions } from './queries/get-projects'
export type { ClientOption, ProjectDetailData, ProjectListRow } from './types'
