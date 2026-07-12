'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { formatMoney, PAYMENT_METHODS } from '@aurexos/core'
import { Button } from '@aurexos/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@aurexos/ui/components/dialog'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { recordPayment } from '../actions/payment-actions'
import { dollarsToMinor, minorToDollars } from '../lib/money'
import { PAYMENT_METHOD_LABELS } from '../types'

const paymentFormSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  method: z.enum(PAYMENT_METHODS),
  receivedAt: z.string().min(1, 'Date is required'),
  fees: z.string(),
  externalRef: z.string().max(200),
})
type PaymentFormValues = z.infer<typeof paymentFormSchema>

function todayLocal(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

export interface RecordPaymentDialogProps {
  invoiceId: string
  currency: string
  balanceMinor: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecordPaymentDialog({
  invoiceId,
  currency,
  balanceMinor,
  open,
  onOpenChange,
}: RecordPaymentDialogProps) {
  const router = useRouter()
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: minorToDollars(Math.max(balanceMinor, 0)),
      method: 'bank',
      receivedAt: todayLocal(),
      fees: '',
      externalRef: '',
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        amount: minorToDollars(Math.max(balanceMinor, 0)),
        method: 'bank',
        receivedAt: todayLocal(),
        fees: '',
        externalRef: '',
      })
    }
  }, [open, balanceMinor, form])

  async function onSubmit(values: PaymentFormValues) {
    const amountMinor = dollarsToMinor(values.amount)
    if (amountMinor <= 0) {
      form.setError('amount', { message: 'Enter an amount greater than zero' })
      return
    }
    const result = await recordPayment({
      invoiceId,
      amountMinor,
      currency,
      method: values.method,
      receivedAt: new Date(`${values.receivedAt}T00:00:00`).toISOString(),
      feesMinor: values.fees ? dollarsToMinor(values.fees) : 0,
      externalRef: values.externalRef || undefined,
    })
    if (result.ok) {
      toast.success(result.data.status === 'paid' ? 'Invoice paid in full' : 'Payment recorded')
      onOpenChange(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const { errors, isSubmitting } = form.formState

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            Balance due {formatMoney(balanceMinor, currency)}. Recording a payment updates the
            invoice status automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payment-amount">Amount ({currency})</Label>
              <Input
                id="payment-amount"
                inputMode="decimal"
                placeholder="0.00"
                className="[font-variant-numeric:tabular-nums]"
                {...form.register('amount')}
              />
              {errors.amount ? (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-date">Received</Label>
              <Input id="payment-date" type="date" {...form.register('receivedAt')} />
              {errors.receivedAt ? (
                <p className="text-xs text-destructive">{errors.receivedAt.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select
                value={form.watch('method')}
                onValueChange={(v) => form.setValue('method', v as PaymentFormValues['method'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-fees">Fees ({currency}, optional)</Label>
              <Input
                id="payment-fees"
                inputMode="decimal"
                placeholder="0.00"
                className="[font-variant-numeric:tabular-nums]"
                {...form.register('fees')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-ref">Reference (optional)</Label>
            <Input
              id="payment-ref"
              placeholder="Bank ref, Stripe charge id…"
              {...form.register('externalRef')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
