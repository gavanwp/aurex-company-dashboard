// Client-safe row shapes + labels shared by queries (server) and components
// (client). No I/O here — safe to import from either side.

import type {
  EmailDirection,
  EmailParticipant,
  EmailThreadStatus,
  EmailThreadVisibility,
  MailboxProvider,
  MailboxStatus,
} from '@aurexos/core'

export interface ThreadRow {
  id: string
  subject: string
  snippet: string | null
  participants: EmailParticipant[]
  lastMessageAt: string | null
  messageCount: number
  status: EmailThreadStatus
  visibility: EmailThreadVisibility
  /** True when the viewer owns the linked mailbox (share/privacy controls). */
  isOwned: boolean
  clientId: string | null
  clientName: string | null
  contactId: string | null
  contactName: string | null
  projectId: string | null
  projectName: string | null
  dealId: string | null
  dealName: string | null
}

export interface MessageRow {
  id: string
  direction: EmailDirection
  fromAddress: string
  toAddresses: string[]
  ccAddresses: string[]
  subject: string | null
  bodyText: string | null
  sentAt: string | null
  isDraft: boolean
  createdAt: string
}

export interface ThreadDetail extends ThreadRow {
  messages: MessageRow[]
}

export interface MailboxConnectionRow {
  id: string
  provider: MailboxProvider
  address: string
  displayName: string | null
  status: MailboxStatus
  lastSyncedAt: string | null
}

export interface LinkOption {
  id: string
  name: string
}

export interface EmailLinkOptions {
  clients: LinkOption[]
  contacts: LinkOption[]
  projects: LinkOption[]
  deals: LinkOption[]
}

export const EMAIL_STATUS_TABS = ['all', 'open', 'waiting', 'closed'] as const
export type EmailStatusTab = (typeof EMAIL_STATUS_TABS)[number]

export function isEmailStatusTab(value: string | undefined): value is EmailStatusTab {
  return !!value && (EMAIL_STATUS_TABS as readonly string[]).includes(value)
}

export const THREAD_STATUS_LABELS: Record<EmailThreadStatus, string> = {
  open: 'Open',
  waiting: 'Waiting',
  closed: 'Closed',
}

export const THREAD_STATUS_BADGE_VARIANT: Record<
  EmailThreadStatus,
  'info-soft' | 'warning-soft' | 'success-soft'
> = {
  open: 'info-soft',
  waiting: 'warning-soft',
  closed: 'success-soft',
}

export function participantSummary(participants: EmailParticipant[]): string {
  if (participants.length === 0) return 'No participants'
  const names = participants.map((p) => p.name || p.email)
  if (names.length <= 2) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
}
