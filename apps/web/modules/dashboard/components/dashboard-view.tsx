import type { WorkspaceContext } from '@/lib/workspace-context'
import type { DashboardData } from '../queries/get-dashboard'
import { ActivityCard } from './activity-card'
import { AiDailyBrief } from './ai-daily-brief'
import { KpiRow } from './kpi-row'
import { MeetingsCard } from './meetings-card'
import { PROJECT_STATUS_DONUT, TASK_STATUS_DONUT } from './metric-meta'
import { QuickActions } from './quick-actions'
import { RevenueCard } from './revenue-card'
import { StatusOverviewCard } from './status-overview-card'
import { TasksPriorityCard } from './tasks-priority-card'

function greetingFor(date: Date): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardView({ ctx, data }: { ctx: WorkspaceContext; data: DashboardData }) {
  const greeting = greetingFor(new Date())
  const firstName = ctx.profile.full_name?.trim().split(/\s+/)[0] || 'there'

  return (
    <div className="space-y-6">
      {/* Page header: greeting + quick actions. No exclamation marks
          (DashboardRules.md §2.4), no emoji. */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your agency today.
          </p>
        </div>
        <QuickActions />
      </div>

      <div className="grid gap-4 min-[1400px]:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          <KpiRow data={data} />

          <div className="grid gap-4 lg:grid-cols-2">
            <StatusOverviewCard
              title="Projects overview"
              totalCaption="projects"
              segments={data.projectStatusCounts.map(({ status, count }) => ({
                status,
                label: PROJECT_STATUS_DONUT[status].label,
                colorVar: PROJECT_STATUS_DONUT[status].colorVar,
                value: count,
              }))}
              viewAllHref="/projects"
              viewAllLabel="View all projects"
            />
            <StatusOverviewCard
              title="Tasks overview"
              totalCaption="tasks"
              segments={data.taskStatusCounts.map(({ status, count }) => ({
                status,
                label: TASK_STATUS_DONUT[status].label,
                colorVar: TASK_STATUS_DONUT[status].colorVar,
                value: count,
              }))}
              viewAllHref="/tasks"
              viewAllLabel="View all tasks"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <RevenueCard revenue={data.revenue} />
            <TasksPriorityCard tasks={data.priorityTasks} />
          </div>
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-4">
          <AiDailyBrief brief={data.brief} firstName={firstName} greeting={greeting} />
          <MeetingsCard meetings={data.meetings} />
          <ActivityCard activity={data.recentActivity} />
        </div>
      </div>
    </div>
  )
}
