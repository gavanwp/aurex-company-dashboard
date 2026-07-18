import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getInvitationPreview, InviteAccept } from '@/modules/access'

export const metadata: Metadata = { title: 'Accept invitation' }

// Public route (middleware PUBLIC_PATHS): a token holder can preview and accept
// even before they are a member. Acceptance itself requires being signed in as
// the invited email (enforced by the accept_invitation RPC).
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [preview, supabase] = await Promise.all([getInvitationPreview(token), createClient()])
  const { data: claims } = await supabase.auth.getClaims()

  return <InviteAccept token={token} preview={preview} isAuthed={!!claims?.claims.sub} />
}
