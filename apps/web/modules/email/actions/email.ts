'use server'

import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import {
  ComposeDraftInput,
  LinkThreadInput,
  LogEmailInput,
  ShareThreadInput,
  UpdateThreadStatusInput,
  type EmailParticipant,
} from '@aurexos/core'
import type { Tables, TablesInsert, TablesUpdate } from '@aurexos/db'
import { ActionError, emitDomainEvent, writeAudit, type ActionResult } from '@/lib/action-kit'
import { revokeGmailToken } from '@/lib/gmail-oauth'
import { decryptTokenBundle } from '@/lib/mailbox-crypto'
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspace-context'
import { GmailSyncError, syncMailbox, type SyncMailboxResult } from '../lib/gmail-sync'
import { GMAIL_ERROR_FALLBACK, mapGmailErrorCode } from '../types'

// Capability note: the can() map has no email.* capabilities yet (they land
// with the capability-map expansion alongside the sync worker). Until then the
// guard is: any internal member may work with email; portal roles may not.
// RLS (0012) is the real privacy engine — private threads only ever reach the
// mailbox owner regardless of what this layer does.
async function requireEmailAccess(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext()
  if (ctx.role === 'client' || ctx.role === 'guest') {
    throw new ActionError('forbidden')
  }
  return ctx
}

function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message }
  throw err
}

function revalidateEmail(): void {
  revalidatePath('/email')
}

function snippetOf(body: string): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, 240)
}

/**
 * Manual logging is backed by the caller's 'manual' mailbox connection —
 * created lazily on first log. Private threads hang off it, which is what
 * makes the owner-scoped RLS policy (0012) work before any OAuth mailbox
 * exists.
 */
async function ensureManualConnection(ctx: WorkspaceContext): Promise<string> {
  const { data: existing } = await ctx.supabase
    .from('mailbox_connections')
    .select('id')
    .eq('workspace_id', ctx.workspace.id)
    .eq('user_id', ctx.userId)
    .eq('provider', 'manual')
    .is('deleted_at', null)
    .maybeSingle()
  if (existing) return existing.id

  const { data: created, error } = await ctx.supabase
    .from('mailbox_connections')
    .insert({
      workspace_id: ctx.workspace.id,
      user_id: ctx.userId,
      provider: 'manual',
      address: ctx.profile.email,
      display_name: ctx.profile.full_name,
      status: 'connected',
    })
    .select('id')
    .single()
  if (error || !created) {
    throw new ActionError(error?.message ?? 'Could not prepare your mailbox')
  }
  return created.id
}

async function getThreadRow(
  ctx: WorkspaceContext,
  id: string,
): Promise<Tables<'email_threads'> | null> {
  const { data } = await ctx.supabase
    .from('email_threads')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  return data
}

/**
 * The v1 workhorse: log a client email against clients/contacts/deals/projects.
 * Creates the thread when needed, appends the message, and emits
 * email.message.logged (plus email.thread.created for new threads).
 */
export async function logEmail(
  input: z.input<typeof LogEmailInput>,
): Promise<ActionResult<{ threadId: string }>> {
  const parsed = LogEmailInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid email' }
  }

  try {
    const ctx = await requireEmailAccess()
    const d = parsed.data

    let thread = d.threadId ? await getThreadRow(ctx, d.threadId) : null
    if (d.threadId && !thread) return { ok: false, error: 'Thread not found' }

    if (!thread) {
      const connectionId = await ensureManualConnection(ctx)
      const participants: EmailParticipant[] = [
        { email: d.fromAddress },
        ...d.toAddresses.map((email) => ({ email })),
      ].filter((p, i, all) => all.findIndex((x) => x.email === p.email) === i)

      const { data: created, error } = await ctx.supabase
        .from('email_threads')
        .insert({
          workspace_id: ctx.workspace.id,
          subject: d.subject,
          snippet: snippetOf(d.bodyText),
          participants: participants as TablesInsert<'email_threads'>['participants'],
          last_message_at: d.occurredAt,
          message_count: 0,
          mailbox_connection_id: connectionId,
          client_id: d.clientId ?? null,
          contact_id: d.contactId ?? null,
          project_id: d.projectId ?? null,
          deal_id: d.dealId ?? null,
        })
        .select('*')
        .single()
      if (error || !created) {
        return { ok: false, error: error?.message ?? 'Could not create thread' }
      }
      thread = created

      await writeAudit(ctx, {
        action: 'email.thread.created',
        entityType: 'email_thread',
        entityId: thread.id,
        after: thread,
      })
      await emitDomainEvent(ctx, {
        eventType: 'email.thread.created',
        entityType: 'email_thread',
        entityId: thread.id,
        payload: { subject: thread.subject, visibility: thread.visibility },
      })
    }

    const { data: message, error: messageError } = await ctx.supabase
      .from('email_messages')
      .insert({
        workspace_id: ctx.workspace.id,
        thread_id: thread.id,
        direction: d.direction,
        from_address: d.fromAddress,
        to_addresses: d.toAddresses as TablesInsert<'email_messages'>['to_addresses'],
        cc_addresses: d.ccAddresses as TablesInsert<'email_messages'>['cc_addresses'],
        subject: d.subject,
        body_text: d.bodyText,
        sent_at: d.occurredAt,
        is_draft: false,
      })
      .select('*')
      .single()
    if (messageError || !message) {
      return { ok: false, error: messageError?.message ?? 'Could not log email' }
    }

    const threadPatch: TablesUpdate<'email_threads'> = {
      message_count: thread.message_count + 1,
      snippet: snippetOf(d.bodyText),
    }
    if (!thread.last_message_at || d.occurredAt >= thread.last_message_at) {
      threadPatch.last_message_at = d.occurredAt
    }
    await ctx.supabase
      .from('email_threads')
      .update(threadPatch)
      .eq('id', thread.id)
      .eq('workspace_id', ctx.workspace.id)

    await writeAudit(ctx, {
      action: 'email.message.logged',
      entityType: 'email_message',
      entityId: message.id,
      after: message,
    })
    await emitDomainEvent(ctx, {
      eventType: 'email.message.logged',
      entityType: 'email_message',
      entityId: message.id,
      payload: { threadId: thread.id, direction: d.direction, subject: d.subject },
    })
    revalidateEmail()
    return { ok: true, data: { threadId: thread.id } }
  } catch (err) {
    return failure(err)
  }
}

