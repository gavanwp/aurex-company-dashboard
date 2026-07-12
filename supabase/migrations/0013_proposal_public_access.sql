-- 0013 — Proposal public (tokenized) access
--
-- WHY THIS MIGRATION EXISTS
-- The client-facing proposal page (/p/[token]) is served with NO login. RLS on
-- public.proposals is workspace-member scoped (0009: proposals_all uses
-- is_workspace_member), so the anonymous Supabase role cannot read a proposal
-- directly — and it must not be able to. The public token IS the capability:
-- possession of the unguessable 32-hex token is the sole grant to view and
-- accept ONE proposal, nothing else.
--
-- SECURITY MODEL
-- Three SECURITY DEFINER functions, owned by the migration role, run with the
-- definer's privileges and therefore bypass RLS. Each one is gated ENTIRELY on
-- the token and returns only client-safe fields. They are the only surface anon
-- may touch on the proposals tables. Draft / internal_review proposals are never
-- retrievable — a proposal is only reachable once it has been sent. Internal
-- data (deal_id, internal notes, other workspace rows, viewer analytics) is
-- never exposed through them.
--
-- EVENT / AUDIT EMISSION
-- The anonymous role has no session (auth.uid() is null) and this environment
-- has no service-role key wired into the app, so the anon route handler cannot
-- itself write to domain_events / audit_log (their INSERT policies require
-- actor_id = auth.uid()). To keep the sales→billing loop observable, the
-- acceptance state change and its domain event + audit row are written together,
-- atomically, INSIDE the definer function (as the definer, bypassing RLS) with a
-- null actor_id denoting an unauthenticated client action. The Next.js route
-- handler wraps the RPC for input validation and shaping only. If a
-- SUPABASE_SERVICE_ROLE_KEY is later configured, emission can move to the route
-- handler via a service client; the function stays the source of truth for state.

-- ── Acceptance evidence columns ─────────────────────────────────────────────
-- Stamped by accept_proposal_by_token. accepted_by carries the client's typed
-- name + email + timestamp (e-acceptance evidence), following the R-D jsonb
-- convention for lightweight structured metadata.
alter table public.proposals
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_by jsonb;

-- ── get_proposal_by_token ────────────────────────────────────────────────────
-- Returns ONLY client-safe fields for a live, non-deleted proposal. Null when
-- the token matches nothing, the proposal is soft-deleted, or its status is not
-- one a client may see (draft / internal_review are invisible). is_expired is
-- computed so the page can show an expired notice and disable acceptance without
-- leaking anything; accepted/declined proposals remain viewable as a receipt.
create or replace function public.get_proposal_by_token(p_token text)
returns jsonb
language sql
security definer
stable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'title', p.title,
    'status', p.status,
    'validUntil', p.valid_until,
    'acceptMethod', p.accept_method,
    'currency', coalesce(p.pricing->>'currency', 'USD'),
    'sections', p.sections,
    'pricing', p.pricing,
    'clientName', c.name,
    'workspaceName', w.name,
    'workspaceLogoUrl', w.logo_url,
    'acceptedAt', p.accepted_at,
    'acceptedBy', p.accepted_by,
    'isExpired', (
      p.status in ('sent', 'viewed')
      and p.valid_until is not null
      and p.valid_until < current_date
    )
  )
  from public.proposals p
  join public.clients c on c.id = p.client_id
  join public.workspaces w on w.id = p.workspace_id
  where p.public_token = p_token
    and p.deleted_at is null
    and p.status in ('sent', 'viewed', 'accepted', 'declined', 'expired')
    and p.status not in ('draft', 'internal_review')
  limit 1;
$$;

