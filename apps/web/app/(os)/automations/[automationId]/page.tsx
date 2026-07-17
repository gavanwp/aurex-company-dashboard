import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  AutomationDetailView,
  canManageAutomations,
  canViewAutomations,
  getAutomation,
  getAutomationRuns,
} from '@/modules/automations'

export const metadata: Metadata = { title: 'Automation' }

export default async function AutomationPage({
  params,
}: {
  params: Promise<{ automationId: string }>
}) {
  const [{ automationId }, ctx] = await Promise.all([params, getWorkspaceContext()])
  if (!canViewAutomations(ctx.role)) notFound()

  const automation = await getAutomation(ctx, automationId)
  if (!automation) notFound()
  const runs = await getAutomationRuns(ctx, automationId)

  return (
    <AutomationDetailView
      automation={automation}
      runs={runs}
      canManage={canManageAutomations(ctx.role)}
      nowMs={Date.now()}
    />
  )
}
