-- 0026 — Security hardening: role-gated RLS on sensitive modules + close the
-- role-escalation surfaces. Addresses the pre-production audit findings C1 and C2.
-- Docs: docs/architecture/EnterpriseIdentityAndRBAC.md; ADR-0008; SECURITY audit 2026-07.
--
-- WHY: authenticated users reach PostgREST directly with their own JWT, so RLS —
-- not the app-layer requirePermission — is the real authorization boundary. Until
-- now the sensitive modules authorized on workspace MEMBERSHIP only
-- (is_workspace_member), which every member — including external portal
-- client/guest principals — satisfies. This routes them through has_permission()
-- (0019), the resolver the app layer already uses, so the two layers finally agree.
--
-- Behavioral change (intended): a member who lacks a module's permission can no
-- longer read/write that module's rows via ANY path. Workspace owners and org
-- owner/admins are unaffected (has_permission grants them everything via org
-- elevation). The gating keys mirror each module's app-layer guard exactly:
--   finance   read finance.invoice.view / write finance.invoice.edit
--             (expense submit needs only .view, matching requireFinanceRead)
--   crm       read crm.crm.view / write crm.crm.edit / delete crm.crm.delete
--   contracts read contracts.contract.view / write contracts.contract.edit
--   proposals read proposals.proposal.view / write proposals.proposal.edit
--
-- NOT in this migration (deliberately deferred — higher blast radius, need
-- coordinated app changes): clients (read across dashboard/email/meetings/
-- projects/finance queries), documents (fine-grained folder/file perm keys; no UI
-- yet), and hr_profiles compensation split (H1 — needs a data move + query
-- changes). Tracked as follow-ups.
--
-- Runs inside the apply harness's per-file transaction (scripts/apply-migration.mjs
-- / supabase db push), so no explicit begin/commit here — matching repo convention.

-- ══════════════════════════════════════════════════════════════════════════════
-- A. Finance — invoices, invoice_schedules, expenses, payments
-- ══════════════════════════════════════════════════════════════════════════════
drop policy if exists invoices_all on public.invoices;
create policy invoices_select on public.invoices for select
  using (public.has_permission(workspace_id, 'finance.invoice.view'));
create policy invoices_write on public.invoices for all
  using (public.has_permission(workspace_id, 'finance.invoice.edit'))
  with check (public.has_permission(workspace_id, 'finance.invoice.edit'));

drop policy if exists invoice_schedules_all on public.invoice_schedules;
create policy invoice_schedules_select on public.invoice_schedules for select
  using (public.has_permission(workspace_id, 'finance.invoice.view'));
create policy invoice_schedules_write on public.invoice_schedules for all
  using (public.has_permission(workspace_id, 'finance.invoice.edit'))
  with check (public.has_permission(workspace_id, 'finance.invoice.edit'));

-- Expenses: submit needs only .view (requireFinanceRead); approve/edit needs .edit
-- (requireFinanceManage). Split so a view-only submitter is not blocked on insert.
drop policy if exists expenses_all on public.expenses;
create policy expenses_select on public.expenses for select
  using (public.has_permission(workspace_id, 'finance.invoice.view'));
create policy expenses_insert on public.expenses for insert
  with check (public.has_permission(workspace_id, 'finance.invoice.view'));
create policy expenses_update on public.expenses for update
  using (public.has_permission(workspace_id, 'finance.invoice.edit'))
  with check (public.has_permission(workspace_id, 'finance.invoice.edit'));
create policy expenses_delete on public.expenses for delete
  using (public.has_permission(workspace_id, 'finance.invoice.edit'));

drop policy if exists payments_all on public.payments;
create policy payments_select on public.payments for select
  using (public.has_permission(workspace_id, 'finance.invoice.view'));
create policy payments_write on public.payments for all
  using (public.has_permission(workspace_id, 'finance.invoice.edit'))
  with check (public.has_permission(workspace_id, 'finance.invoice.edit'));

-- ══════════════════════════════════════════════════════════════════════════════
-- B. CRM — crm_contacts, crm_deals (clients deferred: cross-module read surface)
-- ══════════════════════════════════════════════════════════════════════════════
drop policy if exists crm_contacts_all on public.crm_contacts;
create policy crm_contacts_select on public.crm_contacts for select
  using (public.has_permission(workspace_id, 'crm.crm.view'));
create policy crm_contacts_insert on public.crm_contacts for insert
  with check (public.has_permission(workspace_id, 'crm.crm.edit'));
