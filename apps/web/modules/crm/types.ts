// Client-safe row shapes + labels shared by queries (server) and components
// (client). No I/O here — safe to import from either side.

import type { DealStage } from '@aurexos/core'

export interface DealRow {
  id: string
  title: string
  stage: DealStage
  valueCents: number | null
  currency: string
  probability: number | null
  expectedCloseDate: string | null
  source: string | null
  clientId: string | null
  clientName: string | null
  contactId: string | null
  contactName: string | null
  createdAt: string
}

export interface ContactRow {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  title: string | null
  clientId: string | null
  clientName: string | null
}

export interface ClientOption {
  id: string
  name: string
}

export interface StageSummary {
  stage: DealStage
  count: number
  valueCents: number
}

export interface PipelineSummary {
  stages: StageSummary[]
  openCount: number
  openValueCents: number
  weightedValueCents: number
  wonCount: number
  wonValueCents: number
}

export const STAGE_LABELS: Record<DealStage, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}
