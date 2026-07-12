import { describe, expect, it } from 'vitest'
import type { ProposalPricingLine } from '@aurexos/core'
import {
  computeGrossMinor,
  computeLineAmountMinor,
  computePricingTotal,
  dollarsToMinor,
  minorToDollars,
  toPricingView,
} from './pricing'

const line = (partial: Partial<ProposalPricingLine>): ProposalPricingLine => ({
  description: 'Work',
  quantity: 1,
  rateMinor: 0,
  optional: false,
  ...partial,
})

describe('computeLineAmountMinor', () => {
  it('rounds quantity × rate to whole minor units', () => {
    expect(computeLineAmountMinor(3, 150_000)).toBe(450_000)
    expect(computeLineAmountMinor(1.5, 10_001)).toBe(15_002) // 15001.5 → 15002
  })
})

describe('computePricingTotal', () => {
  it('sums non-optional lines and ignores optional add-ons', () => {
    const total = computePricingTotal([
      line({ quantity: 2, rateMinor: 250_000 }), // $5,000
      line({ quantity: 1, rateMinor: 100_000, optional: true }), // excluded
    ])
    expect(total).toBe(500_000)
  })

  it('subtracts the discount and floors at zero', () => {
    expect(computePricingTotal([line({ quantity: 1, rateMinor: 100_000 })], 30_000)).toBe(70_000)
    expect(computePricingTotal([line({ quantity: 1, rateMinor: 100_000 })], 500_000)).toBe(0)
  })

  it('ignores a negative discount', () => {
    expect(computePricingTotal([line({ quantity: 1, rateMinor: 100_000 })], -5_000)).toBe(100_000)
  })
})

describe('computeGrossMinor', () => {
  it('includes optional lines in the pre-discount gross', () => {
    const gross = computeGrossMinor([
      line({ quantity: 1, rateMinor: 100_000 }),
      line({ quantity: 1, rateMinor: 40_000, optional: true }),
    ])
    expect(gross).toBe(140_000)
  })
})

describe('dollarsToMinor / minorToDollars', () => {
  it('parses formatted dollar strings to minor units', () => {
    expect(dollarsToMinor('1,500.50')).toBe(150_050)
    expect(dollarsToMinor('')).toBe(0)
    expect(dollarsToMinor('abc')).toBe(0)
  })

  it('round-trips minor units back to a two-decimal string', () => {
    expect(minorToDollars(150_050)).toBe('1500.50')
    expect(minorToDollars(0)).toBe('0.00')
  })
})

describe('toPricingView', () => {
  it('recomputes each line amount and the authoritative total', () => {
    const view = toPricingView({
      currency: 'EUR',
      lines: [
        line({ description: 'Design', quantity: 2, rateMinor: 250_000 }),
        line({ description: 'Add-on', quantity: 1, rateMinor: 100_000, optional: true }),
      ],
      discountMinor: 50_000,
    })
    expect(view.currency).toBe('EUR')
    expect(view.lines).toHaveLength(2)
    expect(view.lines[0]?.amountMinor).toBe(500_000)
    expect(view.totalMinor).toBe(450_000) // 500,000 non-optional − 50,000 discount
  })

  it('is safe against an empty pricing object', () => {
    const view = toPricingView({})
    expect(view.currency).toBe('USD')
    expect(view.lines).toEqual([])
    expect(view.totalMinor).toBe(0)
  })
})
