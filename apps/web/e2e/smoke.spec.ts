import { expect, test } from '@playwright/test'

// App-shell smoke suite — the Playwright half of the R-Q5 blocking set.
// Requires a running app backed by local Supabase (see playwright.config.ts).
// No auth needed: these exercise the unauthenticated edge of the middleware.

test.describe('app shell', () => {
  test('unauthenticated / redirects to /login', async ({ page }) => {
    await page.goto('/')
    // middleware.ts: no session + non-public path -> /login, query stripped.
    await expect(page).toHaveURL(/\/login$/)
  })

  test('unauthenticated protected route redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('login page renders the sign-in form and OAuth buttons', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText('Welcome back')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
    // OAuth pair (oauth-buttons.tsx) — presence only; the redirect flow needs
    // provider credentials and is out of scope for smoke.
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible()
    // Magic-link alternative and signup path are reachable.
    await expect(page.getByText('Email me a magic link instead')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Create one' })).toBeVisible()
  })

  test('login form validates before submitting', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('button', { name: 'Sign in' }).click()
    // Client-side zod validation (LoginFormSchema) — no server round trip needed.
    await expect(page.getByText('Enter a valid email address')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('signup page renders', async ({ page }) => {
    await page.goto('/signup')
    await expect(page).toHaveURL(/\/signup$/)
    await expect(page.getByLabel('Email')).toBeVisible()
  })
})