export async function updateThreadStatus(
  input: z.input<typeof UpdateThreadStatusInput>,
): Promise<ActionResult> {
  const parsed = UpdateThreadStatusInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid status change' }

  try {
    const ctx = await requireEmailAccess()
    const { id, status } = parsed.data

    const before = await getThreadRow(ctx, id)
    if (!before) return { ok: false, error: 'Thread not found' }
    if (before.status === status) return { ok: true, data: undefined }

    const { data: after, error } = await ctx.supabase
      .from('email_threads')
      .update({ status })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !after) {
      return { ok: false, error: error?.message ?? 'Could not update thread' }
    }

    await writeAudit(ctx, {
      action: 'email.thread.status_changed',
      entityType: 'email_thread',
      entityId: id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: 'email.thread.status_changed',
      entityType: 'email_thread',
      entityId: id,
      payload: { from: before.status, to: status },
    })
    revalidateEmail()
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

/** Set (or clear) the client/contact/project/deal refs on a thread. */
export async function linkThread(input: z.input<typeof LinkThreadInput>): Promise<ActionResult> {
  const parsed = LinkThreadInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid link' }

  try {
    const ctx = await requireEmailAccess()
    const { id, ...refs } = parsed.data

    const before = await getThreadRow(ctx, id)
    if (!before) return { ok: false, error: 'Thread not found' }

    const patch: TablesUpdate<'email_threads'> = {}
    if (refs.clientId !== undefined) patch.client_id = refs.clientId
    if (refs.contactId !== undefined) patch.contact_id = refs.contactId
    if (refs.projectId !== undefined) patch.project_id = refs.projectId
    if (refs.dealId !== undefined) patch.deal_id = refs.dealId
    if (Object.keys(patch).length === 0) return { ok: true, data: undefined }

    const { data: after, error } = await ctx.supabase
      .from('email_threads')
      .update(patch)
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !after) {
      return { ok: false, error: error?.message ?? 'Could not link thread' }
    }

    await writeAudit(ctx, {
      action: 'email.thread.linked',
      entityType: 'email_thread',
      entityId: id,
      before,
      after,
    })
    await emitDomainEvent(ctx, {
      eventType: 'email.thread.linked',
      entityType: 'email_thread',
      entityId: id,
      payload: {
        clientId: after.client_id,
        contactId: after.contact_id,
        projectId: after.project_id,
        dealId: after.deal_id,
      },
    })
    revalidateEmail()
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

/**
 * Flip thread visibility (private ↔ workspace). Privacy-sensitive
 * (05_User_Roles.md §3.2), so it is always audited; RLS only lets the mailbox
 * owner make a private thread visible to the workspace.
 */
export async function shareThread(input: z.input<typeof ShareThreadInput>): Promise<ActionResult> {
  const parsed = ShareThreadInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid visibility change' }

  try {
    const ctx = await requireEmailAccess()
    const { id, visibility } = parsed.data

    const before = await getThreadRow(ctx, id)
    if (!before) return { ok: false, error: 'Thread not found' }
    if (before.visibility === visibility) return { ok: true, data: undefined }

    const { data: after, error } = await ctx.supabase
      .from('email_threads')
      .update({ visibility })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error || !after) {
      return { ok: false, error: error?.message ?? 'Could not change thread visibility' }
    }

    await writeAudit(ctx, {
      action: 'email.thread.visibility_changed',
      entityType: 'email_thread',
      entityId: id,
      before,
      after,
    })
    revalidateEmail()
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}

/**
 * Save a compose draft as an is_draft message on the thread. Sending is
 * disabled in v1 — there is no mailbox transport until the Gmail sync worker
 * lands; a saved draft becomes sendable then.
 */
export async function saveDraft(
  input: z.input<typeof ComposeDraftInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = ComposeDraftInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid draft' }
  }

  try {
    const ctx = await requireEmailAccess()
    const d = parsed.data

    const thread = await getThreadRow(ctx, d.threadId)
    if (!thread) return { ok: false, error: 'Thread not found' }

    const recipients = (
      Array.isArray(thread.participants) ? (thread.participants as Array<{ email?: string }>) : []
    )
      .map((p) => p.email)
      .filter((email): email is string => !!email && email !== ctx.profile.email)

    // One live draft per thread per author: update it if present.
    const { data: existing } = await ctx.supabase
      .from('email_messages')
      .select('id')
      .eq('thread_id', thread.id)
      .eq('workspace_id', ctx.workspace.id)
      .eq('is_draft', true)
      .eq('from_address', ctx.profile.email)
      .is('deleted_at', null)
      .maybeSingle()

    const { data: draft, error } = existing
      ? await ctx.supabase
          .from('email_messages')
          .update({ body_text: d.bodyText, subject: d.subject ?? thread.subject })
          .eq('id', existing.id)
          .eq('workspace_id', ctx.workspace.id)
          .select('id')
          .single()
      : await ctx.supabase
          .from('email_messages')
          .insert({
            workspace_id: ctx.workspace.id,
            thread_id: thread.id,
            direction: 'outbound',
            from_address: ctx.profile.email,
            to_addresses: recipients as TablesInsert<'email_messages'>['to_addresses'],
            subject: d.subject ?? thread.subject,
            body_text: d.bodyText,
            is_draft: true,
          })
          .select('id')
          .single()
    if (error || !draft) {
      return { ok: false, error: error?.message ?? 'Could not save draft' }
    }

    await writeAudit(ctx, {
      action: existing ? 'email.draft.updated' : 'email.draft.created',
      entityType: 'email_message',
      entityId: draft.id,
      after: { threadId: thread.id, subject: d.subject ?? thread.subject },
    })
    revalidateEmail()
    return { ok: true, data: { id: draft.id } }
  } catch (err) {
    return failure(err)
  }
}

/**
 * Manually re-run a Gmail mailbox sync (owner-only, enforced in syncMailbox's
 * connection load + RLS). Import errors surface as human copy, never Google
 * error bodies or token material.
 */
export async function syncMailboxNow(
  connectionId: string,
): Promise<ActionResult<SyncMailboxResult>> {
  try {
    const ctx = await requireEmailAccess()
    const result = await syncMailbox(ctx, connectionId)
    revalidateEmail()
    return { ok: true, data: result }
  } catch (err) {
    if (err instanceof GmailSyncError) {
      return { ok: false, error: mapGmailErrorCode(err.code) ?? GMAIL_ERROR_FALLBACK }
    }
    return failure(err)
  }
}

/**
 * Disconnect a Gmail mailbox: best-effort token revocation at Google, then
 * null the stored ciphertext and flip status to 'disconnected'. Synced threads
 * stay on the timeline; reconnecting resumes syncing.
 */
export async function disconnectMailbox(connectionId: string): Promise<ActionResult> {
  try {
    const ctx = await requireEmailAccess()

    const { data: connection } = await ctx.supabase
      .from('mailbox_connections')
      .select('id, oauth_token_ciphertext')
      .eq('id', connectionId)
      .eq('workspace_id', ctx.workspace.id)
      .eq('user_id', ctx.userId)
      .eq('provider', 'gmail')
      .is('deleted_at', null)
      .maybeSingle()
    if (!connection) return { ok: false, error: "That mailbox isn't connected." }

    if (connection.oauth_token_ciphertext) {
      // Courtesy revoke — never blocks the local disconnect, never surfaces tokens.
      try {
        const bundle = decryptTokenBundle(connection.oauth_token_ciphertext)
        await revokeGmailToken(bundle.refresh_token)
      } catch {
        // Ignore: the local disconnect below is the source of truth.
      }
    }

    const { error } = await ctx.supabase
      .from('mailbox_connections')
      .update({ oauth_token_ciphertext: null, status: 'disconnected', sync_cursor: null })
      .eq('id', connectionId)
      .eq('workspace_id', ctx.workspace.id)
    if (error) return { ok: false, error: 'Could not disconnect the mailbox' }

    await writeAudit(ctx, {
      action: 'email.mailbox.disconnected',
      entityType: 'mailbox_connection',
      entityId: connectionId,
      after: { note: 'gmail disconnect' },
    })
    revalidateEmail()
    return { ok: true, data: undefined }
  } catch (err) {
    return failure(err)
  }
}
