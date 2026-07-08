'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Building2,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@aurexos/ui/components/command'
import { logout } from '@/modules/shared/actions/auth'

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const NAVIGATION = [
  { label: 'Go to Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Go to Projects', href: '/projects', icon: FolderKanban },
  { label: 'Go to Tasks', href: '/tasks', icon: ListChecks },
  { label: 'Go to CRM', href: '/crm', icon: Handshake },
  { label: 'Go to Clients', href: '/clients', icon: Building2 },
  { label: 'Go to Settings', href: '/settings', icon: Settings },
] as const

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [, startTransition] = useTransition()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  const run = (command: () => void) => {
    onOpenChange(false)
    command()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {NAVIGATION.map((item) => (
            <CommandItem key={item.href} onSelect={() => run(() => router.push(item.href))}>
              <item.icon className="mr-2 size-4" aria-hidden="true" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => run(() => setTheme('light'))}>
            <Sun className="mr-2 size-4" aria-hidden="true" />
            Light
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme('dark'))}>
            <Moon className="mr-2 size-4" aria-hidden="true" />
            Dark
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme('system'))}>
            <Monitor className="mr-2 size-4" aria-hidden="true" />
            System
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading="Account">
          <CommandItem
            onSelect={() =>
              run(() =>
                startTransition(async () => {
                  await logout()
                }),
              )
            }
          >
            <LogOut className="mr-2 size-4" aria-hidden="true" />
            Log out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
