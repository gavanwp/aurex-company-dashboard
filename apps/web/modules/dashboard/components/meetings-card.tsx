import { format } from 'date-fns'
import { CalendarClock } from 'lucide-react'
import { Card } from '@aurexos/ui/components/card'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import type { DashboardMeeting } from '../queries/get-dashboard'

function timeRange(meeting: DashboardMeeting): string {
  const start = new Date(meeting.startsAt)
  const startText = format(start, 'EEE, MMM d · h:mm a')
  if (!meeting.endsAt) return startText
  return `${startText}–${format(new Date(meeting.endsAt), 'h:mm a')}`
}

/**
 * "Upcoming meetings" — the user's next calendar events (next 14 days).
 * The Calendar module ships later, so there is no "View calendar" link —
 * we never render dead routes; a muted caption says when it arrives.
 */
export function MeetingsCard({ meetings }: { meetings: DashboardMeeting[] }) {
  return (
    <Card className="flex flex-col p-4">
      <h3 className="text-[15px] font-semibold leading-[22px] text-foreground">
        Upcoming meetings
      </h3>

      {meetings.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No meetings scheduled"
          description="Events on your calendar will show up here."
          className="mt-4 min-h-[160px] p-6"
        />
      ) : (
        <ul className="mt-2 divide-y divide-border/60">
          {meetings.map((meeting) => (
            <li key={meeting.id} className="flex items-start gap-3 py-2.5">
              <CalendarClock
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{meeting.title}</p>
                <p className="truncate text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                  {timeRange(meeting)}
                  {meeting.location ? ` · ${meeting.location}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
        Calendar module coming soon
      </p>
    </Card>
  )
}
