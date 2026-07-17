import 'server-only'

import { buildGateway, SupabaseUsageSink, type AiGateway, type UsageTableClient } from '@aurexos/ai'
import { getAiEnv } from '@/lib/env'
import type { WorkspaceContext } from '@/lib/workspace-context'

// The app's single entry to the AI gateway (R-AI1: all model calls go through
// packages/ai). Usage is written to ai_usage via the caller's workspace-scoped
// client, so metering is tenancy-correct and RLS-guarded (R-AI2). The gateway
// itself writes usage on every call — features cannot skip it.
//
// Constructing per call is cheap (adapter instances only) and keeps the usage
// sink bound to the acting request's Supabase client.

export function buildWorkspaceGateway(ctx: WorkspaceContext): AiGateway {
  // Structural bridge: the Supabase client satisfies UsageTableClient at runtime
  // (from(table).insert(rows)); the PostgREST builder's typed insert signature
  // differs, so it is asserted at the boundary — the same pattern the query
  // layer uses for PostgREST embeds. A checked double assertion, not `any`.
  const usageClient = ctx.supabase as unknown as UsageTableClient
  return buildGateway({ env: getAiEnv(), usageSink: new SupabaseUsageSink(usageClient) })
}
