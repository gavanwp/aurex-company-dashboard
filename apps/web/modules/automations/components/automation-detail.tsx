import Link from 'next/link'
import { ArrowLeft, CheckCheck, Clock, Pencil, Zap } from 'lucide-react'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { triggerDef } from '../constants'
import {
  runStatusLabel,
  runStatusVariant,
  statusLabel,
  statusVariant,
  timeAgo,
} from '../lib/format'
import { StatusControls } from './status-controls'
import type { AutomationDetail, RunRow } from '../types'

export interface AutomationDetailViewProps {
  automation: AutomationDetail
  runs: RunRow[]
  canManage: boolean
  nowMs: number
}

export function AutomationDetailView({
  automation,
  runs,
  canManage,
  nowMs,
}: AutomationDetailViewProps) {
  const module = triggerDef(automation.triggerEventType)?.module

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link href="/automations">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Automations
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--accent-soft))]"
            style={{ color: 'hsl(var(--accent-text))' }}
            aria-hidden="true"
          >
            <Zap className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {automation.name}
              </h1>
              <Badge variant={statusVariant(automation.status)}>
                {statusLabel(automation.status)}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              When {automation.triggerLabel.toLowerCase()}
              {module ? ` · ${module}` : ''}
              {automation.ownerName ? ` · owned by ${automation.ownerName}` : ''}
            </p>
          </div>
        </div>
        {canManage ? (
          <div className="flex shrink-0 items-center gap-2">
            <StatusControls
              id={automation.id}
              status={automation.status}
              hasActions={automation.actions.length > 0}
            />
            <Button asChild size="sm" variant="outline">
              <Link href={`/automations/${automation.id}/edit`}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recipe (trigger → actions) */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="space-y-5 p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  When
                </p>
                <div className="mt-2 flex items-center gap-2.5 rounded-md border p-3">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--info-soft))]"
                    style={{ color: 'hsl(var(--info-text))' }}
                    aria-hidden="true"
                  >
                    <Clock className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{automation.triggerLabel}</p>
                    {automation.triggerHint ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {automation.triggerHint}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Then
                </p>
                {automation.actions.length === 0 ? (
                  <p className="mt-2 rounded-md border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">
                    No actions yet — edit to add some.
                  </p>
                ) : (
                  <ol className="mt-2 space-y-2">
                    {automation.actions.map((a, i) => (
                      <li
                        key={`${a.actionKey}-${i}`}
                        className="flex items-center gap-2.5 rounded-md border p-3"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{a.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{a.description}</p>
                        </div>
                        {a.requiresApproval ? (
                          <Badge variant="warning-soft" className="shrink-0">
                            needs approval
                          </Badge>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Run history + policy */}
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="text-sm font-semibold text-foreground">Run history</h2>
              {runs.length === 0 ? (
                <div className="rounded-md border border-dashed px-3 py-6 text-center">
                  <CheckCheck
                    className="mx-auto mb-1.5 size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="text-xs text-muted-foreground">
                    {automation.status === 'active'
                      ? 'Waiting for its trigger to fire.'
                      : 'Activate to start running on events.'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {runs.map((run) => (
                    <li
                      key={run.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <Badge variant={runStatusVariant(run.status)}>
                          {runStatusLabel(run.status)}
                        </Badge>
                        {run.error ? (
                          <p className="mt-1 truncate text-xs text-[hsl(var(--destructive-text))]">
                            {run.error}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(run.startedAt, nowMs)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-5 text-sm">
              <h2 className="text-sm font-semibold text-foreground">On failure</h2>
              <p className="text-muted-foreground">
                Retries {automation.errorPolicy.retryCount}×, circuit-breaks after{' '}
                {automation.errorPolicy.circuitBreakAfter} consecutive failures.
              </p>
              <p className="text-muted-foreground">
                {automation.errorPolicy.notifyOwner
                  ? 'Owner is notified on failure.'
                  : 'No failure notifications.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
