// Public surface of modules/contracts (13_Folder_Structure.md §3). Pages and
// other modules reach this module only through this file. getRenewalRadar +
// RenewalRadar are exported for reuse on a dashboard / lifecycle widget.

export { ContractsList } from './components/contracts-list'
export { RenewalRadarPanel } from './components/renewal-radar'
export { ContractBuilder } from './components/contract-builder'
export { ContractFromProposal } from './components/contract-from-proposal'
export { ContractDetailView } from './components/contract-detail'
export { PublicContractView } from './components/public-contract-view'

export {
  getContract,
  getContracts,
  getContractFormOptions,
  getContractMemberOptions,
  getObligations,
  getRenewalRadar,
  type ContractMemberOption,
  type GetContractsFilters,
} from './queries/get-contracts'

export { getPublicContract, signContractByToken } from './lib/public-access'

export { canManageContracts, canViewContracts } from './actions/contracts-access'

export { createContractFromProposal } from './actions/convert-actions'

export {
  isContractStatusTab,
  type ContractDetail,
  type ContractFormOptions,
  type ContractListRow,
  type ContractStatusTab,
  type ObligationRow,
  type PublicContract,
  type RenewalRadar,
  type RenewalRadarItem,
} from './types'
