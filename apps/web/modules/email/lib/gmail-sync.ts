import 'server-only'

import { z } from 'zod'
import type { EmailParticipant } from '@aurexos/core'
import type { Tables, TablesInsert, TablesUpdate } from '@aurexos/db'
import { emitDomainEvent, writeAudit } from '@/lib/action-kit'
import { GmailOAuthError, refreshGmailAccessToken } from '@/lib/gmail-oauth'
import {
  decryptTokenBundle,
  encryptTokenBundle,
  MailboxCryptoError,
  type MailboxTokenBundle,
} from '@/lib/mailbox-crypto'
import type { WorkspaceContext } from '@/lib/workspace-context'

/**
 * Gmail mailbox sync engine (read-only increment) — server-only.
 *
 * Runs as a system write on behalf of the connecting user: it uses the
 * caller's Supabase client, so RLS (0012) applies exactly as if the owner did
 * it, and audit entries carry the owner as actor with a 'gmail sync' note.
 *
 * Thread dedup (ZERO-migration approach, documented per the storage contract):
 * email_messages.provider_message_id stores "<gmailThreadId>:<gmailMessageId>".
 * A Gmail thread's AurexOS thread is found by looking up any existing message
 * whose provider_message_id starts with "<gmailThreadId>:"; individual
 * messages dedupe on the full composite id. No schema change needed — the
 * partial index on (workspace_id, provider_message_id) from 0012 covers both.
 *
 * Tokens are decrypted here and ONLY here, held in locals, and never placed in
 * logs, Error messages, audit rows, or domain event payloads (register S4).
 */

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1'
const SYNC_QUERY = 'in:inbox OR in:sent'
const BODY_MAX_CHARS = 100_000

export type GmailSyncErrorCode =
  'gmail_auth' | 'gmail_sync_failed' | 'gmail_not_connected' | 'gmail_not_configured'

export class GmailSyncError extends Error {
  readonly code: GmailSyncErrorCode
  constructor(code: GmailSyncErrorCode, message: string) {
    super(message)
    this.name = 'GmailSyncError'
    this.code = code
  }
}

export interface SyncMailboxOptions {
  maxThreads?: number
}

export interface SyncMailboxResult {
  threadsImported: number
  messagesImported: number
}

// ── Gmail REST response shapes ───────────────────────────────────────────────

interface GmailPart {
  mimeType?: string
  headers?: Array<{ name?: string; value?: string }>
  body?: { data?: string }
  parts?: GmailPart[]
}

const GmailPartSchema: z.ZodType<GmailPart> = z.lazy(() =>
  z.object({
    mimeType: z.string().optional(),
    headers: z
      .array(z.object({ name: z.string().optional(), value: z.string().optional() }))
      .optional(),
    body: z.object({ data: z.string().optional() }).optional(),
    parts: z.array(GmailPartSchema).optional(),
  }),
)

const GmailMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  labelIds: z.array(z.string()).optional(),
  snippet: z.string().optional(),
  internalDate: z.string().optional(),
  payload: GmailPartSchema.optional(),
})
type GmailMessage = z.infer<typeof GmailMessageSchema>

const ThreadsListSchema = z.object({
  threads: z.array(z.object({ id: z.string() })).optional(),
})

const ThreadGetSchema = z.object({
  id: z.string(),
  messages: z.array(GmailMessageSchema).optional(),
})

const ProfileSchema = z.object({
  emailAddress: z.string().optional(),
  historyId: z.union([z.string(), z.number()]).optional(),
})

// ── Gmail REST client (typed, error-mapped, token never logged) ─────────────

