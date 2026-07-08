import type { Metadata } from 'next'
import { FolderKanban } from 'lucide-react'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { PageHeader } from '@aurexos/ui/components/page-header'

export const metadata: Metadata = { title: 'Projects' }

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Plan and deliver client work." />
      <EmptyState
        icon={FolderKanban}
        title="This module is being built"
        description="The Projects module will appear here soon."
      />
    </div>
  )
}
