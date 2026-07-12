'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Check,
  Copy,
  Eye,
  ExternalLink,
  Pencil,
  Send,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatMoney } from '@aurexos/core'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { Checkbox } from '@aurexos/ui/components/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@aurexos/ui/components/dialog'
import { Input } from '@aurexos/ui/components/input'
import { Separator } from '@aurexos/ui/components/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@aurexos/ui/components/table'
import { convertAcceptedProposal } from '../actions/convert-actions'
import { expireProposal, markInternalReview, sendProposal } from '../actions/proposal-actions'
import { PROPOSAL_STATUS_META, SECTION_TYPE_LABELS, type ProposalDetail } from '../types'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return format(new Date(`${value}T00:00:00`), 'MMM d, yyyy')
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return format(new Date(value), 'MMM d, yyyy · h:mm a')
}

export interface ProposalDetailViewProps {
  proposal: ProposalDetail
  canManage: boolean
}

export function ProposalDetailView({ proposal, canManage }: ProposalDetailViewProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [expireOpen, setExpireOpen] = React.useState(false)
  const [origin, setOrigin] = React.useState('')
  const [createProject, setCreateProject] = React.useState(true)

  React.useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const meta = PROPOSAL_STATUS_META[proposal.status]
  const isEditable = proposal.status === 'draft' || proposal.status === 'internal_review'
  const isLive = proposal.status === 'sent' || proposal.status === 'viewed'
  const isSentOrLater = proposal.status !== 'draft' && proposal.status !== 'internal_review'
  const shareUrl = origin ? `${origin}/p/${proposal.publicToken}` : `/p/${proposal.publicToken}`

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

  async function handleSend() {
    await run(() => sendProposal(proposal.id), 'Proposal sent — the client link is live')
  }
  async function handleReview() {
    await run(() => markInternalReview(proposal.id), 'Moved to internal review')
  }
  async function handleExpire() {
    setExpireOpen(false)
    await run(() => expireProposal(proposal.id), 'Proposal expired')
  }
  async function handleConvert() {
    setPending(true)
    const result = await convertAcceptedProposal(proposal.id, { createProject })
    setPending(false)
    if (result.ok) {
      toast.success(
        result.data.alreadyConverted
          ? 'Already converted — opening the invoice'
          : `Invoice ${result.data.invoiceNumber} created`,
      )
      router.push(`/finance/invoices/${result.data.invoiceId}`)
    } else {
      toast.error(result.error)
    }
  }

  function copyLink() {
    void navigator.clipboard?.writeText(shareUrl).then(
      () => toast.success('Link copied'),
      () => toast.error('Could not copy'),
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Link
            href="/proposals"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Proposals
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">
              {proposal.title}
            </h1>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {proposal.clientName ?? 'No client'}
            {proposal.dealTitle ? ` · ${proposal.dealTitle}` : ''}
          </p>
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            {isEditable ? (
              <Button asChild variant="outline">
                <Link href={`/proposals/${proposal.id}/edit`}>
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            ) : null}
            {proposal.status === 'draft' ? (
              <Button variant="outline" onClick={() => void handleReview()} disabled={pending}>
                Send to review
              </Button>
            ) : null}
            {isEditable ? (
              <Button onClick={() => void handleSend()} disabled={pending}>
                <Send className="mr-1.5 h-4 w-4" />
                Send proposal
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
            {isLive ? (
              <Button variant="outline" onClick={() => setExpireOpen(true)} disabled={pending}>
                <Ban className="mr-1.5 h-4 w-4" />
                Expire
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Share link + analytics (after send) */}
      {isSentOrLater ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Shareable client link</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  readOnly
                  value={shareUrl}
                  className="h-9 font-mono text-xs"
                  aria-label="Shareable proposal link"
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
            <div className="flex items-center gap-6 sm:border-l sm:pl-6">
              <div>
                <p className="text-xs text-muted-foreground">Opened</p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold [font-variant-numeric:tabular-nums]">
                  <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {proposal.analytics.viewCount}
                  {proposal.analytics.uniqueViewers > 0
                    ? ` · ${proposal.analytics.uniqueViewers} viewer${proposal.analytics.uniqueViewers === 1 ? '' : 's'}`
                    : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last viewed</p>
                <p className="mt-0.5 text-sm font-semibold [font-variant-numeric:tabular-nums]">
                  {formatDateTime(proposal.analytics.lastViewedAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Accepted → convert */}
      {proposal.status === 'accepted' ? (
        <Card className="border-[hsl(var(--success-text))]/25 bg-[hsl(var(--success-soft))]/40">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--success-soft))]">
                <Check className="h-5 w-5 text-[hsl(var(--success-text))]" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-foreground">Accepted</h2>
                <p className="text-sm text-muted-foreground">
                  {proposal.acceptedBy
                    ? `${proposal.acceptedBy.name} (${proposal.acceptedBy.email}) accepted on ${formatDateTime(proposal.acceptedAt)}.`
                    : `Accepted on ${formatDateTime(proposal.acceptedAt)}.`}
                </p>
              </div>
            </div>

            <Separator />

            {proposal.convertedInvoiceId ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  This proposal has been converted to an invoice.
                </p>
                <Button asChild variant="outline">
                  <Link href={`/finance/invoices/${proposal.convertedInvoiceId}`}>
                    View invoice
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : canManage ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={createProject}
                    onCheckedChange={(v) => setCreateProject(v === true)}
                  />
                  Also create a delivery project
                </label>
                <Button onClick={() => void handleConvert()} disabled={pending}>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Convert to invoice{proposal.dealId ? ' & win deal' : ''}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Content preview */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardContent className="space-y-5 p-5">
            <h2 className="text-sm font-semibold text-foreground">Content</h2>
            {proposal.sections.length === 0 ? (
              <p className="text-sm text-muted-foreground">This proposal has no sections yet.</p>
            ) : (
              proposal.sections.map((section) => (
                <div key={section.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {SECTION_TYPE_LABELS[section.type]}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                  </div>
                  {section.type === 'pricing' ? (
                    <p className="text-sm text-muted-foreground">Pricing table (see right).</p>
                  ) : section.body ? (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {section.body}
                    </p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground/70">Empty</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pricing + meta */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 gap-4 p-5">
                <div>
                  <p className="text-xs text-muted-foreground">Valid until</p>
                  <p className="mt-0.5 text-sm font-medium [font-variant-numeric:tabular-nums]">
                    {formatDate(proposal.validUntil)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Acceptance</p>
                  <p className="mt-0.5 text-sm font-medium">
                    {proposal.acceptMethod === 'esign' ? 'E-signature' : 'Checkbox'}
                  </p>
                </div>
              </div>
              <Separator />
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="pr-5 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposal.pricing.lines.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-6 text-center text-sm text-muted-foreground"
                      >
                        No pricing lines.
                      </TableCell>
                    </TableRow>
                  ) : (
                    proposal.pricing.lines.map((line, i) => (
                      <TableRow key={i} className="hover:bg-transparent">
                        <TableCell className="pl-5">
                          <span className="text-foreground">{line.description}</span>
                          {line.optional ? (
                            <span className="ml-2 text-xs text-muted-foreground">optional</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right [font-variant-numeric:tabular-nums]">
                          {line.quantity}
                        </TableCell>
                        <TableCell className="pr-5 text-right font-medium [font-variant-numeric:tabular-nums]">
                          {formatMoney(line.amountMinor, proposal.pricing.currency)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <Separator />
              <div className="ml-auto max-w-xs space-y-2 p-5">
                {proposal.pricing.discountMinor > 0 ? (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Discount</span>
                    <span className="[font-variant-numeric:tabular-nums]">
                      −{formatMoney(proposal.pricing.discountMinor, proposal.pricing.currency)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="[font-variant-numeric:tabular-nums]">
                    {formatMoney(proposal.pricing.totalMinor, proposal.pricing.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={expireOpen} onOpenChange={setExpireOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Expire this proposal?</DialogTitle>
            <DialogDescription>
              The client link will stop accepting responses and show an expired notice. This can't
              be undone — you'd send a fresh proposal instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExpireOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleExpire()} disabled={pending}>
              Expire proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
