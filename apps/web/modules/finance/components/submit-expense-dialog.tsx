'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@aurexos/ui/components/button'
import { Checkbox } from '@aurexos/ui/components/checkbox'
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
import { submitExpense } from '../actions/expense-actions'
import { dollarsToMinor } from '../lib/money'
import type { FinanceOption } from '../types'

const NONE = 'none'
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const

const expenseFormSchema = z.object({
  vendor: z.string().min(1, 'Vendor is required').max(200),
  amount: z.string().min(1, 'Amount is required'),
  currency: z.string().length(3),
  category: z.string().max(80),
  expenseDate: z.string().min(1, 'Date is required'),
  billable: z.boolean(),
  projectId: z.string(),
})
type ExpenseFormValues = z.infer<typeof expenseFormSchema>

function todayLocal(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

function defaults(): ExpenseFormValues {
  return {
    vendor: '',
    amount: '',
    currency: 'USD',
    category: '',
    expenseDate: todayLocal(),
    billable: false,
    projectId: NONE,
  }
}

export interface SubmitExpenseDialogProps {
  projects: FinanceOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SubmitExpenseDialog({ projects, open, onOpenChange }: SubmitExpenseDialogProps) {
  const router = useRouter()
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: defaults(),
  })

  React.useEffect(() => {
    if (open) form.reset(defaults())
  }, [open, form])

  async function onSubmit(values: ExpenseFormValues) {
    const amountMinor = dollarsToMinor(values.amount)
    if (amountMinor <= 0) {
      form.setError('amount', { message: 'Enter an amount greater than zero' })
      return
    }
    const result = await submitExpense({
      vendor: values.vendor,
      amountMinor,
      currency: values.currency,
      category: values.category || undefined,
      expenseDate: values.expenseDate,
      billable: values.billable,
      projectId: values.projectId === NONE ? null : values.projectId,
    })
    if (result.ok) {
      toast.success('Expense submitted for approval')
      onOpenChange(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const { errors, isSubmitting } = form.formState

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit an expense</DialogTitle>
          <DialogDescription>
            Log a business expense for approval. Amounts are stored in the selected currency.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="expense-vendor">Vendor</Label>
            <Input
              id="expense-vendor"
              placeholder="Figma, AWS, Uber…"
              {...form.register('vendor')}
            />
            {errors.vendor ? (
              <p className="text-xs text-destructive">{errors.vendor.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount">Amount</Label>
              <Input
                id="expense-amount"
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
              <Label>Currency</Label>
              <Select
                value={form.watch('currency')}
                onValueChange={(v) => form.setValue('currency', v)}
              >
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expense-category">Category (optional)</Label>
              <Input
                id="expense-category"
                placeholder="Software, Travel…"
                {...form.register('category')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-date">Date</Label>
              <Input id="expense-date" type="date" {...form.register('expenseDate')} />
              {errors.expenseDate ? (
                <p className="text-xs text-destructive">{errors.expenseDate.message}</p>
              ) : null}
            </div>
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
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2.5 text-sm">
            <Checkbox
              checked={form.watch('billable')}
              onCheckedChange={(checked) => form.setValue('billable', checked === true)}
            />
            <span>Billable to client</span>
          </label>

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
              Submit expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
