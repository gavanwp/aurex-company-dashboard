import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hasPermission } from '@/lib/permissions'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { AssistantView, getAssistantContext } from '@/modules/assistant'

export const metadata: Metadata = { title: 'Aurex' }

export default async function AssistantPage() {
  const ctx = await getWorkspaceContext()
  if (!(await hasPermission(ctx, 'ai.workspace.use'))) notFound()

  const context = await getAssistantContext(ctx)
  return <AssistantView context={context} />
}
