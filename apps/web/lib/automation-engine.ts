import 'server-only'

import type { AutomationStepResult } from '@aurexos/core'
import type { Tables } from '@aurexos/db'
import { buildWorkspaceGateway } from '@/lib/ai/gateway'
import { isAiConfigured } from '@/lib/env'
import type { WorkspaceContext } from '@/lib/workspace-context'

// The automation execution engine (06_Module_Breakdown.md §17). It is the single
// consumer of the domain-event spine: emitDomainEvent calls dispatchAutomationsForEvent
// after writing each event, so an active automation runs wherever its trigger
// fires — system-wide, without any module knowing automations exist (R-A6).
//
// Design constraints honored here:
// - automation_runs is INSERT-ONLY under RLS (0011), so a run is executed fully
//   in memory and inserted once in its final state — never updated.
// - Best-effort: a failure in the engine must never break the mutation that
//   emitted the event. Everything is wrapped; the caller awaits but is shielded.
// - Loop-safe (v1): the engine never reacts to automation.* / ai.* events, and
//   executed actions write rows directly WITHOUT emitting their own domain events,
//   so no automation can trigger another this pass (chaining is a Phase-3 add).
// - Runs with the CREATOR's standing: if the owner is no longer a workspace
//   member, the automation is paused instead of run (§17 orphaned-privilege rule).

export interface DispatchEvent {
  eventType: string
  entityType: string
  entityId: string
  payload: Record<string, unknown>
}

type AutomationRow = Tables<'automations'>

interface RawAction {
  actionKey?: unknown
  input?: unknown
}

/** Events the engine must never react to — prevents self-triggering loops. */
function isInert(eventType: string): boolean {
  return eventType.startsWith('automation.') || eventType.startsWith('ai.')
}

/** Shallow equality match of a trigger filter against the event payload. */
function filterMatches(filter: unknown, payload: Record<string, unknown>): boolean {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return true
  for (const [key, expected] of Object.entries(filter as Record<string, unknown>)) {
    if (payload[key] !== expected) return false
  }
  return true
}

