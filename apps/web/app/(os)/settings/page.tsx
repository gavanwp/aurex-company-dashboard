import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ChevronRight,
  KeyRound,
  MonitorSmartphone,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '@aurexos/ui/components/card'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { canManageApiKeys, canViewAccess, canViewSecurityCenter } from '@/modules/access'
import { SecuritySettings, WorkspaceSettings } from '@/modules/settings'

export const metadata: Metadata = { title: 'Settings' }

function SettingLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <Link href={href} className="block">
      <Card interactive className="flex items-center gap-3 p-4">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-soft))]"
          style={{ color: 'hsl(var(--accent-text))' }}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Card>
    </Link>
  )
}

export default async function SettingsPage() {
  const ctx = await getWorkspaceContext()
  const [showAccess, showApiKeys, showSecurity] = await Promise.all([
    canViewAccess(ctx),
    canManageApiKeys(ctx),
    canViewSecurityCenter(ctx),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Workspace, members, and security." />
      <WorkspaceSettings ctx={ctx} />
      <div className="space-y-3">
        <SettingLink
          href="/settings/profile"
          icon={UserRound}
          title="Profile"
          description="Your personal details, preferences, and activity"
        />
        {showAccess ? (
          <SettingLink
            href="/settings/people"
            icon={Users}
            title="People & access"
            description="Members, roles, and invitations"
          />
        ) : null}
        {showSecurity ? (
          <SettingLink
            href="/settings/security"
            icon={ShieldCheck}
            title="Security Center"
            description="MFA coverage, elevated access, and risk signals"
          />
        ) : null}
        <SettingLink
          href="/settings/sessions"
          icon={MonitorSmartphone}
          title="Sessions & security"
          description="Two-factor auth, sessions, and sign-in activity"
        />
        {showApiKeys ? (
          <SettingLink
            href="/settings/api-keys"
            icon={KeyRound}
            title="API keys"
            description="Programmatic access to the AurexOS API"
          />
        ) : null}
      </div>
      <SecuritySettings email={ctx.profile.email} />
    </div>
  )
}
