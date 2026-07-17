// Public surface of modules/automations (13_Folder_Structure.md §3).

export { AutomationOverviewPanel } from './components/automation-overview'
export { AutomationsList } from './components/automations-list'
export { AutomationBuilder } from './components/automation-builder'
export { AutomationDetailView } from './components/automation-detail'
export { AutomationAssistant } from './components/ai-assistant'
export { RecipeGallery } from './components/recipe-gallery'

export {
  getAutomations,
  getAutomation,
  getAutomationRuns,
  getAutomationOverview,
  type GetAutomationsFilters,
} from './queries/get-automations'

export { canManageAutomations, canViewAutomations } from './actions/automations-access'

export {
  isAutomationStatusTab,
  AUTOMATION_STATUS_TABS,
  type AutomationDetail,
  type AutomationListRow,
  type AutomationOverview,
  type AutomationStatusTab,
  type RunRow,
} from './types'
