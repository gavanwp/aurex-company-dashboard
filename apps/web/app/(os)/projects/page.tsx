import type { Metadata } from 'next'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { getClientOptions, getProjects, ProjectsView } from '@/modules/projects'

export const metadata: Metadata = { title: 'Projects' }

export default async function ProjectsPage() {
  const ctx = await getWorkspaceContext()
  const [projects, clients] = await Promise.all([getProjects(ctx), getClientOptions(ctx)])

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Plan and deliver client work." />
      <ProjectsView projects={projects} clients={clients} />
    </div>
  )
}
