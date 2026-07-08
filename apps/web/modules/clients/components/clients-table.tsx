'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ExternalLink } from 'lucide-react'
import { formatMoney, type ClientStatus } from '@aurexos/core'
import { Badge, type BadgeProps } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@aurexos/ui/components/table'
import type { ClientRow } from '../types'
import { CLIENT_STATUS_LABELS, ClientDialog } from './client-dialog'

export const CLIENT_STATUS_VARIANTS: Record<ClientStatus, BadgeProps['variant']> = {
  prospect: 'secondary',
  active: 'success',
  paused: 'warning',
  churned: 'outline',
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const router = useRouter()

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No clients yet"
        description="Clients tie your contacts, deals, and projects together. Add your first one."
        action={<ClientDialog trigger={<Button>New client</Button>} />}
      />
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Industry</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Website</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Projects</TableHead>
            <TableHead className="text-right">Pipeline</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow
              key={client.id}
              className="cursor-pointer"
              onClick={() => router.push(`/clients/${client.id}`)}
            >
              <TableCell className="text-sm font-medium">{client.name}</TableCell>
              <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                {client.industry ?? '—'}
              </TableCell>
              <TableCell>
                <Badge variant={CLIENT_STATUS_VARIANTS[client.status]}>
                  {CLIENT_STATUS_LABELS[client.status]}
                </Badge>
              </TableCell>
              <TableCell className="hidden text-sm lg:table-cell">
                {client.website ? (
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {hostnameOf(client.website)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="hidden text-right text-sm text-muted-foreground [font-variant-numeric:tabular-nums] sm:table-cell">
                {client.activeProjects}
              </TableCell>
              <TableCell className="text-right text-sm [font-variant-numeric:tabular-nums]">
                {client.openDeals > 0 ? (
                  <span>
                    {formatMoney(client.pipelineValueCents)}
                    <span className="ml-1 text-xs text-muted-foreground">
                      · {client.openDeals} open
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
