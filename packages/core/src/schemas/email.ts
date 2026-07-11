import { z } from 'zod'

// Email Center (0012) — 06_Module_Breakdown.md §8. Enum values mirror the
// text + CHECK constraints in supabase/migrations/0012_email_center.sql
// (DatabaseArchitecture.md C11). The const arrays live here (not types/index)
// because this module ships as a self-contained schema unit; changing a value
// requires a migration in the same PR (12_Project_Rules.md).

export const MAILBOX_PROVIDERS = ['gmail', 'microsoft', 'manual'] as const
export type MailboxProvider = (typeof MAILBOX_PROVIDERS)[number]

export const MAILBOX_STATUSES = ['connected', 'error', 'disconnected'] as const
export type MailboxStatus = (typeof MAILBOX_STATUSES)[number]

export const MAILBOX_SHARING_POLICIES = ['private', 'shared'] as const
export type MailboxSharingPolicy = (typeof MAILBOX_SHARING_POLICIES)[number]

export const EMAIL_THREAD_STATUSES = ['open', 'waiting', 'closed'] as const
export type EmailThreadStatus = (typeof EMAIL_THREAD_STATUSES)[number]

export const EMAIL_THREAD_VISIBILITIES = ['private', 'workspace'] as const
export type EmailThreadVisibility = (typeof EMAIL_THREAD_VISIBILITIES)[number]

export const EMAIL_DIRECTIONS = ['inbound', 'outbound'] as const
export type EmailDirection = (typeof EMAIL_DIRECTIONS)[number]

// Governs email_threads.participants (0012).
export const EmailParticipantSchema = z.object({
  name: z.string().max(200).optional(),
  email: z.string().email(),
})
export type EmailParticipant = z.infer<typeof EmailParticipantSchema>

export const EmailParticipantsSchema = z.array(EmailParticipantSchema)
export type EmailParticipants = z.infer<typeof EmailParticipantsSchema>

// Governs email_messages.to_addresses / cc_addresses (0012).
export const EmailAddressListSchema = z.array(z.string().email())
export type EmailAddressList = z.infer<typeof EmailAddressListSchema>

export const MailboxConnectionSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  provider: z.enum(MAILBOX_PROVIDERS),
  address: z.string().email(),
  displayName: z.string().max(160).nullable(),
  status: z.enum(MAILBOX_STATUSES),
  syncCursor: z.string().nullable(),
  sharingPolicy: z.enum(MAILBOX_SHARING_POLICIES),
  // oauth_token_ciphertext is deliberately absent: tokens never leave the
  // server-only integration module (SecurityArchitecture.md §4.3 / S4).
  lastSyncedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type MailboxConnection = z.infer<typeof MailboxConnectionSchema>

export const EmailThreadSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  subject: z.string().min(1).max(500),
  snippet: z.string().max(500).nullable(),
  participants: EmailParticipantsSchema,
  lastMessageAt: z.string().nullable(),
  messageCount: z.number().int().nonnegative(),
  status: z.enum(EMAIL_THREAD_STATUSES),
  visibility: z.enum(EMAIL_THREAD_VISIBILITIES),
  mailboxConnectionId: z.string().uuid().nullable(),
  clientId: z.string().uuid().nullable(),
  contactId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  dealId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type EmailThread = z.infer<typeof EmailThreadSchema>

export const EmailMessageSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  threadId: z.string().uuid(),
  direction: z.enum(EMAIL_DIRECTIONS),
  fromAddress: z.string().email(),
  toAddresses: EmailAddressListSchema,
  ccAddresses: EmailAddressListSchema,
  subject: z.string().max(500).nullable(),
  bodyText: z.string().nullable(),
  bodyHtmlSanitized: z.string().nullable(),
  providerMessageId: z.string().nullable(),
  sentAt: z.string().nullable(),
  isDraft: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type EmailMessage = z.infer<typeof EmailMessageSchema>

export const CreateThreadInput = z.object({
  subject: z.string().min(1, 'Subject is required').max(500),
  participants: EmailParticipantsSchema.default([]),
  visibility: z.enum(EMAIL_THREAD_VISIBILITIES).default('private'),
  clientId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
})
export type CreateThreadInput = z.infer<typeof CreateThreadInput>

// The v1 workhorse: manually log a client email against CRM/project records.
export const LogEmailInput = z.object({
  threadId: z.string().uuid().nullable().optional(), // log into an existing thread
  direction: z.enum(EMAIL_DIRECTIONS),
  fromAddress: z.string().email('Enter a valid from address'),
  toAddresses: EmailAddressListSchema.min(1, 'At least one recipient is required'),
  ccAddresses: EmailAddressListSchema.default([]),
  subject: z.string().min(1, 'Subject is required').max(500),
  bodyText: z.string().min(1, 'Email body is required').max(100_000),
  occurredAt: z.string(), // ISO datetime the email was actually sent/received
  clientId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
})
export type LogEmailInput = z.infer<typeof LogEmailInput>

// Drafts are stored as is_draft messages on a thread; sending is disabled in
// v1 (no mailbox transport yet — outbound send arrives with the sync worker).
export const ComposeDraftInput = z.object({
  threadId: z.string().uuid(),
  bodyText: z.string().min(1, 'Draft body is required').max(100_000),
  subject: z.string().max(500).optional(),
})
export type ComposeDraftInput = z.infer<typeof ComposeDraftInput>

export const LinkThreadInput = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
})
export type LinkThreadInput = z.infer<typeof LinkThreadInput>

export const UpdateThreadStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(EMAIL_THREAD_STATUSES),
})
export type UpdateThreadStatusInput = z.infer<typeof UpdateThreadStatusInput>

export const ShareThreadInput = z.object({
  id: z.string().uuid(),
  visibility: z.enum(EMAIL_THREAD_VISIBILITIES),
})
export type ShareThreadInput = z.infer<typeof ShareThreadInput>
