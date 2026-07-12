import 'server-only'

import { format, startOfMonth, subMonths } from 'date-fns'
import { InvoiceLineItemSchema, type InvoiceStatus } from '@aurexos/core'
import type { Tables } from '@aurexos/db'
import type { WorkspaceContext } from '@/lib/workspace-context'
import {
  AR_AGING_BUCKETS,
  arAgingBucket,
  isInvoiceOverdue,
  nextInvoiceNumber,
  type AgingBucket,
} from '../lib/money'
import type {
  ExpenseRow,
  FinanceFormOptions,
  FinanceSnapshot,
  InvoiceDetail,
  InvoiceListRow,
  PaymentRow,
} from '../types'

// RLS (0008) scopes every finance row to workspace members; queries add only
// workspace scoping + soft-delete filters and derive display-only fields
// (overdue, balances) — money truth lives in the columns, never recomputed here.

const DEFAULT_CURRENCY = 'USD'

/** Server-side "today" as YYYY-MM-DD for overdue/aging derivation. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseLineItems(value: unknown) {
  const parsed = InvoiceLineItemSchema.array().safeParse(value)
  return parsed.success ? parsed.data : []
}

async function namesById(
  ctx: WorkspaceContext,
  table: 'clients' | 'projects' | 'profiles',
  nameColumn: 'name' | 'full_name',
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return map
  const { data } = await ctx.supabase.from(table).select(`id, ${nameColumn}`).in('id', unique)
  for (const row of (data ?? []) as unknown as Array<Record<string, string | null>>) {
    if (row.id) map.set(row.id, row[nameColumn] ?? '')
  }
  return map
}

function toListRow(
  invoice: Tables<'invoices'>,
  clientNames: Map<string, string>,
  projectNames: Map<string, string>,
  today: string,
): InvoiceListRow {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    currency: invoice.currency,
    clientId: invoice.client_id,
    clientName: clientNames.get(invoice.client_id) ?? null,
    projectId: invoice.project_id,
    projectName: invoice.project_id ? (projectNames.get(invoice.project_id) ?? null) : null,
    totalMinor: invoice.total_minor,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    isOverdue: isInvoiceOverdue(invoice.status, invoice.due_date, today),
    createdAt: invoice.created_at,
  }
}

// ── Invoices list ───────────────────────────────────────────────────────────

export interface GetInvoicesFilters {
  /** Tab filter. 'overdue' is derived (live receivable past its due date). */
  status?: InvoiceStatus | 'overdue'
  search?: string
}

export async function getInvoices(
  ctx: WorkspaceContext,
  filters: GetInvoicesFilters = {},
): Promise<InvoiceListRow[]> {
  const today = todayIso()
  let query = ctx.supabase
    .from('invoices')
    .select('*')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 'overdue' is derived: filter to live receivables past due below.
  if (filters.status && filters.status !== 'overdue') {
    query = query.eq('status', filters.status)
  } else if (filters.status === 'overdue') {
    query = query.in('status', ['sent', 'viewed', 'partial', 'overdue']).lt('due_date', today)
  }
  if (filters.search) {
    query = query.ilike('number', `%${filters.search}%`)
  }

  const { data: invoices } = await query
  if (!invoices || invoices.length === 0) return []

  const [clientNames, projectNames] = await Promise.all([
    namesById(
      ctx,
      'clients',
      'name',
      invoices.map((i) => i.client_id),
    ),
    namesById(
      ctx,
      'projects',
      'name',
      invoices.map((i) => i.project_id).filter((id): id is string => !!id),
    ),
  ])

  return invoices.map((invoice) => toListRow(invoice, clientNames, projectNames, today))
}

// ── Single invoice ──────────────────────────────────────────────────────────

