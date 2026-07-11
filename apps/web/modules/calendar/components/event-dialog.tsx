'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@aurexos/ui/components/button'
import { Checkbox } from '@aurexos/ui/components/checkbox'
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
import { createEvent, updateEvent } from '../actions/calendar-actions'
import type { CalendarEventItem } from '../types'

const EventFormSchema = z
  .object({
    title: z.string().min(1, 'Event title is required').max(300),
    date: z.string().min(1, 'Date is required'),
    allDay: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    location: z.string().max(500),
  })
  .superRefine((values, ctx) => {
    if (values.allDay) return
    if (!values.startTime) {
      ctx.addIssue({ code: 'custom', path: ['startTime'], message: 'Start time is required' })
    }
    if (values.startTime && values.endTime && values.endTime <= values.startTime) {
      ctx.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'End time must be after the start time',
      })
    }
  })
type EventFormValues = z.infer<typeof EventFormSchema>

function defaultsFor(event: CalendarEventItem | undefined, defaultDate?: string): EventFormValues {
  if (!event) {
    return {
      title: '',
      date: defaultDate ?? format(new Date(), 'yyyy-MM-dd'),
      allDay: false,
      startTime: '09:00',
      endTime: '10:00',
      location: '',
    }
  }
  const start = new Date(event.startsAt)
  return {
    title: event.title,
    date: format(start, 'yyyy-MM-dd'),
    allDay: event.allDay,
    startTime: event.allDay ? '09:00' : format(start, 'HH:mm'),
    endTime: event.endsAt && !event.allDay ? format(new Date(event.endsAt), 'HH:mm') : '',
    location: event.location ?? '',
  }
}

/** Local wall-clock date+time → ISO timestamp; all-day pins to local midnight. */
function composeTimes(values: EventFormValues): { startsAt: string; endsAt: string | null } {
  if (values.allDay) {
    return { startsAt: new Date(`${values.date}T00:00:00`).toISOString(), endsAt: null }
  }
  const startsAt = new Date(`${values.date}T${values.startTime}:00`).toISOString()
  const endsAt = values.endTime
    ? new Date(`${values.date}T${values.endTime}:00`).toISOString()
    : null
  return { startsAt, endsAt }
}

export interface EventDialogProps {
  /** Present = edit that event; absent = create. */
  event?: CalendarEventItem
  /** Prefill for the create form's date (yyyy-MM-dd). */
  defaultDate?: string
  /** Controlled open state (edit-from-popover); omit for the self-triggered create button. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Create/edit dialog for native calendar events (title, date, times, all-day,
 * optional location or URL). 0010 has no description column, so none is
 * offered — the form never invents schema.
 */
export function EventDialog({ event, defaultDate, open, onOpenChange }: EventDialogProps) {
  const router = useRouter()
  const [selfOpen, setSelfOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const controlled = open !== undefined
  const isOpen = controlled ? open : selfOpen
  const setOpen = (next: boolean) => {
    if (!controlled) setSelfOpen(next)
    onOpenChange?.(next)
  }

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: defaultsFor(event, defaultDate),
  })
  const allDay = watch('allDay')

  // Re-prime the form whenever the dialog opens (fresh create defaults, or the
  // latest server values when editing).
  useEffect(() => {
    if (isOpen) reset(defaultsFor(event, defaultDate))
  }, [isOpen])

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const { startsAt, endsAt } = composeTimes(values)
      const shared = {
        title: values.title,
        startsAt,
        endsAt,
        allDay: values.allDay,
        // Always sent; the action normalizes '' to null so edits can clear it.
        location: values.location.trim(),
      }
      const result = event
        ? await updateEvent({ id: event.id, ...shared })
        : await createEvent(shared)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(event ? 'Event updated' : 'Event created')
      setOpen(false)
      router.refresh()
    })
  })

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!controlled && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus />
            New event
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit event' : 'New event'}</DialogTitle>
          <DialogDescription>
            {event ? 'Update the details of this event.' : 'Add an event to your calendar.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" placeholder="Client kickoff" autoFocus {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-date">Date</Label>
              <Input id="event-date" type="date" {...register('date')} />
              {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
            </div>
            <div className="flex items-end pb-2">
              <Controller
                control={control}
                name="allDay"
                render={({ field }) => (
                  <label className="flex min-h-8 cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                    All day
                  </label>
                )}
              />
            </div>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-start">Start time</Label>
                <Input id="event-start" type="time" {...register('startTime')} />
                {errors.startTime && (
                  <p className="text-sm text-destructive">{errors.startTime.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">End time</Label>
                <Input id="event-end" type="time" {...register('endTime')} />
                {errors.endTime && (
                  <p className="text-sm text-destructive">{errors.endTime.message}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="event-location">Location or URL</Label>
            <Input
              id="event-location"
              placeholder="Office, meeting room, or link"
              {...register('location')}
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
              {isPending
                ? event
                  ? 'Saving…'
                  : 'Creating…'
                : event
                  ? 'Save changes'
                  : 'Create event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
