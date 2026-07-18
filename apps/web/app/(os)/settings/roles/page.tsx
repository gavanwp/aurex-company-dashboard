import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { canViewRoles, getRolesCatalog, RolesCatalog } from '@/modules/access'

export const metadata: Metadata = { title: 'Roles & permissions' }

export default async function RolesPage() {
  const ctx = await getWorkspaceContext()
  if (!(await canViewRoles(ctx))) notFound()

  const roles = await getRolesCatalog(ctx)

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
          <Link href="/settings/people">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            People &amp; access
          </Link>
        </Button>
        <PageHeader
          title="Roles & permissions"
          description="The permission each role grants. System roles are immutable templates; custom roles clone them."
        />
      </div>
      <RolesCatalog roles={roles} />
    </div>
  )
}
