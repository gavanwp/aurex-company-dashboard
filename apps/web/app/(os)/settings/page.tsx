import type { Metadata } from 'next'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { WorkspaceSettings } from '@/modules/settings'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const ctx = await getWorkspaceContext()

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Workspace, members, and permissions." />
      <WorkspaceSettings ctx={ctx} />
    </div>
  )
}
