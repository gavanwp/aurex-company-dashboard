import { Activity } from 'lucide-react'
import { initialsOf } from '@aurexos/core'
import { Avatar, AvatarFallback, AvatarImage } from '@aurexos/ui/components/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@aurexos/ui/components/card'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import type { DashboardActivity } from '../queries/get-dashboard'

export function ActivityCard({ activity }: { activity: DashboardActivity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>The latest changes across this workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Changes made across the workspace will appear here."
            className="min-h-[220px]"
          />
        ) : (
          <ul className="space-y-4">
            {activity.map((event) => (
              <li key={event.id} className="flex items-center gap-3">
                <Avatar className="size-7">
                  {event.actorAvatarUrl ? <AvatarImage src={event.actorAvatarUrl} alt="" /> : null}
                  <AvatarFallback className="text-[10px]">
                    {initialsOf(event.actorName ?? 'Someone')}
                  </AvatarFallback>
                </Avatar>
                <p className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-medium">{event.actorName ?? 'Someone'}</span>{' '}
                  <span className="text-muted-foreground">{event.sentence}</span>
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">{event.timeAgo}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
