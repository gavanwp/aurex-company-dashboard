// Client-safe row shapes, label/badge maps, and contract templates shared by
// queries (server) and components (client). No I/O here — safe to import from
// either side. Money is always integer minor units (R-D8); formatting is
// formatMoney's job only.

import type { ContractStatus, ContractType } from '@aurexos/core'
import type { BadgeProps } from '@aurexos/ui/components/badge'

// ── Clause / section blocks ──────────────────────────────────────────────────

/** The clause block types a contract body is built from. */
export const CONTRACT_SECTION_TYPES = [
  'parties',
  'term',
  'scope',
  'fees',
  'payment',
  'confidentiality',
  'ip',
  'warranties',
  'liability',
  'termination',
  'general',
  'custom',
] as const
export type ContractSectionType = (typeof CONTRACT_SECTION_TYPES)[number]

export const CONTRACT_SECTION_LABELS: Record<ContractSectionType, string> = {
  parties: 'Parties',
  term: 'Term',
  scope: 'Scope of services',
  fees: 'Fees',
  payment: 'Payment terms',
  confidentiality: 'Confidentiality',
  ip: 'Intellectual property',
  warranties: 'Warranties',
  liability: 'Limitation of liability',
  termination: 'Termination',
  general: 'General provisions',
  custom: 'Custom clause',
}

/** Short helper copy shown under each clause type in the builder's add menu. */
export const CONTRACT_SECTION_HINTS: Record<ContractSectionType, string> = {
  parties: 'Who is entering into this agreement.',
  term: 'Effective date, duration and renewal.',
  scope: 'The services or deliverables covered.',
  fees: 'The commercial terms — amounts and structure.',
  payment: 'Invoicing cadence, due dates and late terms.',
  confidentiality: 'How confidential information is handled.',
  ip: 'Who owns the work product and any licenses.',
  warranties: 'Representations each party makes.',
  liability: 'Caps and exclusions on liability.',
  termination: 'How and when either party may exit.',
  general: 'Governing law, notices, entire agreement.',
  custom: 'A free-form clause of your own.',
}

/** A normalized, render-ready clause (builder + public view). */
export interface ContractSectionView {
  id: string
  type: ContractSectionType
  title: string
  body: string
}

// ── Signing evidence ─────────────────────────────────────────────────────────

/** Evidence stamped at e-signing (from contracts.signer jsonb). */
export interface SignerEvidence {
  name: string
  email: string
  at: string
}

// ── Internal rows ────────────────────────────────────────────────────────────

/** A row in the internal contracts table. */
export interface ContractListRow {
  id: string
  title: string
  type: ContractType
  status: ContractStatus
  clientId: string | null
  clientName: string | null
  valueMinor: number | null
  currency: string
  effectiveDate: string | null
  endDate: string | null
  autoRenew: boolean
  /** Derived: within the expiring window of end_date (see lib/lifecycle). */
  isExpiringSoon: boolean
  daysToEnd: number | null
  createdAt: string
  updatedAt: string
}

/** A linked obligation, hydrated for the detail panel. */
export interface ObligationRow {
  id: string
  contractId: string
  description: string
  dueKind: 'once' | 'recurring' | null
  dueDate: string | null
  ownerUserId: string | null
  ownerName: string | null
  sourceClause: string | null
  /** Set once converted to a task (idempotency + link). */
  taskId: string | null
  createdAt: string
}

/** One contract, fully hydrated for the internal detail + editor. */
export interface ContractDetail {
  id: string
  title: string
  type: ContractType
  status: ContractStatus
  clientId: string | null
  clientName: string | null
  projectId: string | null
  projectName: string | null
  proposalId: string | null
  proposalTitle: string | null
  effectiveDate: string | null
  endDate: string | null
  autoRenew: boolean
  valueMinor: number | null
  currency: string
  body: ContractSectionView[]
  version: number
  publicToken: string | null
  sentAt: string | null
  signedAt: string | null
  signer: SignerEvidence | null
  obligations: ObligationRow[]
  daysToEnd: number | null
  isExpiringSoon: boolean
  createdAt: string
  updatedAt: string
}

// ── Public (tokenized) shape — mirrors get_contract_by_token() ───────────────

export interface PublicContract {
  title: string
  type: ContractType
  status: ContractStatus
  body: ContractSectionView[]
  valueMinor: number | null
  currency: string
  effectiveDate: string | null
  endDate: string | null
  autoRenew: boolean
  clientName: string | null
  workspaceName: string
  workspaceLogoUrl: string | null
  signedAt: string | null
  signer: SignerEvidence | null
}

// ── Renewal radar (the flagship lifecycle command center) ────────────────────

/** One contract on the renewal radar, with its lifecycle bucket + countdown. */
export interface RenewalRadarItem {
  id: string
  title: string
  clientName: string | null
  status: ContractStatus
  endDate: string | null
  daysToEnd: number | null
  valueMinor: number | null
  currency: string
  autoRenew: boolean
}

