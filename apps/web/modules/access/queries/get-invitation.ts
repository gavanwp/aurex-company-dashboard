import 'server-only'

import { createClient } from '@/lib/supabase/server'

// Public-safe preview of an invitation for a token holder (invitation_preview
// RPC, 0022). Works without a workspace membership — the token is the secret.

export interface InvitationPreview {
  email: string
  orgName: string | null
  workspaceName: string | null
  roleName: string | null
  valid: boolean
  expiresAt: string
}

export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('invitation_preview', { raw_token: token })
  const row = Array.isArray(data) ? data[0] : null
  if (!row) return null
  return {
    email: row.email,
    orgName: row.org_name,
    workspaceName: row.workspace_name,
    roleName: row.role_name,
    valid: row.valid,
    expiresAt: row.expires_at,
  }
}
