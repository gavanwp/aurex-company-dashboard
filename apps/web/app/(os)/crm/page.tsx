import type { Metadata } from 'next'
import { Handshake } from 'lucide-react'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { PageHeader } from '@aurexos/ui/components/page-header'

export const metadata: Metadata = { title: 'CRM' }

export default function CrmPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="CRM" description="Contacts, deals and your pipeline." />
      <EmptyState
        icon={Handshake}
        title="This module is being built"
        description="The CRM module will appear here soon."
      />
    </div>
  )
}
