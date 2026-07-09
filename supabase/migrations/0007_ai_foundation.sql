-- 0007 — Aurex AI foundation: conversations, runs, approvals, memory, usage, vectors
-- Tables: ai_conversations, ai_messages, ai_runs, ai_approvals, memory_items,
--         ai_usage (APPEND-ONLY), embeddings (pgvector)
-- Docs: 06_Module_Breakdown.md §2; 07_AI_Strategy.md; DatabaseArchitecture.md §2
-- (ai_usage is a class-3 append-only stream: no updated_at/deleted_at, no
-- UPDATE/DELETE policies — immutability replaces soft delete).

-- pgvector (not enabled in 0001; first needed here).
create extension if not exists vector;

-- ── Conversations & messages ─────────────────────────────────────────────────
create table public.ai_conversations (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text check (title is null or char_length(title) <= 300),
  -- Entity refs the chat is "about" (pre-loaded context). Governed by
  -- AiContextAnchorsSchema (packages/core/src/schemas/ai.ts).
  context_anchors jsonb not null default '[]',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index ai_conversations_user_idx on public.ai_conversations (workspace_id, user_id) where deleted_at is null;

create table public.ai_messages (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool', 'system')),
  -- Structured message content (text parts, tool calls, citations). Governed by
  -- AiMessageContentSchema (packages/core/src/schemas/ai.ts).
  content jsonb not null default '{}',
  model text,
  input_tokens int check (input_tokens is null or input_tokens >= 0),
  output_tokens int check (output_tokens is null or output_tokens >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index ai_messages_conversation_idx on public.ai_messages (conversation_id) where deleted_at is null;
create index ai_messages_workspace_idx on public.ai_messages (workspace_id) where deleted_at is null;

-- ── Runs & approvals (the auditable agentic trace) ───────────────────────────
create table public.ai_runs (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  trigger text not null check (trigger in ('chat', 'proactive', 'automation')),
  surface text,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'succeeded', 'failed', 'cancelled')),
  -- Plan + tool invocations trace. Governed by AiRunPlanSchema (packages/core/src/schemas/ai.ts).
  plan jsonb not null default '{}',
  input_tokens int not null default 0 check (input_tokens >= 0),
  output_tokens int not null default 0 check (output_tokens >= 0),
  cost_estimate_minor_units bigint not null default 0 check (cost_estimate_minor_units >= 0),
  currency char(3) not null default 'USD',
  registry_version text,
  latency_ms int check (latency_ms is null or latency_ms >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index ai_runs_workspace_idx on public.ai_runs (workspace_id, status) where deleted_at is null;
create index ai_runs_user_idx on public.ai_runs (workspace_id, user_id) where deleted_at is null;

create table public.ai_approvals (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  run_id uuid not null references public.ai_runs (id) on delete restrict,
  -- Typed proposed action awaiting human approval. Governed by
  -- AiProposedActionSchema (packages/core/src/schemas/ai.ts).
  proposed_action jsonb not null,
  risk_class text not null default 'medium' check (risk_class in ('low', 'medium', 'high')),
  approver_user_id uuid references public.profiles (id) on delete set null,
  decision text check (decision is null or decision in ('approved', 'rejected')),
  decided_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index ai_approvals_workspace_pending_idx on public.ai_approvals (workspace_id)
  where decision is null and deleted_at is null;
create index ai_approvals_run_idx on public.ai_approvals (run_id);

-- ── Curated long-term memory ─────────────────────────────────────────────────
create table public.memory_items (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade, -- null = workspace-scoped
  scope text not null check (scope in ('user', 'workspace')),
  kind text not null check (kind in ('preference', 'fact', 'instruction')),
  content text not null check (char_length(content) between 1 and 10000),
  source text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index memory_items_scope_idx on public.memory_items (workspace_id, scope, user_id) where deleted_at is null;

-- ── Usage metering (APPEND-ONLY stream; billing + budget enforcement) ────────
create table public.ai_usage (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  feature text not null,
  provider text not null,
  model text not null,
  tier text,
  input_tokens int not null default 0 check (input_tokens >= 0),
  output_tokens int not null default 0 check (output_tokens >= 0),
  cached_input_tokens int not null default 0 check (cached_input_tokens >= 0),
  cost_estimate_minor_units bigint not null default 0 check (cost_estimate_minor_units >= 0),
  currency char(3) not null default 'USD',
  latency_ms int check (latency_ms is null or latency_ms >= 0),
  outcome text,
  request_id text,
  created_at timestamptz not null default now()
);

create index ai_usage_workspace_time_idx on public.ai_usage (workspace_id, created_at desc);

-- ── Embeddings (pgvector) ────────────────────────────────────────────────────
-- Dimension 1536 is pinned per workspace corpus: changing embedding models with
-- a different dimension is a migration that re-embeds the corpus (there is no
-- in-place dimension change). ACL and verification metadata ride on the row so
-- retrieval is tenant- and permission-filtered like everything else (R-AI4).
create table public.embeddings (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  source_type text not null check (source_type in (
    'document', 'kb_page', 'meeting', 'email', 'file', 'task', 'project', 'client'
  )),
  entity_ref uuid not null,
  chunk_index int not null default 0 check (chunk_index >= 0),
  content text not null,
  embedding vector(1536) not null,
  acl_digest text,
  verification_state text,
  content_hash text,
  -- Chunking/source metadata. Governed by EmbeddingMetadataSchema (packages/core/src/schemas/ai.ts).
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (workspace_id, source_type, entity_ref, chunk_index)
);

create index embeddings_entity_idx on public.embeddings (workspace_id, source_type, entity_ref) where deleted_at is null;

-- Global HNSW index; every query carries the workspace_id predicate (RLS +
-- explicit filter), so recall is tenant-scoped at the row level. If a large
-- tenant degrades recall/latency (09_Scaling_Strategy.md §3.5 triggers), the
-- strategy is per-workspace partial HNSW indexes for the heaviest tenants
-- (created by migration, workspace ids parameterized) before splitting the
-- vector store entirely.
create index embeddings_hnsw_idx on public.embeddings
  using hnsw (embedding vector_cosine_ops);

-- ── updated_at triggers ──────────────────────────────────────────────────────
create trigger ai_conversations_set_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();
create trigger ai_messages_set_updated_at before update on public.ai_messages
  for each row execute function public.set_updated_at();
create trigger ai_runs_set_updated_at before update on public.ai_runs
  for each row execute function public.set_updated_at();
create trigger ai_approvals_set_updated_at before update on public.ai_approvals
  for each row execute function public.set_updated_at();
create trigger memory_items_set_updated_at before update on public.memory_items
  for each row execute function public.set_updated_at();
create trigger embeddings_set_updated_at before update on public.embeddings
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_runs enable row level security;
alter table public.ai_approvals enable row level security;
alter table public.memory_items enable row level security;
alter table public.ai_usage enable row level security;
alter table public.embeddings enable row level security;

-- Conversations and messages are personal: owner-only, workspace-scoped.
create policy ai_conversations_all on public.ai_conversations for all
  using (public.is_workspace_member(workspace_id) and user_id = auth.uid())
  with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

create policy ai_messages_all on public.ai_messages for all
  using (
    public.is_workspace_member(workspace_id)
    and exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    public.is_workspace_member(workspace_id)
    and exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
    )
  );

create policy ai_runs_all on public.ai_runs for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy ai_approvals_all on public.ai_approvals for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Memory: workspace-scoped items visible to members; user-scoped items owner-only.
create policy memory_items_all on public.memory_items for all
  using (
    public.is_workspace_member(workspace_id)
    and (scope = 'workspace' or user_id = auth.uid())
  )
  with check (
    public.is_workspace_member(workspace_id)
    and (scope = 'workspace' or user_id = auth.uid())
  );

-- ai_usage is APPEND-ONLY: insert + select only, no UPDATE/DELETE policies
-- (same shape as domain_events/audit_log in 0005). Reads are billing-sensitive,
-- so select follows the audit_log role restriction plus finance.
create policy ai_usage_insert on public.ai_usage for insert
  with check (public.is_workspace_member(workspace_id));

create policy ai_usage_select on public.ai_usage for select
  using (public.workspace_role_of(workspace_id) in ('owner', 'admin', 'finance'));

create policy embeddings_all on public.embeddings for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