/** The grouped lifecycle view the radar renders. */
export interface RenewalRadar {
  /** Active/signed contracts ending within 30 / 60 / 90 days. */
  expiring30: RenewalRadarItem[]
  expiring60: RenewalRadarItem[]
  expiring90: RenewalRadarItem[]
  /** Auto-renew contracts approaching their term — a decision is due. */
  upForRenewal: RenewalRadarItem[]
  /** Signed in the last 30 days — momentum. */
  recentlySigned: RenewalRadarItem[]
  /** Headline totals. */
  activeCount: number
  activeValueMinor: number
  /** Currency of the active-value total (workspace's dominant currency). */
  currency: string
}

// ── Picker options ───────────────────────────────────────────────────────────

export interface ContractOption {
  id: string
  name: string
}

export interface ContractFormOptions {
  clients: ContractOption[]
  projects: ContractOption[]
  /** Accepted proposals available to draft a contract from. */
  proposals: { id: string; title: string; clientId: string; clientName: string | null }[]
}

// ── Filter tabs ──────────────────────────────────────────────────────────────

export const CONTRACT_STATUS_TABS = [
  'all',
  'draft',
  'review',
  'sent',
  'signed',
  'active',
  'expiring',
  'expired',
  'terminated',
] as const
export type ContractStatusTab = (typeof CONTRACT_STATUS_TABS)[number]

export function isContractStatusTab(value: string | undefined): value is ContractStatusTab {
  return !!value && (CONTRACT_STATUS_TABS as readonly string[]).includes(value)
}

export const CONTRACT_STATUS_TAB_LABELS: Record<ContractStatusTab, string> = {
  all: 'All',
  draft: 'Draft',
  review: 'In review',
  sent: 'Sent',
  signed: 'Signed',
  active: 'Active',
  expiring: 'Expiring',
  expired: 'Expired',
  terminated: 'Terminated',
}

// ── Label + badge maps ───────────────────────────────────────────────────────

type BadgeVariant = NonNullable<BadgeProps['variant']>

/**
 * Contract status → soft badge variant + label. Soft variants only (never color
 * alone — the label carries the state, 11_Design_Principles.md §5).
 */
export const CONTRACT_STATUS_META: Record<
  ContractStatus,
  { label: string; variant: BadgeVariant }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  review: { label: 'In review', variant: 'warning-soft' },
  sent: { label: 'Sent', variant: 'info-soft' },
  signed: { label: 'Signed', variant: 'accent-soft' },
  active: { label: 'Active', variant: 'success-soft' },
  expiring: { label: 'Expiring', variant: 'warning-soft' },
  expired: { label: 'Expired', variant: 'outline' },
  terminated: { label: 'Terminated', variant: 'destructive-soft' },
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  msa: 'MSA',
  sow: 'SOW',
  nda: 'NDA',
  retainer: 'Retainer',
  employment: 'Employment',
  custom: 'Custom',
}

/** Longer descriptor for the type in menus. */
export const CONTRACT_TYPE_DESCRIPTIONS: Record<ContractType, string> = {
  msa: 'Master services agreement — the umbrella terms.',
  sow: 'Statement of work — a specific engagement.',
  nda: 'Non-disclosure agreement.',
  retainer: 'Ongoing retainer — recurring scope and fee.',
  employment: 'Employment or contractor agreement.',
  custom: 'A bespoke agreement.',
}

// ── Contract templates (title + starter clauses with merge fields) ───────────

export interface ContractTemplate {
  type: ContractType
  title: string
  sections: { type: ContractSectionType; title: string; body: string }[]
}

/**
 * Presets that turn a blank contract into a premium scaffold. Clause bodies
 * carry merge-field placeholders ({{client_name}}, {{effective_date}},
 * {{end_date}}, {{value}}, {{workspace_name}}) resolved by lib/merge.
 */
