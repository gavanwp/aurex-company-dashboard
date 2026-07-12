import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageMeetings,
  canViewMeetings,
  getMeeting,
  getMeetingFormOptions,
  getPreMeetingBrief,
  MeetingDetailView,
} from '@/modules/meetings'

export const metadata: Metadata = { title: 'Meeting' }

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>
}) {
  const [{ meetingId }, ctx] = await Promise.all([params, getWorkspaceContext()])
  if (!canViewMeetings(ctx.role)) notFound()

  const meeting = await getMeeting(ctx, meetingId)
  if (!meeting) notFound()

  const [brief, options] = await Promise.all([
    getPreMeetingBrief(ctx, meetingId),
    getMeetingFormOptions(ctx),
  ])

  return (
    <MeetingDetailView
      meeting={meeting}
      brief={brief}
      members={options.members}
      canManage={canManageMeetings(ctx.role)}
    />
  )
}
