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
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached

  const parsed = EnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
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
