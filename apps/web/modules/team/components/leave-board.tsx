'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarClock, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { initialsOf } from '@aurexos/core'
import { Avatar, AvatarFallback, AvatarImage } from '@aurexos/ui/components/avatar'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { Tabs, TabsList, TabsTrigger } from '@aurexos/ui/components/tabs'
import { cancelLeave, decideLeave } from '../actions/leave-actions'
import { formatDateRange, leaveStatusLabel, leaveStatusVariant, leaveTypeLabel } from '../lib/hr'
import { LEAVE_STATUS_TABS, isLeaveStatusTab, type LeaveRow, type LeaveStatusTab } from '../types'
import { LeaveRequestForm } from './leave-request-form'

const TAB_LABELS: Record<LeaveStatusTab, string> = {
  pending: 'Pending',
  approved: 'Approved',
  all: 'All',
}

function LeaveItem({
  row,
  canManage,
  currentUserId,
}: {
  row: LeaveRow
  canManage: boolean
  currentUserId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const decide = (decision: 'approved' | 'rejected') => {
    startTransition(async () => {
      const result = await decideLeave({ id: row.id, decision })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(decision === 'approved' ? 'Leave approved' : 'Leave rejected')
      router.refresh()
    })
  }

  const cancel = () => {
    startTransition(async () => {
      const result = await cancelLeave({ id: row.id })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Request cancelled')
      router.refresh()
    })
  }

  const isPendingStatus = row.status === 'pending'
  const canCancel = isPendingStatus && (canManage || row.userId === currentUserId)

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-9">
          {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt="" /> : null}
          <AvatarFallback>{initialsOf(row.userName) || '?'}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/team/${row.userId}`}
              className="font-medium text-foreground hover:underline"
            >
              {row.userName}
            </Link>
            <Badge variant="outline">{leaveTypeLabel(row.type)}</Badge>
            <Badge variant={leaveStatusVariant(row.status)}>{leaveStatusLabel(row.status)}</Badge>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {formatDateRange(row.startDate, row.endDate)} · {row.days}{' '}
            {row.days === 1 ? 'day' : 'days'}
            {row.reason ? ` · ${row.reason}` : ''}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isPendingStatus && canManage ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => decide('approved')}
            >
              <Check className="mr-1 h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => decide('rejected')}
            >
              <X className="mr-1 h-4 w-4" />
              Reject
            </Button>
          </>
        ) : canCancel ? (
          <Button size="sm" variant="ghost" disabled={isPending} onClick={cancel}>
            Cancel
          </Button>
        ) : row.decidedByName ? (
          <span className="text-xs text-muted-foreground">by {row.decidedByName}</span>
        ) : null}
      </div>
    </div>
  )
}

export interface LeaveBoardProps {
  rows: LeaveRow[]
  statusTab: LeaveStatusTab
  canManage: boolean
  currentUserId: string
}

export function LeaveBoard({ rows, statusTab, canManage, currentUserId }: LeaveBoardProps) {
  const router = useRouter()

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={statusTab}
          onValueChange={(value) =>
            router.replace(
              `/team/leave${
                isLeaveStatusTab(value) && value !== 'pending' ? `?status=${value}` : ''
              }`,
              { scroll: false },
            )
          }
        >
          <TabsList>
            {LEAVE_STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {TAB_LABELS[tab]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <LeaveRequestForm />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={statusTab === 'pending' ? 'Nothing to review' : 'No leave here'}
          description={
            statusTab === 'pending'
              ? 'Leave requests awaiting a decision will show up here.'
              : 'Filed leave will appear here once someone requests time off.'
          }
          action={statusTab !== 'pending' ? <LeaveRequestForm variant="outline" /> : null}
        />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {rows.map((row) => (
              <LeaveItem
                key={row.id}
                row={row}
                canManage={canManage}
                currentUserId={currentUserId}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
