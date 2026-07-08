'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { initialsOf, TASK_PRIORITIES, TASK_STATUSES } from '@aurexos/core'
import type { TaskStatusDb } from '@aurexos/db'
import { Avatar, AvatarFallback, AvatarImage } from '@aurexos/ui/components/avatar'
import { Button } from '@aurexos/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@aurexos/ui/components/dialog'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { Textarea } from '@aurexos/ui/components/textarea'
import { createTask } from '../actions/task-actions'
import type { MemberOption, ProjectOption } from '../types'
import { TASK_PRIORITY_META, TASK_STATUS_META, TaskPriorityIcon, TaskStatusIcon } from './task-meta'

const NONE = 'none'

const TaskFormSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(300),
  description: z.string().max(20_000).optional(),
  projectId: z.string(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  assigneeId: z.string(),
  dueDate: z.string().optional(),
  labels: z.string().optional(),
})
type TaskFormValues = z.infer<typeof TaskFormSchema>

export interface TaskCreateDialogProps {
  members: MemberOption[]
  projects: ProjectOption[]
  defaultProjectId?: string | null
  defaultStatus?: TaskStatusDb
}

export function TaskCreateDialog({
  members,
  projects,
  defaultProjectId = null,
  defaultStatus = 'todo',
}: TaskCreateDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const defaultValues: TaskFormValues = {
    title: '',
    description: '',
    projectId: defaultProjectId ?? NONE,
    status: defaultStatus,
    priority: 'none',
    assigneeId: NONE,
    dueDate: '',
    labels: '',
  }

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({ resolver: zodResolver(TaskFormSchema), defaultValues })

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await createTask({
        title: values.title,
        description: values.description?.trim() ? values.description : undefined,
        projectId: values.projectId === NONE ? null : values.projectId,
        status: values.status,
        priority: values.priority,
        assigneeId: values.assigneeId === NONE ? null : values.assigneeId,
        dueDate: values.dueDate ? values.dueDate : null,
        labels:
          values.labels
            ?.split(',')
            .map((label) => label.trim())
            .filter(Boolean) ?? [],
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Task created')
      setOpen(false)
      reset(defaultValues)
      router.refresh()
    })
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset(defaultValues)
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          New task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Add a task to your workspace.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" placeholder="What needs to be done?" autoFocus {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              rows={3}
              placeholder="Add more context…"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="No project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Controller
                control={control}
                name="assigneeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <span className="flex items-center gap-2">
                            <Avatar className="size-4">
                              {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
                              <AvatarFallback className="text-[8px]">
                                {initialsOf(member.fullName ?? member.email)}
                              </AvatarFallback>
                            </Avatar>
                            {member.fullName ?? member.email}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          <span className="flex items-center gap-2">
                            <TaskStatusIcon status={status} />
                            {TASK_STATUS_META[status].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          <span className="flex items-center gap-2">
                            <TaskPriorityIcon priority={priority} />
                            {TASK_PRIORITY_META[priority].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due date</Label>
              <Input id="task-due-date" type="date" {...register('dueDate')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-labels">Labels</Label>
              <Input id="task-labels" placeholder="design, urgent" {...register('labels')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
