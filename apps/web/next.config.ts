import type { NextConfig } from 'next'

// Baseline CSP. Enforced for the passive directives (framing, base-uri, object,
// form-action) and shipped Report-Only for script/style so a future nonce-based
// enforce pass can be validated against real violation telemetry before it can
// break the app (Next injects inline bootstrap scripts, hence 'unsafe-inline'
// today). connect-src covers Supabase REST + Realtime; tighten per env later.
const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "form-action 'self'",
  "frame-src 'self'",
].join('; ')

// Applied to every response. Clickjacking, MIME-sniffing, referrer leakage,
// transport downgrade, and powerful-feature access are all denied by default.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=()',
  },
  { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
] as const

const nextConfig: NextConfig = {
  transpilePackages: ['@aurexos/ui', '@aurexos/core', '@aurexos/db'],
  // Ship a quieter, slightly smaller production bundle — drop debug logging but
  // keep the best-effort error/warn logs the mutation spine relies on.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  async headers() {
    return [{ source: '/:path*', headers: [...securityHeaders] }]
  },
}

export default nextConfig
