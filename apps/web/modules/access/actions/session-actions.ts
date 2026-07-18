'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/action-error'
import { createClient } from '@/lib/supabase/server'

// Session management. Marking a session row revoked records the intent and hides
// it from the list; true cross-device invalidation is "Sign out everywhere"
// (global Supabase revocation), exposed separately in the UI via logoutEverywhere.

const RevokeInput = z.object({ id: z.string().uuid() })

export async function revokeSession(
  input: z.input<typeof RevokeInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = RevokeInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request' }

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const uid = claims?.claims.sub
  if (!uid) return { ok: false, error: 'Not signed in' }

  // RLS already restricts this to the principal's own sessions; the explicit
  // principal_id filter is defense in depth.
  const { error } = await supabase
    .from('sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', parsed.data.id)
    .eq('principal_id', uid)
  if (error) return { ok: false, error: 'Could not revoke the session' }

  revalidatePath('/settings/sessions')
  return { ok: true, data: { id: parsed.data.id } }
}

/**
 * The real cross-device revocation: global Supabase sign-out (kills every
 * session + refresh token) plus marking this user's session rows revoked, then
 * redirect to login. This is the enforceable control — individual other-device
 * revocation is symbolic without the admin API.
 */
export async function signOutEverywhere(): Promise<never> {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const uid = claims?.claims.sub
  if (uid) {
    try {
      await supabase
        .from('sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('principal_id', uid)
        .is('revoked_at', null)
    } catch {
      /* best-effort */
    }
  }
  await supabase.auth.signOut({ scope: 'global' })
  redirect('/login')
}
