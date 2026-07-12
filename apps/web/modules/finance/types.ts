// Client-safe row shapes + label/badge maps shared by queries (server) and
// components (client). No I/O here — safe to import from either side. Money is
// always integer minor units (R-D8); formatting is formatMoney's job only.

import type {
  ExpenseApprovalStatus,
  InvoiceLineItem,
  InvoiceStatus,
  PaymentMethod,
} from '@aurexos/core'
import type { BadgeProps } from '@aurexos/ui/components/badge'
import type { AgingBucket } from './lib/money'

// ── Invoices ──────────────────────────────────────────────────────────────

/** A row in the invoices table. `isOverdue` is derived (due date passed). */
export interface InvoiceListRow {
  id: string
  number: string
  status: InvoiceStatus
  currency: string
  clientId: string
  clientName: string | null
  projectId: string | null
  projectName: string | null
  totalMinor: number
  issueDate: string | null
  dueDate: string | null
  isOverdue: boolean
  createdAt: string
}

export interface PaymentRow {
  id: string
  amountMinor: number
  currency: string
  method: PaymentMethod
  receivedAt: string
  feesMinor: number
  externalRef: string | null
}

/** One invoice with its frozen line items, payments and derived balances. */
export interface InvoiceDetail {
  id: string
  number: string
  status: InvoiceStatus
  currency: string
  clientId: string
  clientName: string | null
  projectId: string | null
  projectName: string | null
  subtotalMinor: number
  taxMinor: number
  totalMinor: number
  amountPaidMinor: number
  balanceMinor: number
  issueDate: string | null
  dueDate: string | null
  isOverdue: boolean
  lineItems: InvoiceLineItem[]
  payments: PaymentRow[]
  createdAt: string
  updatedAt: string
}

// ── Expenses ──────────────────────────────────────────────────────────────

export interface ExpenseRow {
  id: string
  vendor: string
  amountMinor: number
  currency: string
  category: string | null
  expenseDate: string
  billable: boolean
  projectId: string | null
  projectName: string | null
  submittedByName: string | null
  approvalStatus: ExpenseApprovalStatus
  createdAt: string
}

// ── Overview snapshot (exported for dashboard reuse) ────────────────────────

export interface AgingSlice {
  bucket: AgingBucket
  amountMinor: number
}

export interface CollectedPoint {
  /** Short month label, e.g. "Feb". */
  label: string
  totalMinor: number
}

/**
 * The finance cash snapshot. Exported from the module surface so the dashboard
 * (or any other module) can reuse the same computed shape.
 */
export interface FinanceSnapshot {
  currency: string
  totalInvoicedMinor: number
  collectedMinor: number
  outstandingMinor: number
  overdueMinor: number
  invoiceCount: number
  aging: AgingSlice[]
  collectedByMonth: CollectedPoint[]
  recentInvoices: InvoiceListRow[]
  pendingExpenses: { count: number; totalMinor: number }
}

// ── Picker options ──────────────────────────────────────────────────────────

export interface FinanceOption {
  id: string
  name: string
}

export interface FinanceFormOptions {
  clients: FinanceOption[]
  projects: FinanceOption[]
}

// ── Filter tabs ───────────────────────────────────────────────────────────

export const INVOICE_STATUS_TABS = [
  'all',
  'draft',
  'sent',
  'partial',
  'overdue',
  'paid',
  'void',
] as const
export type InvoiceStatusTab = (typeof INVOICE_STATUS_TABS)[number]

export function isInvoiceStatusTab(value: string | undefined): value is InvoiceStatusTab {
  return !!value && (INVOICE_STATUS_TABS as readonly string[]).includes(value)
}

export const EXPENSE_STATUS_TABS = ['all', 'pending', 'approved', 'rejected'] as const
export type ExpenseStatusTab = (typeof EXPENSE_STATUS_TABS)[number]

export function isExpenseStatusTab(value: string | undefined): value is ExpenseStatusTab {
  return !!value && (EXPENSE_STATUS_TABS as readonly string[]).includes(value)
}

// ── Label + badge maps ──────────────────────────────────────────────────────

type BadgeVariant = NonNullable<BadgeProps['variant']>

/**
 * Invoice status → soft badge variant + label. Soft variants only (never
 * color alone — the label carries the state, 11_Design_Principles.md §5).
 */
export const INVOICE_STATUS_META: Record<InvoiceStatus, { label: string; variant: BadgeVariant }> =
  {
    draft: { label: 'Draft', variant: 'secondary' },
    sent: { label: 'Sent', variant: 'info-soft' },
    viewed: { label: 'Viewed', variant: 'accent-soft' },
    partial: { label: 'Partially paid', variant: 'warning-soft' },
    paid: { label: 'Paid', variant: 'success-soft' },
    overdue: { label: 'Overdue', variant: 'destructive-soft' },
    void: { label: 'Void', variant: 'outline' },
  }

export const EXPENSE_STATUS_META: Record<
  ExpenseApprovalStatus,
  { label: string; variant: BadgeVariant }
> = {
  pending: { label: 'Pending', variant: 'warning-soft' },
  approved: { label: 'Approved', variant: 'success-soft' },
  rejected: { label: 'Rejected', variant: 'destructive-soft' },
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  stripe: 'Stripe',
  bank: 'Bank transfer',
  manual: 'Manual',
}

export const AR_AGING_LABELS: Record<AgingBucket, string> = {
  current: 'Current',
  '1-30': '1–30 days',
  '31-60': '31–60 days',
  '61-90': '61–90 days',
  '90+': '90+ days',
}

/** Finance module hue (teal) — matches the dashboard revenue metric. */
export const FINANCE_HUE = '--chart-2'