export async function getInvoice(
  ctx: WorkspaceContext,
  invoiceId: string,
): Promise<InvoiceDetail | null> {
  const { data: invoice } = await ctx.supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!invoice) return null

  const [{ data: payments }, clientNames, projectNames] = await Promise.all([
    ctx.supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoice.id)
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('received_at', { ascending: false }),
    namesById(ctx, 'clients', 'name', [invoice.client_id]),
    invoice.project_id
      ? namesById(ctx, 'projects', 'name', [invoice.project_id])
      : Promise.resolve(new Map<string, string>()),
  ])

  const paymentRows: PaymentRow[] = (payments ?? []).map((p) => ({
    id: p.id,
    amountMinor: p.amount_minor,
    currency: p.currency,
    method: p.method,
    receivedAt: p.received_at,
    feesMinor: p.fees_minor,
    externalRef: p.external_ref,
  }))
  const amountPaidMinor = paymentRows.reduce((sum, p) => sum + p.amountMinor, 0)

  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    currency: invoice.currency,
    clientId: invoice.client_id,
    clientName: clientNames.get(invoice.client_id) ?? null,
    projectId: invoice.project_id,
    projectName: invoice.project_id ? (projectNames.get(invoice.project_id) ?? null) : null,
    subtotalMinor: invoice.subtotal_minor,
    taxMinor: invoice.tax_minor,
    totalMinor: invoice.total_minor,
    amountPaidMinor,
    balanceMinor: Math.max(0, invoice.total_minor - amountPaidMinor),
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    isOverdue: isInvoiceOverdue(invoice.status, invoice.due_date, todayIso()),
    lineItems: parseLineItems(invoice.line_items),
    payments: paymentRows,
    createdAt: invoice.created_at,
    updatedAt: invoice.updated_at,
  }
}

// ── Expenses ──────────────────────────────────────────────────────────────

export interface GetExpensesFilters {
  status?: 'pending' | 'approved' | 'rejected'
}

export async function getExpenses(
  ctx: WorkspaceContext,
  filters: GetExpensesFilters = {},
): Promise<ExpenseRow[]> {
  let query = ctx.supabase
    .from('expenses')
    .select('*')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (filters.status) query = query.eq('approval_status', filters.status)

  const { data: expenses } = await query
  if (!expenses || expenses.length === 0) return []

  const [projectNames, submitterNames] = await Promise.all([
    namesById(
      ctx,
      'projects',
      'name',
      expenses.map((e) => e.project_id).filter((id): id is string => !!id),
    ),
    namesById(
      ctx,
      'profiles',
      'full_name',
      expenses.map((e) => e.submitted_by).filter((id): id is string => !!id),
    ),
  ])

  return expenses.map((e) => ({
    id: e.id,
    vendor: e.vendor,
    amountMinor: e.amount_minor,
    currency: e.currency,
    category: e.category,
    expenseDate: e.expense_date,
    billable: e.billable,
    projectId: e.project_id,
    projectName: e.project_id ? (projectNames.get(e.project_id) ?? null) : null,
    submittedByName: e.submitted_by ? (submitterNames.get(e.submitted_by) ?? null) : null,
    approvalStatus: e.approval_status,
    createdAt: e.created_at,
  }))
}

// ── Form pickers ────────────────────────────────────────────────────────────

export async function getFinanceFormOptions(ctx: WorkspaceContext): Promise<FinanceFormOptions> {
  const [clients, projects] = await Promise.all([
    ctx.supabase
      .from('clients')
      .select('id, name')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('name'),
    ctx.supabase
      .from('projects')
      .select('id, name')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('name'),
  ])
  return {
    clients: clients.data ?? [],
    projects: projects.data ?? [],
  }
}

// ── Overview snapshot ───────────────────────────────────────────────────────

function dominantCurrency(invoices: Array<{ currency: string }>): string {
  const counts = new Map<string, number>()
  for (const { currency } of invoices) counts.set(currency, (counts.get(currency) ?? 0) + 1)
  let best = DEFAULT_CURRENCY
  let bestCount = 0
  for (const [currency, count] of counts) {
    if (count > bestCount) {
      best = currency
      bestCount = count
    }
  }
  return best
}

/**
 * The finance cash snapshot: invoiced / collected / outstanding / overdue,
 * AR aging, a 6-month collected series, recent invoices and pending expenses.
 * All money in minor units; a single display currency is assumed for v1 (the
 * dominant invoice currency) — mixed-currency workspaces are a later increment.
 */
