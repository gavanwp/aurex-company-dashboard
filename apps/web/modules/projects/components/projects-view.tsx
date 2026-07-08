'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { FolderKanban } from 'lucide-react'
import { initialsOf } from '@aurexos/core'
import { Avatar, AvatarFallback, AvatarImage } from '@aurexos/ui/components/avatar'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@aurexos/ui/components/table'
import type { ClientOption, ProjectListRow } from '../types'
import { ProjectCreateDialog } from './project-create-dialog'
import { ProjectStatusBadge } from './project-status-badge'

export function ProjectsView({
  projects,
  clients,
}: {
  projects: ProjectListRow[]
  clients: ClientOption[]
}) {
  const router = useRouter()

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description="Create your first project to start planning client work."
        action={<ProjectCreateDialog clients={clients} />}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'}
        </p>
        <ProjectCreateDialog clients={clients} />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead className="hidden md:table-cell">Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Due date</TableHead>
              <TableHead className="hidden sm:table-cell">Progress</TableHead>
              <TableHead className="w-12">Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow
                key={project.id}
                className="cursor-pointer"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color ?? 'hsl(var(--muted-foreground))' }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm font-medium">{project.name}</span>
                    {project.code && (
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {project.code}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {project.clientName ?? '—'}
                </TableCell>
                <TableCell>
                  <ProjectStatusBadge status={project.status} />
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                  {project.dueDate ? format(new Date(project.dueDate), 'MMM d, yyyy') : '—'}
                </TableCell>
                <TableCell className="hidden text-sm tabular-nums text-muted-foreground sm:table-cell">
                  {project.totalTasks > 0 ? `${project.doneTasks}/${project.totalTasks}` : '—'}
                </TableCell>
                <TableCell>
                  {project.owner ? (
                    <Avatar className="size-6">
                      {project.owner.avatarUrl ? (
                        <AvatarImage src={project.owner.avatarUrl} alt="" />
                      ) : null}
                      <AvatarFallback className="text-[10px]">
                        {initialsOf(project.owner.fullName ?? '?')}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
