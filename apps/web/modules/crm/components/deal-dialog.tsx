'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { DEAL_STAGES } from '@aurexos/core'
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
import { createDeal, updateDeal } from '../actions/deals'
import { STAGE_LABELS, type ClientOption, type ContactRow, type DealRow } from '../types'

const NONE = 'none'

const dealFormSchema = z.object({
  title: z.string().min(1, 'Deal title is required').max(200),
  clientId: z.string(),
  contactId: z.string(),
  stage: z.enum(DEAL_STAGES),
  value: z
    .string()
    .refine((v) => v.trim() === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
      message: 'Enter a valid amount',
    }),
  probability: z
    .string()
    .refine(
      (v) =>
        v.trim() === '' ||
        (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 100),
      { message: 'Must be a whole number between 0 and 100' },
    ),
  expectedCloseDate: z.string(),
  source: z.string().max(80),
})

type DealFormValues = z.infer<typeof dealFormSchema>

function toFormValues(deal: DealRow | null | undefined): DealFormValues {
  return {
    title: deal?.title ?? '',
    clientId: deal?.clientId ?? NONE,
    contactId: deal?.contactId ?? NONE,
    stage: deal?.stage ?? 'lead',
    value: deal?.valueCents != null ? String(deal.valueCents / 100) : '',
    probability: deal?.probability != null ? String(deal.probability) : '',
    expectedCloseDate: deal?.expectedCloseDate ?? '',
    source: deal?.source ?? '',
  }
}

export interface DealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the dialog edits this deal; otherwise it creates one. */
  deal?: DealRow | null
  clients: ClientOption[]
  contacts: ContactRow[]
}

export function DealDialog({ open, onOpenChange, deal, clients, contacts }: DealDialogProps) {
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: toFormValues(deal),
  })

  React.useEffect(() => {
    if (open) form.reset(toFormValues(deal))
  }, [open, deal, form])

  const clientId = form.watch('clientId')
  const visibleContacts =
    clientId === NONE ? contacts : contacts.filter((c) => c.clientId === clientId)

  async function onSubmit(values: DealFormValues) {
    const payload = {
      title: values.title,
      clientId: values.clientId === NONE ? null : values.clientId,
      contactId: values.contactId === NONE ? null : values.contactId,
      stage: values.stage,
      valueCents: values.value.trim() === '' ? null : Math.round(Number(values.value) * 100),
      currency: deal?.currency ?? 'USD',
      probability: values.probability.trim() === '' ? null : Number(values.probability),
      expectedCloseDate: values.expectedCloseDate === '' ? null : values.expectedCloseDate,
      source: values.source.trim(),
    }
    const result = deal
      ? await updateDeal({ id: deal.id, ...payload })
      : await createDeal(payload)
    if (result.ok) {
      toast.success(deal ? 'Deal updated' : 'Deal created')
      onOpenChange(false)
    } else {
      toast.error(result.error)
    }
  }

  const { errors, isSubmitting } = form.formState

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{deal ? 'Edit deal' : 'New deal'}</DialogTitle>
          <DialogDescription>
            {deal ? 'Update the deal details.' : 'Add a deal to your pipeline.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="deal-title">Title</Label>
            <Input id="deal-title" placeholder="Website redesign" {...form.register('title')} />
            {errors.title ? (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select
                value={clientId}
                onValueChange={(v) => {
                  form.setValue('clientId', v)
                  const contactId = form.getValues('contactId')
                  if (
                    v !== NONE &&
                    contactId !== NONE &&
                    !contacts.some((c) => c.id === contactId && c.clientId === v)
                  ) {
                    form.setValue('contactId', NONE)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No client</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Select
                value={form.watch('contactId')}
                onValueChange={(v) => form.setValue('contactId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No contact</SelectItem>
                  {visibleContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select
                value={form.watch('stage')}
                onValueChange={(v) => form.setValue('stage', v as DealFormValues['stage'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {STAGE_LABELS[stage]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-value">Value (USD)</Label>
              <Input
                id="deal-value"
                type="number"
                min="0"
                step="0.01"
                placeholder="12,500"
                {...form.register('value')}
              />
              {errors.value ? (
                <p className="text-xs text-destructive">{errors.value.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="deal-probability">Probability (%)</Label>
              <Input
                id="deal-probability"
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="50"
                {...form.register('probability')}
              />
              {errors.probability ? (
                <p className="text-xs text-destructive">{errors.probability.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-close-date">Expected close</Label>
              <Input id="deal-close-date" type="date" {...form.register('expectedCloseDate')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-source">Source</Label>
            <Input id="deal-source" placeholder="Referral, inbound…" {...form.register('source')} />
          </div>

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
              {deal ? 'Save changes' : 'Create deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
