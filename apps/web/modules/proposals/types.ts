// Client-safe row shapes + label/badge maps shared by queries (server) and
// components (client). No I/O here — safe to import from either side. Money is
// always integer minor units (R-D8); formatting is formatMoney's job only.

import type { ProposalAcceptMethod, ProposalStatus } from '@aurexos/core'
import type { BadgeProps } from '@aurexos/ui/components/badge'

// ── Section blocks ──────────────────────────────────────────────────────────

/** The block types a proposal is built from (docs 06 §10). */
export const PROPOSAL_SECTION_TYPES = [
  'cover',
  'problem',
  'approach',
  'scope',
  'pricing',
  'timeline',
  'team',
  'terms',
  'case_study',
] as const
export type ProposalSectionType = (typeof PROPOSAL_SECTION_TYPES)[number]

export const SECTION_TYPE_LABELS: Record<ProposalSectionType, string> = {
  cover: 'Cover',
  problem: 'The problem',
  approach: 'Our approach',
  scope: 'Scope of work',
  pricing: 'Pricing',
  timeline: 'Timeline',
  team: 'Team',
  terms: 'Terms',
  case_study: 'Case study',
}

/** Short helper copy shown under each section type in the builder's add menu. */
export const SECTION_TYPE_HINTS: Record<ProposalSectionType, string> = {
  cover: 'The opening hero — headline and a short framing line.',
  problem: 'The challenge the client is facing, in their words.',
  approach: 'How you will solve it — your method and thinking.',
  scope: "What's included, deliverable by deliverable.",
  pricing: 'The investment table — pulls from the pricing editor.',
  timeline: 'Phases, milestones and dates.',
  team: 'Who will do the work.',
  terms: 'Payment terms, assumptions and conditions.',
  case_study: 'Proof — a relevant result you have delivered before.',
}

/** A normalized, render-ready section (builder + public view). */
export interface ProposalSectionView {
  id: string
  type: ProposalSectionType
  title: string
  body: string
}

// ── Pricing (view shapes; math lives in lib/pricing.ts) ─────────────────────

export interface ProposalPricingLineView {
  description: string
  quantity: number
  rateMinor: number
  optional: boolean
  amountMinor: number
}

export interface ProposalPricingView {
  currency: string
  lines: ProposalPricingLineView[]
  discountMinor: number
  totalMinor: number
}

// ── Internal rows ───────────────────────────────────────────────────────────

/** A row in the internal proposals table. */
export interface ProposalListRow {
  id: string
  title: string
  status: ProposalStatus
  clientId: string
  clientName: string | null
  dealId: string | null
  dealTitle: string | null
  currency: string
  totalMinor: number
  validUntil: string | null
  viewCount: number
  lastViewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProposalViewAnalytics {
  viewCount: number
  uniqueViewers: number
  lastViewedAt: string | null
}

/** Evidence stamped at e-acceptance (from proposals.accepted_by jsonb). */
export interface AcceptanceEvidence {
  name: string
  email: string
  at: string
}

/** One proposal, fully hydrated for the internal detail + editor. */
export interface ProposalDetail {
  id: string
  title: string
  status: ProposalStatus
  clientId: string
  clientName: string | null
  dealId: string | null
  dealTitle: string | null
  acceptMethod: ProposalAcceptMethod
  validUntil: string | null
  publicToken: string
  version: number
  sections: ProposalSectionView[]
  pricing: ProposalPricingView
  analytics: ProposalViewAnalytics
  acceptedAt: string | null
  acceptedBy: AcceptanceEvidence | null
  convertedInvoiceId: string | null
  createdAt: string
  updatedAt: string
}

// ── Public (tokenized) shape — mirrors get_proposal_by_token() ──────────────

export interface PublicProposal {
  title: string
  status: ProposalStatus
  validUntil: string | null
  acceptMethod: ProposalAcceptMethod
  currency: string
  sections: ProposalSectionView[]
  pricing: ProposalPricingView
  clientName: string | null
  workspaceName: string
  workspaceLogoUrl: string | null
  acceptedAt: string | null
  acceptedBy: AcceptanceEvidence | null
  isExpired: boolean
}

// ── Picker options ──────────────────────────────────────────────────────────

export interface ProposalOption {
  id: string
  name: string
}

export interface ProposalFormOptions {
  clients: ProposalOption[]
  deals: { id: string; title: string; clientId: string | null }[]
}

// ── Filter tabs ─────────────────────────────────────────────────────────────

export const PROPOSAL_STATUS_TABS = [
  'all',
  'draft',
  'internal_review',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'expired',
] as const
export type ProposalStatusTab = (typeof PROPOSAL_STATUS_TABS)[number]

export function isProposalStatusTab(value: string | undefined): value is ProposalStatusTab {
  return !!value && (PROPOSAL_STATUS_TABS as readonly string[]).includes(value)
}

// ── Label + badge maps ──────────────────────────────────────────────────────

type BadgeVariant = NonNullable<BadgeProps['variant']>

/**
 * Proposal status → soft badge variant + label. Soft variants only (never color
 * alone — the label carries the state, 11_Design_Principles.md §5).
 */
export const PROPOSAL_STATUS_META: Record<
  ProposalStatus,
  { label: string; variant: BadgeVariant }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  internal_review: { label: 'In review', variant: 'warning-soft' },
  sent: { label: 'Sent', variant: 'info-soft' },
  viewed: { label: 'Viewed', variant: 'accent-soft' },
  accepted: { label: 'Accepted', variant: 'success-soft' },
  declined: { label: 'Declined', variant: 'destructive-soft' },
  expired: { label: 'Expired', variant: 'outline' },
}

export const PROPOSAL_STATUS_TAB_LABELS: Record<ProposalStatusTab, string> = {
  all: 'All',
  draft: 'Draft',
  internal_review: 'In review',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
}
