import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { AurexMark } from '@aurexos/ui/components/ai/aurex-mark'
import { Button, buttonVariants } from '@aurexos/ui/components/button'
import { Card } from '@aurexos/ui/components/card'
import { Input } from '@aurexos/ui/components/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@aurexos/ui/components/tooltip'
import { cn } from '@aurexos/ui/lib/utils'
import type { DailyBrief } from '../queries/get-dashboard'

const PHASE_3_HINT = 'Aurex arrives in Phase 3'

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

/** Only true facts make the list; zero counts are omitted, not decorated. */
function briefLines(brief: DailyBrief): string[] {
  const lines: string[] = []
  if (brief.tasksDueToday > 0)
    lines.push(`${plural(brief.tasksDueToday, 'task', 'tasks')} due today`)
  if (brief.meetingsToday > 0)
    lines.push(`${plural(brief.meetingsToday, 'meeting', 'meetings')} scheduled today`)
  if (brief.proposalsPending > 0)
    lines.push(`${plural(brief.proposalsPending, 'proposal', 'proposals')} awaiting a reply`)
  if (brief.invoicesOverdue > 0)
    lines.push(`${plural(brief.invoicesOverdue, 'invoice', 'invoices')} overdue`)
  if (brief.newLeadsThisWeek > 0)
    lines.push(`${plural(brief.newLeadsThisWeek, 'new lead', 'new leads')} this week`)
  return lines
}

/**
 * Right-rail AI assistant card. Every checklist row is a real computed
 * fact — no invented summaries before Aurex ships. Conversational actions
 * render disabled with an honest reason (Phase 3); "Show my tasks" works
 * today because the route does.
 */
export function AiDailyBrief({
  brief,
  firstName,
  greeting,
}: {
  brief: DailyBrief
  firstName: string
  greeting: string
}) {
  const lines = briefLines(brief)

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <AurexMark size={16} label="Aurex, AI assistant" />
        <h3 className="text-[15px] font-semibold leading-[22px] text-foreground">AI assistant</h3>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">
          {greeting}, {firstName}.
        </p>
        <p className="text-sm text-muted-foreground">Your daily summary.</p>
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">All clear today.</p>
      ) : (
        <ul className="space-y-2">
          {lines.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href="/tasks?filter=mine"
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
        >
          Show my tasks
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="secondary" size="sm" disabled>
                Summarize today
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{PHASE_3_HINT}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="secondary" size="sm" disabled>
                What needs attention?
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{PHASE_3_HINT}</TooltipContent>
        </Tooltip>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Input placeholder="Ask me anything…" disabled aria-label="Message Aurex" />
          </span>
        </TooltipTrigger>
        <TooltipContent>{PHASE_3_HINT}</TooltipContent>
      </Tooltip>
    </Card>
  )
}
