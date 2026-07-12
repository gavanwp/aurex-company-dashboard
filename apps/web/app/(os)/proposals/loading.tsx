import { Skeleton } from '@aurexos/ui/components/skeleton'

export default function ProposalsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-96" />
        <Skeleton className="h-9 w-64" />
      </div>
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  )
}
