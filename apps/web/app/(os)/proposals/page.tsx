import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ProposalStatus } from '@aurexos/core'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageProposals,
  canViewProposals,
  getProposals,
  isProposalStatusTab,
  ProposalsList,
  type GetProposalsFilters,
} from '@/modules/proposals'

export const metadata: Metadata = { title: 'Proposals' }

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const [{ status, search }, ctx] = await Promise.all([searchParams, getWorkspaceContext()])
  if (!canViewProposals(ctx.role)) notFound()

  const statusTab = isProposalStatusTab(status) ? status : 'all'
  const filters: GetProposalsFilters = {}
  if (statusTab !== 'all') filters.status = statusTab as ProposalStatus
  if (search) filters.search = search

  const proposals = await getProposals(ctx, filters)

  return (
    <ProposalsList
      proposals={proposals}
      statusTab={statusTab}
      search={search ?? ''}
      canManage={canManageProposals(ctx.role)}
    />
  )
}
