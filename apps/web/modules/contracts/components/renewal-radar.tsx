'use client'

import Link from 'next/link'
import { CalendarClock, CheckCircle2, FileClock, RefreshCw, Wallet } from 'lucide-react'
import { formatMoney } from '@aurexos/core'
import { Badge } from '@aurexos/ui/components/badge'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { cn } from '@aurexos/ui/lib/utils'
import type { RenewalRadar, RenewalRadarItem } from '../types'

function countdownLabel(days: number | null): string {
  if (days === null) return 'No term'
  if (days === 0) return 'Ends today'
  if (days === 1) return 'Ends tomorrow'
  return `${days} days left`
}

/** Urgency tint for a countdown — the closer the term, the warmer the emphasis. */
function countdownTone(days: number | null): string {
  if (days === null) return 'text-muted-foreground'
  if (days <= 30) return 'text-[hsl(var(--warning-text))]'
  return 'text-muted-foreground'
}

function RadarRow({ item }: { item: RenewalRadarItem }) {
  return (
    <Link
      href={`/contracts/${item.id}`}
      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 transition-colors hover:bg-accent/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.clientName ?? 'No client'}
          {item.autoRenew ? ' · auto-renews' : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            'text-xs font-semibold [font-variant-numeric:tabular-nums]',
            countdownTone(item.daysToEnd),
          )}
        >
          {countdownLabel(item.daysToEnd)}
        </p>
        {item.valueMinor != null ? (
          <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
            {formatMoney(item.valueMinor, item.currency)}
          </p>
        ) : null}
      </div>
    </Link>
  )
}

function RadarSection({
  icon: Icon,
  title,
  hint,
  items,
  emptyLabel,
  accent,
}: {
  icon: typeof CalendarClock
  title: string
  hint?: string
  items: RenewalRadarItem[]
  emptyLabel: string
  accent?: boolean
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              'size-4',
              accent ? 'text-[hsl(var(--warning-text))]' : 'text-muted-foreground',
            )}
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {items.length > 0 ? (
            <Badge variant="secondary" className="ml-auto [font-variant-numeric:tabular-nums]">
              {items.length}
            </Badge>
          ) : null}
        </div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <RadarRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export interface RenewalRadarPanelProps {
  radar: RenewalRadar
}

export function RenewalRadarPanel({ radar }: RenewalRadarPanelProps) {
  const expiringSoon = [...radar.expiring30, ...radar.expiring60, ...radar.expiring90]
  const hasAnything =
    expiringSoon.length > 0 || radar.upForRenewal.length > 0 || radar.recentlySigned.length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileClock className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">Renewal radar</h2>
      </div>

      {/* Headline tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Active contracts
            </div>
            <p className="mt-1 text-2xl font-semibold [font-variant-numeric:tabular-nums]">
              {radar.activeCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wallet className="size-3.5" aria-hidden="true" />
              Active value
            </div>
            <p className="mt-1 text-2xl font-semibold [font-variant-numeric:tabular-nums]">
              {formatMoney(radar.activeValueMinor, radar.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              Expiring in 90 days
            </div>
            <p className="mt-1 text-2xl font-semibold [font-variant-numeric:tabular-nums]">
              {expiringSoon.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Up for renewal
            </div>
            <p className="mt-1 text-2xl font-semibold [font-variant-numeric:tabular-nums]">
              {radar.upForRenewal.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {hasAnything ? (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <RadarSection
            icon={CalendarClock}
            title="Expiring soon"
            hint="Signed and active contracts approaching their end date."
            items={expiringSoon}
            emptyLabel="Nothing ending in the next 90 days."
            accent
          />
          <RadarSection
            icon={RefreshCw}
            title="Up for renewal"
            hint="Auto-renewing contracts with a decision coming up."
            items={radar.upForRenewal}
            emptyLabel="No renewals pending."
          />
          <RadarSection
            icon={CheckCircle2}
            title="Recently signed"
            hint="Signed in the last 30 days."
            items={radar.recentlySigned}
            emptyLabel="No recent signatures."
          />
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
            <FileClock className="size-4 shrink-0" aria-hidden="true" />
            The radar is clear — no contracts are expiring, up for renewal, or recently signed.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
