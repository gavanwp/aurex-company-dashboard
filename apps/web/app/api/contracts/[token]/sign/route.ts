import { type NextRequest, NextResponse } from 'next/server'
import { SignContractInput } from '@aurexos/core'
import { createClient } from '@/lib/supabase/server'
import { signContractByToken } from '@/modules/contracts'

const REASON_MESSAGES: Record<string, string> = {
  not_found: 'This contract is no longer available.',
  not_signable: 'This contract can no longer be signed.',
}

/**
 * Client e-signature of a tokenized contract. Anonymous — the token is the
 * capability. Validates the signer's name + email, then calls the SECURITY
 * DEFINER sign_contract_by_token RPC (0015), which performs the sent → signed
 * state change AND writes the contracts.contract.signed domain event + audit row
 * atomically (the anon caller has no session and this env has no service-role
 * key, so emission lives in the definer — see the 0015 header). This handler
 * shapes the result for the page. Real embedded e-sign (DocuSign-class) is the
 * next increment.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing contract token' }, { status: 400 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }

  const parsed = SignContractInput.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid details' },
      { status: 400 },
    )
  }

  try {
    const supabase = await createClient()
    const result = await signContractByToken(
      supabase,
      token,
      parsed.data.signerName,
      parsed.data.signerEmail,
    )
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: REASON_MESSAGES[result.reason ?? 'not_found'] ?? 'Could not sign' },
        { status: 409 },
      )
    }
    return NextResponse.json({ ok: true, alreadySigned: result.alreadySigned ?? false })
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}
