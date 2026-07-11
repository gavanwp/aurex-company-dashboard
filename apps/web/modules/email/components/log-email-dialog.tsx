'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@aurexos/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { logEmail } from '../actions/email'
import type { EmailLinkOptions, LinkOption } from '../types'

const NONE = 'none'

const emailListSchema = z
  .string()
  .transform((value) =>
    value
      .split(/[,;\s]+/)
      .map((part) => part.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string().email('Enter valid email addresses')))

const logEmailFormSchema = z.object({
  direction: z.enum(['inbound', 'outbound']),
  fromAddress: z.string().email('Enter a valid from address'),
  toAddresses: z.string().min(1, 'At least one recipient is required'),
  ccAddresses: z.string(),
  subject: z.string().min(1, 'Subject is required').max(500),
  bodyText: z.string().min(1, 'Email body is required').max(100_000),
  occurredAt: z.string().min(1, 'Date is required'),
  clientId: z.string(),
  contactId: z.string(),
  projectId: z.string(),
  dealId: z.string(),
})

type LogEmailFormValues = z.infer<typeof logEmailFormSchema>

/** Local wall-clock value for a datetime-local input (toISOString is UTC). */
function localDatetimeNow(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

function defaultValues(): LogEmailFormValues {
  return {
    direction: 'inbound',
    fromAddress: '',
    toAddresses: '',
    ccAddresses: '',
    subject: '',
    bodyText: '',
    occurredAt: localDatetimeNow(),
    clientId: NONE,
    contactId: NONE,
    projectId: NONE,
    dealId: NONE,
  }
}

function LinkSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: LinkOption[]
  placeholder: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export interface LogEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: EmailLinkOptions
  /** When set, the message is logged into this thread instead of a new one. */
  threadId?: string | null
}

/** Manual email logging — the v1 ingestion path until Gmail sync lands. */
export function LogEmailDialog({ open, onOpenChange, options, threadId }: LogEmailDialogProps) {
  const router = useRouter()
  const form = useForm<LogEmailFormValues>({
    resolver: zodResolver(logEmailFormSchema),
    defaultValues: defaultValues(),
  })

  React.useEffect(() => {
    if (open) form.reset(defaultValues())
  }, [open, form])

  async function onSubmit(values: LogEmailFormValues) {
    const to = emailListSchema.safeParse(values.toAddresses)
    if (!to.success || to.data.length === 0) {
      form.setError('toAddresses', { message: 'Enter valid recipient addresses' })
      return
    }
    const cc = emailListSchema.safeParse(values.ccAddresses)
    if (!cc.success) {
      form.setError('ccAddresses', { message: 'Enter valid cc addresses' })
      return
    }

    const result = await logEmail({
      threadId: threadId ?? null,
      direction: values.direction,
      fromAddress: values.fromAddress,
      toAddresses: to.data,
      ccAddresses: cc.data,
      subject: values.subject,
      bodyText: values.bodyText,
      occurredAt: new Date(values.occurredAt).toISOString(),
      clientId: values.clientId === NONE ? null : values.clientId,
      contactId: values.contactId === NONE ? null : values.contactId,
      projectId: values.projectId === NONE ? null : values.projectId,
      dealId: values.dealId === NONE ? null : values.dealId,
    })
    if (result.ok) {
      toast.success('Email logged')
      onOpenChange(false)
      router.replace(`/email?thread=${result.data.threadId}`, { scroll: false })
    } else {
      toast.error(result.error)
    }
  }

  const { errors, isSubmitting } = form.formState

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{threadId ? 'Log email to thread' : 'Log an email'}</DialogTitle>
          <DialogDescription>
            Record a client email on the timeline and link it to your CRM records.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select
                value={form.watch('direction')}
                onValueChange={(v) =>
                  form.setValue('direction', v === 'outbound' ? 'outbound' : 'inbound')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Received</SelectItem>
                  <SelectItem value="outbound">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-email-date">Date</Label>
              <Input id="log-email-date" type="datetime-local" {...form.register('occurredAt')} />
              {errors.occurredAt ? (
                <p className="text-xs text-destructive">{errors.occurredAt.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="log-email-from">From</Label>
              <Input
                id="log-email-from"
                type="email"
                placeholder="client@company.com"
                {...form.register('fromAddress')}
              />
              {errors.fromAddress ? (
                <p className="text-xs text-destructive">{errors.fromAddress.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-email-to">To</Label>
              <Input
                id="log-email-to"
                placeholder="you@agency.com, pm@agency.com"
                {...form.register('toAddresses')}
              />
              {errors.toAddresses ? (
                <p className="text-xs text-destructive">{errors.toAddresses.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="log-email-cc">Cc (optional)</Label>
            <Input
              id="log-email-cc"
              placeholder="finance@agency.com"
              {...form.register('ccAddresses')}
            />
            {errors.ccAddresses ? (
              <p className="text-xs text-destructive">{errors.ccAddresses.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="log-email-subject">Subject</Label>
            <Input
              id="log-email-subject"
              placeholder="Re: homepage revisions"
              {...form.register('subject')}
            />
            {errors.subject ? (
              <p className="text-xs text-destructive">{errors.subject.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="log-email-body">Body</Label>
            <Textarea
              id="log-email-body"
              rows={6}
              placeholder="Paste the email content here…"
              {...form.register('bodyText')}
            />
            {errors.bodyText ? (
              <p className="text-xs text-destructive">{errors.bodyText.message}</p>
            ) : null}
          </div>

          {threadId ? null : (
            <div className="grid grid-cols-2 gap-3">
              <LinkSelect
                label="Client"
                value={form.watch('clientId')}
                onChange={(v) => form.setValue('clientId', v)}
                options={options.clients}
                placeholder="No client"
              />
              <LinkSelect
                label="Contact"
                value={form.watch('contactId')}
                onChange={(v) => form.setValue('contactId', v)}
                options={options.contacts}
                placeholder="No contact"
              />
              <LinkSelect
                label="Deal"
                value={form.watch('dealId')}
                onChange={(v) => form.setValue('dealId', v)}
                options={options.deals}
                placeholder="No deal"
              />
              <LinkSelect
                label="Project"
                value={form.watch('projectId')}
                onChange={(v) => form.setValue('projectId', v)}
                options={options.projects}
                placeholder="No project"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Log email
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
