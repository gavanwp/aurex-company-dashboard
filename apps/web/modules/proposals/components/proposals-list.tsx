'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Eye, FileSignature, Plus, Search } from 'lucide-react'
import { formatMoney } from '@aurexos/core'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { Input } from '@aurexos/ui/components/input'
import { PageHeader } from '@aurexos/ui/components/page-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@aurexos/ui/components/table'
import { Tabs, TabsList, TabsTrigger } from '@aurexos/ui/components/tabs'
import {
  isProposalStatusTab,
  PROPOSAL_STATUS_META,
  PROPOSAL_STATUS_TAB_LABELS,
  PROPOSAL_STATUS_TABS,
  type ProposalListRow,
  type ProposalStatusTab,
} from '../types'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return format(new Date(`${value}T00:00:00`), 'MMM d, yyyy')
}

export interface ProposalsListProps {
  proposals: ProposalListRow[]
  statusTab: ProposalStatusTab
  search: string
  canManage: boolean
}

export function ProposalsList({ proposals, statusTab, search, canManage }: ProposalsListProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = React.useState(search)

  function navigate(tab: ProposalStatusTab, nextSearch: string) {
    const params = new URLSearchParams()
    if (tab !== 'all') params.set('status', tab)
    if (nextSearch.trim()) params.set('search', nextSearch.trim())
    const qs = params.toString()
    router.replace(qs ? `/proposals?${qs}` : '/proposals', { scroll: false })
  }

  const filtered = search || statusTab !== 'all'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposals"
        description="Build, send and track proposals — from draft to signed."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/proposals/new">
                <Plus className="mr-1.5 h-4 w-4" />
                New proposal
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={statusTab}
          onValueChange={(value) =>
            navigate(isProposalStatusTab(value) ? value : 'all', searchValue)
          }
        >
          <TabsList>
            {PROPOSAL_STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {PROPOSAL_STATUS_TAB_LABELS[tab]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <form
          className="relative sm:w-64"
          onSubmit={(e) => {
            e.preventDefault()
            navigate(statusTab, searchValue)
          }}
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search proposals…"
            className="pl-8"
            aria-label="Search proposals by title"
          />
        </form>
      </div>

      {proposals.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title={filtered ? 'No matching proposals' : 'No proposals yet'}
          description={
            filtered
              ? 'Try a different status or search term.'
              : 'Build your first proposal — a premium, client-ready page you can send and track.'
          }
          action={
            canManage && !filtered ? (
              <Button asChild size="sm">
                <Link href="/proposals/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  New proposal
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead className="pr-4 text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => {
                const meta = PROPOSAL_STATUS_META[proposal.status]
                return (
                  <TableRow
                    key={proposal.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/proposals/${proposal.id}`)}
                  >
                    <TableCell className="max-w-[22rem] pl-4 font-medium">
                      <Link
                        href={`/proposals/${proposal.id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="block truncate">{proposal.title}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {proposal.clientName ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground [font-variant-numeric:tabular-nums]">
                      {proposal.viewCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          {proposal.viewCount}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground [font-variant-numeric:tabular-nums]">
                      {formatDate(proposal.validUntil)}
                    </TableCell>
                    <TableCell className="pr-4 text-right font-medium [font-variant-numeric:tabular-nums]">
                      {formatMoney(proposal.totalMinor, proposal.currency)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