export const CONTRACT_TEMPLATES: Record<ContractType, ContractTemplate> = {
  msa: {
    type: 'msa',
    title: 'Master services agreement',
    sections: [
      {
        type: 'parties',
        title: 'Parties',
        body: 'This Master Services Agreement ("Agreement") is entered into as of {{effective_date}} between {{workspace_name}} ("Provider") and {{client_name}} ("Client").',
      },
      {
        type: 'term',
        title: 'Term',
        body: 'This Agreement begins on {{effective_date}} and continues until {{end_date}}, unless renewed or terminated as set out below.',
      },
      {
        type: 'scope',
        title: 'Scope of services',
        body: 'Provider will perform the services described in one or more Statements of Work executed under this Agreement. Each Statement of Work is governed by these terms.',
      },
      {
        type: 'fees',
        title: 'Fees',
        body: 'Client will pay Provider the fees set out in each Statement of Work. The total contract value under this Agreement is {{value}}.',
      },
      {
        type: 'confidentiality',
        title: 'Confidentiality',
        body: 'Each party will protect the other party’s confidential information with the same care it uses for its own, and will use it only to perform this Agreement.',
      },
      {
        type: 'ip',
        title: 'Intellectual property',
        body: 'On full payment, Provider assigns to Client all right, title and interest in the deliverables, excluding Provider’s pre-existing and general tools.',
      },
      {
        type: 'termination',
        title: 'Termination',
        body: 'Either party may terminate this Agreement on thirty (30) days’ written notice, or immediately for an uncured material breach.',
      },
      {
        type: 'general',
        title: 'General provisions',
        body: 'This Agreement is the entire agreement between the parties and is governed by the laws of the Provider’s jurisdiction.',
      },
    ],
  },
  sow: {
    type: 'sow',
    title: 'Statement of work',
    sections: [
      {
        type: 'parties',
        title: 'Parties',
        body: 'This Statement of Work is entered into as of {{effective_date}} between {{workspace_name}} and {{client_name}}, under the parties’ Master Services Agreement.',
      },
      {
        type: 'scope',
        title: 'Scope of work',
        body: 'Provider will deliver the following services and deliverables for {{client_name}}. Detail each deliverable, milestone and acceptance criterion here.',
      },
      {
        type: 'term',
        title: 'Schedule',
        body: 'Work begins on {{effective_date}} and is expected to complete by {{end_date}}.',
      },
      {
        type: 'fees',
        title: 'Fees',
        body: 'The fee for this Statement of Work is {{value}}, invoiced as set out in the Payment terms.',
      },
      {
        type: 'payment',
        title: 'Payment terms',
        body: 'Invoices are due within fifteen (15) days of receipt. Late amounts accrue interest at 1.5% per month.',
      },
    ],
  },
  nda: {
    type: 'nda',
    title: 'Mutual non-disclosure agreement',
    sections: [
      {
        type: 'parties',
        title: 'Parties',
        body: 'This Mutual Non-Disclosure Agreement is entered into as of {{effective_date}} between {{workspace_name}} and {{client_name}} (each a "Party").',
      },
      {
        type: 'confidentiality',
        title: 'Confidential information',
        body: 'Each Party may disclose confidential information to the other. The receiving Party will keep it confidential and use it solely to evaluate or perform the parties’ relationship.',
      },
      {
        type: 'term',
        title: 'Term',
        body: 'This Agreement is effective from {{effective_date}} and the confidentiality obligations survive until {{end_date}} or three (3) years, whichever is later.',
      },
      {
        type: 'general',
        title: 'General',
        body: 'Neither Party acquires any license or ownership in the other’s confidential information by virtue of this Agreement.',
      },
    ],
  },
  retainer: {
    type: 'retainer',
    title: 'Retainer agreement',
    sections: [
      {
        type: 'parties',
        title: 'Parties',
        body: 'This Retainer Agreement is entered into as of {{effective_date}} between {{workspace_name}} ("Provider") and {{client_name}} ("Client").',
      },
      {
        type: 'scope',
        title: 'Retained services',
        body: 'Provider will make available an agreed allocation of services each month for {{client_name}}. Describe the included scope and any rollover here.',
      },
      {
        type: 'term',
        title: 'Term & renewal',
        body: 'The retainer runs from {{effective_date}} to {{end_date}} and renews automatically for successive periods unless either party gives notice.',
      },
      {
        type: 'fees',
        title: 'Retainer fee',
        body: 'The retainer fee is {{value}} per period, invoiced in advance.',
      },
      {
        type: 'payment',
        title: 'Payment terms',
        body: 'Retainer invoices are due on the first of each period. Unused allocation does not carry over unless stated in the scope.',
      },
      {
        type: 'termination',
        title: 'Termination',
        body: 'Either party may end this retainer on thirty (30) days’ written notice, effective at the end of the then-current period.',
      },
    ],
  },
  employment: {
    type: 'employment',
    title: 'Employment agreement',
    sections: [
      {
        type: 'parties',
        title: 'Parties',
        body: 'This Employment Agreement is entered into as of {{effective_date}} between {{workspace_name}} and the employee.',
      },
      {
        type: 'term',
        title: 'Term',
        body: 'Employment begins on {{effective_date}} and continues until {{end_date}} or termination in accordance with this Agreement.',
      },
      {
        type: 'scope',
        title: 'Role & responsibilities',
        body: 'Describe the role, reporting line and core responsibilities here.',
      },
      {
        type: 'confidentiality',
        title: 'Confidentiality',
        body: 'The employee will protect confidential information during and after employment.',
      },
      {
        type: 'termination',
        title: 'Termination',
        body: 'Either party may terminate on the notice period required by applicable law.',
      },
    ],
  },
  custom: {
    type: 'custom',
    title: 'Agreement',
    sections: [
      {
        type: 'parties',
        title: 'Parties',
        body: 'This Agreement is entered into as of {{effective_date}} between {{workspace_name}} and {{client_name}}.',
      },
      {
        type: 'custom',
        title: 'Terms',
        body: 'Set out the terms of this agreement here.',
      },
    ],
  },
}
