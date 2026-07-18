'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { createApiKey, revokeApiKey } from '../actions/api-key-actions'
import type { ApiKeyRow } from '../queries/get-api-keys'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(ms)
}

function CreateKeyDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [scope, setScope] = React.useState<'read' | 'full'>('read')
  const [expiry, setExpiry] = React.useState('90')
  const [isPending, startTransition] = React.useTransition()
  const [created, setCreated] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const reset = () => {
    setName('')
    setScope('read')
    setExpiry('90')
    setCreated(null)
    setCopied(false)
  }

  const submit = () => {
    if (!name.trim()) {
      toast.error('Name the key')
      return
    }
    startTransition(async () => {
      const result = await createApiKey({
        name: name.trim(),
        scope,
        expiresInDays: Number(expiry) || 0,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setCreated(result.data.plaintextKey)
      router.refresh()
    })
  }

  const copy = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created)
      setCopied(true)
      toast.success('Key copied')
    } catch {
      toast.error('Could not copy')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Create key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your API key</DialogTitle>
              <DialogDescription>
                This is the only time the full key is shown. Store it somewhere safe.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2.5">
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                {created}
              </code>
              <Button size="icon" variant="ghost" onClick={copy} aria-label="Copy key">
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create an API key</DialogTitle>
              <DialogDescription>
                Keys are hashed at rest — you’ll see the full value once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Zapier integration"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="key-scope">Access</Label>
                  <Select value={scope} onValueChange={(v) => setScope(v as 'read' | 'full')}>
                    <SelectTrigger id="key-scope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Read-only</SelectItem>
                      <SelectItem value="full">Full access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key-expiry">Expires (days)</Label>
                  <Input
                    id="key-expiry"
                    type="number"
                    min={0}
                    max={3650}
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={isPending}>
                {isPending ? 'Creating…' : 'Create key'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function KeyRow({ apiKey, canManage }: { apiKey: ApiKeyRow; canManage: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const expired = apiKey.expiresAt !== null && Date.parse(apiKey.expiresAt) < Date.now()

  const revoke = () => {
    startTransition(async () => {
      const result = await revokeApiKey({ id: apiKey.id })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Key revoked')
      router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <KeyRound className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
            {apiKey.name}
            <Badge variant={apiKey.scopes.includes('full') ? 'secondary' : 'outline'}>
              {apiKey.scopes.includes('full') ? 'Full access' : 'Read-only'}
            </Badge>
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {apiKey.prefix}…{'  '}
            <span className="font-sans">
              · created {formatDate(apiKey.createdAt)}
              {apiKey.createdByName ? ` by ${apiKey.createdByName}` : ''} · last used{' '}
              {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : 'never'}
            </span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {apiKey.revoked ? (
          <Badge variant="destructive-soft">Revoked</Badge>
        ) : expired ? (
          <Badge variant="warning-soft">Expired</Badge>
        ) : (
          <Badge variant="success-soft">Active</Badge>
        )}
        {canManage && !apiKey.revoked ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={revoke}
            disabled={isPending}
            aria-label={`Revoke ${apiKey.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export interface ApiKeysManagerProps {
  keys: ApiKeyRow[]
  canManage: boolean
}

export function ApiKeysManager({ keys, canManage }: ApiKeysManagerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          API keys
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">{keys.length}</span>
        </h2>
        {canManage ? <CreateKeyDialog /> : null}
      </div>
      {keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No API keys yet"
          description="Create a key to let external tools call the AurexOS API on this org’s behalf."
          action={canManage ? <CreateKeyDialog /> : null}
        />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {keys.map((k) => (
              <KeyRow key={k.id} apiKey={k} canManage={canManage} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
