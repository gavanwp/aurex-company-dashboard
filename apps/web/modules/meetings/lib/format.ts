// Shared, side-effect-free formatting helpers for meeting components.
import { format, isToday, isTomorrow } from 'date-fns'

/** ISO timestamp → "Mon, Feb 3 · 2:00 PM", with Today/Tomorrow shortcuts. */
export function formatMeetingTime(iso: string | null): string {
  if (!iso) return 'Not scheduled'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Not scheduled'
  const time = format(d, 'h:mm a')
  if (isToday(d)) return `Today · ${time}`
  if (isTomorrow(d)) return `Tomorrow · ${time}`
  return `${format(d, 'EEE, MMM d')} · ${time}`
}

/** ISO timestamp → "Feb 3, 2026". */
export function formatDay(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return format(d, 'MMM d, yyyy')
}

/** Date-only string (yyyy-MM-dd) → "Feb 3, 2026" at local midnight. */
export function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return format(d, 'MMM d, yyyy')
}

/** Relative-ish label for activity timestamps. */
export function formatWhen(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (isToday(d)) return `Today · ${format(d, 'h:mm a')}`
  return format(d, 'MMM d')
}

/** Initials from a name or email, for avatar fallbacks. */
export function initials(name: string | null | undefined, email?: string): string {
  const source = name?.trim() || email?.split('@')[0] || '?'
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  const first = parts[0] ?? ''
  const second = parts[1] ?? ''
  if (!first) return '?'
  if (!second) return first.slice(0, 2).toUpperCase()
  return ((first[0] ?? '') + (second[0] ?? '')).toUpperCase()
}
