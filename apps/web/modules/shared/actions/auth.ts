'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getEnv } from '@/lib/env'
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

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input'
}

export async function login(email: string, password: string): Promise<ActionResult> {
  const parsed = LoginInput.safeParse({ email, password })
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { ok: false, error: error.message }

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
  if (error) return { ok: false, error: error.message }

  // With email confirmation enabled, signUp returns a user but no session.
  if (!data.session) {
    return { ok: true, data: { needsEmailConfirmation: true } }
  }

  redirect('/dashboard')
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
