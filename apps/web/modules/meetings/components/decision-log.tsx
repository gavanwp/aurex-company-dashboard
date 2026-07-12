'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, CheckCircle2, Search, ScrollText } from 'lucide-react'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { Input } from '@aurexos/ui/components/input'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { formatDay } from '../lib/format'
import type { DecisionRow } from '../types'

export interface DecisionLogProps {
  decisions: DecisionRow[]
  query: string
}

/**
 * The workspace-wide decision register — "what did we decide about X". Searchable
 * by statement, context or attribution; every entry links back to its meeting.
 */
export function DecisionLog({ decisions, query }: DecisionLogProps) {
  const router = useRouter()
  const [value, setValue] = React.useState(query)

  function submit(next: string) {
    const q = next.trim()
    router.replace(q ? `/meetings/decisions?q=${encodeURIComponent(q)}` : '/meetings/decisions', {
      scroll: false,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Decision log"
        description="Every decision your team has made, searchable in one place."
      />

      <form
        className="relative sm:max-w-md"
        onSubmit={(e) => {
          e.preventDefault()
          submit(value)
        }}
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search decisions…"
          className="pl-8"
          aria-label="Search decisions"
        />
      </form>

      {decisions.length === 0 ? (
        <EmptyState
          icon={query ? Search : ScrollText}
          title={query ? 'No matching decisions' : 'No decisions recorded yet'}
          description={
            query
              ? 'Try a different search term.'
              : 'Decisions you record during meetings show up here, searchable forever.'
          }
        />
      ) : (
        <div className="space-y-2">
          {decisions.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[hsl(var(--success-text))]" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm text-foreground">{d.statement}</p>
                    {d.context ? (
                      <p className="text-sm text-muted-foreground">{d.context}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-muted-foreground">
                      {d.decidedBy ? <span>Decided by {d.decidedBy}</span> : null}
                      <span>{formatDay(d.createdAt)}</span>
                      <Link
                        href={`/meetings/${d.meetingId}`}
                        className="inline-flex items-center gap-0.5 text-foreground hover:underline"
                      >
                        {d.meetingTitle ?? 'Meeting'}
                        <ArrowUpRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
