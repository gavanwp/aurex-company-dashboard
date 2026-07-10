'use client'

import { useState } from 'react'
import { Button } from '@aurexos/ui/components/button'
import { createClient } from '@/lib/supabase/client'
import { mapAuthError } from '@/lib/auth-errors'

type OAuthProvider = 'google' | 'github'

/** Monochrome brand marks (currentColor) so both themes render correctly. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

/**
 * "Continue with Google / GitHub" pair for the login and signup cards.
 * OAuth initiation is a client-side redirect (PKCE) through the shared
 * /auth/callback exchange route — no server action involved.
 */
export function OAuthButtons() {
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  function startOAuth(provider: OAuthProvider) {
    setError(null)
    setPendingProvider(provider)
    const supabase = createClient()
    void supabase.auth
      .signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      })
      .then(({ error: oauthError }) => {
        // On success the browser navigates away; we only land here on failure.
        if (oauthError) {
          setPendingProvider(null)
          setError(mapAuthError(oauthError))
        }
      })
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={pendingProvider !== null}
        onClick={() => startOAuth('google')}
      >
        <GoogleIcon />
        {pendingProvider === 'google' ? 'Redirecting…' : 'Continue with Google'}
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={pendingProvider !== null}
        onClick={() => startOAuth('github')}
      >
        <GitHubIcon />
        {pendingProvider === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** "or" separator between the OAuth pair and the email form. */
export function AuthDivider() {
  return (
    <div className="relative" aria-hidden="true">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card px-2 text-xs text-muted-foreground">or</span>
      </div>
    </div>
  )
}
