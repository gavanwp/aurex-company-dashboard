import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { getProfileOverview, ProfilePage } from '@/modules/settings'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfileSettingsPage() {
  const ctx = await getWorkspaceContext()
  const profile = await getProfileOverview(ctx)

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
          title="Profile"
          description="Your personal details, preferences, and recent activity."
        />
      </div>
      <ProfilePage profile={profile} />
    </div>
  )
}
