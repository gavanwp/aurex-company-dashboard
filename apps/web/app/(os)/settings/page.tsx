import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Users } from 'lucide-react'
import { Card } from '@aurexos/ui/components/card'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { canViewAccess } from '@/modules/access'
import { SecuritySettings, WorkspaceSettings } from '@/modules/settings'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const ctx = await getWorkspaceContext()
  const showAccess = await canViewAccess(ctx)

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Workspace, members, and security." />
      <WorkspaceSettings ctx={ctx} />
      {showAccess ? (
        <Link href="/settings/people" className="block">
          <Card interactive className="flex items-center gap-3 p-4">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-soft))]"
              style={{ color: 'hsl(var(--accent-text))' }}
              aria-hidden="true"
            >
              <Users className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">People &amp; access</p>
              <p className="truncate text-xs text-muted-foreground">
                Members, roles, and invitations
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Card>
        </Link>
      ) : null}
      <SecuritySettings email={ctx.profile.email} />
    </div>
  )
}
