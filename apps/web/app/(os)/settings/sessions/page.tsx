import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { getMyLoginHistory, getMySessions, SessionsManager } from '@/modules/access'

export const metadata: Metadata = { title: 'Sessions & devices' }

export default async function SessionsPage() {
  const ctx = await getWorkspaceContext()
  const [sessions, history] = await Promise.all([getMySessions(ctx), getMyLoginHistory(ctx)])

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
          <Link href="/settings">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Settings
          </Link>
        </Button>
        <PageHeader
          title="Sessions & devices"
          description="Where you’re signed in and your recent sign-in activity."
        />
      </div>
      <SessionsManager sessions={sessions} history={history} nowMs={Date.now()} />
    </div>
  )
}
