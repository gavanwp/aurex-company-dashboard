import { Skeleton } from '@aurexos/ui/components/skeleton'

export default function LeaveLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-9 w-56 rounded-md" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}
