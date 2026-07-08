// Pure presentational metadata for task statuses and priorities.
// Safe to import from both server and client components.

import {
  CheckCircle2,
  Circle,
  CircleDashed,
  CircleDot,
  CircleEllipsis,
  Minus,
  SignalHigh,
  SignalLow,
  SignalMedium,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { TaskPriorityDb, TaskStatusDb } from '@aurexos/db'
import { cn } from '@aurexos/ui/lib/utils'

export interface TaskMetaEntry {
  label: string
  icon: LucideIcon
  className: string
}

export const TASK_STATUS_META: Record<TaskStatusDb, TaskMetaEntry> = {
  backlog: { label: 'Backlog', icon: CircleDashed, className: 'text-muted-foreground' },
  todo: { label: 'Todo', icon: Circle, className: 'text-muted-foreground' },
  in_progress: { label: 'In progress', icon: CircleDot, className: 'text-warning' },
  in_review: { label: 'In review', icon: CircleEllipsis, className: 'text-primary' },
  done: { label: 'Done', icon: CheckCircle2, className: 'text-success' },
  canceled: { label: 'Canceled', icon: XCircle, className: 'text-muted-foreground' },
}

export const TASK_PRIORITY_META: Record<TaskPriorityDb, TaskMetaEntry> = {
  none: { label: 'No priority', icon: Minus, className: 'text-muted-foreground' },
  low: { label: 'Low', icon: SignalLow, className: 'text-muted-foreground' },
  medium: { label: 'Medium', icon: SignalMedium, className: 'text-foreground' },
  high: { label: 'High', icon: SignalHigh, className: 'text-warning' },
  urgent: { label: 'Urgent', icon: TriangleAlert, className: 'text-destructive' },
}

/** Render order for grouped lists — canceled is handled as a collapsed tail group. */
export const TASK_STATUS_ORDER: TaskStatusDb[] = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
]

export function TaskStatusIcon({
  status,
  className,
}: {
  status: TaskStatusDb
  className?: string
}) {
  const meta = TASK_STATUS_META[status]
  return <meta.icon className={cn('size-4', meta.className, className)} aria-hidden="true" />
}

export function TaskPriorityIcon({
  priority,
  className,
}: {
  priority: TaskPriorityDb
  className?: string
}) {
  const meta = TASK_PRIORITY_META[priority]
  return <meta.icon className={cn('size-4', meta.className, className)} aria-hidden="true" />
}
