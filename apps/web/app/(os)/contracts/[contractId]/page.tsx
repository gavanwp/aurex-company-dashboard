import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageContracts,
  canViewContracts,
  ContractDetailView,
  getContract,
  getContractMemberOptions,
} from '@/modules/contracts'

export const metadata: Metadata = { title: 'Contract' }

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>
}) {
  const [{ contractId }, ctx] = await Promise.all([params, getWorkspaceContext()])
  if (!canViewContracts(ctx.role)) notFound()

  const [contract, members] = await Promise.all([
    getContract(ctx, contractId),
    getContractMemberOptions(ctx),
  ])
  if (!contract) notFound()

  return (
    <ContractDetailView
      contract={contract}
      members={members}
      workspaceName={ctx.workspace.name}
      canManage={canManageContracts(ctx.role)}
    />
  )
}
