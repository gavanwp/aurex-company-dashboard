'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  ArrowUpRight,
  Ban,
  CalendarClock,
  Check,
  CircleAlert,
  Copy,
  ExternalLink,
  ListChecks,
  ListPlus,
  Pencil,
  PlayCircle,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatMoney } from '@aurexos/core'
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
} from '@aurexos/ui/components/dialog'
import { Input } from '@aurexos/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { Separator } from '@aurexos/ui/components/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@aurexos/ui/components/tooltip'
import { mergeFields } from '../lib/merge'
import { activateContract, sendContract, terminateContract } from '../actions/contract-actions'
import {
  addObligation,
  convertObligationToTask,
  removeObligation,
} from '../actions/obligation-actions'
import type { ContractMemberOption } from '../queries/get-contracts'
import {
  CONTRACT_SECTION_LABELS,
  CONTRACT_STATUS_META,
  CONTRACT_TYPE_LABELS,
  type ContractDetail,
  type ObligationRow,
} from '../types'

const NONE = 'none'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return format(new Date(`${value}T00:00:00`), 'MMM d, yyyy')
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return format(new Date(value), 'MMM d, yyyy · h:mm a')
}

export interface ContractDetailViewProps {
  contract: ContractDetail
  members: ContractMemberOption[]
  workspaceName: string
  canManage: boolean
}

