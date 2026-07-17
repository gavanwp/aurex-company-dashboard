import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageTeam,
  canViewTeam,
  getLeaveRequests,
  isLeaveStatusTab,
  LeaveBoard,
  type GetLeaveFilters,
} from '@/modules/team'

export const metadata: Metadata = { title: 'Leave' }

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const [{ status }, ctx] = await Promise.all([searchParams, getWorkspaceContext()])
  if (!(await canViewTeam(ctx))) notFound()

  const statusTab = isLeaveStatusTab(status) ? status : 'pending'

  const filters: GetLeaveFilters = {}
  if (statusTab === 'pending') filters.status = 'pending'
  else if (statusTab === 'approved') filters.status = 'approved'

  const [rows, canManage] = await Promise.all([getLeaveRequests(ctx, filters), canManageTeam(ctx)])

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
          <Link href="/team">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Team
          </Link>
        </Button>
        <PageHeader
          title="Leave"
          description="Request time off and review what needs a decision. Approved leave blocks availability."
        />
      </div>
      <LeaveBoard
        rows={rows}
        statusTab={statusTab}
        canManage={canManage}
        currentUserId={ctx.userId}
      />
    </div>
  )
}
