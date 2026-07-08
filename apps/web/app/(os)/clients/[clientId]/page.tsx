import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { ClientDetail, getClient } from '@/modules/clients'

export const metadata: Metadata = { title: 'Client' }

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const ctx = await getWorkspaceContext()
  const client = await getClient(ctx, clientId)
  if (!client) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title={client.name} description="Client overview." />
      <ClientDetail client={client} />
    </div>
  )
}
