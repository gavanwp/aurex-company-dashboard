import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { getProject, ProjectDetail } from '@/modules/projects'
import { getMembers, getProjectOptions, getTasks } from '@/modules/tasks'

export const metadata: Metadata = { title: 'Project' }

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const ctx = await getWorkspaceContext()
  const project = await getProject(ctx, projectId)
  if (!project) notFound()

  const [tasks, members, projects] = await Promise.all([
    getTasks(ctx, { projectId }),
    getMembers(ctx),
    getProjectOptions(ctx),
  ])

  return (
    <ProjectDetail
      project={project}
      tasks={tasks}
      members={members}
      projects={projects}
      currentUserId={ctx.userId}
    />
  )
}
