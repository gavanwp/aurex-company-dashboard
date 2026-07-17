# ADR 0008 — Enterprise Identity & Data-Driven RBAC

|              |                                                                                                                                                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**   | Proposed                                                                                                                                                                                                                           |
| **Date**     | 2026-07-16                                                                                                                                                                                                                         |
| **Deciders** | Chief Software Architect / Founding CTO                                                                                                                                                                                            |
| **Related**  | [EnterpriseIdentityAndRBAC.md](../architecture/EnterpriseIdentityAndRBAC.md) · [05_User_Roles.md](../05_User_Roles.md) · [ADR-0001](./0001_Multi_Tenant_Modular_Monolith.md) · [09_Scaling_Strategy.md](../09_Scaling_Strategy.md) |

## Context

AurexOS must serve thousands of agencies as a commercial SaaS with enterprise organizations, white-label, unlimited users, SSO/SCIM, custom roles, and a public API. The current system has a single tenancy tier (workspace) and a **hardcoded** `can(role, capability)` map with 10 fixed roles. This does not scale to the enterprise brief and violates the "permissions are data" intent already written in `05_User_Roles.md` §3.

## Decisions

1. **Add an Organization tier above Workspace; keep Workspace as the RLS/join-locality boundary.** Orgs own billing, branding, SSO and policy; workspaces remain the sharding key (`workspace_id` on every tenant row) so the cell-split path (`09` §2.5) is preserved. Existing workspaces backfill a default 1:1 org — no behavior change.
2. **Add a `platform` scope with a Super Admin who has ZERO standing tenant-data access.** Tenant entry requires a customer-granted, audited support session or two-person break-glass.
3. **Replace hardcoded permissions with a data-driven engine:** a global `permissions` catalog (`module.resource.action`), `roles` as additive bundles (system = immutable templates, custom = cloned + edited), and DENY-capable `user_permission_overrides` / `resource_grants` / `organization_policies` (caps only subtract). Effective permission is a pure, deterministic, **DENY-wins** resolution over these, cached as a JWT **permission digest** with `perm_epoch` invalidation (≤60s), DB as truth.
4. **Model the 19 requested roles as 1 platform + ~14 permission-roles + 4 specialization _templates_.** Designer/Developer/SEO/Content ship as seeded custom roles cloned from Employee (selectable in the picker) but share Employee's permission set; the specialization is an attribute driving dashboards/routing/AI context. This honors the product's language while preserving the anti-role-explosion invariant (`05` §2.4); graduation to a real custom role needs zero data migration.
5. **Enforce in three layers, guard on every route.** RLS (`has_permission()` security-definer) → `requirePermission()` (CI-enforced, extends `defineAction`) → UI hiding. The `05` §6 matrix stays the single source of truth, exported as a typed constant feeding both the seed and the guard-test suite (drift fails CI).

## Consequences

- **Positive:** enterprise-ready (orgs, SSO/SCIM, white-label, custom roles, public API) on the existing foundation; no rewrite; adding a permission is a seed row; the engine is O(1) on the hot path and shard-ready.
- **Cost:** a migration sequence (`0017`–`0021`, each independently shippable) and a transition shim keeping the old `can()` signature until the engine cutover lands.
- **Guardrails preserved:** deny-by-default, workspace-keyed RLS, insert-only audit, soft delete, and "AI never escalates" are all carried forward unchanged.

## Alternatives rejected

- **Keep hardcoded roles, add more enums** — fails the "unlimited custom roles" and "permissions not hardcoded" requirements; every new module/role is a deploy.
- **Make Organization the RLS boundary** — would create cross-workspace joins in product features and break the cell-sharding invariant (`09` §1.2).
- **Give AI/agents a service role** — violates `05` §8 (AI never escalates); rejected in favor of invoker-scoped execution.
