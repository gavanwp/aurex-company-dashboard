import { describe, expect, it } from 'vitest'
import type { InvoiceLineItem } from '@aurexos/core'
import {
  arAgingBucket,
  computeInvoiceTotals,
  computeLineAmountMinor,
  daysOverdue,
  dollarsToMinor,
  isInvoiceOverdue,
  minorToDollars,
  nextInvoiceNumber,
  normalizeLineItems,
} from './money'

const line = (partial: Partial<InvoiceLineItem>): InvoiceLineItem => ({
  description: 'Work',
  quantity: 1,
  unitPriceMinor: 0,
  amountMinor: 0,
  ...partial,
})

describe('computeInvoiceTotals', () => {
  it('sums line amounts and ignores client-sent amountMinor', () => {
    const totals = computeInvoiceTotals([
      line({ quantity: 3, unitPriceMinor: 150_000, amountMinor: 999 }), // 3 × $1500 = $4500
      line({ quantity: 2, unitPriceMinor: 25_000, amountMinor: 0 }), //    2 × $250  = $500
    ])
    expect(totals.subtotalMinor).toBe(500_000)
    expect(totals.taxMinor).toBe(0)
    expect(totals.totalMinor).toBe(500_000)
  })

  it('computes per-line tax with banker-safe rounding and adds it to total', () => {
    const totals = computeInvoiceTotals([
      line({ quantity: 1, unitPriceMinor: 10_000, taxRatePct: 8.25 }), // tax = round(825) = 825
      line({ quantity: 1, unitPriceMinor: 3_333, taxRatePct: 10 }), //    tax = round(333.3) = 333
    ])
    expect(totals.subtotalMinor).toBe(13_333)
    expect(totals.taxMinor).toBe(1_158)
    expect(totals.totalMinor).toBe(14_491)
  })

  it('handles an empty invoice', () => {
    expect(computeInvoiceTotals([])).toEqual({ subtotalMinor: 0, taxMinor: 0, totalMinor: 0 })
  })
})

describe('computeLineAmountMinor / normalizeLineItems', () => {
  it('rounds fractional quantities', () => {
    expect(computeLineAmountMinor(1.5, 10_000)).toBe(15_000)
    expect(computeLineAmountMinor(0.333, 10_000)).toBe(3_330)
  })

  it('rewrites amountMinor from quantity × unitPrice', () => {
    const [normalized] = normalizeLineItems([
      line({ quantity: 2, unitPriceMinor: 5_000, amountMinor: 1 }),
    ])
    expect(normalized?.amountMinor).toBe(10_000)
  })
})

describe('dollarsToMinor / minorToDollars', () => {
  it('round-trips through minor units', () => {
    expect(dollarsToMinor('1500.00')).toBe(150_000)
    expect(dollarsToMinor('1,500.50')).toBe(150_050)
    expect(dollarsToMinor(19.99)).toBe(1_999)
    expect(dollarsToMinor('abc')).toBe(0)
    expect(minorToDollars(150_050)).toBe('1500.50')
    expect(minorToDollars(0)).toBe('0.00')
  })
})

describe('nextInvoiceNumber', () => {
  it('increments the highest sequence for the year', () => {
    expect(nextInvoiceNumber(['INV-2026-0001', 'INV-2026-0007', 'INV-2025-0099'], 2026)).toBe(
      'INV-2026-0008',
    )
  })

  it('starts at 0001 for a fresh year', () => {
    expect(nextInvoiceNumber(['INV-2025-0004'], 2026)).toBe('INV-2026-0001')
    expect(nextInvoiceNumber([], 2026)).toBe('INV-2026-0001')
  })
})

describe('arAgingBucket / daysOverdue / isInvoiceOverdue', () => {
  it('buckets by days past due', () => {
    expect(arAgingBucket('2026-07-20', '2026-07-11')).toBe('current') // not yet due
    expect(arAgingBucket('2026-07-11', '2026-07-11')).toBe('current') // due today
    expect(arAgingBucket('2026-07-01', '2026-07-11')).toBe('1-30') // 10 days
    expect(arAgingBucket('2026-06-01', '2026-07-11')).toBe('31-60') // 40 days
    expect(arAgingBucket('2026-05-01', '2026-07-11')).toBe('61-90') // 71 days
    expect(arAgingBucket('2026-01-01', '2026-07-11')).toBe('90+')
    expect(arAgingBucket(null, '2026-07-11')).toBe('current')
  })

  it('counts overdue days independent of timezone', () => {
    expect(daysOverdue('2026-07-01', '2026-07-11')).toBe(10)
  })

  it('only marks live receivables overdue', () => {
    expect(isInvoiceOverdue('sent', '2026-07-01', '2026-07-11')).toBe(true)
    expect(isInvoiceOverdue('partial', '2026-07-01', '2026-07-11')).toBe(true)
    expect(isInvoiceOverdue('paid', '2026-07-01', '2026-07-11')).toBe(false)
    expect(isInvoiceOverdue('draft', '2026-07-01', '2026-07-11')).toBe(false)
    expect(isInvoiceOverdue('void', '2026-07-01', '2026-07-11')).toBe(false)
    expect(isInvoiceOverdue('sent', '2026-07-20', '2026-07-11')).toBe(false) // future due
  })
})
