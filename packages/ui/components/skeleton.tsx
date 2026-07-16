import * as React from 'react'

import { cn } from '../lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // Premium shimmer sweep (ADR-0007) over a muted block; reduced-motion collapses
  // the sweep to a static block via the global rule in globals.css.
  return <div className={cn('aurex-shimmer rounded-md bg-muted', className)} {...props} />
}

export { Skeleton }
