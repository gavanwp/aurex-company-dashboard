import { Skeleton } from '@aurexos/ui/components/skeleton'

/**
 * Content-shaped skeleton matching the calendar layout (11_Design_Principles.md
 * §8.4 — skeletons over spinners, zero layout shift when data lands).
 */
export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="grid gap-4 min-[1400px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {/* Toolbar: period label + controls */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-36" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
          {/* Month grid: weekday header + 5 rows of day cells */}
          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-7 gap-px border-b bg-muted/50 p-1.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-8" />
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-28 space-y-1.5 border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0 [&:nth-child(n+29)]:border-b-0"
                >
                  <div className="flex justify-end">
                    <Skeleton className="size-6 rounded-full" />
                  </div>
                  {i % 3 === 0 && <Skeleton className="h-5 w-full" />}
                  {i % 4 === 0 && <Skeleton className="h-5 w-4/5" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming rail */}
        <aside className="min-w-0 space-y-3">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 py-1">
              <Skeleton className="size-4 shrink-0 rounded" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  )
}
