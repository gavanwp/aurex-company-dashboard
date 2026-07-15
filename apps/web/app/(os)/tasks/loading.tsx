import { Skeleton } from '@aurexos/ui/components/skeleton'

export default function TasksLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <Skeleton className="h-9 w-40 rounded-md" />
      {/* Grouped task rows */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, group) => (
          <div key={group} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 3 }).map((_, row) => (
              <Skeleton key={row} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
