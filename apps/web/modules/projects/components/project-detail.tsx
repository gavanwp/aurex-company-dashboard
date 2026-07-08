// Server component — composes the project header (client controls) with the
// tasks module's public TaskList. Imports ONLY '@/modules/tasks' cross-module.

import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, Building2, CalendarDays, Wallet } from 'lucide-react'
import { formatMoney, initialsOf } from '@aurexos/core'
import { Avatar, AvatarFallback, AvatarImage } from '@aurexos/ui/components/avatar'
import { Separator } from '@aurexos/ui/components/separator'
import {
  TaskCreateDialog,
  TaskList,
  type MemberOption,
  type ProjectOption,
  type TaskRow,
} from '@/modules/tasks'
import type { ProjectDetailData } from '../types'
import { ProjectHeaderActions } from './project-header-actions'

function formatDate(value: string | null): string {
  return value ? format(new Date(value), 'MMM d, yyyy') : '—'
}

export function ProjectDetail({
  project,
  tasks,
  members,
  projects,
  currentUserId,
}: {
  project: ProjectDetailData
  tasks: TaskRow[]
  members: MemberOption[]
  projects: ProjectOption[]
  currentUserId: string
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Projects
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: project.color ?? 'hsl(var(--muted-foreground))' }}
              aria-hidden="true"
            />
            <h1 className="truncate text-2xl font-semibold tracking-tight">{project.name}</h1>
            {project.code && (
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{project.code}</span>
            )}
          </div>
          <ProjectHeaderActions projectId={project.id} status={project.status} />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-3.5" />
            {project.client?.name ?? 'No client'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {formatDate(project.startDate)} → {formatDate(project.dueDate)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="size-3.5" />
            {formatMoney(project.budgetCents)}
          </span>
          {project.owner && (
            <span className="inline-flex items-center gap-1.5">
              <Avatar className="size-5">
                {project.owner.avatarUrl ? <AvatarImage src={project.owner.avatarUrl} alt="" /> : null}
                <AvatarFallback className="text-[9px]">
                  {initialsOf(project.owner.fullName ?? '?')}
                </AvatarFallback>
              </Avatar>
              {project.owner.fullName ?? 'Owner'}
            </span>
          )}
        </div>

        {project.description && (
          <p className="max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
            {project.description}
          </p>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Tasks <span className="ml-1 font-normal text-muted-foreground">{tasks.length}</span>
          </h2>
          <TaskCreateDialog members={members} projects={projects} defaultProjectId={project.id} />
        </div>
        <TaskList
          tasks={tasks}
          members={members}
          projects={projects}
          currentUserId={currentUserId}
          hideProjectColumn
          defaultProjectId={project.id}
        />
      </div>
    </div>
  )
}
