'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { formatMoney } from '@aurexos/core'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { Separator } from '@aurexos/ui/components/separator'
import { createInvoice, updateInvoice } from '../actions/invoice-actions'
import {
  computeInvoiceTotals,
  computeLineAmountMinor,
  dollarsToMinor,
  minorToDollars,
} from '../lib/money'
import type { FinanceFormOptions, InvoiceDetail } from '../types'

const NONE = 'none'
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const

const lineItemFieldSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.string().min(1, 'Qty'),
  unitPrice: z.string().min(1, 'Rate'),
  taxRatePct: z.string(),
})

const invoiceFormSchema = z.object({
  number: z.string().min(1, 'Invoice number is required').max(40),
  clientId: z.string().min(1, 'Select a client'),
  projectId: z.string(),
  currency: z.string().length(3),
  issueDate: z.string(),
  dueDate: z.string(),
  lineItems: z.array(lineItemFieldSchema).min(1, 'Add at least one line item'),
})
type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

function parseNum(value: string): number {
  const n = Number.parseFloat(String(value).replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function emptyLine(): InvoiceFormValues['lineItems'][number] {
  return { description: '', quantity: '1', unitPrice: '', taxRatePct: '' }
}

export interface InvoiceFormProps {
  mode: 'create' | 'edit'
  options: FinanceFormOptions
  /** Server-suggested next number (create) — user may override. */
  suggestedNumber?: string
  /** The invoice being edited (edit mode). */
  invoice?: InvoiceDetail
}

export function InvoiceForm({ mode, options, suggestedNumber, invoice }: InvoiceFormProps) {
  const router = useRouter()

  const defaultValues = React.useMemo<InvoiceFormValues>(() => {
    if (mode === 'edit' && invoice) {
      return {
        number: invoice.number,
        clientId: invoice.clientId,
        projectId: invoice.projectId ?? NONE,
        currency: invoice.currency,
        issueDate: invoice.issueDate ?? '',
        dueDate: invoice.dueDate ?? '',
        lineItems:
          invoice.lineItems.length > 0
            ? invoice.lineItems.map((line) => ({
                description: line.description,
                quantity: String(line.quantity),
                unitPrice: minorToDollars(line.unitPriceMinor),
                taxRatePct: line.taxRatePct ? String(line.taxRatePct) : '',
              }))
            : [emptyLine()],
      }
    }
    return {
      number: suggestedNumber ?? '',
      clientId: '',
      projectId: NONE,
      currency: 'USD',
      issueDate: '',
      dueDate: '',
      lineItems: [emptyLine()],
    }
  }, [mode, invoice, suggestedNumber])

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lineItems' })

  const watchedLines = form.watch('lineItems')
  const currency = form.watch('currency')

  // Computed inline every render, NOT memoized: react-hook-form's watch()
  // returns a stable array reference whose contents mutate in place, so a
  // useMemo keyed on it would never see a change and the summary would freeze
  // (the per-line amount below is inline for the same reason).
  const totals = computeInvoiceTotals(
    (watchedLines ?? []).map((line) => ({
      description: line.description || '—',
      quantity: parseNum(line.quantity),
      unitPriceMinor: dollarsToMinor(line.unitPrice),
      amountMinor: 0,
      taxRatePct: line.taxRatePct ? parseNum(line.taxRatePct) : undefined,
    })),
  )

  async function onSubmit(values: InvoiceFormValues) {
    const lineItems = values.lineItems.map((line) => {
      const quantity = parseNum(line.quantity)
      const unitPriceMinor = dollarsToMinor(line.unitPrice)
      return {
        description: line.description,
        quantity,
        unitPriceMinor,
        amountMinor: computeLineAmountMinor(quantity, unitPriceMinor),
        taxRatePct: line.taxRatePct ? parseNum(line.taxRatePct) : undefined,
      }
    })

    const payload = {
      clientId: values.clientId,
      projectId: values.projectId === NONE ? null : values.projectId,
      number: values.number,
      currency: values.currency,
      issueDate: values.issueDate || null,
      dueDate: values.dueDate || null,
      lineItems,
    }

    const result =
      mode === 'edit' && invoice
        ? await updateInvoice({ id: invoice.id, ...payload })
        : await createInvoice(payload)

    if (result.ok) {
      toast.success(mode === 'edit' ? 'Invoice updated' : 'Invoice created')
      router.push(`/finance/invoices/${result.data.id}`)
    } else {
      toast.error(result.error)
    }
  }

  const { errors, isSubmitting } = form.formState

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Link
          href={
            mode === 'edit' && invoice ? `/finance/invoices/${invoice.id}` : '/finance/invoices'
          }
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {mode === 'edit' ? 'Back to invoice' : 'Invoices'}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {mode === 'edit' ? 'Edit invoice' : 'New invoice'}
        </h1>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invoice-number">Invoice number</Label>
                  <Input
                    id="invoice-number"
                    className="[font-variant-numeric:tabular-nums]"
                    {...form.register('number')}
                  />
                  {errors.number ? (
                    <p className="text-xs text-destructive">{errors.number.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={(v) => form.setValue('currency', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <Select
                    value={form.watch('clientId') || undefined}
                    onValueChange={(v) => form.setValue('clientId', v, { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.clientId ? (
                    <p className="text-xs text-destructive">{errors.clientId.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Project (optional)</Label>
                  <Select
                    value={form.watch('projectId')}
                    onValueChange={(v) => form.setValue('projectId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No project</SelectItem>
                      {options.projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invoice-issue">Issue date</Label>
                  <Input id="invoice-issue" type="date" {...form.register('issueDate')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invoice-due">Due date</Label>
                  <Input id="invoice-due" type="date" {...form.register('dueDate')} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Line items</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(emptyLine())}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add line
                </Button>
              </div>
              {errors.lineItems?.message ? (
                <p className="mt-2 text-xs text-destructive">{errors.lineItems.message}</p>
              ) : null}

              <div className="mt-3 space-y-3">
                {/* Column headers on wider screens */}
                <div className="hidden gap-2 px-1 text-xs text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_5rem_7rem_5rem_6rem_2rem]">
                  <span>Description</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Rate</span>
                  <span className="text-right">Tax %</span>
                  <span className="text-right">Amount</span>
                  <span />
                </div>

                {fields.map((field, index) => {
                  const line = watchedLines?.[index]
                  const amountMinor = line
                    ? computeLineAmountMinor(
                        parseNum(line.quantity),
                        dollarsToMinor(line.unitPrice),
                      )
                    : 0
                  const lineErrors = errors.lineItems?.[index]
                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_5rem_6rem_2rem] sm:items-center"
                    >
                      <div>
                        <Input
                          placeholder="Design services"
                          aria-label="Description"
                          {...form.register(`lineItems.${index}.description`)}
                        />
                        {lineErrors?.description ? (
                          <p className="mt-1 text-xs text-destructive">
                            {lineErrors.description.message}
                          </p>
                        ) : null}
                      </div>
                      <Input
                        inputMode="decimal"
                        aria-label="Quantity"
                        className="text-right [font-variant-numeric:tabular-nums]"
                        {...form.register(`lineItems.${index}.quantity`)}
                      />
                      <Input
                        inputMode="decimal"
                        placeholder="0.00"
                        aria-label="Unit price"
                        className="text-right [font-variant-numeric:tabular-nums]"
                        {...form.register(`lineItems.${index}.unitPrice`)}
                      />
                      <Input
                        inputMode="decimal"
                        placeholder="0"
                        aria-label="Tax rate percent"
                        className="text-right [font-variant-numeric:tabular-nums]"
                        {...form.register(`lineItems.${index}.taxRatePct`)}
                      />
                      <span className="text-right text-sm font-medium [font-variant-numeric:tabular-nums] sm:pr-1">
                        {formatMoney(amountMinor, currency)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="justify-self-end text-muted-foreground hover:text-destructive"
                        aria-label="Remove line"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live summary */}
        <Card className="lg:sticky lg:top-6">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-sm font-semibold text-foreground">Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="[font-variant-numeric:tabular-nums]">
                  {formatMoney(totals.subtotalMinor, currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="[font-variant-numeric:tabular-nums]">
                  {formatMoney(totals.taxMinor, currency)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="[font-variant-numeric:tabular-nums]">
                  {formatMoney(totals.totalMinor, currency)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {mode === 'edit' ? 'Save changes' : 'Create invoice'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Saved as a draft. Totals are recomputed on the server.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