async function gmailGet<T>(
  schema: z.ZodType<T>,
  accessToken: string,
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : ''
  let response: Response
  try {
    response = await fetch(`${GMAIL_API_BASE}${path}${qs}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    })
  } catch {
    throw new GmailSyncError('gmail_sync_failed', 'Could not reach the Gmail API.')
  }
  if (response.status === 401) {
    throw new GmailSyncError('gmail_auth', 'Gmail rejected the access token.')
  }
  if (!response.ok) {
    // Status code only — Google error bodies are never propagated.
    throw new GmailSyncError('gmail_sync_failed', `Gmail API returned ${response.status}.`)
  }
  const parsed = schema.safeParse(await response.json())
  if (!parsed.success) {
    throw new GmailSyncError('gmail_sync_failed', 'Gmail API response had an unexpected shape.')
  }
  return parsed.data
}

// ── Message parsing helpers ──────────────────────────────────────────────────

function header(message: GmailMessage, name: string): string | null {
  const headers = message.payload?.headers ?? []
  const match = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
  return match?.value ?? null
}

const EMAIL_IN_ANGLE = /<\s*([^<>\s]+@[^<>\s]+)\s*>/
const BARE_EMAIL = /([^\s<>,;:"'()]+@[^\s<>,;:"'()]+)/

function isEmail(value: string): boolean {
  return z.string().email().safeParse(value).success
}

/** Parse an RFC-5322 address-list header into {name?, email} participants. */
function parseAddressHeader(value: string | null): EmailParticipant[] {
  if (!value) return []
  const out: EmailParticipant[] = []
  for (const chunk of value.split(',')) {
    const angled = EMAIL_IN_ANGLE.exec(chunk)
    const bare = angled ?? BARE_EMAIL.exec(chunk)
    const email = bare?.[1]?.toLowerCase()
    if (!email || !isEmail(email)) continue
    const name = angled
      ? chunk.slice(0, chunk.indexOf('<')).trim().replace(/^"|"$/g, '').trim()
      : ''
    out.push(name ? { name: name.slice(0, 200), email } : { email })
  }
  return out
}

function decodeBody(data: string): string {
  try {
    return Buffer.from(data, 'base64url').toString('utf8')
  } catch {
    return ''
  }
}

function findPart(part: GmailPart | undefined, mimeType: string): GmailPart | null {
  if (!part) return null
  if (part.mimeType === mimeType && part.body?.data) return part
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType)
    if (found) return found
  }
  return null
}

/**
 * Small tag-stripping sanitizer for the text/html fallback. This increment
 * stores plain text only — body_html_sanitized stays unused; the raw provider
 * HTML is never stored (0012 column comment).
 */
function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** text/plain part → sanitized text/html part → provider snippet. */
function extractBodyText(message: GmailMessage): string {
  const plain = findPart(message.payload, 'text/plain')
  if (plain?.body?.data) {
    const text = decodeBody(plain.body.data).trim()
    if (text) return text.slice(0, BODY_MAX_CHARS)
  }
  const html = findPart(message.payload, 'text/html')
  if (html?.body?.data) {
    const text = stripHtml(decodeBody(html.body.data))
    if (text) return text.slice(0, BODY_MAX_CHARS)
  }
  return (message.snippet ?? '').slice(0, BODY_MAX_CHARS)
}

function sentAtOf(message: GmailMessage): string | null {
  if (message.internalDate) {
    const ms = Number(message.internalDate)
    if (Number.isFinite(ms) && ms > 0) return new Date(ms).toISOString()
  }
  const date = header(message, 'Date')
  if (date) {
    const parsed = new Date(date)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  return null
}

function snippetOf(body: string): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, 240)
}

// ── Auto-linking (06_Module_Breakdown.md §8) ─────────────────────────────────

/** Domains too generic to identify a client (privacy + false-positive guard). */
const FREEMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
])

function domainOf(address: string): string | null {
  const at = address.lastIndexOf('@')
  if (at < 0) return null
  const domain = address.slice(at + 1).toLowerCase()
  return domain || null
}

function websiteDomain(website: string | null): string | null {
  if (!website) return null
  const trimmed = website.trim().toLowerCase()
  if (!trimmed) return null
  try {
    const host = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).hostname
    return host.replace(/^www\./, '') || null
  } catch {
    return null
  }
}

interface AutoLink {
  contactId: string | null
  clientId: string | null
}

/**
 * Match external participants against crm_contacts.email (→ contact + its
 * client), else their domain against clients.website. Returns null when
 * nothing matches — threads stay unlinked rather than guessing.
 */
async function autoLinkFor(
  ctx: WorkspaceContext,
  participants: EmailParticipant[],
  ownAddress: string,
): Promise<AutoLink | null> {
  const own = ownAddress.toLowerCase()
  const external = [
    ...new Set(
      participants.map((p) => p.email.toLowerCase()).filter((email) => email && email !== own),
    ),
  ]
  if (external.length === 0) return null

  // ilike without wildcards = case-insensitive equality. Addresses with .or()
  // metacharacters are skipped rather than escaped.
  const safe = external.filter((email) => !/[,()]/.test(email))
  if (safe.length > 0) {
    const { data: contacts } = await ctx.supabase
      .from('crm_contacts')
      .select('id, client_id, email')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .or(safe.map((email) => `email.ilike.${email}`).join(','))
      .limit(1)
    const contact = contacts?.[0]
    if (contact) return { contactId: contact.id, clientId: contact.client_id }
  }

  const domains = [
    ...new Set(
      external
        .map(domainOf)
        .filter((d): d is string => !!d)
        .filter((d) => !FREEMAIL_DOMAINS.has(d)),
    ),
  ]
  if (domains.length === 0) return null

  const { data: clients } = await ctx.supabase
    .from('clients')
    .select('id, website')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .not('website', 'is', null)
  for (const client of clients ?? []) {
    const domain = websiteDomain(client.website)
    if (domain && domains.includes(domain)) return { contactId: null, clientId: client.id }
  }
  return null
}

// ── Connection helpers ───────────────────────────────────────────────────────

type ConnectionRow = Tables<'mailbox_connections'>

async function loadConnection(ctx: WorkspaceContext, connectionId: string): Promise<ConnectionRow> {
  const { data } = await ctx.supabase
    .from('mailbox_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('workspace_id', ctx.workspace.id)
    .eq('user_id', ctx.userId) // owner-only, on top of the owner-only RLS
    .eq('provider', 'gmail')
    .is('deleted_at', null)
    .maybeSingle()
  if (!data) throw new GmailSyncError('gmail_not_connected', 'Gmail connection not found.')
  return data
}

async function saveConnectionPatch(
  ctx: WorkspaceContext,
  connectionId: string,
  patch: TablesUpdate<'mailbox_connections'>,
): Promise<void> {
  await ctx.supabase
    .from('mailbox_connections')
    .update(patch)
    .eq('id', connectionId)
    .eq('workspace_id', ctx.workspace.id)
}

/** Decrypt, refresh when (nearly) expired, persist rotated tokens. */
async function freshTokens(
  ctx: WorkspaceContext,
  connection: ConnectionRow,
): Promise<MailboxTokenBundle> {
  if (!connection.oauth_token_ciphertext) {
    throw new GmailSyncError('gmail_not_connected', 'Connection has no stored credentials.')
  }
  const bundle = decryptTokenBundle(connection.oauth_token_ciphertext)

  const expiryMs = Date.parse(bundle.expiry)
  const stillValid = Number.isFinite(expiryMs) && expiryMs > Date.now() + 60_000
  if (stillValid) return bundle

  const refreshed = await refreshGmailAccessToken(bundle.refresh_token)
  const next: MailboxTokenBundle = {
    access_token: refreshed.access_token,
    // Google may rotate the refresh token; keep the previous one otherwise.
    refresh_token: refreshed.refresh_token ?? bundle.refresh_token,
    expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    scope: refreshed.scope ?? bundle.scope,
  }
  await saveConnectionPatch(ctx, connection.id, {
    oauth_token_ciphertext: encryptTokenBundle(next),
  })
  return next
}

// ── Thread import ────────────────────────────────────────────────────────────

interface ImportCounters {
  threadsImported: number
  messagesImported: number
}

async function importThread(
  ctx: WorkspaceContext,
  connection: ConnectionRow,
  accessToken: string,
  gmailThreadId: string,
  counters: ImportCounters,
): Promise<void> {
  const thread = await gmailGet(
    ThreadGetSchema,
    accessToken,
    `/users/me/threads/${gmailThreadId}`,
    {
      format: 'full',
    },
  )
  const messages = thread.messages ?? []
  if (messages.length === 0) return

  // Existing messages for this Gmail thread → AurexOS thread id + dedupe set.
  const { data: existingMessages } = await ctx.supabase
    .from('email_messages')
    .select('thread_id, provider_message_id')
    .eq('workspace_id', ctx.workspace.id)
    .like('provider_message_id', `${gmailThreadId}:%`)
    .is('deleted_at', null)
  const knownIds = new Set((existingMessages ?? []).map((m) => m.provider_message_id))
  let threadId = existingMessages?.[0]?.thread_id ?? null

  const newMessages = messages.filter((m) => !knownIds.has(`${gmailThreadId}:${m.id}`))
  if (newMessages.length === 0) return

  // Participants across the whole Gmail thread (bounded).
  const participantByEmail = new Map<string, EmailParticipant>()
  for (const m of messages) {
    for (const p of [
      ...parseAddressHeader(header(m, 'From')),
      ...parseAddressHeader(header(m, 'To')),
      ...parseAddressHeader(header(m, 'Cc')),
    ]) {
      const existing = participantByEmail.get(p.email)
      if (!existing || (!existing.name && p.name)) participantByEmail.set(p.email, p)
    }
  }
  const participants = [...participantByEmail.values()].slice(0, 25)

  const first = messages[0]
  if (!first) return
  const subject = (header(first, 'Subject') ?? '').trim().slice(0, 500) || '(no subject)'

  let threadRow: Tables<'email_threads'> | null = null
  if (threadId) {
    const { data } = await ctx.supabase
      .from('email_threads')
      .select('*')
      .eq('id', threadId)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .maybeSingle()
    threadRow = data
    if (!threadRow) threadId = null // message rows orphaned from a deleted thread
  }

  if (!threadRow) {
    const link = await autoLinkFor(ctx, participants, connection.address)
    const { data: created, error } = await ctx.supabase
      .from('email_threads')
      .insert({
        workspace_id: ctx.workspace.id,
        subject,
        participants: participants as TablesInsert<'email_threads'>['participants'],
        message_count: 0,
        visibility: 'private', // privacy default per 05_User_Roles.md §3.2
        mailbox_connection_id: connection.id,
        contact_id: link?.contactId ?? null,
        client_id: link?.clientId ?? null,
      })
      .select('*')
      .single()
    if (error || !created) {
      throw new GmailSyncError('gmail_sync_failed', 'Could not store a synced thread.')
    }
    threadRow = created
    threadId = created.id
    counters.threadsImported += 1

    await writeAudit(ctx, {
      action: 'email.thread.created',
      entityType: 'email_thread',
      entityId: created.id,
      after: { subject: created.subject, visibility: created.visibility, note: 'gmail sync' },
    })
    await emitDomainEvent(ctx, {
      eventType: 'email.thread.created',
      entityType: 'email_thread',
      entityId: created.id,
      payload: { subject: created.subject, visibility: created.visibility, source: 'gmail_sync' },
    })
    if (link && (link.contactId || link.clientId)) {
      await emitDomainEvent(ctx, {
        eventType: 'email.thread.linked',
        entityType: 'email_thread',
        entityId: created.id,
        payload: { contactId: link.contactId, clientId: link.clientId, source: 'gmail_sync' },
      })
    }
  } else if (!threadRow.contact_id && !threadRow.client_id) {
    // Existing thread that never got a link — try again with fresh participants.
    const link = await autoLinkFor(ctx, participants, connection.address)
    if (link && (link.contactId || link.clientId)) {
      await ctx.supabase
        .from('email_threads')
        .update({ contact_id: link.contactId, client_id: link.clientId })
        .eq('id', threadRow.id)
        .eq('workspace_id', ctx.workspace.id)
      await emitDomainEvent(ctx, {
        eventType: 'email.thread.linked',
        entityType: 'email_thread',
        entityId: threadRow.id,
        payload: { contactId: link.contactId, clientId: link.clientId, source: 'gmail_sync' },
      })
    }
  }
  if (!threadId || !threadRow) return

  let inserted = 0
  let latestSentAt = threadRow.last_message_at
  let latestBody: string | null = null
  for (const m of newMessages) {
    const from = parseAddressHeader(header(m, 'From'))[0]?.email ?? connection.address
    const to = parseAddressHeader(header(m, 'To')).map((p) => p.email)
    const cc = parseAddressHeader(header(m, 'Cc')).map((p) => p.email)
    const bodyText = extractBodyText(m)
    const sentAt = sentAtOf(m)

    const { error } = await ctx.supabase.from('email_messages').insert({
      workspace_id: ctx.workspace.id,
      thread_id: threadId,
      direction: (m.labelIds ?? []).includes('SENT') ? 'outbound' : 'inbound',
      from_address: from,
      to_addresses: to as TablesInsert<'email_messages'>['to_addresses'],
      cc_addresses: cc as TablesInsert<'email_messages'>['cc_addresses'],
      subject: (header(m, 'Subject') ?? '').trim().slice(0, 500) || null,
      body_text: bodyText || null,
      provider_message_id: `${gmailThreadId}:${m.id}`,
      sent_at: sentAt,
      is_draft: false,
    })
    if (error) continue // duplicate or constraint miss — skip, never abort the run

    inserted += 1
    counters.messagesImported += 1
    if (!latestSentAt || (sentAt && sentAt >= latestSentAt)) {
      latestSentAt = sentAt ?? latestSentAt
      latestBody = bodyText
    }
  }
  if (inserted === 0) return

  const patch: TablesUpdate<'email_threads'> = {
    message_count: threadRow.message_count + inserted,
    participants: participants as TablesUpdate<'email_threads'>['participants'],
  }
  if (latestSentAt) patch.last_message_at = latestSentAt
  if (latestBody) patch.snippet = snippetOf(latestBody)
  await ctx.supabase
    .from('email_threads')
    .update(patch)
    .eq('id', threadId)
    .eq('workspace_id', ctx.workspace.id)
}

// ── Entry point ──────────────────────────────────────────────────────────────

/**
 * Import the newest inbox/sent threads for a connection. Idempotent: rerunning
 * upserts nothing twice (composite provider_message_id dedupe). On auth
 * failure the connection is flipped to status 'error' and a GmailSyncError
 * with code 'gmail_auth' is thrown — token material never rides on the error.
 */
export async function syncMailbox(
  ctx: WorkspaceContext,
  connectionId: string,
  options: SyncMailboxOptions = {},
): Promise<SyncMailboxResult> {
  const maxThreads = Math.min(Math.max(options.maxThreads ?? 25, 1), 100)
  const connection = await loadConnection(ctx, connectionId)
  const counters: ImportCounters = { threadsImported: 0, messagesImported: 0 }

  try {
    const tokens = await freshTokens(ctx, connection)

    const list = await gmailGet(ThreadsListSchema, tokens.access_token, '/users/me/threads', {
      q: SYNC_QUERY,
      maxResults: String(maxThreads),
    })

    for (const t of list.threads ?? []) {
      await importThread(ctx, connection, tokens.access_token, t.id, counters)
    }

    // sync_cursor = latest historyId — the seam a future incremental
    // history.list sync resumes from.
    const profile = await gmailGet(ProfileSchema, tokens.access_token, '/users/me/profile')
    await saveConnectionPatch(ctx, connection.id, {
      sync_cursor: profile.historyId != null ? String(profile.historyId) : connection.sync_cursor,
      last_synced_at: new Date().toISOString(),
      status: 'connected',
    })

    await writeAudit(ctx, {
      action: 'email.mailbox.synced',
      entityType: 'mailbox_connection',
      entityId: connection.id,
      after: { ...counters, note: 'gmail sync' },
    })
    return counters
  } catch (err) {
    if (
      (err instanceof GmailSyncError && err.code === 'gmail_auth') ||
      (err instanceof GmailOAuthError && err.code === 'gmail_auth')
    ) {
      await saveConnectionPatch(ctx, connection.id, { status: 'error' })
      throw new GmailSyncError('gmail_auth', 'Gmail authorization is no longer valid.')
    }
    if (err instanceof GmailSyncError) throw err
    if (err instanceof MailboxCryptoError || err instanceof GmailOAuthError) {
      throw new GmailSyncError('gmail_sync_failed', err.message)
    }
    throw err
  }
}
