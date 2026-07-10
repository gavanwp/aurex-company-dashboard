import { describe, expect, it } from 'vitest'
import { formatMoney, initialsOf, slugify } from './index'

// R-Q2: slugify feeds workspace slugs (mirrored by create_workspace() in
// supabase/migrations/0002) and formatMoney renders minor units — money math.

describe('slugify', () => {
  it('lowercases, trims, and hyphenates whitespace', () => {
    expect(slugify('  Aurex Designs  ')).toBe('aurex-designs')
  })

  it('strips symbols and collapses repeated separators', () => {
    expect(slugify('Aurex — Designs & Co.!!')).toBe('aurex-designs-co')
    // Underscores are symbols to the first pass — removed, not hyphenated.
    expect(slugify('a___b   c')).toBe('ab-c')
  })

  it('never emits leading or trailing hyphens', () => {
    expect(slugify('-hello-')).toBe('hello')
    expect(slugify('!!!hello!!!')).toBe('hello')
  })

  it('caps output at 48 characters', () => {
    expect(slugify('x'.repeat(100)).length).toBeLessThanOrEqual(48)
  })

  it('returns an empty string for symbol-only input (caller must handle)', () => {
    expect(slugify('!!!')).toBe('')
  })

  it('matches the DB slug constraint for typical names', () => {
    // workspaces.slug CHECK: ^[a-z0-9]+(?:-[a-z0-9]+)*$
    const dbConstraint = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    for (const name of ['Meridian Retail Group', 'Bloom Wellness Co', 'A1 Studio']) {
      expect(slugify(name)).toMatch(dbConstraint)
    }
  })
})

describe('formatMoney', () => {
  it('renders minor units as dollars with cents when fractional', () => {
    expect(formatMoney(123456)).toBe('$1,234.56')
  })

  it('drops the cents on whole-dollar amounts', () => {
    expect(formatMoney(500000)).toBe('$5,000')
  })

  it('renders an em dash for null and undefined', () => {
    expect(formatMoney(null)).toBe('—')
    expect(formatMoney(undefined)).toBe('—')
  })

  it('respects the currency parameter', () => {
    expect(formatMoney(9900, 'EUR')).toBe('€99')
  })
})

describe('initialsOf', () => {
  it('takes the first letter of the first two name parts, uppercased', () => {
    expect(initialsOf('ada lovelace')).toBe('AL')
    expect(initialsOf('Grace Brewster Murray Hopper')).toBe('GB')
  })

  it('handles single names and empty input', () => {
    expect(initialsOf('Cher')).toBe('C')
    expect(initialsOf('')).toBe('')
    expect(initialsOf('   ')).toBe('')
  })
})
