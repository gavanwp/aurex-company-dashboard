import type { Metadata } from 'next'
import { Building2 } from 'lucide-react'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { PageHeader } from '@aurexos/ui/components/page-header'

export const metadata: Metadata = { title: 'Clients' }

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description="The agencies and companies you work with." />
      <EmptyState
        icon={Building2}
        title="This module is being built"
        description="The Clients module will appear here soon."
      />
    </div>
  )
}
