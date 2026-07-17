// RBAC moved to the data-driven engine (ADR-0008 / EnterpriseIdentityAndRBAC.md).
// The permission catalog + roles + role_permissions live in the database
// (migrations 0018+) and are resolved by has_permission() (SQL, migration 0019)
// and apps/web/lib/permissions.ts (in-process, React-cached). The old hardcoded
// can(role, capability) map + ROLE_CAPABILITIES were retired at the 0019 cutover.
//
// The `Capability` string union (packages/core/src/types) is retained only as
// the legacy adapter surface that action-kit's requireCapability maps onto engine
// permission keys; new code calls requirePermission('module.resource.action').

export {}
