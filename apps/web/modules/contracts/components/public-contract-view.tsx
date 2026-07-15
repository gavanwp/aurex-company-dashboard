'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Check, Lock, PenLine } from 'lucide-react'
import { formatMoney } from '@aurexos/core'
import { Button } from '@aurexos/ui/components/button'
import { Checkbox } from '@aurexos/ui/components/checkbox'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import { mergeFields } from '../lib/merge'
import { CONTRACT_TYPE_LABELS, type PublicContract, type SignerEvidence } from '../types'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return format(new Date(`${value}T00:00:00`), 'MMMM d, yyyy')
}

function formatDateTime(value: string): string {
  if (!value) return ''
  return format(new Date(value), 'MMMM d, yyyy')
}

export interface PublicContractViewProps {
  contract: PublicContract
  token: string
}

export function PublicContractView({ contract, token }: PublicContractViewProps) {
  const [signed, setSigned] = React.useState(
    contract.status === 'signed' || contract.status === 'active',
  )
  const [evidence, setEvidence] = React.useState<SignerEvidence | null>(contract.signer)

  const mergeCtx = {
    clientName: contract.clientName,
    workspaceName: contract.workspaceName,
    effectiveDate: contract.effectiveDate,
    endDate: contract.endDate,
    valueMinor: contract.valueMinor,
    currency: contract.currency,
  }

  const canSign = !signed && contract.status === 'sent'

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      {/* Brand header */}
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
          {contract.workspaceLogoUrl ? (
            <img
              src={contract.workspaceLogoUrl}
              alt={contract.workspaceName}
              className="h-8 w-8 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              {contract.workspaceName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold">{contract.workspaceName}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Private contract
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        {/* Hero */}
        <section className="mb-8">
          {contract.clientName ? (
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Prepared for {contract.clientName}
            </p>
          ) : null}
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{contract.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {CONTRACT_TYPE_LABELS[contract.type]}
            {contract.effectiveDate ? ` · Effective ${formatDate(contract.effectiveDate)}` : ''}
            {contract.endDate ? ` – ${formatDate(contract.endDate)}` : ''}
          </p>
        </section>

        {/* Signed banner */}
        {signed ? <SignedBanner evidence={evidence} /> : null}

        {/* Key terms */}
        <div className="mb-8 grid grid-cols-2 gap-4 rounded-xl border bg-background p-5 sm:grid-cols-4">
          <Term label="Value" value={formatMoney(contract.valueMinor, contract.currency)} />
          <Term label="Effective" value={formatDate(contract.effectiveDate)} />
          <Term label="Ends" value={formatDate(contract.endDate)} />
          <Term label="Auto-renew" value={contract.autoRenew ? 'Yes' : 'No'} />
        </div>

        {/* Body */}
        <div className="space-y-8">
          {contract.body.map((clause) => (
            <section key={clause.id}>
              <h2 className="text-xl font-semibold tracking-tight">{clause.title}</h2>
              {clause.body ? (
                <p className="mt-3 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {mergeFields(clause.body, mergeCtx)}
                </p>
              ) : null}
            </section>
          ))}
        </div>

        {/* Sign box */}
        {canSign ? (
          <SignBox
            token={token}
            onSigned={(ev) => {
              setEvidence(ev)
              setSigned(true)
            }}
          />
        ) : null}

        <footer className="mt-16 border-t pt-6 text-center text-xs text-muted-foreground">
          {contract.workspaceName} · Powered by AurexOS
        </footer>
      </main>
    </div>
  )
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold [font-variant-numeric:tabular-nums]">{value}</p>
    </div>
  )
}

function SignedBanner({ evidence }: { evidence: SignerEvidence | null }) {
  return (
    <div className="mb-8 flex items-start gap-3 rounded-xl border border-[hsl(var(--success-text))]/25 bg-[hsl(var(--success-soft))] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background/60">
        <Check className="h-5 w-5 text-[hsl(var(--success-text))]" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[hsl(var(--success-text))]">Contract signed</p>
        <p className="text-sm text-muted-foreground">
          {evidence
            ? `Signed by ${evidence.name}${evidence.at ? ` on ${formatDateTime(evidence.at)}` : ''}. A copy of this page is your record.`
            : 'Thank you — this contract has been signed.'}
        </p>
      </div>
    </div>
  )
}

function SignBox({
  token,
  onSigned,
}: {
  token: string
  onSigned: (evidence: SignerEvidence) => void
}) {
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [agreed, setAgreed] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const ready = name.trim().length > 0 && email.trim().length > 0 && agreed

  async function submit() {
    setError(null)
    setPending(true)
    try {
      const res = await fetch(`/api/contracts/${token}/sign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ signerName: name.trim(), signerEmail: email.trim() }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Could not sign the contract.')
        setPending(false)
        return
      }
      onSigned({ name: name.trim(), email: email.trim(), at: new Date().toISOString() })
    } catch {
      setError('Something went wrong. Please try again.')
      setPending(false)
    }
  }

  return (
    <section className="mt-12 rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">Sign to accept</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Type your full name below to sign this contract electronically.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sign-name">Full name (signature)</Label>
          <Input
            id="sign-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Rivera"
            className="font-serif text-lg italic"
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sign-email">Email</Label>
          <Input
            id="sign-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jordan@company.com"
            autoComplete="email"
          />
        </div>
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
        <Checkbox
          className="mt-0.5"
          checked={agreed}
          onCheckedChange={(v) => setAgreed(v === true)}
        />
        I have read this contract and agree to its terms on behalf of my organization.
      </label>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={!ready || pending} onClick={() => void submit()}>
          <PenLine className="mr-1.5 h-4 w-4" />
          Sign &amp; accept
        </Button>
        <span className="text-xs text-muted-foreground">
          Your name, email and timestamp are recorded as your signature.
        </span>
      </div>
    </section>
  )
}
