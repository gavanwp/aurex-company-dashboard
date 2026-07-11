import Link from 'next/link'
import { ListChecks, Receipt, UserPlus, type LucideIcon } from 'lucide-react'
import { AurexGlyph } from '@aurexos/ui/components/ai/aurex-mark'
import { Tooltip, TooltipContent, TooltipTrigger } from '@aurexos/ui/components/tooltip'
import { cn } from '@aurexos/ui/lib/utils'
import { ACTION_HUES } from './metric-meta'

interface TileVisualProps {
  /** CSS variable name for the tint, e.g. "--chart-3". */
  hue: string
  icon?: LucideIcon
  /** Render the ✦ Aurex glyph instead of a Lucide icon. */
  aurex?: boolean
}

/** Soft-tinted icon chip: bg hsl(var(--chart-n) / 0.12), icon full hue. */
function TileChip({ hue, icon: Icon, aurex = false }: TileVisualProps) {
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-md"
      style={{
        backgroundColor: `hsl(var(${hue}) / 0.12)`,
        color: `hsl(var(${hue}))`,
      }}
      aria-hidden="true"
    >
      {aurex ? <AurexGlyph size={16} /> : Icon ? <Icon className="size-4" /> : null}
    </span>
  )
}

const tileClasses =
  'flex items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors'

function TileCopy({ title, caption }: { title: string; caption: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-sm font-medium text-foreground">{title}</span>
      <span className="truncate text-xs text-muted-foreground">{caption}</span>
    </span>
  )
}

/**
 * Quick-action tiles (mockup top-right): bordered cards with a hover
 * background step — never solid colored surfaces. Actions without a live
 * destination render disabled with a tooltip explaining why.
 */
export function QuickActions() {
  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
      {/* AI assistant — Phase 3 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            aria-disabled="true"
            tabIndex={0}
            className={cn(tileClasses, 'cursor-not-allowed opacity-60')}
          >
            <TileChip hue={ACTION_HUES.aiAssistant} aurex />
            <TileCopy title="AI assistant" caption="Ask anything" />
          </div>
        </TooltipTrigger>
        <TooltipContent>Aurex arrives in Phase 3</TooltipContent>
      </Tooltip>

      <Link href="/tasks" className={cn(tileClasses, 'hover:border-input hover:bg-accent')}>
        <TileChip hue={ACTION_HUES.addTask} icon={ListChecks} />
        <TileCopy title="Add task" caption="Create new task" />
      </Link>

      <Link href="/crm" className={cn(tileClasses, 'hover:border-input hover:bg-accent')}>
        <TileChip hue={ACTION_HUES.addLead} icon={UserPlus} />
        <TileCopy title="Add lead" caption="New potential lead" />
      </Link>

      {/* Invoices ship with Finance (Phase 2) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            aria-disabled="true"
            tabIndex={0}
            className={cn(tileClasses, 'cursor-not-allowed opacity-60')}
          >
            <TileChip hue={ACTION_HUES.createInvoice} icon={Receipt} />
            <TileCopy title="Create invoice" caption="Generate invoice" />
          </div>
        </TooltipTrigger>
        <TooltipContent>Invoices are coming soon</TooltipContent>
      </Tooltip>
    </div>
  )
}
