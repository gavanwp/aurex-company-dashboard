import type { Metadata } from 'next'
import { LayoutDashboard } from 'lucide-react'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { PageHeader } from '@aurexos/ui/components/page-header'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Your agency at a glance." />
      <EmptyState
        icon={LayoutDashboard}
        title="This module is being built"
        description="The Dashboard module will appear here soon."
      />
    </div>
  )
}
