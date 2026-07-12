'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react'
import { formatMoney } from '@aurexos/core'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { Checkbox } from '@aurexos/ui/components/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@aurexos/ui/components/dropdown-menu'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { Separator } from '@aurexos/ui/components/separator'
import { Textarea } from '@aurexos/ui/components/textarea'
import { createProposal, updateProposal } from '../actions/proposal-actions'
import {
  computeLineAmountMinor,
  computePricingTotal,
  dollarsToMinor,
  minorToDollars,
} from '../lib/pricing'
import {
  PROPOSAL_SECTION_TYPES,
  SECTION_TYPE_HINTS,
  SECTION_TYPE_LABELS,
  type ProposalDetail,
  type ProposalFormOptions,
  type ProposalSectionType,
} from '../types'

const NONE = 'none'
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const

/** Sections a fresh proposal starts with — a premium scaffold, not a blank page. */
const STARTER_SECTIONS: ProposalSectionType[] = [
  'cover',
  'problem',
  'approach',
  'scope',
  'pricing',
  'terms',
]

interface SectionDraft {
  id: string
  type: ProposalSectionType
  title: string
  body: string
}

interface LineDraft {
  id: string
  description: string
  quantity: string
  rate: string
  optional: boolean
}

function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}`
}

function parseNum(value: string): number {
  const n = Number.parseFloat(String(value).replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function emptyLine(): LineDraft {
  return { id: uid(), description: '', quantity: '1', rate: '', optional: false }
}

export interface ProposalBuilderProps {
  mode: 'create' | 'edit'
  options: ProposalFormOptions
  proposal?: ProposalDetail
}

export function ProposalBuilder({ mode, options, proposal }: ProposalBuilderProps) {
  const router = useRouter()

  const [title, setTitle] = React.useState(proposal?.title ?? '')
  const [clientId, setClientId] = React.useState(proposal?.clientId ?? '')
  const [dealId, setDealId] = React.useState(proposal?.dealId ?? NONE)
  const [currency, setCurrency] = React.useState(proposal?.pricing.currency ?? 'USD')
  const [validUntil, setValidUntil] = React.useState(proposal?.validUntil ?? '')
  const [acceptMethod, setAcceptMethod] = React.useState(proposal?.acceptMethod ?? 'checkbox')
  const [pending, setPending] = React.useState(false)

  const [sections, setSections] = React.useState<SectionDraft[]>(() => {
    if (proposal && proposal.sections.length > 0) {
      return proposal.sections.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        body: s.body,
      }))
    }
    return STARTER_SECTIONS.map((type) => ({
      id: uid(),
      type,
      title: SECTION_TYPE_LABELS[type],
      body: '',
    }))
  })

  const [lines, setLines] = React.useState<LineDraft[]>(() => {
    if (proposal && proposal.pricing.lines.length > 0) {
      return proposal.pricing.lines.map((l) => ({
        id: uid(),
        description: l.description,
        quantity: String(l.quantity),
        rate: minorToDollars(l.rateMinor),
        optional: l.optional,
      }))
    }
    return [emptyLine()]
  })
  const [discount, setDiscount] = React.useState(
    proposal && proposal.pricing.discountMinor > 0
      ? minorToDollars(proposal.pricing.discountMinor)
      : '',
  )

  // Only the deals belonging to the chosen client (keeps the link coherent).
  const availableDeals = options.deals.filter((d) => !clientId || d.clientId === clientId)

  // Live total — computed inline every render (no memo), the finance-form pattern.
  const totalMinor = computePricingTotal(
    lines.map((l) => ({
      description: l.description || '—',
      quantity: parseNum(l.quantity),
      rateMinor: dollarsToMinor(l.rate),
      optional: l.optional,
    })),
    dollarsToMinor(discount),
  )

  // ── Section ops ─────────────────────────────────────────────────────────────
  function addSection(type: ProposalSectionType) {
    setSections((prev) => [
      ...prev,
      { id: uid(), type, title: SECTION_TYPE_LABELS[type], body: '' },
    ])
  }
  function updateSection(id: string, patch: Partial<SectionDraft>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }
  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id))
  }
  function moveSection(index: number, dir: -1 | 1) {
    setSections((prev) => {
      const next = prev.slice()
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      const [item] = next.splice(index, 1)
      if (item) next.splice(target, 0, item)
      return next
    })
  }

  // ── Line ops ────────────────────────────────────────────────────────────────
  function updateLine(id: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }
  function removeLine(id: string) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.id !== id)))
  }

  async function save() {
    if (!title.trim()) {
      toast.error('Give the proposal a title.')
      return
    }
    if (!clientId) {
      toast.error('Choose a client.')
      return
    }

    const payload = {
      title: title.trim(),
      clientId,
      dealId: dealId === NONE ? null : dealId,
      validUntil: validUntil || null,
      acceptMethod,
      sections: sections.map((s, index) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        content: { body: s.body },
        order: index,
      })),
      pricing: {
        currency,
        lines: lines.map((l) => ({
          description: l.description || 'Line item',
          quantity: parseNum(l.quantity),
          rateMinor: dollarsToMinor(l.rate),
          optional: l.optional,
        })),
        discountMinor: dollarsToMinor(discount),
        totalMinor: 0, // recomputed server-side
      },
    }

    setPending(true)
    const result =
      mode === 'edit' && proposal
        ? await updateProposal({ id: proposal.id, ...payload })
        : await createProposal(payload)
    setPending(false)

    if (result.ok) {
      toast.success(mode === 'edit' ? 'Proposal saved' : 'Proposal created')
      router.push(`/proposals/${result.data.id}`)
    } else {
      toast.error(result.error)
    }
  }

  const backHref = mode === 'edit' && proposal ? `/proposals/${proposal.id}` : '/proposals'

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {mode === 'edit' ? 'Back to proposal' : 'Proposals'}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {mode === 'edit' ? 'Edit proposal' : 'New proposal'}
        </h1>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          {/* Details */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="proposal-title">Title</Label>
                <Input
                  id="proposal-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Website redesign & brand system"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <Select
                    value={clientId || undefined}
                    onValueChange={(v) => {
                      setClientId(v)
                      setDealId(NONE)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Deal (optional)</Label>
                  <Select value={dealId} onValueChange={setDealId}>
                    <SelectTrigger>
                      <SelectValue placeholder="No linked deal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No linked deal</SelectItem>
                      {availableDeals.map((deal) => (
                        <SelectItem key={deal.id} value={deal.id}>
                          {deal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="proposal-valid">Valid until</Label>
                  <Input
                    id="proposal-valid"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Acceptance</Label>
                  <Select
                    value={acceptMethod}
                    onValueChange={(v) => setAcceptMethod(v as typeof acceptMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checkbox">Checkbox acknowledgement</SelectItem>
                      <SelectItem value="esign">Typed e-signature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Sections</h2>
                  <p className="text-xs text-muted-foreground">
                    The story of the proposal, block by block.
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add section
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {PROPOSAL_SECTION_TYPES.map((type) => (
                      <DropdownMenuItem
                        key={type}
                        onSelect={() => addSection(type)}
                        className="flex-col items-start gap-0.5"
                      >
                        <span className="font-medium">{SECTION_TYPE_LABELS[type]}</span>
                        <span className="text-xs text-muted-foreground">
                          {SECTION_TYPE_HINTS[type]}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {sections.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No sections yet. Add one to start building.
                </div>
              ) : (
                <div className="space-y-3">
                  {sections.map((section, index) => (
                    <div key={section.id} className="rounded-lg border bg-card p-3">
                      <div className="flex items-center gap-2">
                        <GripVertical
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {SECTION_TYPE_LABELS[section.type]}
                        </span>
                        <Input
                          aria-label="Section heading"
                          value={section.title}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          className="h-8 flex-1 border-0 bg-transparent px-1 font-medium shadow-none focus-visible:ring-1"
                        />
                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            aria-label="Move section up"
                            disabled={index === 0}
                            onClick={() => moveSection(index, -1)}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            aria-label="Move section down"
                            disabled={index === sections.length - 1}
                            onClick={() => moveSection(index, 1)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            aria-label="Remove section"
                            onClick={() => removeSection(section.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {section.type === 'pricing' ? (
                        <p className="mt-2 px-1 text-xs text-muted-foreground">
                          The pricing table renders here on the client page — edit the line items in
                          the Pricing panel.
                        </p>
                      ) : (
                        <Textarea
                          aria-label="Section body"
                          value={section.body}
                          onChange={(e) => updateSection(section.id, { body: e.target.value })}
                          placeholder={SECTION_TYPE_HINTS[section.type]}
                          className="mt-2 min-h-[96px]"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Pricing</h2>
                  <p className="text-xs text-muted-foreground">
                    Optional lines are shown as add-ons and excluded from the total.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLines((prev) => [...prev, emptyLine()])}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add line
                </Button>
              </div>

              <div className="mt-3 space-y-3">
                <div className="hidden gap-2 px-1 text-xs text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_4.5rem_7rem_5.5rem_6rem_2rem]">
                  <span>Description</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Rate</span>
                  <span className="text-center">Optional</span>
                  <span className="text-right">Amount</span>
                  <span />
                </div>

                {lines.map((line) => {
                  const amountMinor = computeLineAmountMinor(
                    parseNum(line.quantity),
                    dollarsToMinor(line.rate),
                  )
                  return (
                    <div
                      key={line.id}
                      className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_7rem_5.5rem_6rem_2rem] sm:items-center"
                    >
                      <Input
                        placeholder="Discovery & UX research"
                        aria-label="Description"
                        value={line.description}
                        onChange={(e) => updateLine(line.id, { description: e.target.value })}
                      />
                      <Input
                        inputMode="decimal"
                        aria-label="Quantity"
                        className="text-right [font-variant-numeric:tabular-nums]"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                      />
                      <Input
                        inputMode="decimal"
                        placeholder="0.00"
                        aria-label="Rate"
                        className="text-right [font-variant-numeric:tabular-nums]"
                        value={line.rate}
                        onChange={(e) => updateLine(line.id, { rate: e.target.value })}
                      />
                      <div className="flex justify-center sm:pt-0">
                        <Checkbox
                          aria-label="Optional add-on"
                          checked={line.optional}
                          onCheckedChange={(v) => updateLine(line.id, { optional: v === true })}
                        />
                      </div>
                      <span className="text-right text-sm font-medium [font-variant-numeric:tabular-nums] sm:pr-1">
                        {formatMoney(amountMinor, currency)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="justify-self-end text-muted-foreground hover:text-destructive"
                        aria-label="Remove line"
                        disabled={lines.length === 1}
                        onClick={() => removeLine(line.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="proposal-discount" className="text-xs">
                    Discount
                  </Label>
                  <Input
                    id="proposal-discount"
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-label="Discount"
                    className="h-8 w-32 text-right [font-variant-numeric:tabular-nums]"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-semibold [font-variant-numeric:tabular-nums]">
                    {formatMoney(totalMinor, currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save rail */}
        <Card className="lg:sticky lg:top-6">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-sm font-semibold text-foreground">Ready to build</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sections</span>
                <span className="font-medium [font-variant-numeric:tabular-nums]">
                  {sections.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Line items</span>
                <span className="font-medium [font-variant-numeric:tabular-nums]">
                  {lines.length}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="[font-variant-numeric:tabular-nums]">
                  {formatMoney(totalMinor, currency)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => void save()} disabled={pending}>
                {mode === 'edit' ? 'Save changes' : 'Save draft'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Saved as a draft. You send it from the proposal page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
