-- 0019 — Engine cutover: the has_permission() resolver (Enterprise RBAC step 3)
-- Docs: docs/architecture/EnterpriseIdentityAndRBAC.md §1.2–§1.3; ADR-0008.
--
-- The security-definer resolver that turns the 0018 engine tables into a boolean
-- decision. It is the DB-side truth (usable in RLS policies) and the parity
-- reference for the in-process app resolver (apps/web/lib/permissions.ts).
--
-- Resolution (DENY-wins, mirrors §1.2):
--   deny override           → false, always
--   workspace role grant    → allow
--   org owner/admin          → organization_owner's full set applies in their workspaces
--   allow override           → allow
--   otherwise               → false (deny by default)
--
-- Org owner/admin elevation preserves the pre-cutover behavior where a workspace
-- 'owner' had full access — their authority now flows from the organization tier.

create or replace function public.has_permission(ws_id uuid, perm text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    case
      -- Explicit DENY wins over any grant, at matching or broader scope.
      when exists (
        select 1 from public.user_permission_overrides o
        where o.principal_id = auth.uid()
          and o.permission_key = perm
          and o.effect = 'deny'
          and (o.workspace_id = ws_id or o.workspace_id is null)
          and (o.expires_at is null or o.expires_at > now())
      ) then false
      else (
        -- Workspace role grant.
        exists (
          select 1
          from public.workspace_members m
          join public.role_permissions rp on rp.role_id = m.role_id
          where m.workspace_id = ws_id and m.user_id = auth.uid() and rp.permission_key = perm
        )
        -- Organization owner/admin elevation: full org set applies in their workspaces.
        or exists (
          select 1
          from public.workspaces w
          join public.organization_members om on om.organization_id = w.organization_id
          join public.roles r on r.key = 'organization_owner' and r.is_system and r.deleted_at is null
          join public.role_permissions rp on rp.role_id = r.id
          where w.id = ws_id
            and om.principal_id = auth.uid()
            and om.org_role in ('owner', 'admin')
            and rp.permission_key = perm
        )
        -- Allow override.
        or exists (
          select 1 from public.user_permission_overrides o
          where o.principal_id = auth.uid()
            and o.permission_key = perm
            and o.effect = 'allow'
            and (o.workspace_id = ws_id or o.workspace_id is null)
            and (o.expires_at is null or o.expires_at > now())
        )
      )
    end;
$$;

comment on function public.has_permission(uuid, text) is
  'RBAC resolver (ADR-0008): true if the current user holds permission `perm` in workspace `ws_id`. DENY-wins over role grants + org-owner elevation + allow overrides.';
