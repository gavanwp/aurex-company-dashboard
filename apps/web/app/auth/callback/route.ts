import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Codes we forward to /login?error=… — anything else collapses to the
// generic marker so the query string can't smuggle arbitrary strings.
const SAFE_ERROR_CODE = /^[a-z0-9_]{1,64}$/

/**
 * PKCE code exchange — one generic route for every email/OAuth flow:
 * signup confirmation, magic link, password recovery (?next=/reset-password)
 * and OAuth (Google, GitHub). Supabase redirects here with ?code=…; we
 * exchange it for a session, then enter the OS (or the `next` target).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/dashboard'
  // Only allow same-origin relative redirects.
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // No code (e.g. the user cancelled the OAuth consent, or the link expired):
  // Supabase sends ?error=…&error_code=…. Forward the code so the login page
  // can map it to human copy (lib/auth-errors.ts) — never the description text.
  const providerCode = searchParams.get('error_code') ?? searchParams.get('error')
  const errorCode =
    providerCode && SAFE_ERROR_CODE.test(providerCode) ? providerCode : 'auth_callback_failed'

  return NextResponse.redirect(`${origin}/login?error=${errorCode}`)
}
