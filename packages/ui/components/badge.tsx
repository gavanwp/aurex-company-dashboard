import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-success text-success-foreground shadow hover:bg-success/80',
        warning: 'border-transparent bg-warning text-warning-foreground shadow hover:bg-warning/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        /*
         * Soft status variants (Components.md §2.9: soft background + status
         * text color; solid is reserved for counts on nav). Status is never
         * conveyed by color alone — the label carries the meaning.
         */
        'success-soft':
          'border-transparent bg-[hsl(var(--success-soft))] text-[hsl(var(--success-text))]',
        'warning-soft':
          'border-transparent bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning-text))]',
        'destructive-soft':
          'border-transparent bg-[hsl(var(--destructive-soft))] text-[hsl(var(--destructive-text))]',
        'info-soft': 'border-transparent bg-[hsl(var(--info-soft))] text-[hsl(var(--info-text))]',
        /* Accent-soft — selection/identity moments only (ColorSystem.md §5). */
        'accent-soft':
          'border-transparent bg-[hsl(var(--accent-soft))] text-[hsl(var(--accent-text))]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
