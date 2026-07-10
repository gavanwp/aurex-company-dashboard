import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes reachable without a session. Everything else requires auth.
// /reset-password is public on purpose: it detects the recovery session
// in-page and shows a request-a-new-link state instead of bouncing.
const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth'] as const

// Signed-in users have no business on these — bounce them to the OS.
const AUTH_ONLY_PATHS = ['/login', '/signup'] as const

function matchesPath(pathname: string, paths: readonly string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  if (!user && !matchesPath(pathname, PUBLIC_PATHS)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (user && matchesPath(pathname, AUTH_ONLY_PATHS)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Return the updateSession response so refreshed auth cookies persist.
  return response
}

export const config = {
  matcher: [
    /*
     * All request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico and common static image/font assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
