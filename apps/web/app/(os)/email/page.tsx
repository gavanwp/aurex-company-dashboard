import type { Metadata } from 'next'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  EmailCenterView,
  getEmailLinkOptions,
  getMailboxConnections,
  getThread,
  getThreads,
  isEmailStatusTab,
} from '@/modules/email'

export const metadata: Metadata = { title: 'Email' }

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; thread?: string }>
}) {
  const { status, thread } = await searchParams
  const ctx = await getWorkspaceContext()

  const statusTab = isEmailStatusTab(status) ? status : 'all'

  const [threads, connections, options, selected] = await Promise.all([
    getThreads(ctx, statusTab === 'all' ? {} : { status: statusTab }),
    getMailboxConnections(ctx),
    getEmailLinkOptions(ctx),
    thread ? getThread(ctx, thread) : Promise.resolve(null),
  ])

  return (
    <EmailCenterView
      threads={threads}
      selected={selected}
      connections={connections}
      options={options}
      statusTab={statusTab}
    />
  )
}