function actionInput(raw: RawAction): Record<string, unknown> {
  return raw.input && typeof raw.input === 'object' && !Array.isArray(raw.input)
    ? (raw.input as Record<string, unknown>)
    : {}
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/**
 * Entry point, called from emitDomainEvent. Never throws — all failures are
 * swallowed and logged so the triggering mutation is never affected.
 */
export async function dispatchAutomationsForEvent(
  ctx: WorkspaceContext,
  event: DispatchEvent,
): Promise<void> {
  try {
    if (isInert(event.eventType)) return

    // Fast path: one indexed lookup (automations_trigger_idx). Most events match
    // nothing and return here with a single cheap query.
    const { data } = await ctx.supabase
      .from('automations')
      .select('*')
      .eq('workspace_id', ctx.workspace.id)
      .eq('status', 'active')
      .eq('trigger_event_type', event.eventType)
      .is('deleted_at', null)
    const automations = (data ?? []) as AutomationRow[]
    if (automations.length === 0) return

    const memberIds = await workspaceMemberIds(ctx)

    for (const automation of automations) {
      if (!filterMatches(automation.trigger_filter, event.payload)) continue

      // Orphaned-privilege guard (§17): pause automations whose owner has left.
      if (automation.owner_user_id && !memberIds.has(automation.owner_user_id)) {
        await pauseAutomation(ctx, automation.id)
        continue
      }

      await runAutomation(ctx, automation, event, memberIds)
    }
  } catch (error) {
    console.error('automation-engine dispatch failed:', error)
  }
}

async function runAutomation(
  ctx: WorkspaceContext,
  automation: AutomationRow,
  event: DispatchEvent,
  memberIds: Set<string>,
): Promise<void> {
  const startedAt = new Date().toISOString()
  const actions = Array.isArray(automation.actions) ? (automation.actions as RawAction[]) : []
  const results: AutomationStepResult[] = []

  for (const raw of actions) {
    const actionKey = typeof raw.actionKey === 'string' ? raw.actionKey : ''
    const startedMs = Date.now()
    try {
      const outcome = await executeAction(ctx, {
        actionKey,
        input: actionInput(raw),
        automationName: automation.name,
        ownerId: automation.owner_user_id,
        event,
        memberIds,
      })
      results.push({
        actionKey,
        status: outcome.status,
        ...(outcome.output !== undefined ? { output: outcome.output } : {}),
        durationMs: Date.now() - startedMs,
      })
    } catch (error) {
      results.push({
        actionKey,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedMs,
      })
    }
  }

  const failed = results.some((r) => r.status === 'failed')

  // Insert the run in its final state (automation_runs is insert-only under RLS).
  await ctx.supabase.from('automation_runs').insert({
    workspace_id: ctx.workspace.id,
    automation_id: automation.id,
    status: failed ? 'failed' : 'succeeded',
    step_results: results as Tables<'automation_runs'>['step_results'],
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    ...(failed
      ? { error: { message: 'One or more actions failed' } as Tables<'automation_runs'>['error'] }
      : {}),
  })
}

interface ExecuteArgs {
  actionKey: string
  input: Record<string, unknown>
  automationName: string
  ownerId: string | null
  event: DispatchEvent
  memberIds: Set<string>
}

interface ActionOutcome {
  status: 'succeeded' | 'skipped'
  output?: string
}

/**
 * Executes one action with the acting request's client (RLS applies). Handlers
 * write rows DIRECTLY and never emit domain events, so a run cannot cascade into
 * another automation this pass. Outbound/AI-send actions never send — they open
 * a review task instead (R-AI3).
 */
async function executeAction(ctx: WorkspaceContext, args: ExecuteArgs): Promise<ActionOutcome> {
  const { actionKey, input, event } = args

  switch (actionKey) {
    case 'notify.team': {
      const message =
        str(input.message) ?? `“${args.automationName}” ran on ${humanEvent(event.eventType)}.`
      const recipients = [...args.memberIds]
      if (recipients.length === 0) return { status: 'skipped', output: 'No members to notify' }
      const rows = recipients.map((userId) => ({
        workspace_id: ctx.workspace.id,
        user_id: userId,
        type: 'automation',
        title: args.automationName,
        body: message,
        entity_type: event.entityType,
        entity_id: isUuid(event.entityId) ? event.entityId : null,
      }))
      const { error } = await ctx.supabase.from('notifications').insert(rows)
      if (error) throw new Error(error.message)
      return { status: 'succeeded', output: `Notified ${recipients.length} member(s)` }
    }

    case 'tasks.create': {
      const title = str(input.title) ?? `Follow up: ${humanEvent(event.eventType)}`
      const dueDate = dueInDays(input.dueInDays)
      const { error } = await ctx.supabase.from('tasks').insert({
        workspace_id: ctx.workspace.id,
        title,
        status: 'todo',
        priority: 'none',
        reporter_id: args.ownerId ?? ctx.userId,
        ...(dueDate ? { due_date: dueDate } : {}),
      })
      if (error) throw new Error(error.message)
      return { status: 'succeeded', output: `Created task “${title}”` }
    }

    case 'ai.summarize': {
      if (!isAiConfigured()) {
        return { status: 'skipped', output: 'AI not configured — add ANTHROPIC_API_KEY' }
      }
      const gateway = buildWorkspaceGateway(ctx)
      const response = await gateway.complete({
        tier: 'light',
        feature: 'automations.action.summarize',
        workspaceId: ctx.workspace.id,
        userId: ctx.userId,
        messages: [
          {
            role: 'user',
            content: `In one or two sentences, summarize this workspace event for a busy teammate.\nEvent: ${humanEvent(
              event.eventType,
            )}\nDetails: ${JSON.stringify(event.payload).slice(0, 800)}`,
          },
        ],
        maxTokens: 160,
        temperature: 0.3,
      })
      return { status: 'succeeded', output: response.text.trim() }
    }

    case 'email.draft':
    case 'finance.reminder_draft': {
      // Never sends (R-AI3): opens a review task so a human sends it.
      const label = actionKey === 'email.draft' ? 'email' : 'payment reminder'
      const title = `Review & send ${label}: ${humanEvent(event.eventType)}`
      const { error } = await ctx.supabase.from('tasks').insert({
        workspace_id: ctx.workspace.id,
        title,
        status: 'todo',
        priority: 'medium',
        reporter_id: args.ownerId ?? ctx.userId,
      })
      if (error) throw new Error(error.message)
      return { status: 'succeeded', output: `Opened review task for the ${label}` }
    }

    case 'automation.delay':
      return { status: 'skipped', output: 'Delays run in the queued engine (Phase 3)' }

    default:
      return { status: 'skipped', output: `Unknown action “${actionKey}”` }
  }
}

async function workspaceMemberIds(ctx: WorkspaceContext): Promise<Set<string>> {
  const { data } = await ctx.supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', ctx.workspace.id)
  return new Set((data ?? []).map((m) => m.user_id))
}

async function pauseAutomation(ctx: WorkspaceContext, id: string): Promise<void> {
  await ctx.supabase
    .from('automations')
    .update({ status: 'paused' })
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
}

function humanEvent(eventType: string): string {
  return eventType.split('.').slice(1).join(' ').replace(/_/g, ' ') || eventType
}

function dueInDays(value: unknown): string | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(n) || n < 0) return null
  return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
