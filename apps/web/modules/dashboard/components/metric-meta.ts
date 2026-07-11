// Series-to-hue registry for dashboard metrics (Charts.md §2.1: hues are
// registered per metric, not chosen per chart; ColorSystem.md §7: module-
// owned metrics use their module identity hue, everything else assigns in
// ramp order — never reshuffled for taste).

import type { ProjectStatusDb, TaskPriorityDb, TaskStatusDb } from '@aurexos/db'
import type { BadgeProps } from '@aurexos/ui/components/badge'

/** KPI metric hues. Revenue is finance teal; leads are CRM sky (pinned). */
export const METRIC_HUES = {
  revenue: '--chart-2', // finance module hue (teal)
  activeProjects: '--chart-1', // ramp order for non-module metrics
  pendingTasks: '--chart-3',
  newLeads: '--chart-4', // CRM module hue (sky)
  totalClients: '--chart-5', // ramp order — distinct from leads on this surface
} as const

/** Quick-action tile hues: module icon tints only, never surfaces. */
export const ACTION_HUES = {
  aiAssistant: '--chart-1', // Aurex identity (accent indigo)
  addTask: '--chart-3',
  addLead: '--chart-4', // CRM
  createInvoice: '--chart-2', // finance
} as const

/**
 * Donut segment hues assigned in ramp order (cross-category distribution,
 * Charts.md §2.1). Terminal/inactive buckets are neutral — the tail is
 * never a seventh hue (Charts.md §2.2).
 */
export const PROJECT_STATUS_DONUT: Record<ProjectStatusDb, { label: string; colorVar: string }> = {
  planning: { label: 'Planning', colorVar: '--chart-1' },
  active: { label: 'Active', colorVar: '--chart-2' },
  on_hold: { label: 'On hold', colorVar: '--chart-3' },
  completed: { label: 'Completed', colorVar: '--chart-4' },
  archived: { label: 'Archived', colorVar: '--muted-foreground' },
}

export const TASK_STATUS_DONUT: Record<TaskStatusDb, { label: string; colorVar: string }> = {
  backlog: { label: 'Backlog', colorVar: '--chart-1' },
  todo: { label: 'Todo', colorVar: '--chart-2' },
  in_progress: { label: 'In progress', colorVar: '--chart-3' },
  in_review: { label: 'In review', colorVar: '--chart-4' },
  done: { label: 'Done', colorVar: '--chart-5' },
  canceled: { label: 'Canceled', colorVar: '--muted-foreground' },
}

/**
 * Priority badges: soft status styling + explicit text — color never
 * carries the meaning alone (11_Design_Principles.md §5). Mapping follows
 * the app-wide priority treatment in modules/tasks/task-meta.tsx.
 */
export const PRIORITY_BADGES: Record<
  TaskPriorityDb,
  { label: string; variant: NonNullable<BadgeProps['variant']> }
> = {
  urgent: { label: 'Urgent', variant: 'destructive-soft' },
  high: { label: 'High', variant: 'warning-soft' },
  medium: { label: 'Medium', variant: 'secondary' },
  low: { label: 'Low', variant: 'secondary' },
  none: { label: 'None', variant: 'outline' },
}
