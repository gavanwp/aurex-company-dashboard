import type { Metadata } from 'next'
import { format } from 'date-fns'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  CalendarView,
  EventDialog,
  getCalendarData,
  getUpcomingItems,
  hasAnyCalendarItems,
  parseAnchor,
  parseView,
  rangeFor,
  UpcomingList,
} from '@/modules/calendar'

export const metadata: Metadata = { title: 'Calendar' }

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>
}) {
  const [{ view: rawView, date: rawDate }, ctx] = await Promise.all([
    searchParams,
    getWorkspaceContext(),
  ])
  const view = parseView(rawView)
  const anchor = parseAnchor(rawDate)
  const range = rangeFor(view, anchor)
  const readOnly = ctx.role === 'client' || ctx.role === 'guest'

  const [data, upcoming, hasAnyItems] = await Promise.all([
    getCalendarData(ctx, range.start.toISOString(), range.end.toISOString()),
    getUpcomingItems(ctx, { days: 14 }),
    hasAnyCalendarItems(ctx),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Events, task deadlines, and meetings in one place."
        actions={readOnly ? undefined : <EventDialog />}
      />
      <div className="grid gap-4 min-[1400px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <CalendarView
            view={view}
            anchor={format(anchor, 'yyyy-MM-dd')}
            data={data}
            readOnly={readOnly}
            hasAnyItems={hasAnyItems}
          />
        </div>
        <aside className="min-w-0">
          <h3 className="mb-2 text-[15px] font-semibold leading-[22px] text-foreground">
            Upcoming
          </h3>
          <UpcomingList items={upcoming} />
        </aside>
      </div>
    </div>
  )
}
