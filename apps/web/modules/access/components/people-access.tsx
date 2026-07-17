'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MailPlus, ShieldCheck, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { initialsOf } from '@aurexos/core'
import { Avatar, AvatarFallback, AvatarImage } from '@aurexos/ui/components/avatar'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@aurexos/ui/components/dialog'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { inviteUser, revokeInvitation } from '../actions/access-actions'
import type { AssignableRole, InvitationRow, RosterRow } from '../queries/get-access'

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

function InviteDialog({ roles }: { roles: AssignableRole[] }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [roleId, setRoleId] = React.useState(
    roles.find((r) => r.key === 'employee')?.id ?? roles[0]?.id ?? '',
  )
  const [isPending, startTransition] = React.useTransition()

  const submit = () => {
    if (!email.trim() || !roleId) {
      toast.error('Enter an email and choose a role')
      return
    }
    startTransition(async () => {
      const result = await inviteUser({ email: email.trim(), roleId })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Invitation created')
      setEmail('')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-1.5 h-4 w-4" />
          Invite user
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>
            They’ll join with the role you choose. You can fine-tune permissions afterwards.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="invite-role">
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending}>
            <MailPlus className="mr-1.5 h-4 w-4" />
            {isPending ? 'Inviting…' : 'Send invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PendingRow({ invite, canManage }: { invite: InvitationRow; canManage: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const revoke = () => {
    startTransition(async () => {
      const result = await revokeInvitation({ id: invite.id })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Invitation revoked')
      router.refresh()
    })
  }
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
        <p className="truncate text-xs text-muted-foreground">
          {invite.roleName} · invited{invite.invitedByName ? ` by ${invite.invitedByName}` : ''} ·
          expires {formatDate(invite.expiresAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="warning-soft">Pending</Badge>
        {canManage ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={revoke}
            disabled={isPending}
            aria-label="Revoke invitation"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export interface PeopleAccessProps {
  roster: RosterRow[]
  invitations: InvitationRow[]
  roles: AssignableRole[]
  canManage: boolean
}

export function PeopleAccess({ roster, invitations, roles, canManage }: PeopleAccessProps) {
  return (
    <div className="space-y-8">
      {/* Members */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">
              Members
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {roster.length}
              </span>
            </h2>
          </div>
          {canManage ? <InviteDialog roles={roles} /> : null}
        </div>
        <Card>
          <CardContent className="divide-y p-0">
            {roster.map((m) => (
              <div key={m.userId} className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-9">
                    {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt="" /> : null}
                    <AvatarFallback>{initialsOf(m.name) || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                      {m.name}
                      {m.isYou ? (
                        <span className="text-xs font-normal text-muted-foreground">(you)</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                <Badge variant="accent-soft" className="shrink-0">
                  {m.roleName}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Pending invitations
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {invitations.length}
            </span>
          </h2>
          <Card>
            <CardContent className="divide-y p-0">
              {invitations.map((invite) => (
                <PendingRow key={invite.id} invite={invite} canManage={canManage} />
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
