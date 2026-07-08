import * as React from 'react'

import { cn } from '../lib/utils'

/**
 * Keyboard shortcut chip. Renders a semantic <kbd> element styled as a small
 * muted key cap — used in tooltips, menus, and the command palette.
 *
 * @example <Kbd>⌘</Kbd> <Kbd>K</Kbd>
 */
const Kbd = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <kbd
      ref={ref}
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  ),
)
Kbd.displayName = 'Kbd'

export { Kbd }
