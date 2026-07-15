-- 0015 — Contract linkage, content, and public (tokenized) e-signing
--
-- WHY THIS MIGRATION EXISTS
-- The Contracts module v1 closes the sales→legal→billing loop (proposal →
-- contract → invoice). 0009 shipped the base contracts / contract_obligations
-- tables; this migration adds the columns the module needs (proposal/project
-- linkage, clause body, versioning, lifecycle timestamps, a public share token,
-- and signing evidence) and the anonymous signing surface.
--
-- SECURITY MODEL (mirrors 0013 for proposals)
-- The client-facing contract page (/c/[token]) is served with NO login. RLS on
-- public.contracts is workspace-member scoped (0009: contracts_all uses
-- is_workspace_member), so the anonymous Supabase role cannot read a contract
-- directly — and it must not. The unguessable public token IS the capability:
-- possession of it is the sole grant to view and sign ONE contract, nothing
-- else. Two SECURITY DEFINER functions (owned by the migration role, bypassing
-- RLS, search_path pinned to public,extensions) are the entire anon surface.
-- Only contracts in status sent / signed / active are ever reachable; draft /
-- review contracts are invisible.
--
-- EVENT / AUDIT EMISSION
-- The anon role has no session (auth.uid() is null) and this environment has no
-- service-role key wired into the app, so — exactly as 0013 documents — the
-- signing state change and its domain event + audit row are written together,
-- atomically, INSIDE the definer function with a null actor_id. The Next.js
-- route handler wraps the RPC for input validation and shaping only.

-- ── New contract columns ─────────────────────────────────────────────────────
alter table public.contracts
  -- Delivery project this contract governs (set when scaffolded from a proposal).
  add column if not exists project_id uuid references public.projects (id) on delete set null,
  -- The proposal→contract link: the accepted proposal this contract was drafted from.
  add column if not exists proposal_id uuid references public.proposals (id) on delete set null,
  -- Ordered clause/section blocks. Governed by ContractSectionSchema
  -- (packages/core/src/schemas/proposal.ts); clause text may carry merge-field
  -- placeholders like {{client_name}} resolved at render.
  add column if not exists body jsonb not null default '[]',
  add column if not exists version int not null default 1 check (version >= 1),
  add column if not exists sent_at timestamptz,
  add column if not exists signed_at timestamptz,
  -- Tokenized hosted-page link; unguessable, minted on insert, mirrors the
  -- proposals.public_token default (0009). Rotatable by reissue.
  add column if not exists public_token text unique default encode(gen_random_bytes(16), 'hex'),
  -- Client's typed signing evidence (name/email/timestamp). Governed by
  -- ContractSignerSchema. Null until signed.
  add column if not exists signer jsonb;

-- Indexes: (workspace_id, status) already exists (0009). Add the proposal link
-- and the renewal-radar range scan (contracts approaching their end date).
create index if not exists contracts_proposal_idx
  on public.contracts (workspace_id, proposal_id) where deleted_at is null;
create index if not exists contracts_project_idx
  on public.contracts (workspace_id, project_id) where deleted_at is null;
create index if not exists contracts_renewal_idx
  on public.contracts (workspace_id, end_date)
  where deleted_at is null and end_date is not null;

-- ── get_contract_by_token ────────────────────────────────────────────────────
-- Returns ONLY client-safe fields for a live contract (status sent / signed /
-- active). Null when the token matches nothing, the contract is soft-deleted, or
-- its status is not one a client may see (draft / review are invisible). Internal
-- data (obligations, other workspace rows, cost detail) is never exposed.
create or replace function public.get_contract_by_token(p_token text)
returns jsonb
language sql
security definer
stable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'title', ct.title,
    'type', ct.type,
    'status', ct.status,
    'body', ct.body,
    'valueMinor', ct.value_minor,
    'currency', ct.currency,
    'effectiveDate', ct.effective_date,
    'endDate', ct.end_date,
    'autoRenew', ct.auto_renew,
    'clientName', c.name,
    'workspaceName', w.name,
    'workspaceLogoUrl', w.logo_url,
    'signedAt', ct.signed_at,
    'signer', ct.signer
  )
  from public.contracts ct
  left join public.clients c on c.id = ct.client_id
  join public.workspaces w on w.id = ct.workspace_id
  where ct.public_token = p_token
    and ct.deleted_at is null
    and ct.status in ('sent', 'signed', 'active')
  limit 1;
$$;

-- ── sign_contract_by_token ───────────────────────────────────────────────────
-- Client e-signature. Advances sent → signed (never from any other state),
-- stamps the signing evidence + signed_at, and writes the domain event + audit
-- row atomically with the state change. Activation to 'active' happens app-side
-- (or on effective_date). Re-signing an already-signed contract is a friendly
-- no-op success (idempotent).
create or replace function public.sign_contract_by_token(
  p_token text,
  p_signer_name text,
  p_signer_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_contract public.contracts;
  v_evidence jsonb;
begin
  select * into v_contract
  from public.contracts
  where public_token = p_token
    and deleted_at is null
  limit 1;

  if v_contract.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_contract.status in ('signed', 'active') then
    return jsonb_build_object('ok', true, 'alreadySigned', true);
  end if;

  if v_contract.status <> 'sent' then
    return jsonb_build_object('ok', false, 'reason', 'not_signable');
  end if;

  v_evidence := jsonb_build_object(
    'name', p_signer_name,
    'email', p_signer_email,
    'at', now()
  );

  update public.contracts
    set status = 'signed',
        signed_at = now(),
        signer = v_evidence
    where id = v_contract.id
      and status = 'sent';

  insert into public.domain_events (workspace_id, actor_id, event_type, entity_type, entity_id, payload)
  values (
    v_contract.workspace_id, null, 'contracts.contract.signed', 'contract', v_contract.id,
    jsonb_build_object('signer', v_evidence)
  );

  insert into public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, before, after)
  values (
    v_contract.workspace_id, null, 'contracts.contract.signed', 'contract', v_contract.id,
    jsonb_build_object('status', v_contract.status),
    jsonb_build_object('status', 'signed', 'signer', v_evidence)
  );

  return jsonb_build_object('ok', true, 'contractId', v_contract.id);
end;
$$;

-- ── Grants ───────────────────────────────────────────────────────────────────
-- anon = the unauthenticated client page; authenticated = a logged-in teammate
-- previewing the public link. These two functions are the entire anon surface.
grant execute on function public.get_contract_by_token(text) to anon, authenticated;
grant execute on function public.sign_contract_by_token(text, text, text) to anon, authenticated;
