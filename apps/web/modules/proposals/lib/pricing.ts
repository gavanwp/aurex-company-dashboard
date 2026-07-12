// Pure pricing math for the Proposals module. Zero I/O, zero runtime imports so
// it is trivially unit-testable and safe on server or client.
//
// MONEY LAW (R-D8): every amount is an integer of minor units (cents). Never a
// float on the wire, never a client-trusted total — the proposal actions call
// computePricingTotal() to recompute the headline total from the line items they
// received, discarding whatever total the client sent.
//
// Mirrors the finance approach (dollarsToMinor / minorToDollars / line-amount +
// total recompute); reimplemented here rather than imported so this module never
// reaches into finance internals (13_Folder_Structure.md §3).

import type { ProposalPricingLine } from '@aurexos/core'
import type { ProposalPricingLineView, ProposalPricingView } from '../types'

/** amountMinor for one line = round(quantity × rateMinor). */
export function computeLineAmountMinor(quantity: number, rateMinor: number): number {
  return Math.round(quantity * rateMinor)
}

/**
 * Recompute the headline total from the line items — server-side truth. Optional
 * add-on lines are shown to the client but excluded from the committed total;
 * only non-optional lines count. Discount is subtracted, floored at zero.
 */
export function computePricingTotal(lines: ProposalPricingLine[], discountMinor = 0): number {
  let subtotal = 0
  for (const line of lines) {
    if (line.optional) continue
    subtotal += computeLineAmountMinor(line.quantity, line.rateMinor)
  }
  return Math.max(0, subtotal - Math.max(0, discountMinor))
}

/** Sum of every line (optional included) — the pre-discount gross, for display. */
export function computeGrossMinor(lines: ProposalPricingLine[]): number {
  let gross = 0
  for (const line of lines) gross += computeLineAmountMinor(line.quantity, line.rateMinor)
  return gross
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
 * Normalize a stored/derived pricing object into a render-ready view: every line
 * carries a freshly-recomputed amountMinor and the total is authoritative. Safe
 * against partial jsonb — missing fields collapse to sane defaults.
 */
export function toPricingView(pricing: {
  currency?: string
  lines?: ProposalPricingLine[]
  discountMinor?: number
}): ProposalPricingView {
  const lines = pricing.lines ?? []
  const discountMinor = pricing.discountMinor ?? 0
  const lineViews: ProposalPricingLineView[] = lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    rateMinor: line.rateMinor,
    optional: line.optional ?? false,
    amountMinor: computeLineAmountMinor(line.quantity, line.rateMinor),
  }))
  return {
    currency: pricing.currency ?? 'USD',
    lines: lineViews,
    discountMinor,
    totalMinor: computePricingTotal(lines, discountMinor),
  }
}

// NOTE ON TOKENS: the public share token is NOT generated here. proposals.public_token
// defaults in Postgres to `encode(gen_random_bytes(16), 'hex')` (0009) — an
// unguessable 32-char hex string minted on insert and rotatable by reissue. The
// app never fabricates tokens; it reads the DB-assigned value after send.
