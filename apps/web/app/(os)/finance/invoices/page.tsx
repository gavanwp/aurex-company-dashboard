import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageFinance,
  canViewFinance,
  getInvoices,
  InvoicesList,
  isInvoiceStatusTab,
  type GetInvoicesFilters,
} from '@/modules/finance'

export const metadata: Metadata = { title: 'Invoices' }

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const [{ status, search }, ctx] = await Promise.all([searchParams, getWorkspaceContext()])
  if (!(await canViewFinance(ctx))) notFound()

  const statusTab = isInvoiceStatusTab(status) ? status : 'all'
  const filters: GetInvoicesFilters = {}
  if (statusTab !== 'all') filters.status = statusTab
  if (search) filters.search = search

  const invoices = await getInvoices(ctx, filters)

  return (
    <InvoicesList
      invoices={invoices}
      statusTab={statusTab}
      search={search ?? ''}
      canManage={await canManageFinance(ctx)}
    />
  )
}
