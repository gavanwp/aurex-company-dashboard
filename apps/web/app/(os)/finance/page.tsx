import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageFinance,
  canViewFinance,
  FinanceOverview,
  getFinanceOverview,
} from '@/modules/finance'

export const metadata: Metadata = { title: 'Finance' }

export default async function FinancePage() {
  const ctx = await getWorkspaceContext()
  if (!canViewFinance(ctx.role)) notFound()

  const snapshot = await getFinanceOverview(ctx)
  return <FinanceOverview snapshot={snapshot} canManage={canManageFinance(ctx.role)} />
}
