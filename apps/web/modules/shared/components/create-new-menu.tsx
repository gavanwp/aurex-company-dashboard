'use client'

import { useRouter } from 'next/navigation'
import { Building2, ChevronDown, FolderKanban, Handshake, ListChecks, Plus } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@aurexos/ui/components/dropdown-menu'

/**
 * Top-bar primary action: one solid-accent button per view
 * (Navigation.md §4). Each item routes to the module page that owns the
 * existing create dialog — creation stays with its module, the menu is a
 * router, not a bypass.
 */
const CREATE_TARGETS = [
  { label: 'New task', href: '/tasks', icon: ListChecks },
  { label: 'New project', href: '/projects', icon: FolderKanban },
  { label: 'New client', href: '/clients', icon: Building2 },
  { label: 'New deal', href: '/crm', icon: Handshake },
] as const

export function CreateNewMenu() {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Create new</span>
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {CREATE_TARGETS.map((target) => (
          <DropdownMenuItem key={target.href} onSelect={() => router.push(target.href)}>
            <target.icon className="mr-2 size-4" aria-hidden="true" />
            {target.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
