import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { AutomationBuilder, canManageAutomations } from '@/modules/automations'

export const metadata: Metadata = { title: 'New automation' }

export default async function NewAutomationPage() {
  const ctx = await getWorkspaceContext()
  if (!canManageAutomations(ctx.role)) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="New automation"
        description="Pick a trigger, add actions, and save it as a draft. Nothing runs until you activate it."
      />
      <AutomationBuilder />
    </div>
  )
}
