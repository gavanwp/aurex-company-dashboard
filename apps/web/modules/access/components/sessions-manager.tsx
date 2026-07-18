'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Monitor, ShieldX } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { revokeSession, signOutEverywhere } from '../actions/session-actions'
import type { LoginEventRow, SessionRow } from '../queries/get-sessions'

function timeAgo(iso: string, nowMs: number): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return '—'
  const s = Math.max(0, Math.round((nowMs - then) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

/** Coarse device label from a user-agent string. */
function deviceLabel(ua: string | null): string {
  if (!ua) return 'Unknown device'
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad|iOS/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Device'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser'
  return `${browser} on ${os}`
}

const EVENT_LABELS: Record<string, string> = {
  login: 'Signed in',
  logout: 'Signed out',
  mfa_challenge: 'MFA challenge',
  mfa_enrolled: 'MFA enrolled',
  failure: 'Failed sign-in',
  password_reset: 'Password reset',
  token_refresh: 'Session refreshed',
}

function SessionItem({ session, nowMs }: { session: SessionRow; nowMs: number }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const revoke = () => {
    startTransition(async () => {
      const result = await revokeSession({ id: session.id })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Session revoked')
      router.refresh()
    })
  }
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Monitor className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {deviceLabel(session.userAgent)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {session.ip ? `${session.ip} · ` : ''}active {timeAgo(session.lastActiveAt, nowMs)}
          </p>
        </div>
      </div>
      <Button size="sm" variant="ghost" onClick={revoke} disabled={isPending}>
        Revoke
      </Button>
    </div>
  )
}

export interface SessionsManagerProps {
  sessions: SessionRow[]
  history: LoginEventRow[]
  nowMs: number
}

export function SessionsManager({ sessions, history, nowMs }: SessionsManagerProps) {
  const [isPending, startTransition] = React.useTransition()
  const signOutAll = () => {
    startTransition(async () => {
      await signOutEverywhere()
    })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Active sessions
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {sessions.length}
            </span>
          </h2>
          <Button size="sm" variant="outline" onClick={signOutAll} disabled={isPending}>
            <LogOut className="mr-1.5 h-4 w-4" />
            Sign out everywhere
          </Button>
        </div>
        {sessions.length === 0 ? (
          <EmptyState
            icon={ShieldX}
            title="No recorded sessions"
            description="Sessions are recorded on sign-in. Sign out and back in to see this device here."
          />
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {sessions.map((s) => (
                <SessionItem key={s.id} session={s} nowMs={nowMs} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {history.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Recent sign-in activity</h2>
          <Card>
            <CardContent className="divide-y p-0">
              {history.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-foreground">{EVENT_LABELS[e.type] ?? e.type}</span>
                    {!e.success ? <Badge variant="destructive-soft">Failed</Badge> : null}
                    {e.method ? (
                      <span className="text-xs text-muted-foreground">· {e.method}</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(e.createdAt, nowMs)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
