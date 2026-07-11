import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getEnv, isGmailConfigured, isProduction } from '@/lib/env'
import {
  buildGmailAuthUrl,
  GMAIL_STATE_COOKIE,
  GMAIL_STATE_MAX_AGE_SECONDS,
} from '@/lib/gmail-oauth'
import { getWorkspaceContext } from '@/lib/workspace-context'

/**
 * Start the Gmail OAuth code flow. Sets a short-lived, httpOnly state nonce
 * cookie (CSRF defense) and redirects to Google's consent screen. Server-only
 * throughout — no token material is created here.
 */
export async function GET() {
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL

  if (!isGmailConfigured()) {
    return NextResponse.redirect(new URL('/email?error=gmail_not_configured', appUrl))
  }

  // Redirects to /login when unauthenticated; to /onboarding without a workspace.
  const ctx = await getWorkspaceContext()
  if (ctx.role === 'client' || ctx.role === 'guest') {
    return NextResponse.redirect(new URL('/email?error=gmail_forbidden', appUrl))
  }

  const state = randomBytes(32).toString('base64url')
  const response = NextResponse.redirect(buildGmailAuthUrl(state))
  response.cookies.set(GMAIL_STATE_COOKIE, state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: GMAIL_STATE_MAX_AGE_SECONDS,
  })
  return response
}
