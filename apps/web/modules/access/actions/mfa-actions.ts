'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/action-error'
import { createClient } from '@/lib/supabase/server'

// Two-factor auth via Supabase Auth's native TOTP MFA. The mfa_factors table
// (0021) mirrors enrollment so the Security Center can report org-wide coverage;
// Supabase remains the source of truth for the actual factor + verification.

export interface MfaEnrollment {
  factorId: string
  /** SVG (data URI) QR code encoding the otpauth:// URI. */
  qrCode: string
  /** Base32 secret for manual entry. */
  secret: string
}

/**
 * Begin TOTP enrollment: creates an unverified factor and returns the QR + secret
 * to display. The registry row is inserted unverified; verification confirms it.
 */
export async function startMfaEnrollment(): Promise<ActionResult<MfaEnrollment>> {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const uid = claims?.claims.sub
  if (!uid) return { ok: false, error: 'Not signed in' }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Could not start MFA enrollment' }
  }

  // Mirror into the registry (unverified). Best-effort — Supabase is the truth.
  try {
    await supabase
      .from('mfa_factors')
      .insert({ principal_id: uid, type: 'totp', label: 'Authenticator app', secret_ref: data.id })
  } catch {
    /* registry mirror is best-effort */
  }

  return {
    ok: true,
    data: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret },
  }
}

const ConfirmInput = z.object({
  factorId: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
})

/** Verify the 6-digit code to activate the factor. */
export async function confirmMfaEnrollment(
  input: z.input<typeof ConfirmInput>,
): Promise<ActionResult<{ factorId: string }>> {
  const parsed = ConfirmInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid code' }
  }
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const uid = claims?.claims.sub
  if (!uid) return { ok: false, error: 'Not signed in' }

  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({
    factorId: parsed.data.factorId,
  })
  if (cErr || !challenge) return { ok: false, error: cErr?.message ?? 'Could not start challenge' }

  const { error: vErr } = await supabase.auth.mfa.verify({
    factorId: parsed.data.factorId,
    challengeId: challenge.id,
    code: parsed.data.code,
  })
  if (vErr) return { ok: false, error: 'That code was not valid. Try again.' }

  try {
    await supabase
      .from('mfa_factors')
      .update({ verified_at: new Date().toISOString(), last_used_at: new Date().toISOString() })
      .eq('principal_id', uid)
      .eq('secret_ref', parsed.data.factorId)
  } catch {
    /* best-effort */
  }
  revalidatePath('/settings/sessions')
  return { ok: true, data: { factorId: parsed.data.factorId } }
}

const RemoveInput = z.object({ factorId: z.string().min(1) })

/** Remove a TOTP factor. */
export async function removeMfaFactor(
  input: z.input<typeof RemoveInput>,
): Promise<ActionResult<{ factorId: string }>> {
  const parsed = RemoveInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request' }
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const uid = claims?.claims.sub
  if (!uid) return { ok: false, error: 'Not signed in' }

  const { error } = await supabase.auth.mfa.unenroll({ factorId: parsed.data.factorId })
  if (error) return { ok: false, error: error.message ?? 'Could not remove the factor' }

  try {
    await supabase
      .from('mfa_factors')
      .update({ revoked_at: new Date().toISOString() })
      .eq('principal_id', uid)
      .eq('secret_ref', parsed.data.factorId)
  } catch {
    /* best-effort */
  }
  revalidatePath('/settings/sessions')
  return { ok: true, data: { factorId: parsed.data.factorId } }
}
