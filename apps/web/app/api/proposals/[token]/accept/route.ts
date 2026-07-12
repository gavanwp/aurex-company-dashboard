import { type NextRequest, NextResponse } from 'next/server'
import { AcceptProposalInput } from '@aurexos/core'
import { createClient } from '@/lib/supabase/server'
import { acceptProposalByToken } from '@/modules/proposals'

const REASON_MESSAGES: Record<string, string> = {
  not_found: 'This proposal is no longer available.',
  not_acceptable: 'This proposal can no longer be accepted.',
  expired: 'This proposal has expired. Please ask for an updated version.',
}

/**
 * Client e-acceptance of a tokenized proposal. Anonymous — the token is the
 * capability. Validates the accepter's name + email, then calls the SECURITY
 * DEFINER accept_proposal_by_token RPC (0013), which performs the sent/viewed →
 * accepted state change AND writes the proposals.proposal.accepted domain event +
 * audit row atomically (the anon caller has no session and this env has no
 * service-role key, so emission lives in the definer — see the 0013 header). This
 * handler shapes the result for the page.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing proposal token' }, { status: 400 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }

  const parsed = AcceptProposalInput.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid details' },
      { status: 400 },
    )
  }

  try {
    const supabase = await createClient()
    const result = await acceptProposalByToken(
      supabase,
      token,
      parsed.data.accepterName,
      parsed.data.accepterEmail,
    )
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: REASON_MESSAGES[result.reason ?? 'not_found'] ?? 'Could not accept' },
        { status: 409 },
      )
    }
    return NextResponse.json({ ok: true, alreadyAccepted: result.alreadyAccepted ?? false })
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}
