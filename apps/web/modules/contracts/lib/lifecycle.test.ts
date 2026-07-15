import { describe, expect, it } from 'vitest'
import {
  daysUntil,
  deriveContractStatus,
  EXPIRING_WINDOW_DAYS,
  isExpiringSoon,
  renewalBucket,
} from './lifecycle'

const TODAY = '2026-07-14'

describe('daysUntil', () => {
  it('counts whole days forward', () => {
    expect(daysUntil('2026-07-24', TODAY)).toBe(10)
  })
  it('is negative for past dates', () => {
    expect(daysUntil('2026-07-04', TODAY)).toBe(-10)
  })
  it('is null with no date or a bad date', () => {
    expect(daysUntil(null, TODAY)).toBeNull()
    expect(daysUntil('not-a-date', TODAY)).toBeNull()
  })
})

describe('deriveContractStatus', () => {
  it('leaves non-live statuses untouched', () => {
    expect(deriveContractStatus('draft', '2020-01-01', TODAY)).toBe('draft')
    expect(deriveContractStatus('sent', '2020-01-01', TODAY)).toBe('sent')
    expect(deriveContractStatus('terminated', '2020-01-01', TODAY)).toBe('terminated')
  })
  it('promotes an active contract past its end date to expired', () => {
    expect(deriveContractStatus('active', '2026-07-01', TODAY)).toBe('expired')
  })
  it('flags an active contract inside the window as expiring', () => {
    const soon = '2026-08-01' // 18 days out
    expect(deriveContractStatus('active', soon, TODAY)).toBe('expiring')
  })
  it('keeps an active contract well before its end date active', () => {
    expect(deriveContractStatus('active', '2027-07-14', TODAY)).toBe('active')
  })
  it('settles a stale expiring flag back to active when the term is far out', () => {
    expect(deriveContractStatus('expiring', '2027-07-14', TODAY)).toBe('active')
  })
  it('uses exactly the configured window boundary', () => {
    const boundary = daysUntil(null, TODAY)
    expect(boundary).toBeNull() // sanity: helper handles null
    // A contract ending exactly EXPIRING_WINDOW_DAYS out is still "expiring".
    const end = new Date(Date.parse(`${TODAY}T00:00:00Z`) + EXPIRING_WINDOW_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10)
    expect(deriveContractStatus('active', end, TODAY)).toBe('expiring')
  })
})

describe('renewalBucket', () => {
  it('buckets by term proximity', () => {
    expect(renewalBucket(null, TODAY)).toBe('no-term')
    expect(renewalBucket('2026-07-01', TODAY)).toBe('expired')
    expect(renewalBucket('2026-08-01', TODAY)).toBe('expiring-soon')
    expect(renewalBucket('2027-07-14', TODAY)).toBe('active')
  })
})

describe('isExpiringSoon', () => {
  it('is true only for live contracts inside the window', () => {
    expect(isExpiringSoon('active', '2026-08-01', TODAY)).toBe(true)
    expect(isExpiringSoon('draft', '2026-08-01', TODAY)).toBe(false)
    expect(isExpiringSoon('active', '2027-07-14', TODAY)).toBe(false)
    expect(isExpiringSoon('active', '2026-07-01', TODAY)).toBe(false) // already expired
  })
})
