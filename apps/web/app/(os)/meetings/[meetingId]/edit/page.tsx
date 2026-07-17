import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageMeetings,
  getMeeting,
  getMeetingFormOptions,
  MeetingForm,
} from '@/modules/meetings'

export const metadata: Metadata = { title: 'Edit meeting' }

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ meetingId: string }>
}) {
  const [{ meetingId }, ctx] = await Promise.all([params, getWorkspaceContext()])
  if (!(await canManageMeetings(ctx))) notFound()

  const [meeting, options] = await Promise.all([
    getMeeting(ctx, meetingId),
    getMeetingFormOptions(ctx),
  ])
  if (!meeting) notFound()

  return <MeetingForm mode="edit" options={options} meeting={meeting} />
}
