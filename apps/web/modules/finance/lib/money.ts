// Pure money + invoicing math for the Finance module. Zero I/O, zero runtime
// imports (the one `@aurexos/core` import is a type and fully erased) so this
// file is trivially unit-testable and safe to import from server or client.
//
// MONEY LAW (R-D8): every amount is an integer of minor units (cents). Never a
// float on the wire, never a client-trusted total — the invoice action calls
// computeInvoiceTotals() to recompute subtotal/tax/total from the line items it
// received, discarding whatever totals the client sent.

import type { InvoiceLineItem } from '@aurexos/core'

export interface InvoiceTotals {
  subtotalMinor: number
  taxMinor: number
  totalMinor: number
}

/** amountMinor for one line = round(quantity × unitPriceMinor). */
export function computeLineAmountMinor(quantity: number, unitPriceMinor: number): number {
  return Math.round(quantity * unitPriceMinor)
}

/**
 * Recompute subtotal, tax and total from line items — server-side truth.
 * Tax is per-line: taxMinor = Σ round(lineAmount × taxRatePct / 100). The
 * passed `amountMinor` on each line is ignored; it is recomputed from
 * quantity × unitPriceMinor so a tampered client total can never take hold.
 */
export function computeInvoiceTotals(lineItems: InvoiceLineItem[]): InvoiceTotals {
  let subtotalMinor = 0
  let taxMinor = 0
  for (const line of lineItems) {
    const amount = computeLineAmountMinor(line.quantity, line.unitPriceMinor)
    subtotalMinor += amount
    if (line.taxRatePct) {
      taxMinor += Math.round((amount * line.taxRatePct) / 100)
    }
  }
  return { subtotalMinor, taxMinor, totalMinor: subtotalMinor + taxMinor }
}

/**
 * Normalize line items for persistence: recompute each amountMinor from
 * quantity × unitPriceMinor so the stored snapshot is internally consistent.
 */
export function normalizeLineItems(lineItems: InvoiceLineItem[]): InvoiceLineItem[] {
  return lineItems.map((line) => ({
    ...line,
    amountMinor: computeLineAmountMinor(line.quantity, line.unitPriceMinor),
  }))
}

/**
 * Convert a user-entered dollar string/number to integer minor units.
 * Non-finite input collapses to 0. `"1,500.50"` → 150050.
 */
export function dollarsToMinor(input: string | number): number {
  const value =
    typeof input === 'number' ? input : Number.parseFloat(String(input).replace(/[,\s]/g, ''))
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100)
}

/**
 * Minor units → a plain dollar string for round-tripping into a form input
 * (no currency symbol, always two decimals). `150050` → `"1500.50"`.
 */
export function minorToDollars(minor: number): string {
  return (minor / 100).toFixed(2)
}

/**
 * Suggest the next per-workspace invoice number: `INV-{year}-{seq}` where seq
 * is the highest existing sequence for that year + 1, zero-padded to 4. The
 * user may override; the DB unique (workspace_id, number) is the real backstop.
 */
export function nextInvoiceNumber(existingNumbers: string[], year: number): string {
  const prefix = `INV-${year}-`
  let max = 0
  for (const number of existingNumbers) {
    if (!number.startsWith(prefix)) continue
    const seq = Number.parseInt(number.slice(prefix.length), 10)
    if (Number.isInteger(seq) && seq > max) max = seq
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

export const AR_AGING_BUCKETS = ['current', '1-30', '31-60', '61-90', '90+'] as const
export type AgingBucket = (typeof AR_AGING_BUCKETS)[number]

/** Parse a `YYYY-MM-DD` date to an integer day count (UTC), TZ-independent. */
function toUtcDay(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Math.floor(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000)
}

/** Days `today` is past `dueDate` (positive = overdue). Both `YYYY-MM-DD`. */
export function daysOverdue(dueDate: string, today: string): number {
  return toUtcDay(today) - toUtcDay(dueDate)
}

/**
 * AR aging bucket for a receivable by its due date, as of `today`
 * (`YYYY-MM-DD`). Not-yet-due (or undated) receivables are `current`.
 */
export function arAgingBucket(dueDate: string | null | undefined, today: string): AgingBucket {
  if (!dueDate) return 'current'
  const days = daysOverdue(dueDate, today)
  if (days <= 0) return 'current'
  if (days <= 30) return '1-30'
  if (days <= 60) return '31-60'
  if (days <= 90) return '61-90'
  return '90+'
}

/**
 * Whether an invoice reads as overdue for display: a live receivable
 * (sent / viewed / partial) whose due date has passed. `paid`, `draft` and
 * `void` are never overdue.
 */
export function isInvoiceOverdue(
  status: string,
  dueDate: string | null | undefined,
  today: string,
): boolean {
  if (!dueDate) return false
  if (status !== 'sent' && status !== 'viewed' && status !== 'partial' && status !== 'overdue') {
    return false
  }
  return daysOverdue(dueDate, today) > 0
}
