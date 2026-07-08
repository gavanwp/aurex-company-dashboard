import type { Metadata } from 'next'
import { ListChecks } from 'lucide-react'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { PageHeader } from '@aurexos/ui/components/page-header'

export const metadata: Metadata = { title: 'Tasks' }

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Everything your team is working on." />
      <EmptyState
        icon={ListChecks}
        title="This module is being built"
        description="The Tasks module will appear here soon."
      />
    </div>
  )
}
