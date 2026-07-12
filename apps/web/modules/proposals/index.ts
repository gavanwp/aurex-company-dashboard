// Public surface of modules/proposals (13_Folder_Structure.md §3). Pages and
// other modules reach this module only through this file.

export { ProposalsList } from './components/proposals-list'
export { ProposalBuilder } from './components/proposal-builder'
export { ProposalDetailView } from './components/proposal-detail'
export { PublicProposalView } from './components/public-proposal-view'

export {
  getProposal,
  getProposalFormOptions,
  getProposals,
  type GetProposalsFilters,
} from './queries/get-proposals'

export { acceptProposalByToken, getPublicProposal, recordProposalView } from './lib/public-access'

export { canManageProposals, canViewProposals } from './actions/proposals-access'

export {
  isProposalStatusTab,
  type ProposalDetail,
  type ProposalFormOptions,
  type ProposalListRow,
  type ProposalStatusTab,
  type PublicProposal,
} from './types'
