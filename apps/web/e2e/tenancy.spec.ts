import { test } from '@playwright/test'

// Two-tenant isolation contract (08_Tech_Stack.md §8: "user A must never see
// workspace B data — run on every PR"; R-S7: the negative case IS the test).
//
// STATUS: contract codified, execution blocked on fixtures. supabase/seed/seed.sql
// currently seeds exactly ONE tenant:
//   user A:      demo@aurexdesigns.com / aurexos-demo (…000001)
//   workspace A: AurexDesigns (…00aa01), projects …00f001-…00f003
// Every test below needs a SECOND seeded tenant (user B, workspace B with its
// own project, plus a client-role membership) and an authenticated-session
// helper. Unblock: extend seed.sql with tenant B fixtures, add
// e2e/helpers/auth.ts (UI login or supabase-js session injection), then
// promote each deferred test below to a real implementation.
//
// The deferred marker excludes these from the run (and from CI's smoke job,
// which targets smoke.spec.ts only) while keeping the contract visible in
// every test report. Until then, the same isolation guarantees are enforced
// at the database layer by supabase/tests/rls_smoke.sql on every PR.

test.describe('tenant isolation (RLS + app routing)', () => {
  test.fixme('user A cannot open workspace B project by direct URL', async ({ browser }) => {
    // Contract: log in as user A, navigate straight to /projects/<project-B-id>.
    // Expected: 404/redirect with ZERO project-B data in the response — RLS
    // returns no row, and the page must not leak existence via error copy.
    // Needs: seeded tenant B with at least one project (fixed UUID like the
    // …00f001 pattern seed.sql uses for tenant A).
    void browser
  })

  test.fixme('workspace switcher scopes lists to the active workspace', async ({ browser }) => {
    // Contract: a user who belongs to BOTH workspaces switches A -> B; the
    // projects/tasks/clients lists must swap completely — no residual rows
    // from A (stale cache, zustand store, or react-query key missing the
    // workspace id are the classic leaks).
    // Needs: seeded user with dual membership + one distinctly-named entity
    // per workspace to assert on.
    void browser
  })

  test.fixme('client (portal) role cannot reach internal (os) routes', async ({ browser }) => {
    // Contract: a client-role member of workspace A logs in and requests
    // /crm, /settings, /clients — the capability map (packages/core/src/
    // permissions) gives client only dashboard/projects/tasks view, so each
    // must redirect or 404, never render internal data. Two contexts (owner
    // + client) prove the same URL renders for one and not the other.
    // Needs: seeded client-role user in workspace A.
    void browser
  })
})
