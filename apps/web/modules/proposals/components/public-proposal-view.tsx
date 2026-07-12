'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { CalendarClock, Check, CircleAlert, Lock } from 'lucide-react'
import { formatMoney } from '@aurexos/core'
import { Button } from '@aurexos/ui/components/button'
import { Checkbox } from '@aurexos/ui/components/checkbox'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import type { AcceptanceEvidence, ProposalSectionView, PublicProposal } from '../types'

const VIEWER_KEY = 'aurex-proposal-viewer'

function viewerToken(): string {
  if (typeof window === 'undefined') return ''
  try {
    const existing = window.localStorage.getItem(VIEWER_KEY)
    if (existing) return existing
    const token = window.crypto?.randomUUID?.() ?? `v-${Math.random().toString(36).slice(2)}`
    window.localStorage.setItem(VIEWER_KEY, token)
    return token
  } catch {
    return `v-${Math.random().toString(36).slice(2)}`
  }
}

function formatDate(value: string | null): string {
  if (!value) return ''
  return format(new Date(`${value}T00:00:00`), 'MMMM d, yyyy')
}

function formatDateTime(value: string): string {
  if (!value) return ''
  return format(new Date(value), 'MMMM d, yyyy')
}

export interface PublicProposalViewProps {
  proposal: PublicProposal
  token: string
}

export function PublicProposalView({ proposal, token }: PublicProposalViewProps) {
  const cover = proposal.sections.find((s) => s.type === 'cover')
  const bodySections = proposal.sections.filter((s) => s.type !== 'cover')

  const [accepted, setAccepted] = React.useState(proposal.status === 'accepted')
  const [evidence, setEvidence] = React.useState<AcceptanceEvidence | null>(proposal.acceptedBy)

  // Record a view once on mount (best-effort; never blocks the page).
  React.useEffect(() => {
    const vt = viewerToken()
    if (!vt) return
    void fetch(`/api/proposals/${token}/view`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ viewerToken: vt }),
    }).catch(() => {})
  }, [token])

  const canAccept =
    !accepted && !proposal.isExpired && (proposal.status === 'sent' || proposal.status === 'viewed')

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      {/* Brand header */}
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
          {proposal.workspaceLogoUrl ? (
            <img
              src={proposal.workspaceLogoUrl}
              alt={proposal.workspaceName}
              className="h-8 w-8 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              {proposal.workspaceName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold">{proposal.workspaceName}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Private proposal
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        {/* Hero */}
        <section className="mb-10">
          {proposal.clientName ? (
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Prepared for {proposal.clientName}
            </p>
          ) : null}
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {cover?.title && cover.title !== 'Cover' ? cover.title : proposal.title}
          </h1>
          {cover?.body ? (
            <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-muted-foreground">
              {cover.body}
            </p>
          ) : null}
        </section>

        {/* Status banners */}
        {accepted ? (
          <AcceptedBanner evidence={evidence} />
        ) : proposal.isExpired ? (
          <div className="mb-10 flex items-start gap-3 rounded-xl border border-[hsl(var(--warning-text))]/25 bg-[hsl(var(--warning-soft))] p-4">
            <CircleAlert
              className="mt-0.5 h-5 w-5 text-[hsl(var(--warning-text))]"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-[hsl(var(--warning-text))]">
                This proposal has expired
              </p>
              <p className="text-sm text-muted-foreground">
                It closed on {formatDate(proposal.validUntil)}. Reach out for an updated version.
              </p>
            </div>
          </div>
        ) : null}

        {/* Sections */}
        <div className="space-y-10">
          {bodySections.map((section) => (
            <SectionBlock key={section.id} section={section} proposal={proposal} />
          ))}
        </div>

        {/* Valid until */}
        {proposal.validUntil && !proposal.isExpired && !accepted ? (
          <p className="mt-10 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            Valid until {formatDate(proposal.validUntil)}
          </p>
        ) : null}

        {/* Accept box */}
        {canAccept ? (
          <AcceptBox
            token={token}
            acceptMethod={proposal.acceptMethod}
            onAccepted={(ev) => {
              setEvidence(ev)
              setAccepted(true)
            }}
          />
        ) : null}

        <footer className="mt-16 border-t pt-6 text-center text-xs text-muted-foreground">
          {proposal.workspaceName} · Powered by AurexOS
        </footer>
      </main>
    </div>
  )
}

