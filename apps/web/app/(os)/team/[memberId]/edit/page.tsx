import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import {
  canManageTeam,
  canViewCompensation,
  getMemberDetail,
  getMemberOptions,
  MemberProfileForm,
} from '@/modules/team'

export const metadata: Metadata = { title: 'Edit profile' }

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const [{ memberId }, ctx] = await Promise.all([params, getWorkspaceContext()])
  if (!(await canManageTeam(ctx))) notFound()

  const [member, managerOptions, canEditComp] = await Promise.all([
    getMemberDetail(ctx, memberId),
    getMemberOptions(ctx),
    canViewCompensation(ctx),
  ])
  if (!member) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={`Edit ${member.name}`}
        description="Profile details, skills, capacity and reporting line."
      />
      <MemberProfileForm
        member={member}
        managerOptions={managerOptions}
        canEditComp={canEditComp}
      />
    </div>
  )
}
