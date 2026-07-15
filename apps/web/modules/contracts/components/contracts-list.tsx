'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { FileText, Plus, Search } from 'lucide-react'
import { formatMoney } from '@aurexos/core'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { Input } from '@aurexos/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@aurexos/ui/components/table'
import { Tabs, TabsList, TabsTrigger } from '@aurexos/ui/components/tabs'
import { cn } from '@aurexos/ui/lib/utils'
import {
  CONTRACT_STATUS_META,
  CONTRACT_STATUS_TAB_LABELS,
  CONTRACT_STATUS_TABS,
  CONTRACT_TYPE_LABELS,
  isContractStatusTab,
  type ContractListRow,
  type ContractStatusTab,
} from '../types'

const TYPE_ALL = 'all'
const CONTRACT_TYPE_OPTIONS = ['msa', 'sow', 'nda', 'retainer', 'employment', 'custom'] as const

function formatDate(value: string | null): string {
  if (!value) return '—'
  return format(new Date(`${value}T00:00:00`), 'MMM d, yyyy')
}

export interface ContractsListProps {
  contracts: ContractListRow[]
  statusTab: ContractStatusTab
  typeFilter: string
  search: string
  canManage: boolean
}

export function ContractsList({
  contracts,
  statusTab,
  typeFilter,
  search,
  canManage,
}: ContractsListProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = React.useState(search)

  function navigate(tab: ContractStatusTab, type: string, nextSearch: string) {
    const params = new URLSearchParams()
    if (tab !== 'all') params.set('status', tab)
    if (type !== TYPE_ALL) params.set('type', type)
    if (nextSearch.trim()) params.set('search', nextSearch.trim())
    const qs = params.toString()
    router.replace(qs ? `/contracts?${qs}` : '/contracts', { scroll: false })
  }

  const filtered = !!search || statusTab !== 'all' || typeFilter !== TYPE_ALL

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-foreground">All contracts</h2>
        {canManage ? (
          <Button asChild size="sm">
            <Link href="/contracts/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New contract
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={statusTab}
          onValueChange={(value) =>
            navigate(isContractStatusTab(value) ? value : 'all', typeFilter, searchValue)
          }
        >
          <TabsList className="flex-wrap">
            {CONTRACT_STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {CONTRACT_STATUS_TAB_LABELS[tab]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={(value) => navigate(statusTab, value, searchValue)}
          >
            <SelectTrigger className="h-9 w-[9rem]" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TYPE_ALL}>All types</SelectItem>
              {CONTRACT_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {CONTRACT_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <form
            className="relative sm:w-56"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(statusTab, typeFilter, searchValue)
            }}
          >
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search contracts…"
              className="pl-8"
              aria-label="Search contracts by title"
            />
          </form>
        </div>
      </div>

      {contracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={filtered ? 'No matching contracts' : 'No contracts yet'}
          description={
            filtered
              ? 'Try a different status, type or search term.'
              : 'Draft your first contract — from a template or an accepted proposal — then send it for signature.'
          }
          action={
            canManage && !filtered ? (
              <Button asChild size="sm">
                <Link href="/contracts/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  New contract
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
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>End date</TableHead>
                <TableHead className="pr-4 text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => {
                const meta = CONTRACT_STATUS_META[contract.status]
                return (
                  <TableRow
                    key={contract.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/contracts/${contract.id}`)}
                  >
                    <TableCell className="max-w-[20rem] pl-4 font-medium">
                      <Link
                        href={`/contracts/${contract.id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="block truncate">{contract.title}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{CONTRACT_TYPE_LABELS[contract.type]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contract.clientName ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        '[font-variant-numeric:tabular-nums]',
                        contract.isExpiringSoon
                          ? 'font-medium text-[hsl(var(--warning-text))]'
                          : 'text-muted-foreground',
                      )}
                    >
                      {formatDate(contract.endDate)}
                      {contract.isExpiringSoon && contract.daysToEnd != null ? (
                        <span className="ml-1.5 text-xs">({contract.daysToEnd}d)</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="pr-4 text-right font-medium [font-variant-numeric:tabular-nums]">
                      {formatMoney(contract.valueMinor, contract.currency)}
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
