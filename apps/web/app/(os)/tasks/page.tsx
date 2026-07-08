import type { Metadata } from 'next'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  getMembers,
  getProjectOptions,
  getTasks,
  TaskCreateDialog,
  TaskFilterTabs,
  TaskList,
} from '@/modules/tasks'

export const metadata: Metadata = { title: 'Tasks' }

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const [{ filter }, ctx] = await Promise.all([searchParams, getWorkspaceContext()])
  const mine = filter === 'mine'
  const [tasks, members, projects] = await Promise.all([
    getTasks(ctx, mine ? { assigneeId: ctx.userId } : undefined),
    getMembers(ctx),
    getProjectOptions(ctx),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Everything your team is working on."
        actions={<TaskCreateDialog members={members} projects={projects} />}
      />
      <TaskFilterTabs filter={mine ? 'mine' : 'all'} />
      <TaskList tasks={tasks} members={members} projects={projects} currentUserId={ctx.userId} />
    </div>
  )
}
