'use client'

import * as React from 'react'
import { MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { initialsOf } from '@aurexos/core'
import { Avatar, AvatarFallback } from '@aurexos/ui/components/avatar'
import { Button } from '@aurexos/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@aurexos/ui/components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@aurexos/ui/components/dropdown-menu'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@aurexos/ui/components/table'
import { deleteContact } from '../actions/contacts'
import type { ClientOption, ContactRow } from '../types'
import { ContactDialog } from './contact-dialog'

export interface ContactsTableProps {
  contacts: ContactRow[]
  clients: ClientOption[]
  /** Opens the create-contact dialog owned by the parent view. */
  onCreateContact: () => void
}

export function ContactsTable({ contacts, clients, onCreateContact }: ContactsTableProps) {
  const [editing, setEditing] = React.useState<ContactRow | null>(null)
  const [deleting, setDeleting] = React.useState<ContactRow | null>(null)
  const [isDeleting, startDelete] = React.useTransition()

  function handleDelete() {
    if (!deleting) return
    const contact = deleting
    startDelete(async () => {
      const result = await deleteContact({ id: contact.id })
      if (result.ok) {
        toast.success('Contact deleted')
        setDeleting(null)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No contacts yet"
        description="Keep the people behind every deal in one place. Add your first contact."
        action={<Button onClick={onCreateContact}>New contact</Button>}
      />
    )
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Phone</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-xs">
                        {initialsOf(contact.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{contact.fullName}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {contact.title ?? '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {contact.clientName ?? '—'}
                </TableCell>
                <TableCell className="hidden text-sm sm:table-cell">
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      {contact.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {contact.phone ?? '—'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Contact actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onSelect={() => setEditing(contact)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setDeleting(contact)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ContactDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        contact={editing}
        clients={clients}
      />

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete contact</DialogTitle>
            <DialogDescription>
              “{deleting?.fullName}” will be removed from your CRM. You can’t undo this here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
