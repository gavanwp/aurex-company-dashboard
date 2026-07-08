import type { Metadata } from 'next'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { CrmView, getClientOptions, getContacts, getDeals, getPipelineSummary } from '@/modules/crm'

export const metadata: Metadata = { title: 'CRM' }

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const ctx = await getWorkspaceContext()

  const [deals, contacts, clients] = await Promise.all([
    getDeals(ctx),
    getContacts(ctx),
    getClientOptions(ctx),
  ])

  return (
    <CrmView
      tab={tab === 'contacts' ? 'contacts' : 'pipeline'}
      deals={deals}
      contacts={contacts}
      clients={clients}
      summary={getPipelineSummary(deals)}
    />
  )
}
