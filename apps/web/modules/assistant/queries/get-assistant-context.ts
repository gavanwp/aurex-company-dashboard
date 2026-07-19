import 'server-only'

import { formatMoney } from '@aurexos/core'
import type { WorkspaceContext } from '@/lib/workspace-context'

// The live workspace snapshot Aurex is grounded in (Phase 1: read-only summary,
// no per-record tools yet). Everything is RLS-scoped to the acting principal, so
// "your tasks" really means theirs. Kept compact — this text goes into the prompt.

const OPEN_TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'in_review'] as const
const ACTIVE_PROJECT_STATUSES = ['planning', 'active', 'on_hold'] as const
const OPEN_DEAL_STAGES = ['lead', 'qualified', 'proposal', 'negotiation'] as const
const OUTSTANDING_INVOICE_STATUSES = ['sent', 'viewed', 'partial', 'overdue'] as const

export interface AssistantContext {
  workspaceName: string
  userDisplayName: string
  userRole: string
  todayIso: string
  /** Compact snapshot text rendered into the system prompt. */
  snapshot: string
  /** Starter prompts for the empty state, tailored to what's in the workspace. */
  suggestions: string[]
}

export async function getAssistantContext(ctx: WorkspaceContext): Promise<AssistantContext> {
  const { supabase, userId, workspace, profile, role } = ctx
  const todayIso = new Date().toISOString().slice(0, 10)

  const [
    { count: myOpenTasks },
    { count: myOverdueTasks },
    { count: activeProjects },
    { count: teamSize },
    { data: openDeals },
    { data: outstanding },
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .eq('assignee_id', userId)
      .is('deleted_at', null)
      .in('status', OPEN_TASK_STATUSES),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .eq('assignee_id', userId)
      .is('deleted_at', null)
      .in('status', OPEN_TASK_STATUSES)
      .lt('due_date', todayIso),
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .is('deleted_at', null)
      .in('status', ACTIVE_PROJECT_STATUSES),
    supabase
      .from('workspace_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id),
    supabase
      .from('crm_deals')
      .select('value_cents, currency')
      .eq('workspace_id', workspace.id)
      .is('deleted_at', null)
      .in('stage', OPEN_DEAL_STAGES)
      .limit(1000),
    supabase
      .from('invoices')
      .select('total_minor, currency')
      .eq('workspace_id', workspace.id)
      .is('deleted_at', null)
      .in('status', OUTSTANDING_INVOICE_STATUSES)
      .limit(1000),
  ])

  const dealRows = openDeals ?? []
  const pipelineCents = dealRows.reduce((sum, d) => sum + (d.value_cents ?? 0), 0)
  const dealCurrency = dealRows[0]?.currency ?? 'USD'
  const invRows = outstanding ?? []
  const arMinor = invRows.reduce((sum, i) => sum + (i.total_minor ?? 0), 0)
  const invCurrency = invRows[0]?.currency ?? 'USD'

  const overdue = myOverdueTasks ?? 0
  const snapshot = [
    `Your open tasks: ${myOpenTasks ?? 0}${overdue > 0 ? ` (${overdue} overdue)` : ''}`,
    `Active projects: ${activeProjects ?? 0}`,
    `Team members: ${teamSize ?? 0}`,
    dealRows.length > 0
      ? `Open pipeline: ${dealRows.length} deals worth ${formatMoney(pipelineCents, dealCurrency)}`
      : 'Open pipeline: no active deals',
    invRows.length > 0
      ? `Outstanding invoices: ${invRows.length} totalling ${formatMoney(arMinor, invCurrency)}`
      : 'Outstanding invoices: none',
  ].join('\n')

  const suggestions = [
    overdue > 0
      ? 'What are my overdue tasks and what should I prioritise?'
      : 'What should I focus on today?',
    dealRows.length > 0 ? 'Give me a read on my sales pipeline.' : 'What can you help me with?',
    invRows.length > 0 ? 'How much is outstanding across invoices?' : 'How does AurexOS work?',
  ]

  return {
    workspaceName: workspace.name,
    userDisplayName: profile.full_name ?? profile.email ?? 'there',
    userRole: role.replace(/_/g, ' '),
    todayIso,
    snapshot,
    suggestions,
  }
}
