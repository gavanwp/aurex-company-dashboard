'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ArrowDown, ArrowUp, Eye, FileStack, Plus, Trash2 } from 'lucide-react'
import type { ContractType } from '@aurexos/core'
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
import { createContract, updateContract } from '../actions/contract-actions'
import { mergeFields } from '../lib/merge'
import {
  CONTRACT_SECTION_HINTS,
  CONTRACT_SECTION_LABELS,
  CONTRACT_SECTION_TYPES,
  CONTRACT_TEMPLATES,
  CONTRACT_TYPE_DESCRIPTIONS,
  CONTRACT_TYPE_LABELS,
  type ContractDetail,
  type ContractFormOptions,
  type ContractSectionType,
} from '../types'

const NONE = 'none'
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const
const TYPES: ContractType[] = ['msa', 'sow', 'nda', 'retainer', 'employment', 'custom']

interface ClauseDraft {
  id: string
  type: ContractSectionType
  title: string
  body: string
}

function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}`
}

function dollarsToMinor(input: string): number | null {
  const v = Number.parseFloat(String(input).replace(/[,\s]/g, ''))
  if (!Number.isFinite(v)) return null
  return Math.round(v * 100)
}

function minorToDollars(minor: number | null): string {
  return minor == null ? '' : (minor / 100).toFixed(2)
}

function templateClauses(type: ContractType): ClauseDraft[] {
  return CONTRACT_TEMPLATES[type].sections.map((s) => ({
    id: uid(),
    type: s.type,
    title: s.title,
    body: s.body,
  }))
}

export interface ContractBuilderProps {
  mode: 'create' | 'edit'
  options: ContractFormOptions
  contract?: ContractDetail
}

export function ContractBuilder({ mode, options, contract }: ContractBuilderProps) {
  const router = useRouter()

  const initialType = contract?.type ?? 'msa'
  const [title, setTitle] = React.useState(contract?.title ?? CONTRACT_TEMPLATES[initialType].title)
  const [type, setType] = React.useState<ContractType>(initialType)
  const [clientId, setClientId] = React.useState(contract?.clientId ?? NONE)
  const [projectId, setProjectId] = React.useState(contract?.projectId ?? NONE)
  const [proposalId, setProposalId] = React.useState(contract?.proposalId ?? NONE)
  const [currency, setCurrency] = React.useState(contract?.currency ?? 'USD')
  const [value, setValue] = React.useState(minorToDollars(contract?.valueMinor ?? null))
  const [effectiveDate, setEffectiveDate] = React.useState(contract?.effectiveDate ?? '')
  const [endDate, setEndDate] = React.useState(contract?.endDate ?? '')
  const [autoRenew, setAutoRenew] = React.useState(contract?.autoRenew ?? false)
  const [showPreview, setShowPreview] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const [clauses, setClauses] = React.useState<ClauseDraft[]>(() => {
    if (contract && contract.body.length > 0) {
      return contract.body.map((s) => ({ id: s.id, type: s.type, title: s.title, body: s.body }))
    }
    return templateClauses(initialType)
  })

  // Merge context for the live preview.
  const clientName = options.clients.find((c) => c.id === clientId)?.name ?? null
  const mergeCtx = {
    clientName,
    workspaceName: null,
    effectiveDate: effectiveDate || null,
    endDate: endDate || null,
    valueMinor: dollarsToMinor(value),
    currency,
  }

  function onTypeChange(next: ContractType) {
    setType(next)
    // In create mode, swap in the new type's template (title + clauses) so the
    // type genuinely drives a premium scaffold. Edit mode preserves the drafted
    // clauses.
    if (mode === 'create') {
      setClauses(templateClauses(next))
      if (!title.trim() || TYPES.some((t) => title === CONTRACT_TEMPLATES[t].title)) {
        setTitle(CONTRACT_TEMPLATES[next].title)
      }
    }
  }

  // ── Clause ops ──────────────────────────────────────────────────────────────
  function addClause(clauseType: ContractSectionType) {
    setClauses((prev) => [
      ...prev,
      { id: uid(), type: clauseType, title: CONTRACT_SECTION_LABELS[clauseType], body: '' },
    ])
  }
  function updateClause(id: string, patch: Partial<ClauseDraft>) {
    setClauses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  function removeClause(id: string) {
    setClauses((prev) => prev.filter((c) => c.id !== id))
  }
  function moveClause(index: number, dir: -1 | 1) {
    setClauses((prev) => {
      const next = prev.slice()
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      const [item] = next.splice(index, 1)
      if (item) next.splice(target, 0, item)
      return next
    })
  }

  async function save() {
    if (!title.trim()) {
      toast.error('Give the contract a title.')
      return
    }

    const payload = {
      title: title.trim(),
      type,
      clientId: clientId === NONE ? null : clientId,
      projectId: projectId === NONE ? null : projectId,
      proposalId: proposalId === NONE ? null : proposalId,
      effectiveDate: effectiveDate || null,
      endDate: endDate || null,
      autoRenew,
      valueMinor: dollarsToMinor(value),
      currency,
      body: clauses.map((c, index) => ({
        id: c.id,
        type: c.type,
        title: c.title,
        content: { body: c.body },
        order: index,
      })),
    }

    setPending(true)
    const result =
      mode === 'edit' && contract
        ? await updateContract({ id: contract.id, ...payload })
        : await createContract(payload)
    setPending(false)

    if (result.ok) {
      toast.success(mode === 'edit' ? 'Contract saved' : 'Contract created')
      router.push(`/contracts/${result.data.id}`)
    } else {
      toast.error(result.error)
    }
  }

  const backHref = mode === 'edit' && contract ? `/contracts/${contract.id}` : '/contracts'
  const availableProposals = options.proposals.filter(
    (p) => clientId === NONE || p.clientId === clientId,
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {mode === 'edit' ? 'Back to contract' : 'Contracts'}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {mode === 'edit' ? 'Edit contract' : 'New contract'}
        </h1>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          {/* Details */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="contract-title">Title</Label>
                <Input
                  id="contract-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Master services agreement"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => onTypeChange(v as ContractType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {CONTRACT_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {CONTRACT_TYPE_DESCRIPTIONS[type]}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <Select
                    value={clientId}
                    onValueChange={(v) => {
                      setClientId(v)
                      setProposalId(NONE)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No client</SelectItem>
                      {options.clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Project (optional)</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="No linked project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No linked project</SelectItem>
                      {options.projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Linked proposal (optional)</Label>
                  <Select value={proposalId} onValueChange={setProposalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="No linked proposal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No linked proposal</SelectItem>
                      {availableProposals.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="contract-effective">Effective date</Label>
                  <Input
                    id="contract-effective"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contract-end">End date</Label>
                  <Input
                    id="contract-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="contract-value">Contract value</Label>
                  <Input
                    id="contract-value"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="text-right [font-variant-numeric:tabular-nums]"
                  />
                </div>
                <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
                  <Checkbox checked={autoRenew} onCheckedChange={(v) => setAutoRenew(v === true)} />
                  Auto-renews at end of term
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Clauses */}
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Clauses</h2>
                  <p className="text-xs text-muted-foreground">
                    Use merge fields like {'{{client_name}}'}, {'{{effective_date}}'} and{' '}
                    {'{{value}}'} — they resolve on the signing page.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview((v) => !v)}
                  >
                    <Eye className="mr-1.5 h-4 w-4" />
                    {showPreview ? 'Hide preview' : 'Preview'}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add clause
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      {CONTRACT_SECTION_TYPES.map((clauseType) => (
                        <DropdownMenuItem
                          key={clauseType}
                          onSelect={() => addClause(clauseType)}
                          className="flex-col items-start gap-0.5"
                        >
                          <span className="font-medium">{CONTRACT_SECTION_LABELS[clauseType]}</span>
                          <span className="text-xs text-muted-foreground">
                            {CONTRACT_SECTION_HINTS[clauseType]}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {clauses.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No clauses yet. Add one, or switch the type to load a template.
                </div>
              ) : (
                <div className="space-y-3">
                  {clauses.map((clause, index) => (
                    <div key={clause.id} className="rounded-lg border bg-card p-3">
                      <div className="flex items-center gap-2">
                        <FileStack
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {CONTRACT_SECTION_LABELS[clause.type]}
                        </span>
                        <Input
                          aria-label="Clause heading"
                          value={clause.title}
                          onChange={(e) => updateClause(clause.id, { title: e.target.value })}
                          className="h-8 flex-1 border-0 bg-transparent px-1 font-medium shadow-none focus-visible:ring-1"
                        />
                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            aria-label="Move clause up"
                            disabled={index === 0}
                            onClick={() => moveClause(index, -1)}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            aria-label="Move clause down"
                            disabled={index === clauses.length - 1}
                            onClick={() => moveClause(index, 1)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            aria-label="Remove clause"
                            onClick={() => removeClause(clause.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        aria-label="Clause body"
                        value={clause.body}
                        onChange={(e) => updateClause(clause.id, { body: e.target.value })}
                        placeholder={CONTRACT_SECTION_HINTS[clause.type]}
                        className="mt-2 min-h-[96px]"
                      />
                      {showPreview && clause.body.trim() ? (
                        <div className="mt-2 rounded-md border bg-muted/30 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Preview
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                            {mergeFields(clause.body, mergeCtx)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Save rail */}
        <Card className="lg:sticky lg:top-6">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-sm font-semibold text-foreground">Ready to draft</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{CONTRACT_TYPE_LABELS[type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Clauses</span>
                <span className="font-medium [font-variant-numeric:tabular-nums]">
                  {clauses.length}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Value</span>
                <span className="[font-variant-numeric:tabular-nums]">
                  {value ? `${currency} ${value}` : '—'}
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
                Saved as a draft. You send it for signature from the contract page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
