import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '../lib/utils'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lucide icon rendered in a muted circle above the title. */
  icon?: LucideIcon
  title: string
  description?: string
  /** Primary CTA (and optional secondary actions) rendered under the copy. */
  action?: React.ReactNode
}

/**
 * Designed empty state for lists, tables, and boards
 * (11_Design_Principles.md §6.2 — empty states that teach).
 */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon: Icon, title, description, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center',
        className,
      )}
      {...props}
    >
      {Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? (
        <div className="mt-4 flex items-center gap-2">{action}</div>
      ) : null}
    </div>
  ),
)
EmptyState.displayName = 'EmptyState'

export { EmptyState }
