-- 0008 — Finance module: invoices, schedules, expenses, payments
-- Tables: invoices, invoice_schedules, expenses, payments
-- Docs: 06_Module_Breakdown.md §9; 12_Project_Rules.md R-D8 (money = bigint
-- minor units + char(3) currency — no floats, ever).
-- Immutability rule: sent invoices are never edited — void & reissue only;
-- line_items are the frozen snapshot at send time (DatabaseArchitecture.md §4.1).

-- ── Invoices ─────────────────────────────────────────────────────────────────
create table public.invoices (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  project_id uuid references public.projects (id) on delete set null,
  number text not null check (char_length(number) between 1 and 40),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void')),
  currency char(3) not null default 'USD',
  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  total_minor bigint not null default 0 check (total_minor >= 0),
  issue_date date,
  due_date date,
  -- Frozen at send time (immutability snapshot). Governed by
  -- InvoiceLineItemSchema (packages/core/src/schemas/finance.ts).
  line_items jsonb not null default '[]',
  payment_link_url text,
  pdf_file_id uuid references public.files (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (workspace_id, number)
);

create index invoices_workspace_status_idx on public.invoices (workspace_id, status) where deleted_at is null;
create index invoices_client_idx on public.invoices (workspace_id, client_id) where deleted_at is null;
create index invoices_due_idx on public.invoices (workspace_id, due_date)
  where deleted_at is null and status in ('sent', 'viewed', 'partial', 'overdue');

-- ── Invoice schedules (retainer/milestone billing → draft invoices) ──────────
create table public.invoice_schedules (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  source text not null check (source in ('contract', 'retainer', 'milestones')),
  cadence text not null check (cadence in ('weekly', 'monthly', 'quarterly', 'yearly', 'milestone')),
  next_issue_date date,
  -- Draft-invoice template (line items, terms). Governed by
  -- InvoiceScheduleTemplateSchema (packages/core/src/schemas/finance.ts).
  template jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index invoice_schedules_next_idx on public.invoice_schedules (workspace_id, next_issue_date) where deleted_at is null;

-- ── Expenses ─────────────────────────────────────────────────────────────────
create table public.expenses (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  vendor text not null check (char_length(vendor) between 1 and 200),
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null default 'USD',
  category text,
  expense_date date not null,
  receipt_file_id uuid references public.files (id) on delete set null,
  submitted_by uuid references public.profiles (id) on delete set null,
  billable boolean not null default false,
  project_id uuid references public.projects (id) on delete set null,
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index expenses_workspace_status_idx on public.expenses (workspace_id, approval_status) where deleted_at is null;
create index expenses_project_idx on public.expenses (workspace_id, project_id) where deleted_at is null;

-- ── Payments ─────────────────────────────────────────────────────────────────
-- Money records: restrict on invoice_id — an invoice with payments cannot be
-- hard-deleted (void & reconcile instead).
create table public.payments (
  id uuid primary key default public.uuid_v7(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'USD',
  method text not null check (method in ('stripe', 'bank', 'manual')),
  received_at timestamptz not null default now(),
  fees_minor bigint not null default 0 check (fees_minor >= 0),
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index payments_invoice_idx on public.payments (invoice_id) where deleted_at is null;
create index payments_workspace_time_idx on public.payments (workspace_id, received_at desc) where deleted_at is null;

-- ── updated_at triggers ──────────────────────────────────────────────────────
create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();
create trigger invoice_schedules_set_updated_at before update on public.invoice_schedules
  for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.invoices enable row level security;
alter table public.invoice_schedules enable row level security;
alter table public.expenses enable row level security;
alter table public.payments enable row level security;

create policy invoices_all on public.invoices for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy invoice_schedules_all on public.invoice_schedules for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy expenses_all on public.expenses for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy payments_all on public.payments for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
