// Maps Supabase auth error codes to human copy (ErrorStates.md §8: what
// happened → why → what to do; no raw codes, no blame, sentence case).
// Client-safe — imported by both auth forms and server actions, so raw
// `error.message` never reaches the UI (R-Q6).

/** Structural subset of @supabase/supabase-js AuthError we map from. */
export interface AuthErrorLike {
  code?: string
  status?: number
}

const RATE_LIMIT_COPY = 'Too many attempts — wait a few minutes, then try again.'

const AUTH_ERROR_COPY: Record<string, string> = {
  // Credentials
  invalid_credentials: "That email and password don't match — check for typos and try again.",
  email_not_confirmed: 'Confirm your email first — we sent you a link when you signed up.',
  user_not_found: "That email and password don't match — check for typos and try again.",
  user_banned: 'This account is currently suspended — contact your workspace owner.',

  // Signup
  user_already_exists: 'An account with this email already exists — sign in instead.',
  email_exists: 'An account with this email already exists — sign in instead.',
  signup_disabled: 'New sign-ups are currently closed — contact your workspace owner for an invite.',
  weak_password: 'That password is too easy to guess — use at least 8 characters.',
  same_password: 'Your new password must be different from your current one.',

  // Rate limiting
  over_email_send_rate_limit:
    'We just sent an email to this address — wait a moment before requesting another.',
  over_request_rate_limit: RATE_LIMIT_COPY,

  // Links (magic link, confirmation, recovery)
  otp_expired: 'That link has expired or was already used — request a new one.',
  flow_state_expired: 'That link has expired — request a new one.',
  flow_state_not_found: 'That link is no longer valid — request a new one.',
  bad_code_verifier:
    'That link must be opened in the same browser that requested it — request a new one here.',

  // OAuth
  access_denied: 'Sign-in was cancelled — nothing happened. Try again whenever you like.',
  provider_email_needs_verification:
    'Verify your email with that provider first, then try signing in again.',
  oauth_provider_not_supported: "That sign-in method isn't available — use your email instead.",
  provider_disabled: "That sign-in method isn't available — use your email instead.",

  // Sessions
  session_expired: 'Your session has expired — sign in again.',
  session_not_found: 'Your session has ended — sign in again.',
  refresh_token_not_found: 'Your session has expired — sign in again.',

  // Our own callback failure marker (see app/auth/callback/route.ts)
  auth_callback_failed: "We couldn't complete sign-in — the link may have expired. Try again.",
}

/** Last-resort copy when the failure is genuinely unknown to us. */
export const AUTH_ERROR_FALLBACK = "Couldn't complete that — try again in a moment."

/** Map a bare error code (e.g. from a callback query param) to copy, or null. */
export function mapAuthErrorCode(code: string | null | undefined): string | null {
  if (!code) return null
  return AUTH_ERROR_COPY[code] ?? null
}

/** Map a Supabase AuthError to human copy. Always returns something renderable. */
export function mapAuthError(error: AuthErrorLike | null | undefined): string {
  if (!error) return AUTH_ERROR_FALLBACK
  const byCode = mapAuthErrorCode(error.code)
  if (byCode) return byCode
  if (error.status === 429) return RATE_LIMIT_COPY
  return AUTH_ERROR_FALLBACK
}
