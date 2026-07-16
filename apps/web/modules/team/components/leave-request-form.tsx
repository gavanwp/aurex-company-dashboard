'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { LEAVE_TYPES, type LeaveType } from '@aurexos/core'
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
import { requestLeave } from '../actions/leave-actions'
import { leaveDays, leaveTypeLabel } from '../lib/hr'

const LeaveFormSchema = z
  .object({
    type: z.enum(LEAVE_TYPES),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().max(1000),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'End date cannot be before the start date',
    path: ['endDate'],
  })
type LeaveFormValues = z.infer<typeof LeaveFormSchema>

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaults(): LeaveFormValues {
  const today = todayISO()
  return { type: 'vacation', startDate: today, endDate: today, reason: '' }
}

export interface LeaveRequestFormProps {
  /** File on behalf of this member (managers); omit to file for yourself. */
  onBehalfOf?: { userId: string; name: string }
  /** Render a compact secondary trigger instead of the primary button. */
  variant?: 'primary' | 'outline'
}

export function LeaveRequestForm({ onBehalfOf, variant = 'primary' }: LeaveRequestFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LeaveFormValues>({
    resolver: zodResolver(LeaveFormSchema),
    defaultValues: defaults(),
  })

  useEffect(() => {
    if (open) reset(defaults())
  }, [open, reset])

  const start = watch('startDate')
  const end = watch('endDate')
  const days = start && end ? leaveDays(start, end) : 0

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await requestLeave({
        userId: onBehalfOf?.userId,
        type: values.type,
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason.trim() || null,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Leave request filed')
      setOpen(false)
      router.refresh()
    })
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={variant === 'outline' ? 'outline' : 'default'}>
          <Plus className="mr-1.5 h-4 w-4" />
          Request leave
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {onBehalfOf ? `Request leave for ${onBehalfOf.name}` : 'Request leave'}
          </DialogTitle>
          <DialogDescription>
            File time off for approval. It blocks availability once approved.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="leave-type">Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v as LeaveType)}>
                  <SelectTrigger id="leave-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {leaveTypeLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leave-start">Start</Label>
              <Input id="leave-start" type="date" {...register('startDate')} />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-end">End</Label>
              <Input id="leave-end" type="date" {...register('endDate')} />
              {errors.endDate && (
                <p className="text-sm text-destructive">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          {days > 0 ? (
            <p className="text-xs text-muted-foreground">
              {days} {days === 1 ? 'day' : 'days'} of leave.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="leave-reason">Reason (optional)</Label>
            <Textarea
              id="leave-reason"
              rows={3}
              placeholder="A short note for your approver…"
              {...register('reason')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Filing…' : 'File request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
