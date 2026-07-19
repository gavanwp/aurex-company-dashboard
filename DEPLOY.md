# Deploying AurexOS to Vercel

AurexOS is a **Turborepo + pnpm** monorepo; the deployable app is `apps/web`
(Next.js 15, App Router). Vercel has first-class Turborepo support, so the import
is straightforward once the settings below are right.

> **Do this first — it is not optional.** The app reads from the Supabase **Mumbai**
> project (`tcwkxxfbzupotzoneoht`). If that project's PostgREST schema cache is
> stale, the **Profile** and **Documents** pages error (missing `profiles.title`
> and `document_*` tables in the cache) — on the live site exactly as locally.
> Fix it once: Supabase dashboard → Mumbai project → **Settings → General →
> Restart project**. That forces a schema reload. (Migrations `0024`/`0025` are
> already applied to that project.)

---

## 1. Import the repo

1. Go to **vercel.com → Add New… → Project**.
2. Import **`gavanwp/aurex-company-dashboard`**.
3. In **Configure Project**:
   - **Root Directory** → set to **`apps/web`** (click _Edit_ → choose `apps/web`).
     Vercel detects the pnpm workspace root above it and installs from there.
   - **Framework Preset** → **Next.js** (auto-detected).
   - Leave Build/Install commands on their defaults — Vercel's Turborepo
     detection runs `pnpm install` at the root and `next build` for `apps/web`.

## 2. Environment variables

Add these under **Settings → Environment Variables** (values come from your local
`apps/web/.env.local`). Mark them for **Production** (and Preview if you want PR
deploys).

| Variable                        | Required | Notes                                                |
| ------------------------------- | -------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅       | `https://tcwkxxfbzupotzoneoht.supabase.co`           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅       | Mumbai anon/publishable key                          |
| `NEXT_PUBLIC_APP_URL`           | ✅       | Your Vercel URL, e.g. `https://<project>.vercel.app` |
| `MAILBOX_TOKEN_KEY`             | ✅       | AES key for Gmail token encryption                   |
| `GOOGLE_CLIENT_ID`              | ⬜       | Only if using Google OAuth / Gmail sync              |
| `GOOGLE_CLIENT_SECRET`          | ⬜       | ”                                                    |
| `ANTHROPIC_API_KEY`             | ⬜       | Enables live AI surfaces (Automation drafting, Q&A)  |
| `SUPABASE_SERVICE_ROLE_KEY`     | ⬜       | Needed later for Documents file upload/download      |

> `NEXT_PUBLIC_*` values are **inlined at build time** — set them before the first
> deploy (or redeploy after adding them).

## 3. Deploy

Click **Deploy**. Vercel builds and gives you a `*.vercel.app` URL.

## 4. Post-deploy wiring

1. **Supabase Auth redirect URLs** — Supabase dashboard → **Authentication → URL
   Configuration** → add your Vercel URL to _Site URL_ and _Redirect URLs_
   (otherwise email/OAuth sign-in bounces).
2. **Google OAuth** (if used) — add `https://<project>.vercel.app/api/integrations/gmail/callback`
   (and the Supabase auth callback) to the Google Cloud console authorized
   redirect URIs.
3. **`NEXT_PUBLIC_APP_URL`** — set it to the final Vercel URL and redeploy.

## What works vs. what's gated

- **Working:** Dashboard, CRM, Clients, Projects, Tasks, Calendar, Meetings,
  Email center, Finance, Proposals, Contracts, Team, Automation, Settings.
- **Needs the schema-cache restart (step 0):** Profile, Documents browser.
- **Needs `SUPABASE_SERVICE_ROLE_KEY` + a private storage bucket:** Documents
  file upload/download (metadata + versioning work without it).
