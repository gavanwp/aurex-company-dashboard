import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Card } from '@aurexos/ui/components/card'
import { UpcomingList, type UpcomingItem } from '@/modules/calendar'
import type { DashboardMeeting } from '../queries/get-dashboard'

/**
 * "Upcoming" — the user's next calendar items (next 14 days, top 3), rendered
 * through the calendar module's public surface with a link to /calendar.
 */
export function MeetingsCard({ meetings }: { meetings: DashboardMeeting[] }) {
  const items: UpcomingItem[] = meetings.slice(0, 3).map((meeting) => ({
    id: meeting.id,
    layer: 'event',
    title: meeting.title,
    startsAt: meeting.startsAt,
    endsAt: meeting.endsAt,
    allDay: false,
    location: meeting.location,
  }))

  return (
    <Card className="flex flex-col p-4">
      <h3 className="text-[15px] font-semibold leading-[22px] text-foreground">Upcoming</h3>

      <UpcomingList items={items} compact className="mt-2" />

      <Link
        href="/calendar"
        className="mt-3 inline-flex min-h-8 items-center gap-1 border-t pt-3 text-xs font-medium text-primary hover:underline"
      >
        View calendar
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </Link>
    </Card>
  )
}
