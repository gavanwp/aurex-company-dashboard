import type { Metadata } from 'next'
import { isGmailConfigured } from '@/lib/env'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  EmailCenterView,
  getEmailLinkOptions,
  getMailboxConnections,
  getThread,
  getThreads,
  GMAIL_CONNECTED_COPY,
  isEmailStatusTab,
  mapGmailErrorCode,
} from '@/modules/email'

export const metadata: Metadata = { title: 'Email' }

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; thread?: string; connected?: string; error?: string }>
}) {
  const { status, thread, connected, error } = await searchParams
  const ctx = await getWorkspaceContext()

  const statusTab = isEmailStatusTab(status) ? status : 'all'

  const [threads, connections, options, selected] = await Promise.all([
    getThreads(ctx, statusTab === 'all' ? {} : { status: statusTab }),
    getMailboxConnections(ctx),
    getEmailLinkOptions(ctx),
    thread ? getThread(ctx, thread) : Promise.resolve(null),
  ])

  const errorMessage = mapGmailErrorCode(error)
  const notice = connected
    ? ({ tone: 'success', message: GMAIL_CONNECTED_COPY } as const)
    : errorMessage
      ? ({ tone: 'error', message: errorMessage } as const)
      : null

  return (
    <EmailCenterView
      threads={threads}
      selected={selected}
      connections={connections}
      options={options}
      statusTab={statusTab}
      gmailConfigured={isGmailConfigured()}
      notice={notice}
    />
  )
}
