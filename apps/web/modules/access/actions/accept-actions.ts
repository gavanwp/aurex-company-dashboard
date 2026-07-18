'use server'

import { z } from 'zod'
import { cookies } from 'next/headers'
import type { ActionResult } from '@/lib/action-error'
import { createClient } from '@/lib/supabase/server'
import { WORKSPACE_COOKIE } from '@/lib/workspace-context'

// Accept an invitation. Runs the accept_invitation RPC (security definer, 0022):
// it validates the token + email match and creates the membership — the invitee
// isn't a member yet, so this can't go through the normal RLS-guarded path.

const AcceptInput = z.object({ token: z.string().min(1) })

export async function acceptInvitation(
  input: z.input<typeof AcceptInput>,
): Promise<ActionResult<{ workspaceId: string | null }>> {
  const parsed = AcceptInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid invitation' }

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims.sub) {
    return { ok: false, error: 'Please sign in with the invited email to accept.' }
  }

  const { data: workspaceId, error } = await supabase.rpc('accept_invitation', {
    raw_token: parsed.data.token,
  })
  if (error) {
    // The RPC raises human-readable messages (wrong email, expired, etc.).
    return {
      ok: false,
      error: error.message.replace(/^.*:\s*/, '') || 'Could not accept the invitation',
    }
  }

  // Land the accepted workspace as the active one.
  if (workspaceId) {
    const store = await cookies()
    store.set(WORKSPACE_COOKIE, workspaceId, { path: '/', sameSite: 'lax', httpOnly: false })
  }
  return { ok: true, data: { workspaceId: workspaceId ?? null } }
}
