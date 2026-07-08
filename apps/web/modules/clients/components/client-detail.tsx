'use client'

import * as React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowUpRight, ExternalLink, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import {
  formatMoney,
  initialsOf,
  CLIENT_STATUSES,
  type ClientStatus,
  type DealStage,
  type ProjectStatus,
} from '@aurexos/core'
import { Avatar, AvatarFallback } from '@aurexos/ui/components/avatar'
import { Badge, type BadgeProps } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@aurexos/ui/components/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { updateClient } from '../actions/clients'
import type { ClientDetailData } from '../types'
import { CLIENT_STATUS_LABELS, ClientDialog } from './client-dialog'
import { CLIENT_STATUS_VARIANTS } from './clients-table'

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
}

const PROJECT_STATUS_VARIANTS: Record<ProjectStatus, BadgeProps['variant']> = {
  planning: 'secondary',
  active: 'success',
  on_hold: 'warning',
  completed: 'outline',
  archived: 'outline',
}

const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

function dealStageVariant(stage: DealStage): BadgeProps['variant'] {
  if (stage === 'won') return 'success'
  if (stage === 'lost') return 'outline'
  return 'secondary'
}

export function ClientDetail({ client }: { client: ClientDetailData }) {
  const [editOpen, setEditOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  function handleStatusChange(status: ClientStatus) {
    if (status === client.status) return
    startTransition(async () => {
      const result = await updateClient({ id: client.id, status })
      if (result.ok) {
        toast.success(`Client marked ${CLIENT_STATUS_LABELS[status].toLowerCase()}`)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">{client.name}</CardTitle>
              <Badge variant={CLIENT_STATUS_VARIANTS[client.status]}>
                {CLIENT_STATUS_LABELS[client.status]}
              </Badge>
            </div>
            <CardDescription>{client.industry ?? 'No industry set'}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={client.status}
              onValueChange={(v) => handleStatusChange(v as ClientStatus)}
              disabled={isPending}
            >
              <SelectTrigger className="h-8 w-32">
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
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Website</span>
            {client.website ? (
              <a
                href={client.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
              >
                {client.website}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          {client.notes ? (
            <div className="space-y-1 text-sm">
              <span className="text-muted-foreground">Notes</span>
              <p className="whitespace-pre-wrap">{client.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Contacts</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/crm?tab=contacts">
                Open CRM
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            ) : (
              client.contacts.map((contact) => (
                <div key={contact.id} className="flex items-center gap-3">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">
                      {initialsOf(contact.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{contact.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {contact.title ?? contact.email ?? '—'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {client.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              client.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="-mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    {project.dueDate ? (
                      <p className="text-xs text-muted-foreground">
                        Due {format(new Date(`${project.dueDate}T00:00:00`), 'MMM d, yyyy')}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={PROJECT_STATUS_VARIANTS[project.status]}>
                    {PROJECT_STATUS_LABELS[project.status]}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.deals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deals yet.</p>
            ) : (
              client.deals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{deal.title}</p>
                    <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                      {formatMoney(deal.valueCents, deal.currency)}
                    </p>
                  </div>
                  <Badge variant={dealStageVariant(deal.stage)}>
                    {DEAL_STAGE_LABELS[deal.stage]}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <ClientDialog client={client} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  )
}
