import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { canManageFinance, getFinanceFormOptions, getInvoice, InvoiceForm } from '@/modules/finance'

export const metadata: Metadata = { title: 'Edit invoice' }

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  const [{ invoiceId }, ctx] = await Promise.all([params, getWorkspaceContext()])
  if (!(await canManageFinance(ctx))) notFound()

  const [invoice, options] = await Promise.all([
    getInvoice(ctx, invoiceId),
    getFinanceFormOptions(ctx),
  ])
  if (!invoice) notFound()
  // Immutability: only drafts are editable — anything else redirects to the
  // read-only detail (void & reissue is the path to change a sent invoice).
  if (invoice.status !== 'draft') redirect(`/finance/invoices/${invoiceId}`)

  return <InvoiceForm mode="edit" options={options} invoice={invoice} />
}
