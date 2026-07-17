import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { AutomationBuilder, canManageAutomations, getAutomation } from '@/modules/automations'

export const metadata: Metadata = { title: 'Edit automation' }

export default async function EditAutomationPage({
  params,
}: {
  params: Promise<{ automationId: string }>
}) {
  const [{ automationId }, ctx] = await Promise.all([params, getWorkspaceContext()])
  if (!canManageAutomations(ctx.role)) notFound()

  const automation = await getAutomation(ctx, automationId)
  if (!automation) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={`Edit ${automation.name}`}
        description="Adjust the trigger, actions, or failure handling."
      />
      <AutomationBuilder automation={automation} />
    </div>
  )
}
