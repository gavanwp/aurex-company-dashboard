// Client-safe row shapes shared by queries (server) and components (client).
// No I/O here — safe to import from either side.

import type { ClientStatus, DealStage, ProjectStatus } from '@aurexos/core'

export interface ClientRow {
  id: string
  name: string
  website: string | null
  industry: string | null
  status: ClientStatus
  notes: string | null
  activeProjects: number
  openDeals: number
  pipelineValueCents: number
}

export interface ClientContactRow {
  id: string
  fullName: string
  email: string | null
  title: string | null
}

export interface ClientProjectRow {
  id: string
  name: string
  status: ProjectStatus
  dueDate: string | null
}

export interface ClientDealRow {
  id: string
  title: string
  stage: DealStage
  valueCents: number | null
  currency: string
}

export interface ClientDetailData {
  id: string
  name: string
  website: string | null
  industry: string | null
  status: ClientStatus
  notes: string | null
  contacts: ClientContactRow[]
  projects: ClientProjectRow[]
  deals: ClientDealRow[]
}
