import {
  Activity,
  Building2,
  FolderKanban,
  Handshake,
  ListChecks,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '@aurexos/ui/components/card'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import type { DashboardActivity } from '../queries/get-dashboard'

/** Source-module icon per event namespace — module identity, not decoration. */
const SOURCE_ICONS: Record<string, LucideIcon> = {
  tasks: ListChecks,
  projects: FolderKanban,
  crm: Handshake,
  workspace: Building2,
}

export function ActivityCard({ activity }: { activity: DashboardActivity[] }) {
  return (
    <Card className="flex flex-col p-4">
      <h3 className="text-[15px] font-semibold leading-[22px] text-foreground">Recent activity</h3>

      {activity.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Changes made across the workspace will appear here."
          className="mt-4 min-h-[160px] p-6"
        />
      ) : (
        <ul className="mt-2 space-y-3">
          {activity.map((event) => {
            const Icon = SOURCE_ICONS[event.source] ?? Activity
            return (
              <li key={event.id} className="flex items-center gap-3">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                  aria-hidden="true"
                >
                  <Icon className="size-4" />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-medium">{event.actorName ?? 'Someone'}</span>{' '}
                  <span className="text-muted-foreground">{event.sentence}</span>
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">{event.timeAgo}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
