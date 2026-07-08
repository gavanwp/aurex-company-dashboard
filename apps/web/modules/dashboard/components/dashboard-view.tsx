import { format } from 'date-fns'
import { CalendarClock, FolderKanban, ListTodo, TrendingUp } from 'lucide-react'
import { formatMoney } from '@aurexos/core'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { StatCard } from '@aurexos/ui/components/stat-card'
import type { WorkspaceContext } from '@/lib/workspace-context'
import type { DashboardData } from '../queries/get-dashboard'
import { ActivityCard } from './activity-card'
import { MyTasksCard } from './my-tasks-card'

function greetingFor(date: Date): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardView({ ctx, data }: { ctx: WorkspaceContext; data: DashboardData }) {
  const now = new Date()
  const firstName = ctx.profile.full_name?.trim().split(/\s+/)[0] || 'there'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greetingFor(now)}, ${firstName}`}
        description={`${ctx.workspace.name} · ${format(now, 'EEEE, MMMM d, yyyy')}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active projects" value={data.activeProjects} icon={FolderKanban} />
        <StatCard
          label="Open tasks"
          value={data.openTasks}
          icon={ListTodo}
          delta={data.overdue > 0 ? `${data.overdue} overdue` : undefined}
          deltaTrend="down"
          hint={data.overdue === 0 ? 'nothing overdue' : undefined}
        />
        <StatCard
          label="Due this week"
          value={data.dueThisWeek}
          icon={CalendarClock}
          hint="next 7 days"
        />
        <StatCard
          label="Pipeline value"
          value={formatMoney(data.pipelineValue)}
          icon={TrendingUp}
          delta={data.wonThisMonth > 0 ? `+${formatMoney(data.wonThisMonth)}` : undefined}
          deltaTrend="up"
          hint="won this month"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MyTasksCard tasks={data.myTasks} />
        <ActivityCard activity={data.recentActivity} />
      </div>
    </div>
  )
}