function AcceptedBanner({ evidence }: { evidence: AcceptanceEvidence | null }) {
  return (
    <div className="mb-10 flex items-start gap-3 rounded-xl border border-[hsl(var(--success-text))]/25 bg-[hsl(var(--success-soft))] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background/60">
        <Check className="h-5 w-5 text-[hsl(var(--success-text))]" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[hsl(var(--success-text))]">Proposal accepted</p>
        <p className="text-sm text-muted-foreground">
          {evidence
            ? `Accepted by ${evidence.name}${evidence.at ? ` on ${formatDateTime(evidence.at)}` : ''}. Thank you — we'll be in touch about next steps.`
            : "Thank you — we'll be in touch about next steps."}
        </p>
      </div>
    </div>
  )
}

function SectionBlock({
  section,
  proposal,
}: {
  section: ProposalSectionView
  proposal: PublicProposal
}) {
  if (section.type === 'pricing') {
    return <PricingBlock title={section.title} proposal={proposal} />
  }
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
      {section.body ? (
        <p className="mt-3 whitespace-pre-wrap leading-relaxed text-muted-foreground">
          {section.body}
        </p>
      ) : null}
    </section>
  )
}

function PricingBlock({ title, proposal }: { title: string; proposal: PublicProposal }) {
  const { pricing } = proposal
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 overflow-hidden rounded-xl border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-5 py-3 text-right font-medium">Qty</th>
              <th className="px-5 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {pricing.lines.map((line, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-5 py-3">
                  <span>{line.description}</span>
                  {line.optional ? (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      optional add-on
                    </span>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-right [font-variant-numeric:tabular-nums]">
                  {line.quantity}
                </td>
                <td className="px-5 py-3 text-right font-medium [font-variant-numeric:tabular-nums]">
                  {formatMoney(line.amountMinor, pricing.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ml-auto max-w-xs space-y-2 p-5">
          {pricing.discountMinor > 0 ? (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Discount</span>
              <span className="[font-variant-numeric:tabular-nums]">
                −{formatMoney(pricing.discountMinor, pricing.currency)}
              </span>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-2xl font-bold [font-variant-numeric:tabular-nums]">
              {formatMoney(pricing.totalMinor, pricing.currency)}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function AcceptBox({
  token,
  acceptMethod,
  onAccepted,
}: {
  token: string
  acceptMethod: PublicProposal['acceptMethod']
  onAccepted: (evidence: AcceptanceEvidence) => void
}) {
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [agreed, setAgreed] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isEsign = acceptMethod === 'esign'
  const ready = name.trim().length > 0 && email.trim().length > 0 && (isEsign || agreed)

  async function submit() {
    setError(null)
    setPending(true)
    try {
      const res = await fetch(`/api/proposals/${token}/accept`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accepterName: name.trim(), accepterEmail: email.trim() }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Could not accept the proposal.')
        setPending(false)
        return
      }
      onAccepted({ name: name.trim(), email: email.trim(), at: new Date().toISOString() })
    } catch {
      setError('Something went wrong. Please try again.')
      setPending(false)
    }
  }

  return (
    <section className="mt-12 rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">
        {isEsign ? 'Sign to accept' : 'Accept this proposal'}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {isEsign
          ? 'Type your full name below to sign electronically.'
          : 'Confirm your details and accept to get started.'}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="accept-name">{isEsign ? 'Full name (signature)' : 'Full name'}</Label>
          <Input
            id="accept-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Rivera"
            className={isEsign ? 'font-serif text-lg italic' : undefined}
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="accept-email">Email</Label>
          <Input
            id="accept-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jordan@company.com"
            autoComplete="email"
          />
        </div>
      </div>

      {!isEsign ? (
        <label className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
          <Checkbox
            className="mt-0.5"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
          />
          I have read and accept this proposal on behalf of my organization.
        </label>
      ) : null}

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-5 flex items-center gap-3">
        <Button size="lg" disabled={!ready || pending} onClick={() => void submit()}>
          <Check className="mr-1.5 h-4 w-4" />
          {isEsign ? 'Sign & accept' : 'Accept proposal'}
        </Button>
        <span className="text-xs text-muted-foreground">
          Your name, email and timestamp are recorded as acceptance.
        </span>
      </div>
    </section>
  )
}
