import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageProposals,
  canViewProposals,
  getProposal,
  ProposalDetailView,
} from '@/modules/proposals'

export const metadata: Metadata = { title: 'Proposal' }

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ proposalId: string }>
}) {
  const [{ proposalId }, ctx] = await Promise.all([params, getWorkspaceContext()])
  if (!canViewProposals(ctx.role)) notFound()

  const proposal = await getProposal(ctx, proposalId)
  if (!proposal) notFound()

  return <ProposalDetailView proposal={proposal} canManage={canManageProposals(ctx.role)} />
}
