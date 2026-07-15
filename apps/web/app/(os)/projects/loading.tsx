import { Skeleton } from '@aurexos/ui/components/skeleton'

export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      {/* Table */}
      <div className="rounded-lg border">
        <Skeleton className="h-11 w-full rounded-t-lg" />
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="mx-4 my-3 h-8" />
          ))}
        </div>
      </div>
    </div>
  )
}
