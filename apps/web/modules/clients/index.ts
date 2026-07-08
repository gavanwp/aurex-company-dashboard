// Public surface of modules/clients (13_Folder_Structure.md §3).

export { ClientDetail } from './components/client-detail'
export { ClientDialog } from './components/client-dialog'
export { ClientsTable } from './components/clients-table'
export { getClient, getClients } from './queries/get-clients'
export type {
  ClientContactRow,
  ClientDealRow,
  ClientDetailData,
  ClientProjectRow,
  ClientRow,
} from './types'