-- ── record_proposal_view ─────────────────────────────────────────────────────
-- Logs an engagement view for the token's proposal and flips sent → viewed on
-- the first open. Idempotent-ish: at most one view row per viewer_token per day,
-- so a client refreshing the page does not inflate the count. Emits
-- proposals.proposal.viewed exactly once, on the sent → viewed transition.
create or replace function public.record_proposal_view(p_token text, p_viewer_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_proposal public.proposals;
begin
  select * into v_proposal
  from public.proposals
  where public_token = p_token
    and deleted_at is null
    and status in ('sent', 'viewed')
  limit 1;

  if v_proposal.id is null then
    return; -- unknown token, or not in a viewable-for-tracking state; no-op
  end if;

  -- One view row per viewer per day (rate-limit-safe).
  if not exists (
    select 1 from public.proposal_views
    where proposal_id = v_proposal.id
      and viewer_token = p_viewer_token
      and viewed_at > now() - interval '1 day'
  ) then
    insert into public.proposal_views (workspace_id, proposal_id, viewer_token)
    values (v_proposal.workspace_id, v_proposal.id, p_viewer_token);
  end if;

  -- First view flips the lifecycle and records the domain event once.
  if v_proposal.status = 'sent' then
    update public.proposals
      set status = 'viewed'
      where id = v_proposal.id and status = 'sent';

    insert into public.domain_events (workspace_id, actor_id, event_type, entity_type, entity_id, payload)
    values (
      v_proposal.workspace_id, null, 'proposals.proposal.viewed', 'proposal', v_proposal.id,
      jsonb_build_object('viewerToken', p_viewer_token)
    );
  end if;
end;
$$;

-- ── accept_proposal_by_token ─────────────────────────────────────────────────
-- Client e-acceptance. Advances sent/viewed → accepted (never from any other
-- state, never when expired), stamps the acceptance evidence, and writes the
-- domain event + audit row atomically with the state change. Returns a jsonb
-- result the route handler shapes for the page. Re-accepting an already-accepted
-- proposal is a friendly no-op success (idempotent).
create or replace function public.accept_proposal_by_token(
  p_token text,
  p_accepter_name text,
  p_accepter_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_proposal public.proposals;
  v_evidence jsonb;
begin
  select * into v_proposal
  from public.proposals
  where public_token = p_token
    and deleted_at is null
  limit 1;

  if v_proposal.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_proposal.status = 'accepted' then
    return jsonb_build_object('ok', true, 'alreadyAccepted', true);
  end if;

  if v_proposal.status not in ('sent', 'viewed') then
    return jsonb_build_object('ok', false, 'reason', 'not_acceptable');
  end if;

  if v_proposal.valid_until is not null and v_proposal.valid_until < current_date then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  v_evidence := jsonb_build_object(
    'name', p_accepter_name,
    'email', p_accepter_email,
    'at', now()
  );

  update public.proposals
    set status = 'accepted',
        accepted_at = now(),
        accepted_by = v_evidence
    where id = v_proposal.id
      and status in ('sent', 'viewed');

  insert into public.domain_events (workspace_id, actor_id, event_type, entity_type, entity_id, payload)
  values (
    v_proposal.workspace_id, null, 'proposals.proposal.accepted', 'proposal', v_proposal.id,
    jsonb_build_object('acceptedBy', v_evidence, 'method', v_proposal.accept_method)
  );

  insert into public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, before, after)
  values (
    v_proposal.workspace_id, null, 'proposals.proposal.accepted', 'proposal', v_proposal.id,
    jsonb_build_object('status', v_proposal.status),
    jsonb_build_object('status', 'accepted', 'acceptedBy', v_evidence)
  );

  return jsonb_build_object('ok', true, 'proposalId', v_proposal.id);
end;
$$;

-- ── Grants ───────────────────────────────────────────────────────────────────
-- anon = the unauthenticated client page; authenticated = a logged-in teammate
-- previewing the public link. No other privileges are granted on these tables to
-- anon; these three functions are the entire anon surface.
grant execute on function public.get_proposal_by_token(text) to anon, authenticated;
grant execute on function public.record_proposal_view(text, text) to anon, authenticated;
grant execute on function public.accept_proposal_by_token(text, text, text) to anon, authenticated;