export async function getFinanceOverview(ctx: WorkspaceContext): Promise<FinanceSnapshot> {
  const today = todayIso()

  const [{ data: invoicesRaw }, { data: paymentsRaw }, { data: pendingExpensesRaw }] =
    await Promise.all([
      ctx.supabase
        .from('invoices')
        .select('*')
        .eq('workspace_id', ctx.workspace.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      ctx.supabase
        .from('payments')
        .select('invoice_id, amount_minor, received_at')
        .eq('workspace_id', ctx.workspace.id)
        .is('deleted_at', null),
      ctx.supabase
        .from('expenses')
        .select('amount_minor')
        .eq('workspace_id', ctx.workspace.id)
        .eq('approval_status', 'pending')
        .is('deleted_at', null),
    ])

  const invoices = invoicesRaw ?? []
  const payments = paymentsRaw ?? []
  const currency = dominantCurrency(invoices)

  const paidByInvoice = new Map<string, number>()
  let collectedMinor = 0
  for (const p of payments) {
    collectedMinor += p.amount_minor
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + p.amount_minor)
  }

  const agingTotals = new Map<AgingBucket, number>()
  let totalInvoicedMinor = 0
  let outstandingMinor = 0
  let overdueMinor = 0

  for (const invoice of invoices) {
    if (invoice.status === 'draft' || invoice.status === 'void') continue
    totalInvoicedMinor += invoice.total_minor
    const paid = paidByInvoice.get(invoice.id) ?? 0
    const outstanding = Math.max(0, invoice.total_minor - paid)
    if (outstanding <= 0) continue
    outstandingMinor += outstanding
    const bucket = arAgingBucket(invoice.due_date, today)
    agingTotals.set(bucket, (agingTotals.get(bucket) ?? 0) + outstanding)
    if (isInvoiceOverdue(invoice.status, invoice.due_date, today)) {
      overdueMinor += outstanding
    }
  }

  const aging = AR_AGING_BUCKETS.map((bucket) => ({
    bucket,
    amountMinor: agingTotals.get(bucket) ?? 0,
  }))

  // 6-month collected series (oldest → newest), keyed by month start.
  const monthBuckets: Array<{ key: string; label: string; totalMinor: number }> = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const month = startOfMonth(subMonths(now, i))
    monthBuckets.push({ key: format(month, 'yyyy-MM'), label: format(month, 'MMM'), totalMinor: 0 })
  }
  const byKey = new Map(monthBuckets.map((b) => [b.key, b]))
  for (const p of payments) {
    const key = p.received_at.slice(0, 7)
    const bucket = byKey.get(key)
    if (bucket) bucket.totalMinor += p.amount_minor
  }

  // Recent invoices (top 5) reuse the list-row derivation.
  const recent = invoices.slice(0, 5)
  const [clientNames, projectNames] = await Promise.all([
    namesById(
      ctx,
      'clients',
      'name',
      recent.map((i) => i.client_id),
    ),
    namesById(
      ctx,
      'projects',
      'name',
      recent.map((i) => i.project_id).filter((id): id is string => !!id),
    ),
  ])

  const pendingExpenses = {
    count: pendingExpensesRaw?.length ?? 0,
    totalMinor: (pendingExpensesRaw ?? []).reduce((sum, e) => sum + e.amount_minor, 0),
  }

  return {
    currency,
    totalInvoicedMinor,
    collectedMinor,
    outstandingMinor,
    overdueMinor,
    invoiceCount: invoices.length,
    aging,
    collectedByMonth: monthBuckets.map((b) => ({ label: b.label, totalMinor: b.totalMinor })),
    recentInvoices: recent.map((invoice) => toListRow(invoice, clientNames, projectNames, today)),
    pendingExpenses,
  }
}

/** All invoice numbers in the workspace — feeds nextInvoiceNumber() suggestions. */
export async function getInvoiceNumbers(ctx: WorkspaceContext): Promise<string[]> {
  const { data } = await ctx.supabase
    .from('invoices')
    .select('number')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
  return (data ?? []).map((row) => row.number)
}

/** Server-suggested next invoice number, `INV-{year}-{seq}` (user may override). */
export async function getNextInvoiceNumber(ctx: WorkspaceContext): Promise<string> {
  const numbers = await getInvoiceNumbers(ctx)
  return nextInvoiceNumber(numbers, new Date().getFullYear())
}
