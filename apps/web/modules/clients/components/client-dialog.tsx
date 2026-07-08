'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CLIENT_STATUSES, type ClientStatus } from '@aurexos/core'
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
import { createClient, updateClient } from '../actions/clients'

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  prospect: 'Prospect',
  active: 'Active',
  paused: 'Paused',
  churned: 'Churned',
}

const clientFormSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(160),
  website: z.string().url('Enter a valid URL (https://…)').max(2000).or(z.literal('')),
  industry: z.string().max(80),
  status: z.enum(CLIENT_STATUSES),
  notes: z.string().max(20_000),
})

type ClientFormValues = z.infer<typeof clientFormSchema>

export interface ClientDialogClient {
  id: string
  name: string
  website: string | null
  industry: string | null
  status: ClientStatus
  notes: string | null
}

function toFormValues(client: ClientDialogClient | null | undefined): ClientFormValues {
  return {
    name: client?.name ?? '',
    website: client?.website ?? '',
    industry: client?.industry ?? '',
    status: client?.status ?? 'prospect',
    notes: client?.notes ?? '',
  }
}

export interface ClientDialogProps {
  /** When set, the dialog edits this client; otherwise it creates one. */
  client?: ClientDialogClient | null
  /** Uncontrolled mode: render this node as the dialog trigger. */
  trigger?: React.ReactNode
  /** Controlled mode: manage open state from the parent. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ClientDialog({ client, trigger, open, onOpenChange }: ClientDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  function setOpen(next: boolean) {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: toFormValues(client),
  })

  React.useEffect(() => {
    if (isOpen) form.reset(toFormValues(client))
  }, [isOpen, client, form])

  async function onSubmit(values: ClientFormValues) {
    const payload = {
      name: values.name,
      website: values.website.trim() === '' ? null : values.website,
      industry: values.industry.trim(),
      status: values.status,
      notes: values.notes,
    }
    const result = client
      ? await updateClient({ id: client.id, ...payload })
      : await createClient(payload)
    if (result.ok) {
      toast.success(client ? 'Client updated' : 'Client created')
      setOpen(false)
    } else {
      toast.error(result.error)
    }
  }

  const { errors, isSubmitting } = form.formState

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit client' : 'New client'}</DialogTitle>
          <DialogDescription>
            {client ? 'Update the client details.' : 'Add a company you work with.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="client-name">Name</Label>
            <Input id="client-name" placeholder="Acme Inc." {...form.register('name')} />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client-website">Website</Label>
            <Input
              id="client-website"
              placeholder="https://acme.com"
              {...form.register('website')}
            />
            {errors.website ? (
              <p className="text-xs text-destructive">{errors.website.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-industry">Industry</Label>
              <Input id="client-industry" placeholder="SaaS" {...form.register('industry')} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(v) => form.setValue('status', v as ClientStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {CLIENT_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client-notes">Notes</Label>
            <Textarea
              id="client-notes"
              rows={4}
              placeholder="Anything the team should know…"
              {...form.register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {client ? 'Save changes' : 'Create client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
