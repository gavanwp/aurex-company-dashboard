import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageContracts,
  ContractBuilder,
  getContract,
  getContractFormOptions,
} from '@/modules/contracts'

export const metadata: Metadata = { title: 'Edit contract' }

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ contractId: string }>
}) {
  const [{ contractId }, ctx] = await Promise.all([params, getWorkspaceContext()])
  if (!canManageContracts(ctx.role)) notFound()

  const [contract, options] = await Promise.all([
    getContract(ctx, contractId),
    getContractFormOptions(ctx),
  ])
  if (!contract) notFound()
  // Sent contracts are immutable — bounce back to the read-only detail.
  if (contract.status !== 'draft' && contract.status !== 'review') {
    redirect(`/contracts/${contractId}`)
  }

  return <ContractBuilder mode="edit" options={options} contract={contract} />
}
