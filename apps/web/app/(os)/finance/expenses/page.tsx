import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageFinance,
  canViewFinance,
  ExpensesList,
  getExpenses,
  getFinanceFormOptions,
  isExpenseStatusTab,
  type GetExpensesFilters,
} from '@/modules/finance'

export const metadata: Metadata = { title: 'Expenses' }

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const [{ status }, ctx] = await Promise.all([searchParams, getWorkspaceContext()])
  if (!canViewFinance(ctx.role)) notFound()

  const statusTab = isExpenseStatusTab(status) ? status : 'all'
  const filters: GetExpensesFilters = {}
  if (statusTab !== 'all') filters.status = statusTab

  const [expenses, options] = await Promise.all([
    getExpenses(ctx, filters),
    getFinanceFormOptions(ctx),
  ])

  return (
    <ExpensesList
      expenses={expenses}
      statusTab={statusTab}
      projects={options.projects}
      canManage={canManageFinance(ctx.role)}
    />
  )
}
