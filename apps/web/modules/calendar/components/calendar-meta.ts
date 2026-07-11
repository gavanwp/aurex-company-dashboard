// Pure presentational metadata for the three calendar layers.
// Safe to import from both server and client components.

import { CalendarDays, SquareCheckBig, Users, type LucideIcon } from 'lucide-react'
import type { CalendarLayer } from '../types'

export interface CalendarLayerMeta {
  label: string
  icon: LucideIcon
  /**
   * Soft chip colors per layer, from design tokens (never color alone — every
   * chip also carries the layer icon): native events accent-soft, tasks
   * amber/warning-soft, meetings teal via --chart-2.
   */
  chipClassName: string
  /** Icon-only tint for dense rows (upcoming list). */
  iconClassName: string
}

export const CALENDAR_LAYER_META: Record<CalendarLayer, CalendarLayerMeta> = {
  event: {
    label: 'Event',
    icon: CalendarDays,
    chipClassName: 'bg-[hsl(var(--accent-soft))] text-[hsl(var(--accent-text))]',
    iconClassName: 'text-[hsl(var(--accent-text))]',
  },
  task: {
    label: 'Task',
    icon: SquareCheckBig,
    chipClassName: 'bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning-text))]',
    iconClassName: 'text-[hsl(var(--warning-text))]',
  },
  meeting: {
    label: 'Meeting',
    icon: Users,
    chipClassName: 'bg-[hsl(var(--chart-2)/0.15)] text-[hsl(var(--chart-2))]',
    iconClassName: 'text-[hsl(var(--chart-2))]',
  },
}
