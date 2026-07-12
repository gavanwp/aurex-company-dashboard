import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { canViewMeetings, DecisionLog, getDecisionLog } from '@/modules/meetings'

export const metadata: Metadata = { title: 'Decision log' }

export default async function DecisionLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const [{ q }, ctx] = await Promise.all([searchParams, getWorkspaceContext()])
  if (!canViewMeetings(ctx.role)) notFound()

  const decisions = await getDecisionLog(ctx, q)
  return <DecisionLog decisions={decisions} query={q ?? ''} />
}
