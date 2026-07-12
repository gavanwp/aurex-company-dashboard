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
import { cn } from '@aurexos/ui/lib/utils'
import {
  INVOICE_STATUS_META,
  INVOICE_STATUS_TABS,
  isInvoiceStatusTab,
  type InvoiceListRow,
  type InvoiceStatusTab,
} from '../types'

/** Parse a date-only string at local midnight (avoids UTC off-by-one). */
function formatDate(value: string | null): string {
  if (!value) return '—'
  return format(new Date(`${value}T00:00:00`), 'MMM d, yyyy')
}

const TAB_LABELS: Record<InvoiceStatusTab, string> = {
  all: 'All',
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partial',
  overdue: 'Overdue',
  paid: 'Paid',
  void: 'Void',
}

export interface InvoicesListProps {
  invoices: InvoiceListRow[]
  statusTab: InvoiceStatusTab
  search: string
  canManage: boolean
}

export function InvoicesList({ invoices, statusTab, search, canManage }: InvoicesListProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = React.useState(search)

  function navigate(tab: InvoiceStatusTab, nextSearch: string) {
    const params = new URLSearchParams()
    if (tab !== 'all') params.set('status', tab)
    if (nextSearch.trim()) params.set('search', nextSearch.trim())
    const qs = params.toString()
    router.replace(qs ? `/finance/invoices?${qs}` : '/finance/invoices', { scroll: false })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Every invoice, from draft to paid."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/finance/invoices/new">
                <Plus className="mr-1.5 h-4 w-4" />
                New invoice
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={statusTab}
          onValueChange={(value) =>
            navigate(isInvoiceStatusTab(value) ? value : 'all', searchValue)
          }
        >
          <TabsList>
            {INVOICE_STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {TAB_LABELS[tab]}
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
            placeholder="Search invoice number…"
            className="pl-8"
            aria-label="Search invoices by number"
          />
        </form>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search || statusTab !== 'all' ? 'No matching invoices' : 'No invoices yet'}
          description={
            search || statusTab !== 'all'
              ? 'Try a different status or search term.'
              : 'Create your first invoice to start billing clients.'
          }
          action={
            canManage && !search && statusTab === 'all' ? (
              <Button asChild size="sm">
                <Link href="/finance/invoices/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  New invoice
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
                <TableHead className="pl-4">Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="pr-4 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const meta = INVOICE_STATUS_META[invoice.status]
                return (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/finance/invoices/${invoice.id}`)}
                  >
                    <TableCell className="pl-4 font-medium">
                      <Link
                        href={`/finance/invoices/${invoice.id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {invoice.number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.clientName ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={invoice.isOverdue ? 'destructive-soft' : meta.variant}>
                        {invoice.isOverdue ? 'Overdue' : meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground [font-variant-numeric:tabular-nums]">
                      {formatDate(invoice.issueDate)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        '[font-variant-numeric:tabular-nums]',
                        invoice.isOverdue
                          ? 'font-medium text-destructive'
                          : 'text-muted-foreground',
                      )}
                    >
                      {formatDate(invoice.dueDate)}
                    </TableCell>
                    <TableCell className="pr-4 text-right font-medium [font-variant-numeric:tabular-nums]">
                      {formatMoney(invoice.totalMinor, invoice.currency)}
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
