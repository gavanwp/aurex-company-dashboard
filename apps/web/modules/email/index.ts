// Public surface of modules/email (13_Folder_Structure.md §3).

export { EmailCenterView } from './components/email-center-view'
export { isEmailStatusTab, type EmailStatusTab } from './types'
export { ConnectMailboxCard } from './components/connect-mailbox-card'
export { LogEmailDialog } from './components/log-email-dialog'
export {
  getEmailLinkOptions,
  getMailboxConnections,
  getThread,
  getThreads,
  type GetThreadsFilters,
} from './queries/get-email'
export type {
  EmailLinkOptions,
  LinkOption,
  MailboxConnectionRow,
  MessageRow,
  ThreadDetail,
  ThreadRow,
} from './types'
