'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Plus, Search, Workflow, Zap } from 'lucide-react'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card } from '@aurexos/ui/components/card'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { Input } from '@aurexos/ui/components/input'
import { Tabs, TabsList, TabsTrigger } from '@aurexos/ui/components/tabs'
import {
  runStatusLabel,
  runStatusVariant,
  statusLabel,
  statusVariant,
  timeAgo,
} from '../lib/format'
import {
  AUTOMATION_STATUS_TABS,
  isAutomationStatusTab,
  type AutomationListRow,
  type AutomationStatusTab,
} from '../types'

const TAB_LABELS: Record<AutomationStatusTab, string> = {
  all: 'All',
  active: 'Active',
  paused: 'Paused',
  draft: 'Draft',
}

export interface AutomationsListProps {
  automations: AutomationListRow[]
  statusTab: AutomationStatusTab
  search: string
  canManage: boolean
  nowMs: number
}

export function AutomationsList({
  automations,
  statusTab,
  search,
  canManage,
  nowMs,
}: AutomationsListProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = React.useState(search)

  function navigate(tab: AutomationStatusTab, nextSearch: string) {
    const params = new URLSearchParams()
    if (tab !== 'all') params.set('status', tab)
    if (nextSearch.trim()) params.set('search', nextSearch.trim())
    const qs = params.toString()
    router.replace(qs ? `/automations?${qs}` : '/automations', { scroll: false })
  }

  const filtered = !!search || statusTab !== 'all'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={statusTab}
          onValueChange={(v) => navigate(isAutomationStatusTab(v) ? v : 'all', searchValue)}
        >
          <TabsList>
            {AUTOMATION_STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {TAB_LABELS[tab]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <form
            className="relative sm:w-56"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(statusTab, searchValue)
            }}
          >
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search automations…"
              className="pl-8"
              aria-label="Search automations"
            />
          </form>
          {canManage ? (
            <Button asChild size="sm">
              <Link href="/automations/new">
                <Plus className="mr-1.5 h-4 w-4" />
                New
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {automations.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title={filtered ? 'No matching automations' : 'No automations yet'}
          description={
            filtered
              ? 'Try a different status or search term.'
              : 'Automate the busywork: pick a trigger event, add actions, and let it run. Ask Aurex above to draft one for you.'
          }
          action={
            canManage && !filtered ? (
              <Button asChild size="sm">
                <Link href="/automations/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  New automation
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="aurex-reveal space-y-2.5">
          {automations.map((a) => (
            <Link key={a.id} href={`/automations/${a.id}`} className="group block">
              <Card interactive className="flex items-center gap-4 p-4">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-soft))]"
                  style={{ color: 'hsl(var(--accent-text))' }}
                  aria-hidden="true"
                >
                  <Zap className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-foreground">{a.name}</p>
                    <Badge variant={statusVariant(a.status)}>{statusLabel(a.status)}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    When {a.triggerLabel.toLowerCase()} · {a.actionCount}{' '}
                    {a.actionCount === 1 ? 'action' : 'actions'}
                    {a.ownerName ? ` · ${a.ownerName}` : ''}
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-3 sm:flex">
                  {a.lastRunStatus ? (
                    <Badge variant={runStatusVariant(a.lastRunStatus)}>
                      {runStatusLabel(a.lastRunStatus)}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">no runs</span>
                  )}
                  <span className="w-16 text-right text-xs text-muted-foreground">
                    {timeAgo(a.lastRunAt, nowMs)}
                  </span>
                  <ArrowRight
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
