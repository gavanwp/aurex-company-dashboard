// Anonymous (tokenized) access to a single contract, via the SECURITY DEFINER
// RPCs added in migration 0015. These wrappers take any Supabase client (the
// server-request anon client for the public page + route handlers) and gate
// entirely on the token — the token IS the capability. No workspace-member data
// beyond the token's contract is ever reachable here, and the service-role key
// is never used in client-reachable code.
//
// The generated db types predate 0015's functions, so the rpc surface is reached
// through a narrow local cast rather than by regenerating packages/db.

import type { ContractStatus, ContractType } from '@aurexos/core'
import type { DbClient } from '@aurexos/db'
import { parseSigner, toSectionViews } from './sections'
import type { PublicContract } from '../types'

type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>

function rpc(client: DbClient): RpcCaller {
  return client.rpc.bind(client) as unknown as RpcCaller
}

/** Raw shape returned by get_contract_by_token (before clause shaping). */
interface RawPublicContract {
  title: string
  type: ContractType
  status: ContractStatus
  body: unknown
  valueMinor: number | null
  currency: string
  effectiveDate: string | null
  endDate: string | null
  autoRenew: boolean
  clientName: string | null
  workspaceName: string
  workspaceLogoUrl: string | null
  signedAt: string | null
  signer: unknown
}

/** Fetch the client-safe contract for a token, or null if not viewable. */
export async function getPublicContract(
  client: DbClient,
  token: string,
): Promise<PublicContract | null> {
  const { data, error } = await rpc(client)('get_contract_by_token', { p_token: token })
  if (error || !data || typeof data !== 'object') return null
  const raw = data as RawPublicContract
  return {
    title: raw.title,
    type: raw.type,
    status: raw.status,
    body: toSectionViews(raw.body),
    valueMinor: raw.valueMinor,
    currency: raw.currency ?? 'USD',
    effectiveDate: raw.effectiveDate,
    endDate: raw.endDate,
    autoRenew: raw.autoRenew,
    clientName: raw.clientName,
    workspaceName: raw.workspaceName,
    workspaceLogoUrl: raw.workspaceLogoUrl,
    signedAt: raw.signedAt,
    signer: parseSigner(raw.signer),
  }
}

export interface SignRpcResult {
  ok: boolean
  reason?: 'not_found' | 'not_signable'
  alreadySigned?: boolean
  contractId?: string
}

/** Client e-signature. Returns the definer function's structured result. */
export async function signContractByToken(
  client: DbClient,
  token: string,
  signerName: string,
  signerEmail: string,
): Promise<SignRpcResult> {
  const { data, error } = await rpc(client)('sign_contract_by_token', {
    p_token: token,
    p_signer_name: signerName,
    p_signer_email: signerEmail,
  })
  if (error || !data || typeof data !== 'object') {
    return { ok: false, reason: 'not_found' }
  }
  return data as SignRpcResult
}
