// Public surface of modules/email (13_Folder_Structure.md §3).

export { EmailCenterView } from './components/email-center-view'
export {
  GMAIL_CONNECTED_COPY,
  isEmailStatusTab,
  mapGmailErrorCode,
  type EmailStatusTab,
} from './types'
export { ConnectMailboxCard } from './components/connect-mailbox-card'
export { LogEmailDialog } from './components/log-email-dialog'
export {
  getEmailLinkOptions,
  getMailboxConnections,
  getThread,
  getThreads,
  type GetThreadsFilters,
} from './queries/get-email'
// Server-only Gmail sync engine, exposed for the OAuth callback route handler.
export { GmailSyncError, syncMailbox, type SyncMailboxResult } from './lib/gmail-sync'
export type {
  EmailLinkOptions,
  LinkOption,
  MailboxConnectionRow,
  MessageRow,
  ThreadDetail,
  ThreadRow,
} from './types'
