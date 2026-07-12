import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageProposals,
  getProposal,
  getProposalFormOptions,
  ProposalBuilder,
} from '@/modules/proposals'

export const metadata: Metadata = { title: 'Edit proposal' }

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ proposalId: string }>
}) {
  const [{ proposalId }, ctx] = await Promise.all([params, getWorkspaceContext()])
  if (!canManageProposals(ctx.role)) notFound()

  const [proposal, options] = await Promise.all([
    getProposal(ctx, proposalId),
    getProposalFormOptions(ctx),
  ])
  if (!proposal) notFound()
  // Sent proposals are immutable — bounce back to the read-only detail.
  if (proposal.status !== 'draft' && proposal.status !== 'internal_review') {
    redirect(`/proposals/${proposalId}`)
  }

  return <ProposalBuilder mode="edit" options={options} proposal={proposal} />
}
