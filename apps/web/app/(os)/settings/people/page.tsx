import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageAccess,
  canViewAccess,
  getAssignableRoles,
  getPendingInvitations,
  getRoster,
  PeopleAccess,
} from '@/modules/access'

export const metadata: Metadata = { title: 'People & Access' }

export default async function PeopleAccessPage() {
  const ctx = await getWorkspaceContext()
  if (!(await canViewAccess(ctx))) notFound()

  const [roster, invitations, roles, canManage] = await Promise.all([
    getRoster(ctx),
    getPendingInvitations(ctx),
    getAssignableRoles(ctx),
    canManageAccess(ctx),
  ])

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
          title="People & access"
          description="Manage who’s in this workspace, their roles, and pending invitations."
        />
      </div>
      <PeopleAccess roster={roster} invitations={invitations} roles={roles} canManage={canManage} />
    </div>
  )
}
