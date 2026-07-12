'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Ban, CreditCard, Pencil, Send } from 'lucide-react'
import { toast } from 'sonner'
import { formatMoney } from '@aurexos/core'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@aurexos/ui/components/dialog'
import { Separator } from '@aurexos/ui/components/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@aurexos/ui/components/table'
import { markSent, voidInvoice } from '../actions/invoice-actions'
import { INVOICE_STATUS_META, PAYMENT_METHOD_LABELS, type InvoiceDetail } from '../types'
import { RecordPaymentDialog } from './record-payment-dialog'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return format(new Date(`${value}T00:00:00`), 'MMM d, yyyy')
}

function formatDateTime(value: string): string {
  return format(new Date(value), 'MMM d, yyyy · h:mm a')
}

export interface InvoiceDetailViewProps {
  invoice: InvoiceDetail
  canManage: boolean
}

export function InvoiceDetailView({ invoice, canManage }: InvoiceDetailViewProps) {
  const router = useRouter()
  const [payOpen, setPayOpen] = React.useState(false)
  const [voidOpen, setVoidOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const meta = INVOICE_STATUS_META[invoice.status]
  const isDraft = invoice.status === 'draft'
  const canRecordPayment =
    invoice.status === 'sent' || invoice.status === 'viewed' || invoice.status === 'partial'
  const canVoid = invoice.status !== 'paid' && invoice.status !== 'void'

  async function handleSend() {
    setPending(true)
    const result = await markSent(invoice.id)
    setPending(false)
    if (result.ok) {
      toast.success('Invoice sent')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleVoid() {
    setPending(true)
    const result = await voidInvoice(invoice.id)
    setPending(false)
    setVoidOpen(false)
    if (result.ok) {
      toast.success('Invoice voided')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/finance/invoices"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Invoices
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground [font-variant-numeric:tabular-nums]">
              {invoice.number}
            </h1>
            <Badge variant={invoice.isOverdue ? 'destructive-soft' : meta.variant}>
              {invoice.isOverdue ? 'Overdue' : meta.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {invoice.clientName ?? 'No client'}
            {invoice.projectName ? ` · ${invoice.projectName}` : ''}
          </p>
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            {isDraft ? (
              <Button asChild variant="outline">
                <Link href={`/finance/invoices/${invoice.id}/edit`}>
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            ) : null}
            {isDraft ? (
              <Button onClick={() => void handleSend()} disabled={pending}>
                <Send className="mr-1.5 h-4 w-4" />
                Send invoice
              </Button>
            ) : null}
            {canRecordPayment ? (
              <Button onClick={() => setPayOpen(true)} disabled={pending}>
                <CreditCard className="mr-1.5 h-4 w-4" />
                Record payment
              </Button>
            ) : null}
            {canVoid ? (
              <Button variant="outline" onClick={() => setVoidOpen(true)} disabled={pending}>
                <Ban className="mr-1.5 h-4 w-4" />
                Void
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Line items + totals */}
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Issue date</p>
                <p className="mt-0.5 text-sm font-medium [font-variant-numeric:tabular-nums]">
                  {formatDate(invoice.issueDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Due date</p>
                <p
                  className={`mt-0.5 text-sm font-medium [font-variant-numeric:tabular-nums] ${
                    invoice.isOverdue ? 'text-destructive' : ''
                  }`}
                >
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="mt-0.5 text-sm font-medium">{invoice.currency}</p>
              </div>
            </div>

            <Separator />

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="pr-5 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      No line items on this invoice.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoice.lineItems.map((line, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell className="pl-5">
                        <span className="text-foreground">{line.description}</span>
                        {line.taxRatePct ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {line.taxRatePct}% tax
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right [font-variant-numeric:tabular-nums]">
                        {line.quantity}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground [font-variant-numeric:tabular-nums]">
                        {formatMoney(line.unitPriceMinor, invoice.currency)}
                      </TableCell>
                      <TableCell className="pr-5 text-right font-medium [font-variant-numeric:tabular-nums]">
                        {formatMoney(line.amountMinor, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <Separator />

            <div className="ml-auto max-w-xs space-y-2 p-5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="[font-variant-numeric:tabular-nums]">
                  {formatMoney(invoice.subtotalMinor, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="[font-variant-numeric:tabular-nums]">
                  {formatMoney(invoice.taxMinor, invoice.currency)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="[font-variant-numeric:tabular-nums]">
                  {formatMoney(invoice.totalMinor, invoice.currency)}
                </span>
              </div>
              {invoice.amountPaidMinor > 0 ? (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Paid</span>
                  <span className="[font-variant-numeric:tabular-nums]">
                    −{formatMoney(invoice.amountPaidMinor, invoice.currency)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-semibold">
                <span>Balance due</span>
                <span
                  className={`[font-variant-numeric:tabular-nums] ${
                    invoice.balanceMinor > 0 && invoice.isOverdue ? 'text-destructive' : ''
                  }`}
                >
                  {formatMoney(invoice.balanceMinor, invoice.currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments timeline */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-foreground">Payments</h2>
            {invoice.payments.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </div>
            ) : (
              <ul className="mt-4 space-y-4">
                {invoice.payments.map((payment) => (
                  <li key={payment.id} className="flex gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--success-soft))]">
                      <CreditCard
                        className="h-4 w-4 text-[hsl(var(--success-text))]"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-foreground [font-variant-numeric:tabular-nums]">
                          {formatMoney(payment.amountMinor, payment.currency)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {PAYMENT_METHOD_LABELS[payment.method]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                        {formatDateTime(payment.receivedAt)}
                      </p>
                      {payment.externalRef ? (
                        <p className="truncate text-xs text-muted-foreground">
                          Ref: {payment.externalRef}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <RecordPaymentDialog
        invoiceId={invoice.id}
        currency={invoice.currency}
        balanceMinor={invoice.balanceMinor}
        open={payOpen}
        onOpenChange={setPayOpen}
      />

      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Void this invoice?</DialogTitle>
            <DialogDescription>
              Voiding {invoice.number} is permanent — it removes the invoice from your receivables.
              To bill this work again you'll need to reissue a new invoice.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setVoidOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleVoid()} disabled={pending}>
              Void invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
