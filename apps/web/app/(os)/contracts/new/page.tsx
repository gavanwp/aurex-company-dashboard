import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageContracts,
  ContractBuilder,
  ContractFromProposal,
  getContractFormOptions,
} from '@/modules/contracts'

export const metadata: Metadata = { title: 'New contract' }

export default async function NewContractPage() {
  const ctx = await getWorkspaceContext()
  if (!canManageContracts(ctx.role)) notFound()

  const options = await getContractFormOptions(ctx)

  return (
    <div className="space-y-4">
      <ContractFromProposal proposals={options.proposals} />
      <ContractBuilder mode="create" options={options} />
    </div>
  )
}
