import type { AutomationRunStatus, AutomationStatus } from '@aurexos/core'

// Pure display helpers for Automation Studio.

export function statusLabel(status: AutomationStatus): string {
  return status === 'active' ? 'Active' : status === 'paused' ? 'Paused' : 'Draft'
}

export function statusVariant(
  status: AutomationStatus,
): 'success-soft' | 'warning-soft' | 'secondary' {
  return status === 'active' ? 'success-soft' : status === 'paused' ? 'warning-soft' : 'secondary'
}

export function runStatusLabel(status: AutomationRunStatus): string {
  switch (status) {
    case 'succeeded':
      return 'Succeeded'
    case 'failed':
      return 'Failed'
    case 'running':
      return 'Running'
    case 'cancelled':
      return 'Cancelled'
  }
}

export function runStatusVariant(
  status: AutomationRunStatus,
): 'success-soft' | 'destructive-soft' | 'info-soft' | 'secondary' {
  switch (status) {
    case 'succeeded':
      return 'success-soft'
    case 'failed':
      return 'destructive-soft'
    case 'running':
      return 'info-soft'
    case 'cancelled':
      return 'secondary'
  }
}

/** Relative "time ago" for run timestamps; UTC-stable. */
export function timeAgo(iso: string | null, nowMs: number): string {
  if (!iso) return 'never'
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return '—'
  const s = Math.max(0, Math.round((nowMs - then) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}
