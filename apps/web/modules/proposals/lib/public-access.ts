// Anonymous (tokenized) access to a single proposal, via the SECURITY DEFINER
// RPCs added in migration 0013. These wrappers take any Supabase client (the
// server-request anon client for the public page + route handlers) and gate
// entirely on the token — the token IS the capability. No workspace-member data
// beyond the token's proposal is ever reachable here, and the service-role key is
// never used in client-reachable code.
//
// The generated db types predate 0013's functions, so the rpc surface is reached
// through a narrow local cast rather than by regenerating packages/db.

import type { ProposalStatus } from '@aurexos/core'
import type { DbClient } from '@aurexos/db'
import { toPricingView } from './pricing'
import { parseAcceptedBy, toSectionViews } from './sections'
import type { PublicProposal } from '../types'

type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>

function rpc(client: DbClient): RpcCaller {
  return client.rpc.bind(client) as unknown as RpcCaller
}

/** Raw shape returned by get_proposal_by_token (before section/pricing shaping). */
interface RawPublicProposal {
  title: string
  status: ProposalStatus
  validUntil: string | null
  acceptMethod: PublicProposal['acceptMethod']
  currency: string
  sections: unknown
  pricing: unknown
  clientName: string | null
  workspaceName: string
  workspaceLogoUrl: string | null
  acceptedAt: string | null
  acceptedBy: unknown
  isExpired: boolean
}

/** Fetch the client-safe proposal for a token, or null if not viewable. */
export async function getPublicProposal(
  client: DbClient,
  token: string,
): Promise<PublicProposal | null> {
  const { data, error } = await rpc(client)('get_proposal_by_token', { p_token: token })
  if (error || !data || typeof data !== 'object') return null
  const raw = data as RawPublicProposal
  return {
    title: raw.title,
    status: raw.status,
    validUntil: raw.validUntil,
    acceptMethod: raw.acceptMethod,
    currency: raw.currency,
    sections: toSectionViews(raw.sections),
    pricing: toPricingView({
      currency: raw.currency,
      ...(typeof raw.pricing === 'object' && raw.pricing ? (raw.pricing as object) : {}),
    }),
    clientName: raw.clientName,
    workspaceName: raw.workspaceName,
    workspaceLogoUrl: raw.workspaceLogoUrl,
    acceptedAt: raw.acceptedAt,
    acceptedBy: parseAcceptedBy(raw.acceptedBy),
    isExpired: raw.isExpired,
  }
}

/** Record an engagement view (flips sent → viewed on first open). Best-effort. */
export async function recordProposalView(
  client: DbClient,
  token: string,
  viewerToken: string,
): Promise<void> {
  await rpc(client)('record_proposal_view', { p_token: token, p_viewer_token: viewerToken })
}

export interface AcceptRpcResult {
  ok: boolean
  reason?: 'not_found' | 'not_acceptable' | 'expired'
  alreadyAccepted?: boolean
  proposalId?: string
}

/** Client e-acceptance. Returns the definer function's structured result. */
export async function acceptProposalByToken(
  client: DbClient,
  token: string,
  accepterName: string,
  accepterEmail: string,
): Promise<AcceptRpcResult> {
  const { data, error } = await rpc(client)('accept_proposal_by_token', {
    p_token: token,
    p_accepter_name: accepterName,
    p_accepter_email: accepterEmail,
  })
  if (error || !data || typeof data !== 'object') {
    return { ok: false, reason: 'not_found' }
  }
  return data as AcceptRpcResult
}
