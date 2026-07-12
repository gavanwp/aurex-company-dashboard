import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { canManageProposals, getProposalFormOptions, ProposalBuilder } from '@/modules/proposals'

export const metadata: Metadata = { title: 'New proposal' }

export default async function NewProposalPage() {
  const ctx = await getWorkspaceContext()
  if (!canManageProposals(ctx.role)) notFound()

  const options = await getProposalFormOptions(ctx)

  return <ProposalBuilder mode="create" options={options} />
}
