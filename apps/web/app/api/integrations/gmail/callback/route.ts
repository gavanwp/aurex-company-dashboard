import { type NextRequest, NextResponse } from 'next/server'
import { writeAudit } from '@/lib/action-kit'
import { getEnv, isGmailConfigured } from '@/lib/env'
import {
  exchangeGmailCode,
  GMAIL_STATE_COOKIE,
  GmailOAuthError,
  resolveGmailAddress,
} from '@/lib/gmail-oauth'
import { encryptTokenBundle } from '@/lib/mailbox-crypto'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { GmailSyncError, syncMailbox } from '@/modules/email'

/**
 * Gmail OAuth callback: verify state, exchange the code, encrypt the token
 * bundle, upsert the mailbox connection, and run one bounded initial sync.
 * Every failure redirects to /email?error=gmail_* with a coded reason the
 * Email Center maps to human copy — Google error bodies and tokens never leak.
 */
export async function GET(request: NextRequest) {
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL

  const redirectWith = (query: string): NextResponse => {
    const response = NextResponse.redirect(new URL(`/email?${query}`, appUrl))
    // Always clear the one-time state nonce on the way out.
    response.cookies.set(GMAIL_STATE_COOKIE, '', { path: '/', maxAge: 0 })
    return response
  }
  const fail = (code: string): NextResponse => redirectWith(`error=${code}`)

  if (!isGmailConfigured()) return fail('gmail_not_configured')

  const params = new URL(request.url).searchParams
  const oauthError = params.get('error')
  const code = params.get('code')
  const state = params.get('state')
  const cookieState = request.cookies.get(GMAIL_STATE_COOKIE)?.value

  if (oauthError) {
    return fail(oauthError === 'access_denied' ? 'gmail_denied' : 'gmail_exchange')
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return fail('gmail_state')
  }

  // Resolve tenancy BEFORE the try block so its auth redirects propagate
  // instead of being swallowed as a gmail error.
  const ctx = await getWorkspaceContext()
  if (ctx.role === 'client' || ctx.role === 'guest') return fail('gmail_forbidden')

  try {
    const tokens = await exchangeGmailCode(code)
    if (!tokens.refresh_token) {
      // No refresh token means we can't sync long-term — treat as a failed
      // exchange (prompt=consent should always return one).
      return fail('gmail_exchange')
    }

    const address = await resolveGmailAddress(tokens)
    const ciphertext = encryptTokenBundle({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scope: tokens.scope ?? '',
    })

    const { data: existing } = await ctx.supabase
      .from('mailbox_connections')
      .select('id')
      .eq('workspace_id', ctx.workspace.id)
      .eq('user_id', ctx.userId)
      .eq('provider', 'gmail')
      .is('deleted_at', null)
      .maybeSingle()

    let connectionId: string
    if (existing) {
      await ctx.supabase
        .from('mailbox_connections')
        .update({ address, status: 'connected', oauth_token_ciphertext: ciphertext })
        .eq('id', existing.id)
        .eq('workspace_id', ctx.workspace.id)
      connectionId = existing.id
    } else {
      const { data: created, error } = await ctx.supabase
        .from('mailbox_connections')
        .insert({
          workspace_id: ctx.workspace.id,
          user_id: ctx.userId,
          provider: 'gmail',
          address,
          display_name: ctx.profile.full_name,
          status: 'connected',
          sharing_policy: 'private',
          oauth_token_ciphertext: ciphertext,
        })
        .select('id')
        .single()
      if (error || !created) return fail('gmail_exchange')
      connectionId = created.id
    }

    await writeAudit(ctx, {
      action: 'email.mailbox.connected',
      entityType: 'mailbox_connection',
      entityId: connectionId,
      after: { address, provider: 'gmail', note: 'gmail connect' },
    })

    // Initial backfill inline, bounded. Non-fatal: the connection is live even
    // if the first sync stumbles — the card offers "Sync now".
    try {
      await syncMailbox(ctx, connectionId, { maxThreads: 25 })
    } catch {
      // Swallowed by design; surfaced as connected with a retry affordance.
    }

    return redirectWith('connected=1')
  } catch (err) {
    if (err instanceof GmailOAuthError) return fail(err.code)
    if (err instanceof GmailSyncError) return fail('gmail_sync_failed')
    return fail('gmail_exchange')
  }
}
