import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database, DbClient } from '@aurexos/db'
import { getEnv } from '@/lib/env'

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Next 15: cookies() is async — always `await createClient()`.
 */
export async function createClient(): Promise<DbClient> {
  const cookieStore = await cookies()
  const env = getEnv()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Safe to ignore: middleware.ts refreshes the session cookie.
          }
        },
      },
    },
  )
}
