'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getEnv } from '@/lib/env'
import { mapAuthError, mapAuthErrorCode, AUTH_ERROR_FALLBACK } from '@/lib/auth-errors'
import type { ActionResult } from '@/lib/action-kit'

const LoginInput = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

const SignupInput = z.object({
  fullName: z.string().min(1, 'Your name is required').max(120),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const EmailInput = z.object({
  email: z.string().email('Enter a valid email address'),
})

const PasswordInput = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input'
}

export async function login(email: string, password: string): Promise<ActionResult> {
  const parsed = LoginInput.safeParse({ email, password })
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { ok: false, error: mapAuthError(error) }

  // Record the login + a session row for the Security surface (0021). Best-effort:
  // wrapped so a recording failure never blocks sign-in. RLS lets the just-authed
  // user insert their own auth_events / sessions rows.
  const userId = data.user?.id
  if (userId) {
    try {
      const { data: orgm } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('principal_id', userId)
        .limit(1)
        .maybeSingle()
      const organizationId = orgm?.organization_id ?? null
      await supabase.from('auth_events').insert({
        principal_id: userId,
        organization_id: organizationId,
        type: 'login',
        method: 'password',
        success: true,
      })
      await supabase
        .from('sessions')
        .insert({ principal_id: userId, organization_id: organizationId })
    } catch {
      /* best-effort telemetry — never block login */
    }
  }

  redirect('/dashboard')
}

export interface SignupData {
  /** True when email confirmation is required before a session exists. */
  needsEmailConfirmation: boolean
}

export async function signup(
  fullName: string,
  email: string,
  password: string,
): Promise<ActionResult<SignupData>> {
  const parsed = SignupInput.safeParse({ fullName, email, password })
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${getEnv().NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })
  if (error) return { ok: false, error: mapAuthError(error) }

  // With email confirmation enabled, signUp returns a user but no session.
  if (!data.session) {
    return { ok: true, data: { needsEmailConfirmation: true } }
  }

  redirect('/dashboard')
}

/**
 * Send the password-recovery email. Enumeration-safe by design: only rate
 * limiting surfaces as an error — everything else reads as sent, so the
 * response never reveals whether an account exists for the address.
 */
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const parsed = EmailInput.safeParse({ email })
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getEnv().NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  })
  if (error && (error.code === 'over_email_send_rate_limit' || error.status === 429)) {
    return { ok: false, error: mapAuthError(error) }
  }

  return { ok: true, data: undefined }
}

/**
 * Complete password recovery. Requires the recovery session established by
 * /auth/callback; on success every session is revoked (AuthenticationArchitecture
 * §2.5) and the user re-authenticates with the new password.
 */
export async function updatePassword(password: string): Promise<ActionResult> {
  const parsed = PasswordInput.safeParse({ password })
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: mapAuthErrorCode('otp_expired') ?? AUTH_ERROR_FALLBACK }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { ok: false, error: mapAuthError(error) }

  await supabase.auth.signOut({ scope: 'global' })
  redirect('/login?notice=password_updated')
}

/**
 * Change password from Settings → Security. Same password rules, but the
 * current session survives — no redirect, no sign-out (other devices keep
 * their sessions until "Sign out everywhere" or natural expiry).
 */
export async function changePassword(password: string): Promise<ActionResult> {
  const parsed = PasswordInput.safeParse({ password })
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: mapAuthErrorCode('session_expired') ?? AUTH_ERROR_FALLBACK }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { ok: false, error: mapAuthError(error) }

  return { ok: true, data: undefined }
}

/**
 * The ONE sign-out path (AuthenticationArchitecture §3.3 revocation).
 * scope 'local' ends this session only; 'global' revokes every session
 * and refresh token for the user across all devices.
 */
async function signOut(scope: 'local' | 'global'): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope })
  redirect('/login')
}

/** Sign out of the current session only. */
export async function logout(): Promise<void> {
  await signOut('local')
}

/** Sign out everywhere — revokes all sessions on all devices. */
export async function logoutEverywhere(): Promise<void> {
  await signOut('global')
}
