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

// ── Gmail connect-flow notices ───────────────────────────────────────────────
// Human copy for /email?connected=1 and /email?error=gmail_* (ErrorStates.md
// §8 style: what happened → what to do; no raw codes, no Google error bodies).

export const GMAIL_CONNECTED_COPY =
  'Gmail connected — your recent conversations are on the timeline. New threads stay private until you share them.'

const GMAIL_ERROR_COPY: Record<string, string> = {
  gmail_not_configured:
    "Gmail connections aren't available yet — the Google integration hasn't been configured for this workspace.",
  gmail_forbidden: "Portal accounts can't connect a mailbox — ask a workspace member to do it.",
  gmail_state: "We couldn't verify that connection attempt — start the connection again from here.",
  gmail_denied: 'Google access was declined — nothing was connected. Try again whenever you like.',
  gmail_exchange: "Google didn't complete the connection — try connecting again in a moment.",
  gmail_auth: 'Gmail authorization is no longer valid — reconnect your mailbox to resume syncing.',
  gmail_not_connected: "That mailbox isn't connected anymore — connect Gmail to start syncing.",
  gmail_sync_failed:
    'Your mailbox is connected, but the last sync hit a problem — use "Sync now" to retry.',
}

/** Last-resort copy when the failure code is unknown to us. */
export const GMAIL_ERROR_FALLBACK = "Couldn't complete that — try again in a moment."

/** Map a gmail_* error code (e.g. from a callback query param) to human copy. */
export function mapGmailErrorCode(code: string | null | undefined): string | null {
  if (!code || !code.startsWith('gmail_')) return null
  return GMAIL_ERROR_COPY[code] ?? GMAIL_ERROR_FALLBACK
}

export function participantSummary(participants: EmailParticipant[]): string {
  if (participants.length === 0) return 'No participants'
  const names = participants.map((p) => p.name || p.email)
  if (names.length <= 2) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
}
