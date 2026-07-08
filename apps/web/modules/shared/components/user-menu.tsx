'use client'

import { useTransition } from 'react'
import { useTheme } from 'next-themes'
import { ChevronsUpDown, LogOut, Monitor, Moon, Sun, SunMoon } from 'lucide-react'
import { initialsOf, type WorkspaceRole } from '@aurexos/core'
import { cn } from '@aurexos/ui/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@aurexos/ui/components/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@aurexos/ui/components/dropdown-menu'
import { logout } from '@/modules/shared/actions/auth'

export interface UserMenuProfile {
  fullName: string | null
  email: string
  avatarUrl: string | null
}

export interface UserMenuProps {
  profile: UserMenuProfile
  role: WorkspaceRole
  /** Icon-only mode for the collapsed sidebar. */
  hideDetails?: boolean
}

export function UserMenu({ profile, role, hideDetails = false }: UserMenuProps) {
  const { theme, setTheme } = useTheme()
  const [isPending, startTransition] = useTransition()
  const displayName = profile.fullName ?? profile.email
  const detailClass = hideDetails ? 'hidden' : 'hidden md:flex'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-11 w-full items-center gap-2.5 rounded-md px-1.5 text-left text-sm outline-none transition-colors hover:bg-sidebar-accent/50 focus-visible:bg-sidebar-accent/50"
        aria-label="Account menu"
      >
        <Avatar className="size-7 shrink-0">
          {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={displayName} />}
          <AvatarFallback className="text-xs">{initialsOf(displayName)}</AvatarFallback>
        </Avatar>
        <span className={cn('min-w-0 flex-1 flex-col', detailClass)}>
          <span className="truncate text-sm font-medium leading-tight">{displayName}</span>
          <span className="truncate text-xs text-sidebar-foreground/60">{profile.email}</span>
        </span>
        <ChevronsUpDown
          className={cn('size-4 shrink-0 text-sidebar-foreground/50', detailClass)}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium">{displayName}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {profile.email} · {role.replace(/_/g, ' ')}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <SunMoon className="mr-2 size-4" aria-hidden="true" />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                <DropdownMenuRadioItem value="light">
                  <Sun className="mr-2 size-4" aria-hidden="true" />
                  Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Moon className="mr-2 size-4" aria-hidden="true" />
                  Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <Monitor className="mr-2 size-4" aria-hidden="true" />
                  System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={isPending}
          onSelect={(event) => {
            event.preventDefault()
            startTransition(async () => {
              await logout()
            })
          }}
        >
          <LogOut className="mr-2 size-4" aria-hidden="true" />
          {isPending ? 'Signing out…' : 'Log out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
