import { Skeleton } from '@aurexos/ui/components/skeleton'

export default function EmailLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-64" />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-px rounded-lg border p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2 border-b p-4 last:border-b-0">
              <div className="flex justify-between gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-14" />
              </div>
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border p-5">
          <div className="space-y-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-24 w-3/4" />
            <Skeleton className="ml-auto h-24 w-3/4" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
