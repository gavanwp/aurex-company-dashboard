import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { canManageMeetings, canViewMeetings, getMeetings, MeetingsList } from '@/modules/meetings'
import { isMeetingTypeTab, type MeetingTypeTab } from '@/modules/meetings'

export const metadata: Metadata = { title: 'Meetings' }

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const [{ type }, ctx] = await Promise.all([searchParams, getWorkspaceContext()])
  if (!canViewMeetings(ctx.role)) notFound()

  const typeTab: MeetingTypeTab = isMeetingTypeTab(type) ? type : 'all'
  const meetings = await getMeetings(ctx, { type: typeTab })

  return (
    <MeetingsList meetings={meetings} typeTab={typeTab} canManage={canManageMeetings(ctx.role)} />
  )
}
