'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CircleDollarSign,
  FileSignature,
  FileText,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  ListChecks,
  Mail,
  PanelLeft,
  Receipt,
  ScrollText,
  Search,
  Settings,
  UserRound,
  Users,
  Video,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import type { WorkspaceRole } from '@aurexos/core'
import { cn } from '@aurexos/ui/lib/utils'
import { AurexGlyph } from '@aurexos/ui/components/ai/aurex-mark'
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
import type { ShellNotifications } from '../queries/get-notifications'
import { CommandPalette } from './command-palette'
import { CreateNewMenu } from './create-new-menu'
import { NotificationBell } from './notification-bell'
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
  notifications: ShellNotifications
  children: React.ReactNode
}

interface NavItem {
  label: string
  icon: LucideIcon
  /** Canonical route; absent for modules that ship in a later phase. */
  href?: string
  /** Accent-soft "New" identity badge (AI Assistant only). */
  isNew?: boolean
  /** Tooltip reason for disabled entries. */
  soonHint?: string
}

/**
 * Full module map in canonical order (Navigation.md §2.5). Routes that do
 * not exist yet render as non-link rows with a muted "Soon" caption — we
 * never ship dead routes.
 */
const MODULE_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'CRM', href: '/crm', icon: Handshake },
  { label: 'Clients', href: '/clients', icon: Building2 },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Tasks', href: '/tasks', icon: ListChecks },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Meetings', href: '/meetings', icon: Video },
  { label: 'Email center', href: '/email', icon: Mail },
  { label: 'Finance', href: '/finance', icon: CircleDollarSign },
  { label: 'Invoices', href: '/finance/invoices', icon: Receipt },
  { label: 'Proposals', href: '/proposals', icon: ScrollText },
  { label: 'Contracts', href: '/contracts', icon: FileSignature },
  { label: 'Team', href: '/team', icon: Users },
  { label: 'Documents', icon: FileText, soonHint: 'Documents are coming soon' },
  { label: 'Knowledge base', icon: BookOpen, soonHint: 'Knowledge base is coming soon' },
  { label: 'Automation', href: '/automations', icon: Workflow },
  { label: 'Analytics', icon: BarChart3, soonHint: 'Analytics is coming soon' },
]

