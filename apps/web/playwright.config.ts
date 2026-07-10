import { defineConfig, devices } from '@playwright/test'

// E2E config (08_Tech_Stack.md §8). Foundation phase: chromium only — firefox/webkit
// join when the golden-path suites land (10_Roadmap.md §9). Two-tenant isolation
// tests will use multiple browser contexts, which Playwright supports per-test.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // A stray .only must never shrink the blocking suite in CI (R-Q5).
  forbidOnly: !!process.env.CI,
  // No retries: a flaky test is a P1 bug, not something to retry into submission (R-Q5).
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // webServer is intentionally NOT enabled: the app requires a running local
  // Supabase stack (auth + seeded data) before `next start` is useful, and that
  // orchestration lives outside Playwright:
  //
  //   supabase start          # applies supabase/migrations + supabase/seed/seed.sql
  //   pnpm turbo build --filter=web
  //   pnpm --filter web start # serves on :3000
  //   pnpm --filter web test:e2e
  //
  // CI does the same in the e2e-smoke job (.github/workflows/ci.yml). Once local
  // Supabase bootstrap is scripted, uncomment to let Playwright own the server:
  //
  // webServer: {
  //   command: 'pnpm start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
})
