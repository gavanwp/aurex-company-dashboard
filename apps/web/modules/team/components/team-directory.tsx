'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users } from 'lucide-react'
import type { MemberSpecialization } from '@aurexos/core'
import { MEMBER_SPECIALIZATIONS } from '@aurexos/core'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { Input } from '@aurexos/ui/components/input'
import { Tabs, TabsList, TabsTrigger } from '@aurexos/ui/components/tabs'
import { specializationLabel } from '../lib/hr'
import type { DirectoryMember } from '../types'
import { MemberCard } from './member-card'

const SPEC_ALL = 'all'

export interface TeamDirectoryProps {
  members: DirectoryMember[]
  specialization: string
  search: string
}

export function TeamDirectory({ members, specialization, search }: TeamDirectoryProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = React.useState(search)

  function navigate(spec: string, nextSearch: string) {
    const params = new URLSearchParams()
    if (spec !== SPEC_ALL) params.set('specialization', spec)
    if (nextSearch.trim()) params.set('search', nextSearch.trim())
    const qs = params.toString()
    router.replace(qs ? `/team?${qs}` : '/team', { scroll: false })
  }

  const filtered = !!search || specialization !== SPEC_ALL

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={specialization} onValueChange={(value) => navigate(value, searchValue)}>
          <TabsList className="flex-wrap">
            <TabsTrigger value={SPEC_ALL}>Everyone</TabsTrigger>
            {MEMBER_SPECIALIZATIONS.map((spec: MemberSpecialization) => (
              <TabsTrigger key={spec} value={spec}>
                {specializationLabel(spec)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <form
          className="relative lg:w-64"
          onSubmit={(e) => {
            e.preventDefault()
            navigate(specialization, searchValue)
          }}
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search name, role or skill…"
            className="pl-8"
            aria-label="Search the team"
          />
        </form>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filtered ? 'No matching people' : 'No one here yet'}
          description={
            filtered
              ? 'Try a different specialization or search term.'
              : 'Invite teammates from Settings, then build out their profiles here.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {members.map((member) => (
            <MemberCard key={member.userId} member={member} />
          ))}
        </div>
      )}
    </div>
  )
}
