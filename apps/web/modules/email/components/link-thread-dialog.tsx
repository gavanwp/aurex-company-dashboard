'use client'

import * as React from 'react'
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
import { Label } from '@aurexos/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { linkThread } from '../actions/email'
import type { EmailLinkOptions, LinkOption, ThreadRow } from '../types'

const NONE = 'none'

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

export interface LinkThreadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  thread: ThreadRow
  options: EmailLinkOptions
}

/** Set or change the client/contact/deal/project records a thread belongs to. */
export function LinkThreadDialog({ open, onOpenChange, thread, options }: LinkThreadDialogProps) {
  const [clientId, setClientId] = React.useState(thread.clientId ?? NONE)
  const [contactId, setContactId] = React.useState(thread.contactId ?? NONE)
  const [dealId, setDealId] = React.useState(thread.dealId ?? NONE)
  const [projectId, setProjectId] = React.useState(thread.projectId ?? NONE)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setClientId(thread.clientId ?? NONE)
      setContactId(thread.contactId ?? NONE)
      setDealId(thread.dealId ?? NONE)
      setProjectId(thread.projectId ?? NONE)
    }
  }, [open, thread])

  async function onSave() {
    setSaving(true)
    const result = await linkThread({
      id: thread.id,
      clientId: clientId === NONE ? null : clientId,
      contactId: contactId === NONE ? null : contactId,
      dealId: dealId === NONE ? null : dealId,
      projectId: projectId === NONE ? null : projectId,
    })
    setSaving(false)
    if (result.ok) {
      toast.success('Thread links updated')
      onOpenChange(false)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link thread</DialogTitle>
          <DialogDescription>
            Attach this conversation to the records it belongs to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <LinkSelect
            label="Client"
            value={clientId}
            onChange={setClientId}
            options={options.clients}
            placeholder="No client"
          />
          <LinkSelect
            label="Contact"
            value={contactId}
            onChange={setContactId}
            options={options.contacts}
            placeholder="No contact"
          />
          <LinkSelect
            label="Deal"
            value={dealId}
            onChange={setDealId}
            options={options.deals}
            placeholder="No deal"
          />
          <LinkSelect
            label="Project"
            value={projectId}
            onChange={setProjectId}
            options={options.projects}
            placeholder="No project"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            Save links
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
