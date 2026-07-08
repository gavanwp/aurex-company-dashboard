import { createBrowserClient } from '@supabase/ssr'
import type { Database, DbClient } from '@aurexos/db'
import { getEnv } from '@/lib/env'

/** Supabase client for Client Components ('use client' files only). */
export function createClient(): DbClient {
  const env = getEnv()

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
