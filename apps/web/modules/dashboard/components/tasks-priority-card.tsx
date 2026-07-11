import Link from 'next/link'
import { ListTodo } from 'lucide-react'
import { Badge } from '@aurexos/ui/components/badge'
import { Card } from '@aurexos/ui/components/card'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import type { DashboardTask } from '../queries/get-dashboard'
import { METRIC_HUES, PRIORITY_BADGES } from './metric-meta'

/**
 * "Tasks priority" — the top 5 open tasks ranked by priority, then due
 * date. Rows deep-link into Tasks; the priority badge pairs soft status
 * color with explicit text (never color alone).
 */
export function TasksPriorityCard({ tasks }: { tasks: DashboardTask[] }) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold leading-[22px] text-foreground">Tasks priority</h3>
        <Link
          href="/tasks"
          className="text-sm font-medium text-[hsl(var(--accent-text))] transition-colors hover:underline"
        >
          View all
        </Link>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No open tasks"
          description="Open tasks rank here by priority as your team creates them."
          className="mt-4 min-h-[220px] flex-1"
        />
      ) : (
        <ul className="mt-2 flex-1 divide-y divide-border/60">
          {tasks.map((task) => {
            const priority = PRIORITY_BADGES[task.priority]
            return (
              <li key={task.id}>
                <Link
                  href="/tasks"
                  className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: `hsl(var(${METRIC_HUES.pendingTasks}) / 0.12)`,
                      color: `hsl(var(${METRIC_HUES.pendingTasks}))`,
                    }}
                    aria-hidden="true"
                  >
                    <ListTodo className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {task.title}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {task.projectName ?? 'No project'}
                    </span>
                  </span>
                  <Badge variant={priority.variant} className="shrink-0 font-medium">
                    {priority.label}
                  </Badge>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
