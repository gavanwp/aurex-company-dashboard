import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@aurexos/db'
import { getEnv } from '@/lib/env'

export interface UpdateSessionResult {
  response: NextResponse
  user: User | null
}

/**
 * Standard @supabase/ssr session refresh for middleware. Keeps the auth
 * cookie fresh on every request and reports the (server-verified) user.
 *
 * IMPORTANT: do not run other logic between createServerClient and
 * auth.getUser() — a subtle bug can make sessions randomly drop.
 */
export async function updateSession(request: NextRequest): Promise<UpdateSessionResult> {
  let response = NextResponse.next({ request })
  const env = getEnv()

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}
