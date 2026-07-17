import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { AutomationStatus } from '@aurexos/core'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { isAiConfigured } from '@/lib/env'
import {
  AutomationAssistant,
  AutomationOverviewPanel,
  AutomationsList,
  canManageAutomations,
  canViewAutomations,
  getAutomationOverview,
  getAutomations,
  isAutomationStatusTab,
  RecipeGallery,
  type GetAutomationsFilters,
} from '@/modules/automations'

export const metadata: Metadata = { title: 'Automation' }

export default async function AutomationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const [{ status, search }, ctx] = await Promise.all([searchParams, getWorkspaceContext()])
  if (!(await canViewAutomations(ctx))) notFound()

  const statusTab = isAutomationStatusTab(status) ? status : 'all'
  const filters: GetAutomationsFilters = {}
  if (statusTab !== 'all') filters.status = statusTab as AutomationStatus
  if (search) filters.search = search

  const [automations, overview] = await Promise.all([
    getAutomations(ctx, filters),
    getAutomationOverview(ctx),
  ])

  const canManage = await canManageAutomations(ctx)
  const nowMs = Date.now()

  return (
    <div className="space-y-8">
      <PageHeader
        title="Automation"
        description="React to what happens in your workspace — Aurex can answer questions and draft automations for you."
      />
      <AutomationOverviewPanel overview={overview} />
      <AutomationAssistant aiConfigured={isAiConfigured()} canManage={canManage} />
      {overview.total === 0 ? <RecipeGallery canManage={canManage} /> : null}
      <AutomationsList
        automations={automations}
        statusTab={statusTab}
        search={search ?? ''}
        canManage={canManage}
        nowMs={nowMs}
      />
    </div>
  )
}
