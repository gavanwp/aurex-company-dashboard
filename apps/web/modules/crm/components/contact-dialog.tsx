'use client'

import * as React from 'react'
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
import { createContact, updateContact } from '../actions/contacts'
import type { ClientOption, ContactRow } from '../types'

const NONE = 'none'

const contactFormSchema = z.object({
  fullName: z.string().min(1, 'Contact name is required').max(160),
  clientId: z.string(),
  title: z.string().max(120),
  email: z.string().email('Enter a valid email').max(320).or(z.literal('')),
  phone: z.string().max(40),
})

type ContactFormValues = z.infer<typeof contactFormSchema>

function toFormValues(contact: ContactRow | null | undefined): ContactFormValues {
  return {
    fullName: contact?.fullName ?? '',
    clientId: contact?.clientId ?? NONE,
    title: contact?.title ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
  }
}

export interface ContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the dialog edits this contact; otherwise it creates one. */
  contact?: ContactRow | null
  clients: ClientOption[]
}

export function ContactDialog({ open, onOpenChange, contact, clients }: ContactDialogProps) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: toFormValues(contact),
  })

  React.useEffect(() => {
    if (open) form.reset(toFormValues(contact))
  }, [open, contact, form])

  async function onSubmit(values: ContactFormValues) {
    const payload = {
      fullName: values.fullName,
      clientId: values.clientId === NONE ? null : values.clientId,
      email: values.email.trim() === '' ? null : values.email,
      phone: values.phone.trim(),
      title: values.title.trim(),
    }
    const result = contact
      ? await updateContact({ id: contact.id, ...payload })
      : await createContact(payload)
    if (result.ok) {
      toast.success(contact ? 'Contact updated' : 'Contact created')
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
          <DialogTitle>{contact ? 'Edit contact' : 'New contact'}</DialogTitle>
          <DialogDescription>
            {contact ? 'Update the contact details.' : 'Add a person to your CRM.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact-name">Full name</Label>
            <Input id="contact-name" placeholder="Ada Lovelace" {...form.register('fullName')} />
            {errors.fullName ? (
              <p className="text-xs text-destructive">{errors.fullName.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select
                value={form.watch('clientId')}
                onValueChange={(v) => form.setValue('clientId', v)}
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
              <Label htmlFor="contact-title">Title</Label>
              <Input
                id="contact-title"
                placeholder="Head of Marketing"
                {...form.register('title')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="ada@example.com"
                {...form.register('email')}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input id="contact-phone" placeholder="+1 555 010 2030" {...form.register('phone')} />
            </div>
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
              {contact ? 'Save changes' : 'Create contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
