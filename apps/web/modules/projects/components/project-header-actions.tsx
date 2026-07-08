'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PROJECT_STATUSES } from '@aurexos/core'
import type { ProjectStatusDb } from '@aurexos/db'
import { Button } from '@aurexos/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@aurexos/ui/components/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { cn } from '@aurexos/ui/lib/utils'
import { deleteProject, updateProject } from '../actions/project-actions'
import { PROJECT_STATUS_META } from './project-status-badge'

/** Status select (inline updateProject) + overflow menu with soft delete. */
export function ProjectHeaderActions({
  projectId,
  status,
}: {
  projectId: string
  status: ProjectStatusDb
}) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState<ProjectStatusDb>(status)

  async function handleStatusChange(next: ProjectStatusDb): Promise<void> {
    if (next === currentStatus) return
    const previous = currentStatus
    setCurrentStatus(next)
    const result = await updateProject({ id: projectId, status: next })
    if (!result.ok) {
      setCurrentStatus(previous)
      toast.error(result.error)
    } else {
      router.refresh()
    }
  }

  async function handleDelete(): Promise<void> {
    const result = await deleteProject(projectId)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Project deleted')
    router.push('/projects')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={currentStatus} onValueChange={(v) => void handleStatusChange(v as ProjectStatusDb)}>
        <SelectTrigger className="h-8 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROJECT_STATUSES.map((option) => (
            <SelectItem key={option} value={option}>
              <span className="flex items-center gap-2">
                <span
                  className={cn('size-1.5 rounded-full', PROJECT_STATUS_META[option].dotClassName)}
                  aria-hidden="true"
                />
                {PROJECT_STATUS_META[option].label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Project actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => void handleDelete()}
          >
            <Trash2 className="mr-2 size-4" />
            Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