export function ContractDetailView({
  contract,
  members,
  workspaceName,
  canManage,
}: ContractDetailViewProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [terminateOpen, setTerminateOpen] = React.useState(false)
  const [origin, setOrigin] = React.useState('')

  React.useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const meta = CONTRACT_STATUS_META[contract.status]
  const isEditable = contract.status === 'draft' || contract.status === 'review'
  const isSentOrLater = !isEditable
  const canTerminate =
    contract.status === 'sent' ||
    contract.status === 'signed' ||
    contract.status === 'active' ||
    contract.status === 'expiring'
  const shareUrl = origin ? `${origin}/c/${contract.publicToken}` : `/c/${contract.publicToken}`

  const mergeCtx = {
    clientName: contract.clientName,
    workspaceName,
    effectiveDate: contract.effectiveDate,
    endDate: contract.endDate,
    valueMinor: contract.valueMinor,
    currency: contract.currency,
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setPending(true)
    const result = await fn()
    setPending(false)
    if (result.ok) {
      toast.success(success)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Something went wrong')
    }
    return result.ok
  }

  function copyLink() {
    void navigator.clipboard?.writeText(shareUrl).then(
      () => toast.success('Link copied'),
      () => toast.error('Could not copy'),
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Link
              href="/contracts"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Contracts
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">
                {contract.title}
              </h1>
              <Badge variant={meta.variant}>{meta.label}</Badge>
              <Badge variant="outline">{CONTRACT_TYPE_LABELS[contract.type]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {contract.clientName ?? 'No client'}
              {contract.projectName ? ` · ${contract.projectName}` : ''}
            </p>
          </div>

          {canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              {isEditable ? (
                <Button asChild variant="outline">
                  <Link href={`/contracts/${contract.id}/edit`}>
                    <Pencil className="mr-1.5 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              ) : null}
              {isEditable ? (
                <Button
                  onClick={() =>
                    void run(
                      () => sendContract(contract.id),
                      'Contract sent — the signing link is live',
                    )
                  }
                  disabled={pending}
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  Send for signature
                </Button>
              ) : null}
              {isSentOrLater ? (
                <Button asChild variant="outline">
                  <a href={shareUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Preview
                  </a>
                </Button>
              ) : null}
              {contract.status === 'signed' ? (
                <Button
                  onClick={() =>
                    void run(() => activateContract(contract.id), 'Contract activated')
                  }
                  disabled={pending}
                >
                  <PlayCircle className="mr-1.5 h-4 w-4" />
                  Activate
                </Button>
              ) : null}
              {canTerminate ? (
                <Button variant="outline" onClick={() => setTerminateOpen(true)} disabled={pending}>
                  <Ban className="mr-1.5 h-4 w-4" />
                  Terminate
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Share link (after send) */}
        {isSentOrLater && contract.publicToken ? (
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">Shareable signing link</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="h-9 font-mono text-xs"
                    aria-label="Shareable signing link"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={copyLink}
                    aria-label="Copy link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Signing evidence (after signed) */}
        {contract.signer ? (
          <Card className="border-[hsl(var(--success-text))]/25 bg-[hsl(var(--success-soft))]/40">
            <CardContent className="flex items-start gap-3 p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--success-soft))]">
                <Check className="h-5 w-5 text-[hsl(var(--success-text))]" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-foreground">Signed</h2>
                <p className="text-sm text-muted-foreground">
                  {contract.signer.name} ({contract.signer.email}) signed on{' '}
                  {formatDateTime(contract.signedAt)}.
                  {contract.status === 'signed' ? ' Activate it to put the contract in force.' : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* Contract body */}
          <Card>
            <CardContent className="space-y-5 p-5">
              <h2 className="text-sm font-semibold text-foreground">Contract</h2>
              {contract.body.length === 0 ? (
                <p className="text-sm text-muted-foreground">This contract has no clauses yet.</p>
              ) : (
                contract.body.map((clause) => (
                  <div key={clause.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {CONTRACT_SECTION_LABELS[clause.type]}
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">{clause.title}</h3>
                    </div>
                    {clause.body ? (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {mergeFields(clause.body, mergeCtx)}
                      </p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground/70">Empty</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {/* Term & value summary */}
            <Card>
              <CardContent className="grid grid-cols-2 gap-4 p-5">
                <div>
                  <p className="text-xs text-muted-foreground">Value</p>
                  <p className="mt-0.5 text-sm font-semibold [font-variant-numeric:tabular-nums]">
                    {formatMoney(contract.valueMinor, contract.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Auto-renew</p>
                  <p className="mt-0.5 text-sm font-medium">{contract.autoRenew ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Effective</p>
                  <p className="mt-0.5 text-sm font-medium [font-variant-numeric:tabular-nums]">
                    {formatDate(contract.effectiveDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ends</p>
                  <p
                    className={
                      contract.isExpiringSoon
                        ? 'mt-0.5 text-sm font-medium text-[hsl(var(--warning-text))] [font-variant-numeric:tabular-nums]'
                        : 'mt-0.5 text-sm font-medium [font-variant-numeric:tabular-nums]'
                    }
                  >
                    {formatDate(contract.endDate)}
                  </p>
                </div>
                {contract.isExpiringSoon && contract.daysToEnd != null ? (
                  <div className="col-span-2 flex items-center gap-1.5 rounded-md bg-[hsl(var(--warning-soft))] px-3 py-2 text-xs text-[hsl(var(--warning-text))]">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                    Expiring in {contract.daysToEnd} days
                  </div>
                ) : null}
                {contract.proposalId ? (
                  <div className="col-span-2">
                    <Separator className="mb-3" />
                    <Link
                      href={`/proposals/${contract.proposalId}`}
                      className="inline-flex items-center gap-1.5 text-sm text-foreground hover:underline"
                    >
                      From proposal: {contract.proposalTitle ?? 'View'}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Obligations */}
            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-foreground">Obligations</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Commitments in this contract. Convert any to a tracked task.
                </p>

                {canManage ? <AddObligation contractId={contract.id} members={members} /> : null}

                {contract.obligations.length === 0 ? (
                  <p className="rounded-md border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">
                    No obligations captured yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {contract.obligations.map((o) => (
                      <ObligationLine key={o.id} obligation={o} canManage={canManage} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Phase-3 AI seam */}
            <Card>
              <CardContent className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">Clause intelligence</h2>
                  <p className="text-sm text-muted-foreground">
                    Plain-English clause explanations and version diffs arrive in Phase 3.
                  </p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button size="sm" variant="outline" disabled>
                        <Sparkles className="mr-1.5 h-4 w-4" />
                        Explain
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Clause explain &amp; diff arrive in Phase 3</TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Terminate this contract?</DialogTitle>
              <DialogDescription>
                The contract will be marked terminated and the signing link will stop accepting
                signatures. This can’t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setTerminateOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => {
                  setTerminateOpen(false)
                  void run(() => terminateContract(contract.id), 'Contract terminated')
                }}
              >
                Terminate contract
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

// ── Add obligation ────────────────────────────────────────────────────────────

function AddObligation({
  contractId,
  members,
}: {
  contractId: string
  members: ContractMemberOption[]
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [description, setDescription] = React.useState('')
  const [kind, setKind] = React.useState<'once' | 'recurring'>('once')
  const [dueDate, setDueDate] = React.useState('')
  const [owner, setOwner] = React.useState(NONE)

  async function submit() {
    if (!description.trim()) return
    setPending(true)
    const result = await addObligation({
      contractId,
      description: description.trim(),
      dueRule: { kind, dueDate: dueDate || undefined },
      ownerUserId: owner === NONE ? null : owner,
    })
    setPending(false)
    if (result.ok) {
      toast.success('Obligation added')
      setDescription('')
      setDueDate('')
      setOwner(NONE)
      setKind('once')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
        }}
        placeholder="Provider will deliver a monthly report…"
        aria-label="Obligation description"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select value={kind} onValueChange={(v) => setKind(v as 'once' | 'recurring')}>
          <SelectTrigger className="h-8 w-[8.5rem] text-sm" aria-label="Due kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="once">One-time</SelectItem>
            <SelectItem value="recurring">Recurring</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-label="Due date"
          className="h-8 w-[9.5rem] text-sm"
        />
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger className="h-8 w-[10rem] text-sm" aria-label="Owner">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Unassigned</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={pending || !description.trim()} onClick={() => void submit()}>
          <ListPlus className="mr-1.5 h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  )
}

// ── Obligation row ────────────────────────────────────────────────────────────

function ObligationLine({
  obligation,
  canManage,
}: {
  obligation: ObligationRow
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    setPending(true)
    const result = await fn()
    setPending(false)
    if (result.ok) {
      if (success) toast.success(success)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Something went wrong')
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-foreground">{obligation.description}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{obligation.ownerName ?? 'Unassigned'}</span>
            {obligation.dueDate ? <span>· due {formatDate(obligation.dueDate)}</span> : null}
            {obligation.dueKind === 'recurring' ? <span>· recurring</span> : null}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {obligation.taskId ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/tasks?task=${obligation.taskId}`}>
              View task
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : canManage ? (
          <>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                void run(() => convertObligationToTask(obligation.id), 'Converted to a task')
              }
            >
              <Check className="mr-1.5 h-4 w-4" />
              Convert to task
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove obligation"
              disabled={pending}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => void run(() => removeObligation(obligation.id))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}
