import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { canManageMeetings, getMeetingFormOptions, MeetingForm } from '@/modules/meetings'

export const metadata: Metadata = { title: 'New meeting' }

export default async function NewMeetingPage() {
  const ctx = await getWorkspaceContext()
  if (!(await canManageMeetings(ctx))) notFound()

  const options = await getMeetingFormOptions(ctx)
  return <MeetingForm mode="create" options={options} />
}
