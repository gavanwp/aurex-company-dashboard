import type { Metadata } from 'next'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { DashboardView, getDashboardData } from '@/modules/dashboard'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const ctx = await getWorkspaceContext()
  const data = await getDashboardData(ctx)

  return <DashboardView ctx={ctx} data={data} />
}
