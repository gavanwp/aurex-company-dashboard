import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { CheckCircle2 } from 'lucide-react'
import type { TaskPriorityDb } from '@aurexos/db'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@aurexos/ui/components/card'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { cn } from '@aurexos/ui/lib/utils'
import type { DashboardTask } from '../queries/get-dashboard'

const priorityDotClasses: Record<TaskPriorityDb, string> = {
  urgent: 'bg-destructive',
  high: 'bg-warning',
  medium: 'bg-primary',
  low: 'bg-muted-foreground',
  none: 'bg-muted-foreground/40',
}

export function MyTasksCard({ tasks }: { tasks: DashboardTask[] }) {
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>My tasks</CardTitle>
          <CardDescription>Your open work, soonest due first.</CardDescription>
        </div>
        <Link
          href="/tasks"
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No open tasks"
            description="Tasks assigned to you will show up here as they land."
            className="min-h-[220px]"
          />
        ) : (
          <ul className="-mx-2 divide-y divide-border/60">
            {tasks.map((task) => {
              const isOverdue = task.dueDate !== null && task.dueDate < today
              return (
                <li key={task.id}>
                  <Link
                    href="/tasks"
                    className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
                  >
                    <span
                      className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        priorityDotClasses[task.priority],
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {task.title}
                    </span>
                    {task.projectName ? (
                      <span className="inline-flex max-w-[10rem] shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            'size-1.5 rounded-full',
                            task.projectColor ? undefined : 'bg-muted-foreground/40',
                          )}
                          style={
                            task.projectColor ? { backgroundColor: task.projectColor } : undefined
                          }
                          aria-hidden="true"
                        />
                        <span className="truncate">{task.projectName}</span>
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'w-14 shrink-0 text-right text-xs [font-variant-numeric:tabular-nums]',
                        isOverdue ? 'font-medium text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {task.dueDate ? format(parseISO(task.dueDate), 'MMM d') : '—'}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
