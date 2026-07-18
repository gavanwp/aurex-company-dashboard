import 'server-only'

import { createClient } from '@/lib/supabase/server'

// The signed-in user's MFA status, from Supabase Auth (the source of truth for
// the current user's factors). The mfa_factors registry mirrors this for the
// org-wide Security Center report.

export interface MfaStatus {
  enrolled: boolean
  factorId: string | null
}

export async function getMfaStatus(): Promise<MfaStatus> {
  const supabase = await createClient()
  const { data } = await supabase.auth.mfa.listFactors()
  const verified = (data?.totp ?? []).find((f) => f.status === 'verified')
  return { enrolled: !!verified, factorId: verified?.id ?? null }
}
