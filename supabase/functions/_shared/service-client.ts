// Shared service-role client factory for Edge Function workers.
//
// ⚠ THE SERVICE ROLE BYPASSES RLS. That is why workers can run at all (jobs
// has zero RLS policies — deny-by-default for every application role), and
// why every query issued through this client MUST carry an explicit
// workspace_id predicate (docs/09 §2.3; DatabaseArchitecture.md §5.4). The
// ONE sanctioned exception is the cross-tenant jobs-claim scan documented on
// the jobs table itself (migration 0011): queues are drained across
// workspaces, and each claimed job re-scopes to its own workspace_id for all
// subsequent work.
//
// The service key exists only in the Edge runtime's secret store (R-S6) —
// never in client bundles, never in source (R-S2).

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

/**
 * Creates the service-role client for a worker invocation.
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
 * the Supabase Edge runtime; boot fails loudly if either is missing (the
 * R-S3 posture: config errors fail at start, not mid-job).
 */
export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (url === undefined || key === undefined) {
    throw new Error(
      'createServiceClient: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the Edge runtime',
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
