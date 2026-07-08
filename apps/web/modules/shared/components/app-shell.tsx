'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CircleDollarSign,
  FileText,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  ListChecks,
  Mail,
  PanelLeft,
  Search,
  Settings,
  Sparkles,
  Video,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import type { WorkspaceRole } from '@aurexos/core'
import { cn } from '@aurexos/ui/lib/utils'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Kbd } from '@aurexos/ui/components/kbd'
import { ScrollArea } from '@aurexos/ui/components/scroll-area'
import { Separator } from '@aurexos/ui/components/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@aurexos/ui/components/tooltip'
import { CommandPalette } from './command-palette'
import { UserMenu, type UserMenuProfile } from './user-menu'

export interface AppShellWorkspace {
  id: string
  name: string
  logoUrl: string | null
}

export interface AppShellProps {
  workspace: AppShellWorkspace
  profile: UserMenuProfile
  role: WorkspaceRole
  children: React.ReactNode
}

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Tasks', href: '/tasks', icon: ListChecks },
  { label: 'CRM', href: '/crm', icon: Handshake },
  { label: 'Clients', href: '/clients', icon: Building2 },
]

const COMING_SOON_NAV: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'Calendar', icon: Calendar },
  { label: 'Meetings', icon: Video },
  { label: 'Email', icon: Mail },
  { label: 'Finance', icon: CircleDollarSign },
  { label: 'Documents', icon: FileText },
  { label: 'Knowledge Base', icon: BookOpen },
  { label: 'Automations', icon: Workflow },
  { label: 'Analytics', icon: BarChart3 },
]

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function pageTitleFor(pathname: string): string {
  const match = [...MAIN_NAV, { label: 'Settings', href: '/settings', icon: Settings }].find(
    (item) => isActive(pathname, item.href),
  )
  return match?.label ?? 'AurexOS'
}

export function AppShell({ workspace, profile, role, children }: AppShellProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Below md the sidebar always collapses to icons; ≥md the user can toggle.
  const labelClass = collapsed ? 'hidden' : 'hidden md:inline'

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-svh w-full overflow-hidden bg-background text-foreground">
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside
          className={cn(
            'flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
            collapsed ? 'w-16' : 'w-16 md:w-60',
          )}
        >
          {/* Workspace identity */}
          <div className="flex h-14 items-center gap-2.5 px-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              {workspace.name.charAt(0).toUpperCase() || 'A'}
            </div>
            <span className={cn('truncate text-sm font-semibold', labelClass)}>
              {workspace.name}
            </span>
          </div>
          <Separator className="bg-sidebar-border" />

          {/* Navigation */}
          <ScrollArea className="flex-1">
            <nav className="flex flex-col gap-1 p-2" aria-label="Main">
              {MAIN_NAV.map((item) => {
                const active = isActive(pathname, item.href)
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors',
                          active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                        )}
                      >
                        <item.icon className="size-4 shrink-0" aria-hidden="true" />
                        <span className={cn('truncate', labelClass)}>{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className={cn(!collapsed && 'md:hidden')}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              })}

              <div
                className={cn(
                  'mt-4 px-2.5 pb-1 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50',
                  labelClass === 'hidden' ? 'hidden' : 'hidden md:block',
                )}
              >
                Coming soon
              </div>
              {COMING_SOON_NAV.map((item) => (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <div
                      aria-disabled="true"
                      className="flex h-9 cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 text-sm text-sidebar-foreground/40"
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className={cn('flex-1 truncate', labelClass)}>{item.label}</span>
                      <Badge
                        variant="outline"
                        className={cn('border-sidebar-border text-[10px] text-sidebar-foreground/50', labelClass)}
                      >
                        Soon
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label} — coming soon</TooltipContent>
                </Tooltip>
              ))}
            </nav>
          </ScrollArea>

          {/* Bottom: settings + user */}
          <div className="flex flex-col gap-1 p-2">
            <Separator className="mb-1 bg-sidebar-border" />
            <Link
              href="/settings"
              aria-current={isActive(pathname, '/settings') ? 'page' : undefined}
              className={cn(
                'flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors',
                isActive(pathname, '/settings')
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              )}
            >
              <Settings className="size-4 shrink-0" aria-hidden="true" />
              <span className={cn('truncate', labelClass)}>Settings</span>
            </Link>
            <UserMenu profile={profile} role={role} hideDetails={collapsed} />
          </div>
        </aside>

        {/* ── Content area ────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <PanelLeft className="size-4" aria-hidden="true" />
            </Button>

            <div className="flex min-w-0 items-center gap-1.5 text-sm">
              <span className="hidden truncate text-muted-foreground sm:inline">
                {workspace.name}
              </span>
              <span className="hidden text-muted-foreground sm:inline">/</span>
              <span className="truncate font-medium">{pageTitleFor(pathname)}</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={() => setPaletteOpen(true)}
              >
                <Search className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Search…</span>
                <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  {/* span wrapper: disabled buttons don't fire tooltip events */}
                  <span tabIndex={0}>
                    <Button variant="secondary" size="sm" className="gap-2" disabled>
                      <Sparkles className="size-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Ask Aurex</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Coming in Phase 3</TooltipContent>
              </Tooltip>
            </div>
          </header>

          {/* Main — scrolls independently of the sidebar */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">{children}</div>
          </main>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </TooltipProvider>
  )
}
