// Public surface of modules/crm (13_Folder_Structure.md §3).

export { CrmView, type CrmTab } from './components/crm-view'
export { getClientOptions, getContacts, getDeals, getPipelineSummary } from './queries/get-crm'
export type {
  ClientOption,
  ContactRow,
  DealRow,
  PipelineSummary,
  StageSummary,
} from './types'
