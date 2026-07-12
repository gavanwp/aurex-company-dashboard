import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordProposalView } from '@/modules/proposals'

/**
 * Record a client view of a tokenized proposal. Anonymous — the token is the
 * capability. Delegates to the SECURITY DEFINER record_proposal_view RPC (0013),
 * which inserts the engagement row (rate-limited per viewer/day) and flips
 * sent → viewed on the first open. Always 200 (analytics is best-effort and must
 * never break the client's page).
 */
export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  let viewerToken = ''
  try {
    const body = (await request.json()) as { viewerToken?: unknown }
    if (typeof body.viewerToken === 'string') viewerToken = body.viewerToken
  } catch {
    // No/invalid body — fall through with an empty viewer token.
  }
  if (!token || !viewerToken) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  try {
    const supabase = await createClient()
    await recordProposalView(supabase, token, viewerToken)
  } catch {
    // Swallowed by design — a view that fails to record is not a client error.
  }
  return NextResponse.json({ ok: true }, { status: 200 })
}
