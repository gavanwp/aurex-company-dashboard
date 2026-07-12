'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Check, Plus, Receipt, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatMoney } from '@aurexos/core'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { EmptyState } from '@aurexos/ui/components/empty-state'
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
import { approveExpense, rejectExpense } from '../actions/expense-actions'
import {
  EXPENSE_STATUS_META,
  EXPENSE_STATUS_TABS,
  isExpenseStatusTab,
  type ExpenseRow,
  type ExpenseStatusTab,
  type FinanceOption,
} from '../types'
import { SubmitExpenseDialog } from './submit-expense-dialog'

function formatDate(value: string): string {
  return format(new Date(`${value}T00:00:00`), 'MMM d, yyyy')
}

const TAB_LABELS: Record<ExpenseStatusTab, string> = {
  all: 'All',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

export interface ExpensesListProps {
  expenses: ExpenseRow[]
  statusTab: ExpenseStatusTab
  projects: FinanceOption[]
  canManage: boolean
}

export function ExpensesList({ expenses, statusTab, projects, canManage }: ExpensesListProps) {
  const router = useRouter()
  const [submitOpen, setSubmitOpen] = React.useState(false)
  const [pendingId, setPendingId] = React.useState<string | null>(null)

  function navigate(tab: ExpenseStatusTab) {
    const params = new URLSearchParams()
    if (tab !== 'all') params.set('status', tab)
    const qs = params.toString()
    router.replace(qs ? `/finance/expenses?${qs}` : '/finance/expenses', { scroll: false })
  }

  async function decide(id: string, action: 'approve' | 'reject') {
    setPendingId(id)
    const result = action === 'approve' ? await approveExpense(id) : await rejectExpense(id)
    setPendingId(null)
    if (result.ok) {
      toast.success(action === 'approve' ? 'Expense approved' : 'Expense rejected')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Submit and approve business expenses."
        actions={
          <Button onClick={() => setSubmitOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Submit expense
          </Button>
        }
      />

      <Tabs
        value={statusTab}
        onValueChange={(value) => navigate(isExpenseStatusTab(value) ? value : 'all')}
      >
        <TabsList>
          {EXPENSE_STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {TAB_LABELS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={statusTab === 'all' ? 'No expenses yet' : `No ${statusTab} expenses`}
          description={
            statusTab === 'all'
              ? 'Submit your first expense to start tracking spend and approvals.'
              : 'Nothing here right now.'
          }
          action={
            statusTab === 'all' ? (
              <Button size="sm" onClick={() => setSubmitOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Submit expense
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {canManage ? <TableHead className="pr-4 text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => {
                const meta = EXPENSE_STATUS_META[expense.approvalStatus]
                const isPending = expense.approvalStatus === 'pending'
                const busy = pendingId === expense.id
                return (
                  <TableRow key={expense.id} className="hover:bg-muted/40">
                    <TableCell className="pl-4">
                      <span className="font-medium text-foreground">{expense.vendor}</span>
                      {expense.billable ? (
                        <Badge variant="accent-soft" className="ml-2">
                          Billable
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {expense.category ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {expense.projectName ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground [font-variant-numeric:tabular-nums]">
                      {formatDate(expense.expenseDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium [font-variant-numeric:tabular-nums]">
                      {formatMoney(expense.amountMinor, expense.currency)}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="pr-4 text-right">
                        {isPending ? (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => void decide(expense.id, 'approve')}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              disabled={busy}
                              onClick={() => void decide(expense.id, 'reject')}
                            >
                              <X className="mr-1 h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {expense.submittedByName ? `by ${expense.submittedByName}` : '—'}
                          </span>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <SubmitExpenseDialog projects={projects} open={submitOpen} onOpenChange={setSubmitOpen} />
    </div>
  )
}
