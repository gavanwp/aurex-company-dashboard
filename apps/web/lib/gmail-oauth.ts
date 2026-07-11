import 'server-only'

import { z } from 'zod'
import { getEnv, getGmailEnv } from '@/lib/env'

/**
 * Google OAuth plumbing for the Gmail integration — no SDK, plain fetch
 * against Google's documented REST endpoints. Server-only: tokens returned
 * here go straight into lib/mailbox-crypto.ts, never to logs, errors, events
 * or client components (SecurityArchitecture.md §4.3 / register S4). Google
 * error response bodies are deliberately dropped — failures surface as coded
 * GmailOAuthError values that the Email Center maps to human copy.
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

/** Read-only increment: sync scope only — sending arrives later. */
export const GMAIL_OAUTH_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly openid email'

/** Short-lived httpOnly cookie carrying the OAuth state nonce. */
export const GMAIL_STATE_COOKIE = 'aurex-gmail-state'
export const GMAIL_STATE_MAX_AGE_SECONDS = 600

/** Machine-readable failure codes; human copy lives in modules/email/types.ts. */
export type GmailOAuthErrorCode = 'gmail_auth' | 'gmail_exchange'

export class GmailOAuthError extends Error {
  readonly code: GmailOAuthErrorCode
  constructor(code: GmailOAuthErrorCode, message: string) {
    super(message)
    this.name = 'GmailOAuthError'
    this.code = code
  }
}

/** The exact redirect URI that must be registered on the Google OAuth client. */
export function gmailRedirectUri(): string {
  return `${getEnv().NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`
}

/** Consent-screen URL for the connect redirect. */
export function buildGmailAuthUrl(state: string): string {
  const { clientId } = getGmailEnv()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: gmailRedirectUri(),
    response_type: 'code',
    scope: GMAIL_OAUTH_SCOPE,
    access_type: 'offline',
    prompt: 'consent', // guarantees a refresh_token on every connect
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
  id_token: z.string().optional(),
})
export type GmailTokenResponse = z.infer<typeof TokenResponseSchema>

async function tokenRequest(
  body: Record<string, string>,
  failureCode: GmailOAuthErrorCode,
): Promise<GmailTokenResponse> {
  let response: Response
  try {
    response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    })
  } catch {
    throw new GmailOAuthError(failureCode, 'Could not reach Google.')
  }
  if (!response.ok) {
    // 400/401 on a refresh grant means the user revoked access (or the token
    // was invalidated) — an auth failure, not a transient exchange failure.
    const code: GmailOAuthErrorCode =
      body.grant_type === 'refresh_token' && (response.status === 400 || response.status === 401)
        ? 'gmail_auth'
        : failureCode
    throw new GmailOAuthError(code, `Google token endpoint returned ${response.status}.`)
  }
  const parsed = TokenResponseSchema.safeParse(await response.json())
  if (!parsed.success) {
    throw new GmailOAuthError(failureCode, 'Google token response had an unexpected shape.')
  }
  return parsed.data
}

/** Exchange an authorization code for a token set. */
export async function exchangeGmailCode(code: string): Promise<GmailTokenResponse> {
  const { clientId, clientSecret } = getGmailEnv()
  return tokenRequest(
    {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: gmailRedirectUri(),
      grant_type: 'authorization_code',
    },
    'gmail_exchange',
  )
}

/** Refresh an expired access token (may rotate the refresh token). */
export async function refreshGmailAccessToken(refreshToken: string): Promise<GmailTokenResponse> {
  const { clientId, clientSecret } = getGmailEnv()
  return tokenRequest(
    {
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    },
    'gmail_auth',
  )
}

/**
 * Best-effort token revocation on disconnect. Never throws — the local
 * disconnect (ciphertext nulled, status flipped) must succeed regardless.
 */
export async function revokeGmailToken(token: string): Promise<void> {
  try {
    await fetch(GOOGLE_REVOKE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }).toString(),
    })
  } catch {
    // Swallowed by design: revocation is a courtesy, not a dependency.
  }
}

const IdTokenClaimsSchema = z.object({ email: z.string().email() })
const UserinfoSchema = z.object({ email: z.string().email() })

/**
 * Resolve the connected account's email address — from the id_token claims
 * when present (no extra request), falling back to the OIDC userinfo endpoint.
 */
export async function resolveGmailAddress(tokens: GmailTokenResponse): Promise<string> {
  if (tokens.id_token) {
    const payload = tokens.id_token.split('.')[1]
    if (payload) {
      try {
        const claims = IdTokenClaimsSchema.safeParse(
          JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
        )
        if (claims.success) return claims.data.email
      } catch {
        // Fall through to userinfo.
      }
    }
  }

  let response: Response
  try {
    response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    })
  } catch {
    throw new GmailOAuthError('gmail_exchange', 'Could not reach Google userinfo.')
  }
  if (!response.ok) {
    throw new GmailOAuthError('gmail_exchange', `Google userinfo returned ${response.status}.`)
  }
  const parsed = UserinfoSchema.safeParse(await response.json())
  if (!parsed.success) {
    throw new GmailOAuthError('gmail_exchange', 'Google userinfo response had no email.')
  }
  return parsed.data.email
}
