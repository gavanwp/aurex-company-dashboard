-- 0009 — Proposals and Contracts modules
-- Tables: proposals, proposal_views, contracts, contract_obligations
-- Docs: 06_Module_Breakdown.md §10–11; 12_Project_Rules.md R-D8.
-- proposal_views is engagement analytics keyed by a public viewer token: rows
-- are written once per view session and never edited — it deliberately carries
-- no deleted_at (nothing user-facing to trash; pruned by retention if ever needed).

-- ── Proposals ────────────────────────────────────────────────────────────────
create table public.proposals (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  deal_id uuid references public.crm_deals (id) on delete set null,
  client_id uuid not null references public.clients (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 300),
  status text not null default 'draft'
    check (status in ('draft', 'internal_review', 'sent', 'viewed', 'accepted', 'declined', 'expired')),
  valid_until date,
  accept_method text not null default 'checkbox' check (accept_method in ('esign', 'checkbox')),
  -- Tokenized hosted-page link; unguessable, rotatable by reissue.
  public_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  version int not null default 1 check (version >= 1),
  -- Ordered section blocks. Governed by ProposalSectionSchema (packages/core/src/schemas/proposal.ts).
  sections jsonb not null default '[]',
  -- Pricing table (line items, packages, discounts; amounts in minor units).
  -- Governed by ProposalPricingSchema (packages/core/src/schemas/proposal.ts).
  pricing jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index proposals_workspace_status_idx on public.proposals (workspace_id, status) where deleted_at is null;
create index proposals_deal_idx on public.proposals (workspace_id, deal_id) where deleted_at is null;
create index proposals_client_idx on public.proposals (workspace_id, client_id) where deleted_at is null;

-- ── Proposal views (engagement analytics; no soft delete by design) ──────────
create table public.proposal_views (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  viewer_token text not null,
  viewed_at timestamptz not null default now(),
  -- Per-section dwell times (ms). Governed by ProposalSectionDwellSchema
  -- (packages/core/src/schemas/proposal.ts).
  section_dwell jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index proposal_views_proposal_idx on public.proposal_views (proposal_id, viewed_at desc);
create index proposal_views_workspace_idx on public.proposal_views (workspace_id, viewed_at desc);

-- ── Contracts ────────────────────────────────────────────────────────────────
create table public.contracts (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type text not null check (type in ('msa', 'sow', 'nda', 'retainer', 'employment', 'custom')),
  -- Counterparty; null for employment/internal contracts (counterparty is a profile via HR).
  client_id uuid references public.clients (id) on delete set null,
  title text not null check (char_length(title) between 1 and 300),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'sent', 'signed', 'active', 'expiring', 'expired', 'terminated')),
  effective_date date,
  end_date date,
  auto_renew boolean not null default false,
  value_minor bigint check (value_minor is null or value_minor >= 0),
  currency char(3) not null default 'USD',
  signed_file_id uuid references public.files (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index contracts_workspace_status_idx on public.contracts (workspace_id, status) where deleted_at is null;
create index contracts_client_idx on public.contracts (workspace_id, client_id) where deleted_at is null;
create index contracts_end_date_idx on public.contracts (workspace_id, end_date)
  where deleted_at is null and status in ('signed', 'active', 'expiring');

-- ── Contract obligations (extracted commitments → reminders/tasks) ───────────
create table public.contract_obligations (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contract_id uuid not null references public.contracts (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 2000),
  -- Recurrence/deadline rule (e.g. "monthly by the 5th", "90 days before end").
  -- Governed by ObligationDueRuleSchema (packages/core/src/schemas/proposal.ts).
  due_rule jsonb not null default '{}',
  owner_user_id uuid references public.profiles (id) on delete set null,
  source_clause text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index contract_obligations_contract_idx on public.contract_obligations (contract_id) where deleted_at is null;
create index contract_obligations_workspace_idx on public.contract_obligations (workspace_id) where deleted_at is null;

-- ── updated_at triggers ──────────────────────────────────────────────────────
create trigger proposals_set_updated_at before update on public.proposals
  for each row execute function public.set_updated_at();
create trigger contracts_set_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();
create trigger contract_obligations_set_updated_at before update on public.contract_obligations
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.proposals enable row level security;
alter table public.proposal_views enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_obligations enable row level security;

create policy proposals_all on public.proposals for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Views are written once and read for analytics; no UPDATE/DELETE policies.
-- Anonymous public-page viewers record views via an edge function (service role),
-- not through these policies.
create policy proposal_views_insert on public.proposal_views for insert
  with check (public.is_workspace_member(workspace_id));

create policy proposal_views_select on public.proposal_views for select
  using (public.is_workspace_member(workspace_id));

create policy contracts_all on public.contracts for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy contract_obligations_all on public.contract_obligations for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
