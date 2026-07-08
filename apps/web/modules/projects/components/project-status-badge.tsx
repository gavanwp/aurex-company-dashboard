// Pure presentational status badge — safe in server and client components.

import type { ProjectStatusDb } from '@aurexos/db'
import { Badge } from '@aurexos/ui/components/badge'
import { cn } from '@aurexos/ui/lib/utils'

export const PROJECT_STATUS_META: Record<
  ProjectStatusDb,
  { label: string; dotClassName: string; badgeClassName?: string }
> = {
  planning: { label: 'Planning', dotClassName: 'bg-primary' },
  active: { label: 'Active', dotClassName: 'bg-success' },
  on_hold: { label: 'On hold', dotClassName: 'bg-warning' },
  completed: { label: 'Completed', dotClassName: 'bg-success' },
  archived: {
    label: 'Archived',
    dotClassName: 'bg-muted-foreground',
    badgeClassName: 'text-muted-foreground',
  },
}

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatusDb
  className?: string
}) {
  const meta = PROJECT_STATUS_META[status]
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', meta.badgeClassName, className)}>
      <span className={cn('size-1.5 rounded-full', meta.dotClassName)} aria-hidden="true" />
      {meta.label}
    </Badge>
  )
}
