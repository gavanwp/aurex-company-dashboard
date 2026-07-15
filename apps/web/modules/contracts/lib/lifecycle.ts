// Pure contract-lifecycle logic — zero I/O (13_Folder_Structure.md iron law 3).
// Dates are ISO date strings ('YYYY-MM-DD'); "today" is passed in so the
// functions stay deterministic and unit-testable.

import type { ContractStatus } from '@aurexos/core'

/** A contract nearing its end date within this many days is "expiring". */
export const EXPIRING_WINDOW_DAYS = 60

/** Whole days from `today` until `date` (negative if `date` is in the past). */
export function daysUntil(date: string | null, today: string): number | null {
  if (!date) return null
  const end = Date.parse(`${date}T00:00:00Z`)
  const now = Date.parse(`${today}T00:00:00Z`)
  if (Number.isNaN(end) || Number.isNaN(now)) return null
  return Math.round((end - now) / 86_400_000)
}

/**
 * Derive the display status of a live contract from its dates. Only signed /
 * active contracts get date-driven promotion:
 *   - past end_date            → 'expired'
 *   - within the window of end → 'expiring'
 *   - otherwise                → unchanged
 * Draft / review / sent / terminated are never overridden here (their status is
 * a workflow fact, not a date fact).
 */
export function deriveContractStatus(
  status: ContractStatus,
  endDate: string | null,
  today: string,
): ContractStatus {
  if (status !== 'signed' && status !== 'active' && status !== 'expiring') return status
  const days = daysUntil(endDate, today)
  if (days === null) return status
  if (days < 0) return 'expired'
  if (days <= EXPIRING_WINDOW_DAYS) return 'expiring'
  // Was flagged expiring but the term moved out again → settle back to active.
  return status === 'expiring' ? 'active' : status
}

export type RenewalBucket = 'active' | 'expiring-soon' | 'expired' | 'no-term'

/** Classify a contract's term for the renewal radar. */
export function renewalBucket(endDate: string | null, today: string): RenewalBucket {
  const days = daysUntil(endDate, today)
  if (days === null) return 'no-term'
  if (days < 0) return 'expired'
  if (days <= EXPIRING_WINDOW_DAYS) return 'expiring-soon'
  return 'active'
}

/** True when the contract is signed/active and within the expiring window. */
export function isExpiringSoon(
  status: ContractStatus,
  endDate: string | null,
  today: string,
): boolean {
  if (status !== 'signed' && status !== 'active' && status !== 'expiring') return false
  const days = daysUntil(endDate, today)
  return days !== null && days >= 0 && days <= EXPIRING_WINDOW_DAYS
}
