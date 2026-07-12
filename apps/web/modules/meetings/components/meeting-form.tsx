'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, GripVertical, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { cn } from '@aurexos/ui/lib/utils'
import type { MeetingType } from '@aurexos/core'
import { createMeeting, updateMeeting } from '../actions/meeting-actions'
import { MEETING_TEMPLATES, MEETING_TYPE_LABELS, templateFor } from '../types'
import type { AttendeeRef, MeetingDetail, MeetingFormOptions } from '../types'

const NONE = 'none'
const MEETING_TYPE_VALUES: MeetingType[] = ['internal', 'client', 'sales', 'standup']

const agendaFieldSchema = z.object({
  title: z.string().min(1, 'Agenda item needs a title'),
  durationMinutes: z.string(),
})

const meetingFormSchema = z.object({
  title: z.string().min(1, 'Meeting title is required').max(300),
  type: z.enum(['internal', 'client', 'sales', 'standup']),
  clientId: z.string(),
  projectId: z.string(),
  dealId: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  location: z.string(),
  agenda: z.array(agendaFieldSchema),
})
type MeetingFormValues = z.infer<typeof meetingFormSchema>

/** datetime-local value (local) → ISO string, or null when empty. */
function localToIso(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** ISO string → datetime-local value in the viewer's local time. */
function isoToLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export interface MeetingFormProps {
  mode: 'create' | 'edit'
  options: MeetingFormOptions
  meeting?: MeetingDetail
}

export function MeetingForm({ mode, options, meeting }: MeetingFormProps) {
  const router = useRouter()

  const defaultValues = React.useMemo<MeetingFormValues>(() => {
    if (mode === 'edit' && meeting) {
      return {
        title: meeting.title,
        type: meeting.type,
        clientId: meeting.clientId ?? NONE,
        projectId: meeting.projectId ?? NONE,
        dealId: meeting.dealId ?? NONE,
        startsAt: isoToLocal(meeting.startsAt),
        endsAt: isoToLocal(meeting.endsAt),
        location: meeting.location ?? '',
        agenda: meeting.agenda.map((a) => ({
          title: a.title,
          durationMinutes: a.durationMinutes ? String(a.durationMinutes) : '',
        })),
      }
    }
    return {
      title: '',
      type: 'internal',
      clientId: NONE,
      projectId: NONE,
      dealId: NONE,
      startsAt: '',
      endsAt: '',
      location: '',
      agenda: [],
    }
  }, [mode, meeting])

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues,
  })
  const { fields, append, remove, move, replace } = useFieldArray({
    control: form.control,
    name: 'agenda',
  })

  const type = form.watch('type')
  const clientId = form.watch('clientId')

  // Contacts filter to the selected client (kept simple; unfiltered when no client).
  const attendeeContacts = React.useMemo(() => {
    if (clientId === NONE) return options.contacts
    return options.contacts.filter((c) => c.clientId === clientId)
  }, [clientId, options.contacts])

  // Attendees are a lightweight multi-select of member/contact refs.
  const [attendeeIds, setAttendeeIds] = React.useState<Set<string>>(() => {
    const set = new Set<string>()
    for (const a of meeting?.attendees ?? []) if (a.id) set.add(a.id)
    return set
  })
  function toggleAttendee(id: string) {
    setAttendeeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function applyTemplate(key: string) {
    const template = templateFor(key)
    if (!template) return
    form.setValue('type', template.type)
    replace(
      template.agenda.map((a) => ({
        title: a.title,
        durationMinutes: a.durationMinutes ? String(a.durationMinutes) : '',
      })),
    )
    toast.success(`Loaded the ${template.label.toLowerCase()} agenda`)
  }

  const totalMinutes = (form.watch('agenda') ?? []).reduce((sum, a) => {
    const n = Number.parseInt(a.durationMinutes, 10)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)

  async function onSubmit(values: MeetingFormValues) {
    const memberById = new Map(options.members.map((m) => [m.id, m]))
    const contactById = new Map(options.contacts.map((c) => [c.id, c]))
    const attendees: AttendeeRef[] = [...attendeeIds].flatMap((id): AttendeeRef[] => {
      const member = memberById.get(id)
      if (member) {
        return [
          {
            kind: 'user',
            id: member.id,
            name: member.fullName ?? member.email,
            email: member.email,
          },
        ]
      }
      const contact = contactById.get(id)
      if (contact) {
        return [
          {
            kind: 'contact',
            id: contact.id,
            name: contact.fullName,
            ...(contact.email ? { email: contact.email } : {}),
          },
        ]
      }
      return []
    })

    const agenda = values.agenda
      .filter((a) => a.title.trim())
      .map((a) => {
        const n = Number.parseInt(a.durationMinutes, 10)
        return {
          title: a.title.trim(),
          ...(Number.isFinite(n) && n > 0 ? { durationMinutes: n } : {}),
        }
      })

    const payload = {
      title: values.title.trim(),
      type: values.type,
      clientId: values.clientId === NONE ? null : values.clientId,
      projectId: values.projectId === NONE ? null : values.projectId,
      dealId: values.dealId === NONE ? null : values.dealId,
      startsAt: localToIso(values.startsAt),
      endsAt: localToIso(values.endsAt),
      location: values.location.trim() || null,
      attendees,
      agenda,
    }

    if (mode === 'edit' && meeting) {
      const result = await updateMeeting({ id: meeting.id, ...payload })
      if (result.ok) {
        toast.success('Meeting updated')
        router.push(`/meetings/${meeting.id}`)
        router.refresh()
      } else {
        toast.error(result.error)
      }
      return
    }

    const result = await createMeeting(payload)
    if (result.ok) {
      toast.success('Meeting scheduled')
      router.push(`/meetings/${result.data.id}`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const { errors, isSubmitting } = form.formState

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Link
          href={mode === 'edit' && meeting ? `/meetings/${meeting.id}` : '/meetings'}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {mode === 'edit' ? 'Back to meeting' : 'Meetings'}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {mode === 'edit' ? 'Edit meeting' : 'New meeting'}
        </h1>
      </div>

      {/* Template prefill (create only) */}
      {mode === 'create' ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[hsl(var(--accent-text))]" />
              <h2 className="text-sm font-semibold text-foreground">Start from a template</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {MEETING_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => applyTemplate(t.key)}
                  className="rounded-md border px-3 py-1.5 text-left text-sm transition-colors hover:border-foreground/30 hover:bg-accent/40"
                >
                  <span className="font-medium text-foreground">{t.label}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    {t.agenda.length} items
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          {/* Core details */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="meeting-title">Title</Label>
                <Input
                  id="meeting-title"
                  placeholder="Kickoff with Acme"
                  {...form.register('title')}
                />
                {errors.title ? (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={type}
                    onValueChange={(v) => form.setValue('type', v as MeetingType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEETING_TYPE_VALUES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {MEETING_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meeting-location">Location or link</Label>
                  <Input
                    id="meeting-location"
                    placeholder="Google Meet, Zoom, room…"
                    {...form.register('location')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="meeting-starts">Starts</Label>
                  <Input id="meeting-starts" type="datetime-local" {...form.register('startsAt')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meeting-ends">Ends</Label>
                  <Input id="meeting-ends" type="datetime-local" {...form.register('endsAt')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Relationship links */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-sm font-semibold text-foreground">Relationship</h2>
              <p className="-mt-2 text-xs text-muted-foreground">
                Linking a client, deal or project powers the pre-meeting brief.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <Select
                    value={form.watch('clientId')}
                    onValueChange={(v) => form.setValue('clientId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No client</SelectItem>
                      {options.clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Project</Label>
                  <Select
                    value={form.watch('projectId')}
                    onValueChange={(v) => form.setValue('projectId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No project</SelectItem>
                      {options.projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Deal</Label>
                  <Select
                    value={form.watch('dealId')}
                    onValueChange={(v) => form.setValue('dealId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No deal</SelectItem>
                      {options.deals.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agenda editor */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Agenda</h2>
                  {totalMinutes > 0 ? (
                    <p className="text-xs text-muted-foreground">{totalMinutes} min planned</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ title: '', durationMinutes: '' })}
                >
                  <Plus className="mr-1.5 size-4" />
                  Add item
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {fields.length === 0 ? (
                  <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                    No agenda yet. Add items or start from a template above.
                  </p>
                ) : (
                  fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)_5rem_2rem] items-center gap-2"
                    >
                      <div className="flex flex-col text-muted-foreground">
                        <button
                          type="button"
                          aria-label="Move up"
                          disabled={index === 0}
                          onClick={() => move(index, index - 1)}
                          className="disabled:opacity-30"
                        >
                          <GripVertical className="size-4" />
                        </button>
                      </div>
                      <Input
                        placeholder="Agenda item"
                        aria-label="Agenda item title"
                        {...form.register(`agenda.${index}.title`)}
                      />
                      <Input
                        inputMode="numeric"
                        placeholder="min"
                        aria-label="Duration in minutes"
                        className="text-right [font-variant-numeric:tabular-nums]"
                        {...form.register(`agenda.${index}.durationMinutes`)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove agenda item"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendees + submit */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-sm font-semibold text-foreground">Attendees</h2>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Team
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {options.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members.</p>
                  ) : (
                    options.members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleAttendee(m.id)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs transition-colors',
                          attendeeIds.has(m.id)
                            ? 'border-transparent bg-[hsl(var(--accent-soft))] text-[hsl(var(--accent-text))]'
                            : 'text-muted-foreground hover:border-foreground/30',
                        )}
                      >
                        {m.fullName ?? m.email}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Client contacts
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {attendeeContacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {clientId === NONE ? 'Pick a client to see contacts.' : 'No contacts.'}
                    </p>
                  ) : (
                    attendeeContacts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleAttendee(c.id)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs transition-colors',
                          attendeeIds.has(c.id)
                            ? 'border-transparent bg-[hsl(var(--info-soft))] text-[hsl(var(--info-text))]'
                            : 'text-muted-foreground hover:border-foreground/30',
                        )}
                      >
                        {c.fullName}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {attendeeIds.size > 0 ? (
                <Badge variant="secondary">{attendeeIds.size} attending</Badge>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2 p-5">
              <Button type="submit" disabled={isSubmitting}>
                {mode === 'edit' ? 'Save changes' : 'Schedule meeting'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                A scheduled meeting with a start time appears on your calendar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
