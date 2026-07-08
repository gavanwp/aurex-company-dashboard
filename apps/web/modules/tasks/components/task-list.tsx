'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, isBefore, startOfDay } from 'date-fns'
import { ChevronDown, ChevronRight, ListChecks, MoreHorizontal, Trash2, UserCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { initialsOf, TASK_STATUSES } from '@aurexos/core'
import type { TaskPriorityDb, TaskStatusDb } from '@aurexos/db'
import { Avatar, AvatarFallback, AvatarImage } from '@aurexos/ui/components/avatar'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@aurexos/ui/components/dropdown-menu'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { cn } from '@aurexos/ui/lib/utils'
import { changeTaskStatus, deleteTask, updateTask } from '../actions/task-actions'
import type { MemberOption, ProjectOption, TaskRow } from '../types'
import {
  TASK_PRIORITY_META,
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
  TaskPriorityIcon,
  TaskStatusIcon,
} from './task-meta'
import { TaskCreateDialog } from './task-create-dialog'

const PRIORITY_MENU: TaskPriorityDb[] = ['urgent', 'high', 'medium', 'low', 'none']

export interface TaskListProps {
  tasks: TaskRow[]
  members: MemberOption[]
  projects: ProjectOption[]
  currentUserId: string
  /** Hide the project chip when the list is rendered inside a project. */
  hideProjectColumn?: boolean
  /** Preset project for the empty-state create dialog (project detail view). */
  defaultProjectId?: string | null
}

type MutationResult = { ok: true; data: unknown } | { ok: false; error: string }

export function TaskList({
  tasks,
  members,
  projects,
  currentUserId,
  hideProjectColumn = false,
  defaultProjectId = null,
}: TaskListProps) {
  const router = useRouter()
  const [overrides, setOverrides] = useState<Record<string, Partial<TaskRow>>>({})
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set())
  const [canceledOpen, setCanceledOpen] = useState(false)

  const merged = useMemo(
    () =>
      tasks
        .filter((t) => !removedIds.has(t.id))
        .map((t) => (overrides[t.id] ? { ...t, ...overrides[t.id] } : t)),
    [tasks, overrides, removedIds],
  )

  const groups = useMemo(() => {
    const byStatus = new Map<TaskStatusDb, TaskRow[]>()
    for (const task of merged) {
      const bucket = byStatus.get(task.status)
      if (bucket) bucket.push(task)
      else byStatus.set(task.status, [task])
    }
    return byStatus
  }, [merged])

  async function runOptimistic(
    id: string,
    patch: Partial<TaskRow>,
    mutate: () => Promise<MutationResult>,
  ): Promise<void> {
    const snapshot = overrides
    setOverrides({ ...snapshot, [id]: { ...snapshot[id], ...patch } })
    const result = await mutate()
    if (!result.ok) {
      setOverrides(snapshot)
      toast.error(result.error)
    } else {
      router.refresh()
    }
  }

  function handleStatus(task: TaskRow, status: TaskStatusDb): void {
    if (task.status === status) return
    void runOptimistic(task.id, { status }, () => changeTaskStatus({ id: task.id, status }))
  }

  function handlePriority(task: TaskRow, priority: TaskPriorityDb): void {
    if (task.priority === priority) return
    void runOptimistic(task.id, { priority }, () => updateTask({ id: task.id, priority }))
  }

  function handleAssignee(task: TaskRow, assigneeId: string | null): void {
    if (task.assigneeId === assigneeId) return
    const member = assigneeId ? members.find((m) => m.id === assigneeId) : undefined
    void runOptimistic(
      task.id,
      {
        assigneeId,
        assignee: member
          ? { id: member.id, fullName: member.fullName, avatarUrl: member.avatarUrl }
          : null,
      },
      () => updateTask({ id: task.id, assigneeId }),
    )
  }

  async function handleDelete(task: TaskRow): Promise<void> {
    const snapshot = removedIds
    setRemovedIds(new Set([...snapshot, task.id]))
    const result = await deleteTask(task.id)
    if (!result.ok) {
      setRemovedIds(snapshot)
      toast.error(result.error)
    } else {
      toast.success('Task deleted')
      router.refresh()
    }
  }

  if (merged.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No tasks yet"
        description="Create your first task to start tracking work."
        action={
          <TaskCreateDialog members={members} projects={projects} defaultProjectId={defaultProjectId} />
        }
      />
    )
  }

  const canceled = groups.get('canceled') ?? []

  return (
    <div className="overflow-hidden rounded-lg border">
      {TASK_STATUS_ORDER.map((status) => {
        const rows = groups.get(status) ?? []
        if (rows.length === 0) return null
        return (
          <section key={status}>
            <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5">
              <TaskStatusIcon status={status} />
              <span className="text-xs font-medium">{TASK_STATUS_META[status].label}</span>
              <span className="text-xs text-muted-foreground">{rows.length}</span>
            </div>
            {rows.map((task) => renderRow(task))}
          </section>
        )
      })}
      {canceled.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setCanceledOpen((open) => !open)}
            className="flex w-full items-center gap-2 border-b bg-muted/50 px-3 py-1.5 text-left hover:bg-muted"
          >
            {canceledOpen ? (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
            <TaskStatusIcon status="canceled" />
            <span className="text-xs font-medium">Canceled</span>
            <span className="text-xs text-muted-foreground">{canceled.length}</span>
          </button>
          {canceledOpen && canceled.map((task) => renderRow(task))}
        </section>
      )}
    </div>
  )

  function renderRow(task: TaskRow) {
    const overdue =
      task.dueDate !== null &&
      task.status !== 'done' &&
      task.status !== 'canceled' &&
      isBefore(new Date(task.dueDate), startOfDay(new Date()))

    return (
      <div
        key={task.id}
        className="group flex items-center gap-2 border-b px-3 py-2 last:border-b-0 hover:bg-accent/50"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6 shrink-0" aria-label="Change status">
              <TaskStatusIcon status={task.status} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {TASK_STATUSES.map((status) => (
              <DropdownMenuItem key={status} onSelect={() => handleStatus(task, status)}>
                <TaskStatusIcon status={status} className="mr-2" />
                {TASK_STATUS_META[status].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm',
            (task.status === 'done' || task.status === 'canceled') &&
              'text-muted-foreground line-through decoration-muted-foreground/50',
          )}
        >
          {task.title}
        </span>

        {task.labels.slice(0, 3).map((label) => (
          <Badge key={label} variant="outline" className="hidden shrink-0 font-normal text-muted-foreground lg:inline-flex">
            {label}
          </Badge>
        ))}

        {!hideProjectColumn && task.project && (
          <Link
            href={`/projects/${task.project.id}`}
            className="hidden shrink-0 items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground sm:inline-flex"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: task.project.color ?? 'hsl(var(--muted-foreground))' }}
            />
            <span className="max-w-32 truncate">{task.project.name}</span>
          </Link>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6 shrink-0" aria-label="Set priority">
              <TaskPriorityIcon priority={task.priority} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Priority</DropdownMenuLabel>
            {PRIORITY_MENU.map((priority) => (
              <DropdownMenuItem key={priority} onSelect={() => handlePriority(task, priority)}>
                <TaskPriorityIcon priority={priority} className="mr-2" />
                {TASK_PRIORITY_META[priority].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {task.dueDate && (
          <span
            className={cn(
              'hidden w-14 shrink-0 text-right text-xs tabular-nums sm:inline',
              overdue ? 'font-medium text-destructive' : 'text-muted-foreground',
            )}
          >
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6 shrink-0" aria-label="Assign task">
              {task.assignee ? (
                <Avatar className="size-5">
                  {task.assignee.avatarUrl ? (
                    <AvatarImage src={task.assignee.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback className="text-[9px]">
                    {initialsOf(task.assignee.fullName ?? '?')}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <UserCircle2 className="size-4 text-muted-foreground" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Assignee</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => handleAssignee(task, currentUserId)}>
              Assign to me
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleAssignee(task, null)}>
              Unassigned
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {members.map((member) => (
              <DropdownMenuItem key={member.id} onSelect={() => handleAssignee(task, member.id)}>
                <Avatar className="mr-2 size-5">
                  {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="text-[9px]">
                    {initialsOf(member.fullName ?? member.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{member.fullName ?? member.email}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              aria-label="Task actions"
            >
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => void handleDelete(task)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }
}