create policy crm_contacts_update on public.crm_contacts for update
  using (public.has_permission(workspace_id, 'crm.crm.edit'))
  with check (public.has_permission(workspace_id, 'crm.crm.edit'));
create policy crm_contacts_delete on public.crm_contacts for delete
  using (public.has_permission(workspace_id, 'crm.crm.delete'));

drop policy if exists crm_deals_all on public.crm_deals;
create policy crm_deals_select on public.crm_deals for select
  using (public.has_permission(workspace_id, 'crm.crm.view'));
create policy crm_deals_insert on public.crm_deals for insert
  with check (public.has_permission(workspace_id, 'crm.crm.edit'));
create policy crm_deals_update on public.crm_deals for update
  using (public.has_permission(workspace_id, 'crm.crm.edit'))
  with check (public.has_permission(workspace_id, 'crm.crm.edit'));
create policy crm_deals_delete on public.crm_deals for delete
  using (public.has_permission(workspace_id, 'crm.crm.delete'));

-- ══════════════════════════════════════════════════════════════════════════════
-- C. Proposals & contracts
-- ══════════════════════════════════════════════════════════════════════════════
drop policy if exists proposals_all on public.proposals;
create policy proposals_select on public.proposals for select
  using (public.has_permission(workspace_id, 'proposals.proposal.view'));
create policy proposals_write on public.proposals for all
  using (public.has_permission(workspace_id, 'proposals.proposal.edit'))
  with check (public.has_permission(workspace_id, 'proposals.proposal.edit'));

drop policy if exists contracts_all on public.contracts;
create policy contracts_select on public.contracts for select
  using (public.has_permission(workspace_id, 'contracts.contract.view'));
create policy contracts_write on public.contracts for all
  using (public.has_permission(workspace_id, 'contracts.contract.edit'))
  with check (public.has_permission(workspace_id, 'contracts.contract.edit'));

drop policy if exists contract_obligations_all on public.contract_obligations;
create policy contract_obligations_select on public.contract_obligations for select
  using (public.has_permission(workspace_id, 'contracts.contract.view'));
create policy contract_obligations_write on public.contract_obligations for all
  using (public.has_permission(workspace_id, 'contracts.contract.edit'))
  with check (public.has_permission(workspace_id, 'contracts.contract.edit'));

-- ══════════════════════════════════════════════════════════════════════════════
-- D. SEC C2 — authoritative role-escalation backstop on workspace_members
-- ══════════════════════════════════════════════════════════════════════════════
-- workspace_members INSERT/UPDATE was gated only on legacy workspace_role_of() in
-- ('owner','admin'). operations_manager maps to legacy 'admin', so an ops manager
-- could PATCH /rest/v1/workspace_members directly to set any member's role_id to
-- organization_owner — a direct escalation bypassing inviteUser AND
-- accept_invitation. Constrain the settable role to assignable workspace/portal
-- system roles; org/platform roles (organization_owner, super_admin, ceo) can
-- never be conferred by a direct member write. Workspace ownership still changes
-- only via the org ownership-transfer flow.
create or replace function public.is_assignable_member_role(p_role_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_role_id is null or exists (
    select 1 from public.roles r
    where r.id = p_role_id
      and r.is_system
      and r.scope in ('workspace', 'portal')
      and r.deleted_at is null
  );
$$;

drop policy if exists workspace_members_insert on public.workspace_members;
create policy workspace_members_insert on public.workspace_members for insert
  with check (
    public.workspace_role_of(workspace_id) in ('owner', 'admin')
    and public.is_assignable_member_role(role_id)
  );

drop policy if exists workspace_members_update on public.workspace_members;
create policy workspace_members_update on public.workspace_members for update
  using (public.workspace_role_of(workspace_id) in ('owner', 'admin'))
  with check (
    public.workspace_role_of(workspace_id) in ('owner', 'admin')
    and public.is_assignable_member_role(role_id)
  );

-- accept_invitation defense-in-depth: refuse to join a member on a non-assignable
-- (org/platform-scoped) role even if such an invitation row was forged directly.
create or replace function public.accept_invitation(raw_token text)
returns uuid
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

  -- SEC C2: an invitation may only confer an assignable workspace/portal role.
  if inv.role_id is not null and not public.is_assignable_member_role(inv.role_id) then
    raise exception 'invitation role is not assignable';
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
