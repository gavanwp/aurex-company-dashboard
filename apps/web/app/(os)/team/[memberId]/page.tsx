import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { canManageTeam, canViewTeam, getMemberDetail, MemberDetailView } from '@/modules/team'

export const metadata: Metadata = { title: 'Team member' }

export default async function MemberPage({ params }: { params: Promise<{ memberId: string }> }) {
  const [{ memberId }, ctx] = await Promise.all([params, getWorkspaceContext()])
  if (!canViewTeam(ctx.role)) notFound()

  const member = await getMemberDetail(ctx, memberId)
  if (!member) notFound()

  const todayISO = new Date().toISOString().slice(0, 10)

  return (
    <MemberDetailView member={member} canManage={canManageTeam(ctx.role)} todayISO={todayISO} />
  )
}
