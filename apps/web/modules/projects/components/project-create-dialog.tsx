'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PROJECT_STATUSES } from '@aurexos/core'
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
import { createProject } from '../actions/project-actions'
import type { ClientOption } from '../types'
import { PROJECT_STATUS_META } from './project-status-badge'

const NONE = 'none'

const ProjectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(160),
  clientId: z.string(),
  status: z.enum(PROJECT_STATUSES),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  /** Whole dollars as typed; converted to cents on submit. */
  budget: z.string().optional(),
  description: z.string().max(10_000).optional(),
})
type ProjectFormValues = z.infer<typeof ProjectFormSchema>

const DEFAULT_VALUES: ProjectFormValues = {
  name: '',
  clientId: NONE,
  status: 'planning',
  startDate: '',
  dueDate: '',
  budget: '',
  description: '',
}

export function ProjectCreateDialog({ clients }: { clients: ClientOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProjectFormValues>({ resolver: zodResolver(ProjectFormSchema), defaultValues: DEFAULT_VALUES })

  const onSubmit = handleSubmit((values) => {
    const budgetDollars = values.budget?.trim() ? Number(values.budget) : null
    if (budgetDollars !== null && (Number.isNaN(budgetDollars) || budgetDollars < 0)) {
      setError('budget', { message: 'Enter a valid amount' })
      return
    }
    startTransition(async () => {
      const result = await createProject({
        name: values.name,
        clientId: values.clientId === NONE ? null : values.clientId,
        status: values.status,
        startDate: values.startDate ? values.startDate : null,
        dueDate: values.dueDate ? values.dueDate : null,
        budgetCents: budgetDollars === null ? null : Math.round(budgetDollars * 100),
        description: values.description?.trim() ? values.description : undefined,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Project created')
      setOpen(false)
      reset(DEFAULT_VALUES)
      router.refresh()
    })
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset(DEFAULT_VALUES)
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Plan a new engagement for your workspace.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input id="project-name" placeholder="Website redesign" autoFocus {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="No client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No client</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
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
                      {PROJECT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {PROJECT_STATUS_META[status].label}
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
              <Label htmlFor="project-start">Start date</Label>
              <Input id="project-start" type="date" {...register('startDate')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-due">Due date</Label>
              <Input id="project-due" type="date" {...register('dueDate')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-budget">Budget (USD)</Label>
            <Input
              id="project-budget"
              type="number"
              min="0"
              step="0.01"
              placeholder="25000"
              {...register('budget')}
            />
            {errors.budget && <p className="text-sm text-destructive">{errors.budget.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              rows={3}
              placeholder="Goals, scope, deliverables…"
              {...register('description')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
