import { getWorkspaceContext } from '@/lib/workspace-context'
import { AppShell } from '@/modules/shared'

export default async function OsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getWorkspaceContext()

  return (
    <AppShell
      workspace={{
        id: ctx.workspace.id,
        name: ctx.workspace.name,
        logoUrl: ctx.workspace.logo_url,
      }}
      profile={{
        fullName: ctx.profile.full_name,
        email: ctx.profile.email,
        avatarUrl: ctx.profile.avatar_url,
      }}
      role={ctx.role}
    >
      {children}
    </AppShell>
  )
}