/** Sidebar collapse preference, persisted per device (Navigation.md §2.2). */
const SIDEBAR_COLLAPSED_KEY = 'aurexos-sidebar-collapsed'

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppShell({ workspace, profile, role, notifications, children }: AppShellProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Default expanded; restore the persisted preference after mount so SSR
  // and hydration agree.
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, current ? '0' : '1')
      return !current
    })
  }

  // ⌘\ toggles the sidebar (Navigation.md §11 global shortcut map).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '\\' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleCollapsed()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Below md the sidebar always collapses to icons; ≥md the user can toggle.
  const labelClass = collapsed ? 'hidden' : 'hidden md:inline'

  const activeStyles =
    'bg-[hsl(var(--accent-soft))] text-[hsl(var(--accent-text))] before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-primary'
  const inactiveStyles =
    'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'

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
          {/* Product identity — the ✦ mark is the one permitted star glyph. */}
          <div className="flex h-14 items-center gap-2.5 px-3">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--accent-soft))]"
              style={{ color: 'hsl(var(--accent-text))' }}
              role="img"
              aria-label="AurexOS"
            >
              <AurexGlyph size={16} />
            </span>
            <span className={cn('min-w-0 flex-col', collapsed ? 'hidden' : 'hidden md:flex')}>
              <span className="truncate text-sm font-semibold text-foreground">AurexOS</span>
              <span className="truncate text-xs text-sidebar-foreground/60">
                AI operating system
              </span>
            </span>
          </div>
          <Separator className="bg-sidebar-border" />

          {/* Navigation */}
          <ScrollArea className="flex-1">
            <nav className="flex flex-col gap-0.5 p-2" aria-label="Primary">
              {MODULE_NAV.map((item) => {
                if (item.href) {
                  const active = isActive(pathname, item.href)
                  return (
                    <Tooltip key={item.label}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors',
                            active ? activeStyles : inactiveStyles,
                          )}
                        >
                          <item.icon className="size-5 shrink-0" aria-hidden="true" />
                          <span className={cn('truncate', labelClass)}>{item.label}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className={cn(!collapsed && 'md:hidden')}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                }
                return (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                      <div
                        aria-disabled="true"
                        tabIndex={0}
                        className="flex h-8 cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 text-sm text-sidebar-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <item.icon className="size-5 shrink-0" aria-hidden="true" />
                        <span className={cn('flex-1 truncate', labelClass)}>{item.label}</span>
                        <span
                          className={cn('text-xs text-sidebar-foreground/40', labelClass)}
                          aria-hidden="true"
                        >
                          Soon
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.soonHint}</TooltipContent>
                  </Tooltip>
                )
              })}

              {/* AI Assistant — a system surface, pinned after the modules
                  (Navigation.md §2.1). Phase 3; disabled until Aurex ships. */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    aria-disabled="true"
                    tabIndex={0}
                    className="mt-2 flex h-8 cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 text-sm text-sidebar-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className="flex size-5 shrink-0 items-center justify-center"
                      style={{ color: 'hsl(var(--accent-text))' }}
                      aria-hidden="true"
                    >
                      <AurexGlyph size={16} />
                    </span>
                    <span className={cn('flex-1 truncate', labelClass)}>AI assistant</span>
                    <Badge variant="accent-soft" className={cn('px-1.5 py-0', labelClass)}>
                      New
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">Aurex arrives in Phase 3</TooltipContent>
              </Tooltip>
            </nav>
          </ScrollArea>

          {/* Bottom: settings + workspace card */}
          <div className="flex flex-col gap-1 p-2">
            <Separator className="mb-1 bg-sidebar-border" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings/profile"
                  aria-current={isActive(pathname, '/settings/profile') ? 'page' : undefined}
                  className={cn(
                    'relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors',
                    isActive(pathname, '/settings/profile') ? activeStyles : inactiveStyles,
                  )}
                >
                  <UserRound className="size-5 shrink-0" aria-hidden="true" />
                  <span className={cn('truncate', labelClass)}>Profile</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className={cn(!collapsed && 'md:hidden')}>
                Profile
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  aria-current={
                    isActive(pathname, '/settings') && !isActive(pathname, '/settings/profile')
                      ? 'page'
                      : undefined
                  }
                  className={cn(
                    'relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors',
                    isActive(pathname, '/settings') && !isActive(pathname, '/settings/profile')
                      ? activeStyles
                      : inactiveStyles,
                  )}
                >
                  <Settings className="size-5 shrink-0" aria-hidden="true" />
                  <span className={cn('truncate', labelClass)}>Settings</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className={cn(!collapsed && 'md:hidden')}>
                Settings
              </TooltipContent>
            </Tooltip>

            {/* Workspace card — name + settings link only. Billing/usage
                meters arrive with plans in Phase 5; nothing fake here. */}
            <div
              className={cn(
                'flex items-center gap-2.5 rounded-md border border-sidebar-border p-2',
                collapsed && 'justify-center border-transparent p-1',
              )}
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
                aria-hidden="true"
              >
                {workspace.name.charAt(0).toUpperCase() || 'A'}
              </span>
              <span className={cn('min-w-0 flex-col', collapsed ? 'hidden' : 'hidden md:flex')}>
                <span className="truncate text-sm font-medium text-foreground">
                  {workspace.name}
                </span>
                <Link
                  href="/settings"
                  className="truncate text-xs text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
                >
                  Workspace settings
                </Link>
              </span>
            </div>
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
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <PanelLeft className="size-4" aria-hidden="true" />
            </Button>

            {/* Palette trigger styled as search — never an inline field
                (Navigation.md §2.1). */}
            <div className="flex min-w-0 flex-1 justify-center px-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full max-w-md justify-start gap-2 text-muted-foreground"
                onClick={() => setPaletteOpen(true)}
              >
                <Search className="size-4" aria-hidden="true" />
                <span className="hidden truncate sm:inline">Search anything…</span>
                <Kbd className="ml-auto hidden sm:inline-flex">⌘K</Kbd>
              </Button>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <CreateNewMenu />
              <NotificationBell notifications={notifications} />
              <UserMenu profile={profile} role={role} placement="topbar" />
            </div>
          </header>

          {/* Main — scrolls independently of the sidebar */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-6">{children}</div>
          </main>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </TooltipProvider>
  )
}
