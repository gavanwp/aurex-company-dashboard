'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, Banknote, FileText, Plus, Receipt, Wallet } from 'lucide-react'
import { formatMoney } from '@aurexos/core'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@aurexos/ui/components/card'
import { BarChart, ChartContainer } from '@aurexos/ui/components/chart'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { StatCard } from '@aurexos/ui/components/stat-card'
import { cn } from '@aurexos/ui/lib/utils'
import type { AgingBucket } from '../lib/money'
import { AR_AGING_LABELS, FINANCE_HUE, INVOICE_STATUS_META, type FinanceSnapshot } from '../types'

/** Compact money for axis ticks: $1.2k / $3.4M (Charts.md §5). */
function compactMoney(minor: number, currency: string): string {
  const dollars = minor / 100
  const abs = Math.abs(dollars)
  if (abs >= 1_000_000) return `${symbol(currency)}${trimZero((dollars / 1_000_000).toFixed(1))}M`
  if (abs >= 1_000) return `${symbol(currency)}${trimZero((dollars / 1_000).toFixed(1))}k`
  return `${symbol(currency)}${Math.round(dollars)}`
}

function symbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).formatToParts(0)
    return parts.find((p) => p.type === 'currency')?.value ?? '$'
  } catch {
    return '$'
  }
}

function trimZero(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value
}

const AGING_TONE: Record<AgingBucket, string> = {
  current: FINANCE_HUE,
  '1-30': '--chart-3',
  '31-60': '--warning',
  '61-90': '--destructive',
  '90+': '--destructive',
}

export interface FinanceOverviewProps {
  snapshot: FinanceSnapshot
  canManage: boolean
}

export function FinanceOverview({ snapshot, canManage }: FinanceOverviewProps) {
  const { currency } = snapshot
  const collectedEmpty = snapshot.collectedMinor === 0
  const agingMax = Math.max(...snapshot.aging.map((a) => a.amountMinor), 1)
  const hasOutstanding = snapshot.outstandingMinor > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Invoices, payments and expenses — your agency's money at a glance."
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

      <div className="aurex-reveal grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total invoiced"
          value={formatMoney(snapshot.totalInvoicedMinor, currency)}
          icon={FileText}
          iconTint={FINANCE_HUE}
          hint={`${snapshot.invoiceCount} invoice${snapshot.invoiceCount === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Collected"
          value={formatMoney(snapshot.collectedMinor, currency)}
          icon={Banknote}
          iconTint="--chart-4"
          hint="Payments received"
        />
        <StatCard
          label="Outstanding"
          value={formatMoney(snapshot.outstandingMinor, currency)}
          icon={Wallet}
          iconTint="--chart-3"
          hint="Awaiting payment"
        />
        <StatCard
          label="Overdue"
          value={formatMoney(snapshot.overdueMinor, currency)}
          icon={AlertTriangle}
          iconTint={snapshot.overdueMinor > 0 ? '--destructive' : undefined}
          delta={snapshot.overdueMinor > 0 ? 'Past due' : undefined}
          deltaTrend="down"
          hint={snapshot.overdueMinor > 0 ? 'Needs follow-up' : 'Nothing past due'}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ChartContainer
          title="Collected over time"
          plotHeight={216}
          empty={collectedEmpty}
          emptyMessage="No payments yet — record your first payment and collected months land here."
          summary={
            <span className="text-2xl font-bold text-foreground [font-variant-numeric:tabular-nums]">
              {formatMoney(snapshot.collectedMinor, currency)}
            </span>
          }
          timeframe={<span>Last 6 months</span>}
        >
          <BarChart
            data={snapshot.collectedByMonth.map((m) => ({ label: m.label, value: m.totalMinor }))}
            plotHeight={180}
            colorVar={FINANCE_HUE}
            label={`Collected by month, last 6 months, ${formatMoney(snapshot.collectedMinor, currency)} total`}
            formatValue={(minor) => formatMoney(minor, currency)}
            formatTick={(minor) => compactMoney(minor, currency)}
          />
        </ChartContainer>

        <Card>
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm">Accounts receivable aging</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {hasOutstanding ? (
              <div className="space-y-3">
                {snapshot.aging.map((slice) => (
                  <div key={slice.bucket} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">{AR_AGING_LABELS[slice.bucket]}</span>
                      <span className="font-medium text-foreground [font-variant-numeric:tabular-nums]">
                        {formatMoney(slice.amountMinor, currency)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max((slice.amountMinor / agingMax) * 100, slice.amountMinor > 0 ? 4 : 0)}%`,
                          backgroundColor: `hsl(var(${AGING_TONE[slice.bucket]}))`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm font-medium text-foreground">All clear</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No outstanding receivables — every invoice is settled.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-3">
            <CardTitle className="text-sm">Recent invoices</CardTitle>
            {snapshot.recentInvoices.length > 0 ? (
              <Link
                href="/finance/invoices"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {snapshot.recentInvoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Create your first invoice to start billing clients and tracking cash."
                className="min-h-[200px]"
                action={
                  canManage ? (
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
              <ul className="divide-y">
                {snapshot.recentInvoices.map((invoice) => {
                  const meta = INVOICE_STATUS_META[invoice.status]
                  return (
                    <li key={invoice.id}>
                      <Link
                        href={`/finance/invoices/${invoice.id}`}
                        className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {invoice.number}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {invoice.clientName ?? 'No client'}
                          </p>
                        </div>
                        <Badge variant={invoice.isOverdue ? 'destructive-soft' : meta.variant}>
                          {invoice.isOverdue ? 'Overdue' : meta.label}
                        </Badge>
                        <span className="w-24 shrink-0 text-right text-sm font-medium text-foreground [font-variant-numeric:tabular-nums]">
                          {formatMoney(invoice.totalMinor, invoice.currency)}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-3">
            <CardTitle className="text-sm">Pending expenses</CardTitle>
            <Link
              href="/finance/expenses"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Review
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {snapshot.pendingExpenses.count === 0 ? (
              <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center">
                <Receipt className="mb-2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">No expenses awaiting approval.</p>
              </div>
            ) : (
              <div className={cn('rounded-lg border p-4')}>
                <p className="text-2xl font-bold text-foreground [font-variant-numeric:tabular-nums]">
                  {formatMoney(snapshot.pendingExpenses.totalMinor, currency)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {snapshot.pendingExpenses.count} expense
                  {snapshot.pendingExpenses.count === 1 ? '' : 's'} awaiting approval
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
