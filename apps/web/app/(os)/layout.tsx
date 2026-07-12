import { getWorkspaceContext } from '@/lib/workspace-context'
import { AppShell } from '@/modules/shared'
import { getShellNotifications } from '@/modules/shared/server'

export default async function OsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getWorkspaceContext()
  const notifications = await getShellNotifications(ctx)

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
      notifications={notifications}
    >
      {children}
    </AppShell>
  )
}
