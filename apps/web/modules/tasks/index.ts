// Public surface of modules/tasks (13_Folder_Structure.md §3) — the ONLY
// file other modules and routes may import from this module.

export { TaskList } from './components/task-list'
export type { TaskListProps } from './components/task-list'
export { TaskCreateDialog } from './components/task-create-dialog'
export { TaskFilterTabs, type TaskFilter } from './components/task-filter-tabs'
export { createTask } from './actions/task-actions'
export { getTasks, getMembers, getProjectOptions } from './queries/get-tasks'
export type { TaskFilters } from './queries/get-tasks'
export type { MemberOption, ProjectOption, TaskRow } from './types'
