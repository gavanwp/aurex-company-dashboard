import 'server-only'

import type { AutomationStatus } from '@aurexos/core'
import type { Tables } from '@aurexos/db'
import type { WorkspaceContext } from '@/lib/workspace-context'
import { actionDef, triggerDef, triggerLabel } from '../constants'
import type {
  AutomationActionView,
  AutomationDetail,
  AutomationListRow,
  AutomationOverview,
  RunRow,
} from '../types'

// RLS (0011) scopes automations / automation_runs to workspace members. Queries
// add workspace + soft-delete filters and fold owner names + last-run status
// into the read models the UI renders.

type AutomationRow = Tables<'automations'>
type RunRecord = Tables<'automation_runs'>

interface RawAction {
  actionKey?: unknown
  input?: unknown
}

function toActionViews(raw: unknown): AutomationActionView[] {
  if (!Array.isArray(raw)) return []
  const views: AutomationActionView[] = []
  for (const item of raw as RawAction[]) {
    if (!item || typeof item.actionKey !== 'string') continue
    const def = actionDef(item.actionKey)
    views.push({
      actionKey: item.actionKey,
      label: def?.label ?? item.actionKey,
      description: def?.description ?? 'Custom action.',
      requiresApproval: def?.requiresApproval ?? false,
      input:
        item.input && typeof item.input === 'object' && !Array.isArray(item.input)
          ? (item.input as Record<string, unknown>)
          : {},
    })
  }
  return views
}

async function ownerNames(ctx: WorkspaceContext, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return map
  const { data } = await ctx.supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', unique)
  for (const p of data ?? []) map.set(p.id, p.full_name ?? p.email ?? '')
  return map
}

/** Latest run per automation id, in one query. */
async function latestRuns(
  ctx: WorkspaceContext,
  automationIds: string[],
): Promise<Map<string, RunRecord>> {
  const map = new Map<string, RunRecord>()
  if (automationIds.length === 0) return map
  const { data } = await ctx.supabase
    .from('automation_runs')
    .select('*')
    .eq('workspace_id', ctx.workspace.id)
    .in('automation_id', automationIds)
    .order('started_at', { ascending: false })
  for (const run of (data ?? []) as RunRecord[]) {
    if (!map.has(run.automation_id)) map.set(run.automation_id, run)
  }
  return map
}

export interface GetAutomationsFilters {
  status?: AutomationStatus
  search?: string
}

export async function getAutomations(
  ctx: WorkspaceContext,
  filters: GetAutomationsFilters = {},
): Promise<AutomationListRow[]> {
  let query = ctx.supabase
    .from('automations')
    .select('*')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)

  const { data: raw } = await query
  const rows = (raw ?? []) as AutomationRow[]
  if (rows.length === 0) return []

  const [names, runs] = await Promise.all([
    ownerNames(
      ctx,
      rows.map((r) => r.owner_user_id).filter((id): id is string => !!id),
    ),
    latestRuns(
      ctx,
      rows.map((r) => r.id),
    ),
  ])

  return rows.map((r) => {
    const def = triggerDef(r.trigger_event_type)
    const run = runs.get(r.id)
    return {
      id: r.id,
      name: r.name,
      status: r.status,
      triggerEventType: r.trigger_event_type,
      triggerLabel: triggerLabel(r.trigger_event_type),
      triggerModule: def?.module ?? null,
      actionCount: Array.isArray(r.actions) ? r.actions.length : 0,
      ownerName: r.owner_user_id ? (names.get(r.owner_user_id) ?? null) : null,
      lastRunAt: run?.started_at ?? null,
      lastRunStatus: run?.status ?? null,
      updatedAt: r.updated_at,
    }
  })
}

export async function getAutomation(
  ctx: WorkspaceContext,
  id: string,
): Promise<AutomationDetail | null> {
  const { data: raw } = await ctx.supabase
    .from('automations')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!raw) return null
  const r = raw as AutomationRow

  const names = r.owner_user_id
    ? await ownerNames(ctx, [r.owner_user_id])
    : new Map<string, string>()
  const def = triggerDef(r.trigger_event_type)
  const policy = (r.error_policy ?? {}) as Record<string, unknown>

  return {
    id: r.id,
    name: r.name,
    status: r.status,
    triggerEventType: r.trigger_event_type,
    triggerLabel: triggerLabel(r.trigger_event_type),
    triggerHint: def?.hint ?? null,
    triggerFilter:
      r.trigger_filter && typeof r.trigger_filter === 'object' && !Array.isArray(r.trigger_filter)
        ? (r.trigger_filter as Record<string, unknown>)
        : {},
    actions: toActionViews(r.actions),
    errorPolicy: {
      retryCount: typeof policy.retryCount === 'number' ? policy.retryCount : 0,
      circuitBreakAfter:
        typeof policy.circuitBreakAfter === 'number' ? policy.circuitBreakAfter : 5,
      notifyOwner: policy.notifyOwner !== false,
    },
    ownerName: r.owner_user_id ? (names.get(r.owner_user_id) ?? null) : null,
    scope: r.scope,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function getAutomationRuns(
  ctx: WorkspaceContext,
  automationId: string,
  limit = 20,
): Promise<RunRow[]> {
  const { data } = await ctx.supabase
    .from('automation_runs')
    .select('*')
    .eq('workspace_id', ctx.workspace.id)
    .eq('automation_id', automationId)
    .order('started_at', { ascending: false })
    .limit(limit)
  return ((data ?? []) as RunRecord[]).map((r) => {
    const err = r.error as { message?: unknown } | null
    return {
      id: r.id,
      status: r.status,
      stepCount: Array.isArray(r.step_results) ? r.step_results.length : 0,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      error: err && typeof err.message === 'string' ? err.message : null,
    }
  })
}

export async function getAutomationOverview(ctx: WorkspaceContext): Promise<AutomationOverview> {
  const sinceIso = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [{ data: autos }, { data: runs }] = await Promise.all([
    ctx.supabase
      .from('automations')
      .select('status')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null),
    ctx.supabase
      .from('automation_runs')
      .select('status')
      .eq('workspace_id', ctx.workspace.id)
      .gte('started_at', sinceIso),
  ])

  const a = autos ?? []
  const r = runs ?? []
  return {
    total: a.length,
    active: a.filter((x) => x.status === 'active').length,
    paused: a.filter((x) => x.status === 'paused').length,
    draft: a.filter((x) => x.status === 'draft').length,
    runsLast30d: r.length,
    failuresLast30d: r.filter((x) => x.status === 'failed').length,
  }
}

/** A compact summary of existing automations, fed to the AI assistant as context. */
export async function getAutomationsSummary(ctx: WorkspaceContext): Promise<string> {
  const { data } = await ctx.supabase
    .from('automations')
    .select('name, status, trigger_event_type, actions')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(25)
  const rows = data ?? []
  if (rows.length === 0) return 'None yet.'
  return rows
    .map((r) => {
      const count = Array.isArray(r.actions) ? r.actions.length : 0
      return `- "${r.name}" [${r.status}] on ${triggerLabel(r.trigger_event_type)} → ${count} action${count === 1 ? '' : 's'}`
    })
    .join('\n')
}
