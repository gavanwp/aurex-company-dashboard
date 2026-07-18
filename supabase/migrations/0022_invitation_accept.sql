-- 0022 — Invitation acceptance (Enterprise RBAC — completes the invite loop)
-- Docs: docs/architecture/EnterpriseIdentityAndRBAC.md §3.3, §4; ADR-0008.
--
-- Two security-definer RPCs. The invitee is NOT a workspace member yet, so RLS on
-- workspace_members would block a self-insert — acceptance must run as definer,
-- validating the token + email match internally (like create_workspace, 0002).
-- The raw token lives only in the invite link; only its SHA-256 is stored (0021),
-- so these hash the incoming token and compare.

-- ── Preview: safe, non-sensitive invite details for a token holder ────────────
-- Callable by anyone (the token is the secret); exposes only display fields.
create or replace function public.invitation_preview(raw_token text)
returns table (
  email text,
  org_name text,
  workspace_name text,
  role_name text,
  valid boolean,
  expires_at timestamptz
)
language sql
security definer
stable
set search_path = public, extensions
as $$
  select
    i.email,
    o.name,
    w.name,
    r.name,
    (i.status = 'pending' and i.expires_at > now()),
    i.expires_at
  from public.invitations i
  left join public.organizations o on o.id = i.organization_id
  left join public.workspaces w on w.id = i.workspace_id
  left join public.roles r on r.id = i.role_id
  where i.token_hash = encode(digest(raw_token, 'sha256'), 'hex')
  limit 1;
$$;

-- ── Accept: create the membership, mark the invite accepted ───────────────────
create or replace function public.accept_invitation(raw_token text)
returns uuid   -- the workspace joined (for redirect); raises on any failure
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  inv public.invitations;
  uid uuid := auth.uid();
  user_email text;
  role_key text;
  legacy public.workspace_role;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select email into user_email from public.profiles where id = uid;

  select * into inv from public.invitations
    where token_hash = encode(digest(raw_token, 'sha256'), 'hex')
    limit 1;
  if inv.id is null then
    raise exception 'invitation not found';
  end if;
  if inv.status <> 'pending' or inv.expires_at <= now() then
    raise exception 'invitation is no longer valid';
  end if;
  -- Email must match to prevent invite hijacking (the token alone is not enough).
  if user_email is null or lower(user_email) <> lower(inv.email) then
    raise exception 'this invitation is for a different email address';
  end if;

  -- Legacy workspace_role kept in sync with the engine role (RLS backstop).
  select key into role_key from public.roles where id = inv.role_id;
  legacy := (case role_key
    when 'operations_manager' then 'admin'
    when 'project_manager' then 'project_manager'
    when 'sales_manager' then 'sales'
    when 'marketing_manager' then 'sales'
    when 'finance_manager' then 'finance'
    when 'hr_manager' then 'hr'
    when 'client' then 'client'
    when 'guest' then 'guest'
    else 'member'
  end)::public.workspace_role;

  insert into public.organization_members (organization_id, principal_id, org_role, status)
    values (inv.organization_id, uid, 'member', 'active')
    on conflict (organization_id, principal_id) do nothing;

  if inv.workspace_id is not null then
    insert into public.workspace_members (workspace_id, user_id, role, role_id)
      values (inv.workspace_id, uid, legacy, inv.role_id)
      on conflict (workspace_id, user_id)
        do update set role = excluded.role, role_id = excluded.role_id;
  end if;

  update public.invitations set status = 'accepted', accepted_at = now() where id = inv.id;

  -- Audit the join (best-effort — never block acceptance on an audit failure).
  begin
    insert into public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, after)
      values (inv.workspace_id, uid, 'workspace.member.joined', 'workspace_member', uid,
              jsonb_build_object('roleId', inv.role_id, 'roleKey', role_key, 'via', 'invitation'));
  exception when others then
    null;
  end;

  return inv.workspace_id;
end;
$$;
