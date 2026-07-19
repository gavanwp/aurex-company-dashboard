'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  CheckSquare,
  Clock,
  FolderGit2,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Sun,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { initialsOf, TIMEZONE_OPTIONS } from '@aurexos/core'
import { Avatar, AvatarFallback, AvatarImage } from '@aurexos/ui/components/avatar'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import { Separator } from '@aurexos/ui/components/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { updateProfile } from '../actions/profile-actions'
import type { ProfileOverview } from '../queries/get-profile'

const STAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  projects: FolderGit2,
  tasks: CheckSquare,
  team: Users,
}

function formatDate(iso: string): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(ms)
}

function relativeTime(iso: string): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const diff = Date.now() - ms
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

function StatTile({ label, value, statKey }: { label: string; value: number; statKey: string }) {
  const Icon = STAT_ICONS[statKey] ?? FolderGit2
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <span className="text-3xl font-semibold tracking-tight [font-variant-numeric:tabular-nums]">
          {value}
        </span>
      </CardContent>
    </Card>
  )
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

function ThemeControl() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const active = mounted ? (theme ?? 'system') : undefined

  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1"
      role="group"
      aria-label="Interface theme"
    >
      {THEME_OPTIONS.map((opt) => {
        const Icon = opt.icon
        const isActive = active === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function ProfilePage({ profile }: { profile: ProfileOverview }) {
  const router = useRouter()
  const [fullName, setFullName] = React.useState(profile.fullName)
  const [title, setTitle] = React.useState(profile.title ?? '')
  const [timezone, setTimezone] = React.useState(profile.timezone ?? '')
  const [location, setLocation] = React.useState(profile.location ?? '')
  const [isPending, startTransition] = React.useTransition()

  const dirty =
    fullName !== profile.fullName ||
    title !== (profile.title ?? '') ||
    timezone !== (profile.timezone ?? '') ||
    location !== (profile.location ?? '')

  const save = () => {
    if (!fullName.trim()) {
      toast.error('Your name is required')
      return
    }
    startTransition(async () => {
      const result = await updateProfile({
        fullName: fullName.trim(),
        title: title.trim() || undefined,
        timezone: timezone || undefined,
        location: location.trim() || undefined,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Profile saved')
      router.refresh()
    })
  }

  const tzLabel = TIMEZONE_OPTIONS.find((t) => t.value === profile.timezone)?.label

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Main column */}
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
            <Avatar className="size-16 rounded-2xl">
              {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt="" /> : null}
              <AvatarFallback className="rounded-2xl text-lg">
                {initialsOf(profile.fullName) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {profile.fullName}
                </h2>
                <Badge variant="accent-soft">{profile.roleName}</Badge>
              </div>
              {profile.title ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{profile.title}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" aria-hidden="true" />
                  {profile.email}
                </span>
                {profile.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {profile.location}
                    {tzLabel ? ` · ${tzLabel}` : ''}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden="true" />
                  Joined {formatDate(profile.joinedAt)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real stat tiles */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {profile.stats.map((s) => (
            <StatTile key={s.key} statKey={s.key} label={s.label} value={s.value} />
          ))}
        </div>

        {/* Personal information */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-semibold text-foreground">Personal information</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Update how you appear across the workspace.
            </p>
            <Separator className="my-5" />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-name">Full name</Label>
                  <Input
                    id="p-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-title">Job title</Label>
                  <Input
                    id="p-title"
                    placeholder="e.g. Director of Operations"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-email">Email address</Label>
                <Input id="p-email" value={profile.email} disabled readOnly />
                <p className="text-xs text-muted-foreground">
                  Your email is managed through sign-in and can’t be changed here.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-location">Location</Label>
                  <Input
                    id="p-location"
                    placeholder="e.g. San Francisco, CA"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-tz">Timezone</Label>
                  <Select value={timezone || undefined} onValueChange={setTimezone}>
                    <SelectTrigger id="p-tz">
                      <SelectValue placeholder="Select a timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={save} disabled={isPending || !dirty}>
                {isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Workspace preferences */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-semibold text-foreground">Workspace preferences</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Manage how your environment looks and feels.
            </p>
            <Separator className="my-5" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Interface theme</p>
                <p className="text-xs text-muted-foreground">
                  Choose light, dark, or match your system.
                </p>
              </div>
              <ThemeControl />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right rail */}
      <div className="space-y-6">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your latest actions in this workspace.
            </p>
            <div className="mt-4 space-y-3">
              {profile.activity.length > 0 ? (
                profile.activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[hsl(var(--accent-text))]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{a.label}</p>
                      <p className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                        {relativeTime(a.at)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground">Connected tools</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Integrations linked to your account.
            </p>
            <div className="mt-4 space-y-2.5">
              {profile.connections.length > 0 ? (
                profile.connections.map((c) => (
                  <div
                    key={`${c.provider}-${c.address}`}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-soft))]"
                      style={{ color: 'hsl(var(--accent-text))' }}
                      aria-hidden="true"
                    >
                      <Mail className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium capitalize text-foreground">
                        {c.provider}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{c.address}</p>
                    </div>
                    {c.connected ? (
                      <Badge variant="accent-soft">Connected</Badge>
                    ) : (
                      <Badge variant="secondary">{c.status}</Badge>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="text-sm text-foreground">No tools connected</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Connect a mailbox from the Email center to see it here.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
