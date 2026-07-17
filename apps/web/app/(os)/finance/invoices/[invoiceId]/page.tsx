import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { canManageFinance, canViewFinance, getInvoice, InvoiceDetailView } from '@/modules/finance'

export const metadata: Metadata = { title: 'Invoice' }

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  const [{ invoiceId }, ctx] = await Promise.all([params, getWorkspaceContext()])
  if (!(await canViewFinance(ctx))) notFound()

  const invoice = await getInvoice(ctx, invoiceId)
  if (!invoice) notFound()

  return <InvoiceDetailView invoice={invoice} canManage={await canManageFinance(ctx)} />
}
