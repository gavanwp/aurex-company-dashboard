import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageFinance,
  getFinanceFormOptions,
  getNextInvoiceNumber,
  InvoiceForm,
} from '@/modules/finance'

export const metadata: Metadata = { title: 'New invoice' }

export default async function NewInvoicePage() {
  const ctx = await getWorkspaceContext()
  if (!canManageFinance(ctx.role)) notFound()

  const [options, suggestedNumber] = await Promise.all([
    getFinanceFormOptions(ctx),
    getNextInvoiceNumber(ctx),
  ])

  return <InvoiceForm mode="create" options={options} suggestedNumber={suggestedNumber} />
}
