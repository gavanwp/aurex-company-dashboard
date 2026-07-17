import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import type { MemberSpecialization } from '@aurexos/core'
import { MEMBER_SPECIALIZATIONS } from '@aurexos/core'
import { Button } from '@aurexos/ui/components/button'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canViewTeam,
  getTeamDirectory,
  getTeamOverview,
  TeamDirectory,
  TeamOverviewPanel,
  type GetDirectoryFilters,
} from '@/modules/team'

export const metadata: Metadata = { title: 'Team' }

const SPEC_ALL = 'all'

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ specialization?: string; search?: string }>
}) {
  const [{ specialization, search }, ctx] = await Promise.all([searchParams, getWorkspaceContext()])
  if (!(await canViewTeam(ctx))) notFound()

  const specTab =
    specialization && (MEMBER_SPECIALIZATIONS as readonly string[]).includes(specialization)
      ? specialization
      : SPEC_ALL

  const filters: GetDirectoryFilters = {}
  if (specTab !== SPEC_ALL) filters.specialization = specTab as MemberSpecialization
  if (search) filters.search = search

  const [members, overview] = await Promise.all([
    getTeamDirectory(ctx, filters),
    getTeamOverview(ctx),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        description="Your people — profiles, skills, capacity and leave in one place."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/team/leave">
              <CalendarClock className="mr-1.5 h-4 w-4" />
              Leave
            </Link>
          </Button>
        }
      />
      <TeamOverviewPanel overview={overview} />
      <TeamDirectory members={members} specialization={specTab} search={search ?? ''} />
    </div>
  )
}
