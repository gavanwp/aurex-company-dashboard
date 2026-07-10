# supabase/tests — RLS / tenancy test suite

Database-level adversarial tests required by **R-S7** ("adversarial tests for every
permission surface") and **R-D1** ("RLS on every table, no exceptions"), per
[08_Tech_Stack.md](../../docs/08_Tech_Stack.md) §8 (pgTAP-style SQL tests).

These are plain SQL files with `DO`-block assertions — a violated assertion
`raise exception`s, `psql -v ON_ERROR_STOP=1` exits non-zero, and CI fails.
No pgTAP extension needed; if we adopt `supabase test db` (pg_prove/pgTAP)
later, these files convert mechanically (`raise exception` → `ok()`/`throws_ok()`).

## Files

### `rls_smoke.sql`

1. **R-D1 lint-as-test** — every table in `public` has
   `pg_class.relrowsecurity = true`; fails naming any offender, so a new table
   without RLS cannot merge.
2. **Tenant isolation (read path)** — builds a throwaway tenant B (rolled
   back), impersonates seeded user A via the `request.jwt.claims` GUC (the
   same mechanism PostgREST uses for `auth.uid()`), and asserts zero tenant-B
   rows across `workspaces`, `projects`, `tasks`, `invoices`,
   `ai_conversations`, and `embeddings`. A positive control first proves user
   A _does_ see tenant A — no vacuous pass.
3. **Tenant isolation (write path)** — a cross-tenant `INSERT` must be
   rejected by RLS (`42501`).
4. **`jobs` is service-role only** — zero rows for _any_ authenticated user,
   even in their own workspace (migration 0011: RLS enabled, zero policies).
5. **`anon` deny-by-default** — zero rows everywhere for the anonymous role.

Every file must be self-contained: `begin; … rollback;` so fixtures never
persist, and runnable in any order.

## Run locally

```sh
supabase start                       # applies supabase/migrations + seed/seed.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -v ON_ERROR_STOP=1 -f supabase/tests/rls_smoke.sql
```

Success prints `PASS:` notices and ends with `RLS smoke suite: ALL PASSED`.
Re-running is safe — fixtures roll back. If you changed migrations, use
`supabase db reset` first so the schema and seed match `main`.

## CI wiring

`.github/workflows/ci.yml` job **`rls-tests`** (part of the R-Q5 blocking suite):
sets up the Supabase CLI, runs `supabase start` + `supabase db reset` (all
migrations + seed), then executes every `supabase/tests/*.sql` via `psql` with
`ON_ERROR_STOP` — any assertion failure fails the job.

## Adding tests

- One file per surface (e.g. `rls_portal_role.sql` when the client portal lands).
- Always include the **negative case** — a test that only proves allowed access
  passes proves nothing (R-S7).
- New tables automatically fall under the R-D1 check in `rls_smoke.sql`; add
  explicit cross-tenant assertions for tables with non-standard policies
  (append-only streams, service-role-only tables, ACL-scoped KB tables).
- RLS policy changes ship with their tests **in the same PR**
  ([DeploymentArchitecture.md](../../docs/architecture/DeploymentArchitecture.md) §6).
