import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { canViewSecurityCenter, getSecurityOverview, SecurityCenter } from '@/modules/access'

export const metadata: Metadata = { title: 'Security Center' }

export default async function SecurityCenterPage() {
  const ctx = await getWorkspaceContext()
  if (!(await canViewSecurityCenter(ctx))) notFound()

  const overview = await getSecurityOverview(ctx)

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
          title="Security Center"
          description="Your organization’s security posture at a glance — MFA coverage, elevated access, and risk signals."
        />
      </div>
      <SecurityCenter overview={overview} />
    </div>
  )
}
