import { z } from 'zod'

// The ONE place env vars are read (per .env.example). Validation is lazy —
// getEnv() throws at first use, never at module load, so `next build` succeeds
// without a configured environment.
//
// NEXT_PUBLIC_* vars MUST be referenced as literal `process.env.NEXT_PUBLIC_X`
// expressions — Next.js inlines them into the client bundle at build time and
// dynamic access (process.env[name]) silently yields undefined in the browser.

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  // ── Gmail integration (server-only, OPTIONAL) ─────────────────────────────
  // Absent in dev/preview environments without a Google Cloud project: the app
  // boots and the Email Center renders its "coming soon" connect card. All
  // three must be set for isGmailConfigured() to flip the live connect flow on.
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  // Base64-encoded 32-byte AES-256-GCM key (SecurityArchitecture.md §4.3 /
  // register S4: token-encryption keys live outside the database). Byte-length
  // validation happens in lib/mailbox-crypto.ts, the only consumer.
  MAILBOX_TOKEN_KEY: z.string().min(1).optional(),
})

export type Env = z.infer<typeof EnvSchema>

// Runtime mode, exposed here so feature code never touches process.env (R-S3).
export const isProduction = process.env.NODE_ENV === 'production'

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached

  const parsed = EnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    MAILBOX_TOKEN_KEY: process.env.MAILBOX_TOKEN_KEY,
  })

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new Error(
      `Invalid environment configuration — copy .env.example to .env.local and fill it in. (${details})`,
    )
  }

  cached = parsed.data
  return cached
}

// ── Gmail integration helpers ────────────────────────────────────────────────

export interface GmailEnv {
  clientId: string
  clientSecret: string
  mailboxTokenKey: string
}

/**
 * True when the Google OAuth app + token-encryption key are all configured.
 * Server components use this to decide whether the Email Center shows the
 * live connect flow or the "coming soon" state — the app must work without it.
 */
export function isGmailConfigured(): boolean {
  const env = getEnv()
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.MAILBOX_TOKEN_KEY)
}

/**
 * The Gmail integration env bundle. Throws a clear configuration error when
 * any part is missing — callers behind isGmailConfigured() never hit this.
 */
export function getGmailEnv(): GmailEnv {
  const env = getEnv()
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.MAILBOX_TOKEN_KEY) {
    throw new Error(
      'Gmail integration is not configured — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and MAILBOX_TOKEN_KEY (see .env.example).',
    )
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    mailboxTokenKey: env.MAILBOX_TOKEN_KEY,
  }
}
