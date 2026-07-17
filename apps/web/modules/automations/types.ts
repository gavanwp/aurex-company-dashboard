import type { AutomationStatus, AutomationRunStatus, AutomationDraft } from '@aurexos/core'

// Module-local read models the Automation UI renders. Domain schemas live in
// packages/core; these are shaped for display.

export interface AutomationActionView {
  actionKey: string
  label: string
  description: string
  requiresApproval: boolean
  input: Record<string, unknown>
}

export interface AutomationListRow {
  id: string
  name: string
  status: AutomationStatus
  triggerEventType: string
  triggerLabel: string
  triggerModule: string | null
  actionCount: number
  ownerName: string | null
  lastRunAt: string | null
  lastRunStatus: AutomationRunStatus | null
  updatedAt: string
}

export interface AutomationDetail {
  id: string
  name: string
  status: AutomationStatus
  triggerEventType: string
  triggerLabel: string
  triggerHint: string | null
  triggerFilter: Record<string, unknown>
  actions: AutomationActionView[]
  errorPolicy: { retryCount: number; circuitBreakAfter: number; notifyOwner: boolean }
  ownerName: string | null
  scope: string
  createdAt: string
  updatedAt: string
}

export interface RunRow {
  id: string
  status: AutomationRunStatus
  stepCount: number
  startedAt: string
  finishedAt: string | null
  error: string | null
}

export interface AutomationOverview {
  total: number
  active: number
  paused: number
  draft: number
  runsLast30d: number
  failuresLast30d: number
}

/** Result of the Q&A assistant. */
export interface AssistantResult {
  answer: string
  model: string
}

/** Result of the NL drafter — a proposed automation for human review. */
export interface DraftResult {
  draft: AutomationDraft
  /** Trigger/action keys the model chose that aren't in the registry (surfaced, not silently dropped). */
  unknownTrigger: boolean
  unknownActions: string[]
  model: string
}

export const AUTOMATION_STATUS_TABS = ['all', 'active', 'paused', 'draft'] as const
export type AutomationStatusTab = (typeof AUTOMATION_STATUS_TABS)[number]

export function isAutomationStatusTab(v: string | undefined): v is AutomationStatusTab {
  return v === 'all' || v === 'active' || v === 'paused' || v === 'draft'
}
