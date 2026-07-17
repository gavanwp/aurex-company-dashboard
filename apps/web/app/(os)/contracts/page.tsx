import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ContractStatus, ContractType } from '@aurexos/core'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageContracts,
  canViewContracts,
  ContractsList,
  getContracts,
  getRenewalRadar,
  isContractStatusTab,
  RenewalRadarPanel,
  type GetContractsFilters,
} from '@/modules/contracts'

export const metadata: Metadata = { title: 'Contracts' }

const CONTRACT_TYPES: readonly string[] = ['msa', 'sow', 'nda', 'retainer', 'employment', 'custom']

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; search?: string }>
}) {
  const [{ status, type, search }, ctx] = await Promise.all([searchParams, getWorkspaceContext()])
  if (!(await canViewContracts(ctx))) notFound()

  const statusTab = isContractStatusTab(status) ? status : 'all'
  const typeFilter = type && CONTRACT_TYPES.includes(type) ? type : 'all'

  const filters: GetContractsFilters = {}
  if (statusTab !== 'all') filters.status = statusTab as ContractStatus
  if (typeFilter !== 'all') filters.type = typeFilter as ContractType
  if (search) filters.search = search

  const [contracts, radar] = await Promise.all([getContracts(ctx, filters), getRenewalRadar(ctx)])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Contracts"
        description="Draft, send and track contracts — from signature to renewal."
      />
      <RenewalRadarPanel radar={radar} />
      <ContractsList
        contracts={contracts}
        statusTab={statusTab}
        typeFilter={typeFilter}
        search={search ?? ''}
        canManage={await canManageContracts(ctx)}
      />
    </div>
  )
}
