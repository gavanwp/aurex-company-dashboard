import 'server-only'

import { z } from 'zod'
import { formatMoney } from '@aurexos/core'
import type { ToolSpec } from '@aurexos/ai'
import type { WorkspaceContext } from '@/lib/workspace-context'

// Aurex read-tools (Phase 2 — the agent leap). Each tool is a typed, RLS-scoped
// read the model can call to look things up itself, instead of guessing. The
// model's raw input is NEVER trusted: every tool validates with Zod before it
// touches the database, and results are bounded + projected to the fields that
// matter. Read-only by design — no tool mutates (that's Phase 3, with approvals).

export interface AgentTool {
  readonly spec: ToolSpec
  run(ctx: WorkspaceContext, rawInput: unknown): Promise<unknown>
}

const OPEN_TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'in_review'] as const
const OUTSTANDING = ['sent', 'viewed', 'partial', 'overdue'] as const

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function clampLimit(n: number | undefined, def = 15, max = 30): number {
  return Math.min(Math.max(1, n ?? def), max)
}

// ── list_tasks ────────────────────────────────────────────────────────────────
const ListTasksInput = z.object({
  assignedToMe: z.boolean().optional(),
  status: z.enum(['open', 'overdue', 'done', 'all']).optional(),
  limit: z.number().int().positive().max(30).optional(),
})

const listTasks: AgentTool = {
  spec: {
    name: 'list_tasks',
    description:
      'List tasks in the workspace. Use assignedToMe to scope to the current user. status: "open" (not done/cancelled), "overdue" (open and past due date), "done", or "all". Returns titles, status, priority and due dates.',
    inputSchema: {
      type: 'object',
      properties: {
        assignedToMe: { type: 'boolean', description: 'Only tasks assigned to the current user.' },
        status: { type: 'string', enum: ['open', 'overdue', 'done', 'all'] },
        limit: { type: 'number', description: 'Max rows (default 15, max 30).' },
      },
    },
  },
  async run(ctx, raw) {
    const p = ListTasksInput.safeParse(raw)
    if (!p.success) return { error: 'invalid input for list_tasks' }
    const { assignedToMe, status = 'open', limit } = p.data
    let q = ctx.supabase
      .from('tasks')
      .select('title, status, priority, due_date, assignee_id')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(clampLimit(limit))
    if (assignedToMe) q = q.eq('assignee_id', ctx.userId)
    if (status === 'open' || status === 'overdue') q = q.in('status', OPEN_TASK_STATUSES)
    if (status === 'overdue') q = q.lt('due_date', todayIso())
    if (status === 'done') q = q.eq('status', 'done')
    const { data, error } = await q
    if (error) return { error: 'could not list tasks' }
    return {
      count: data?.length ?? 0,
      tasks: (data ?? []).map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.due_date,
        assignedToMe: t.assignee_id === ctx.userId,
      })),
    }
  },
}

// ── list_deals ────────────────────────────────────────────────────────────────
const ListDealsInput = z.object({
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).optional(),
  limit: z.number().int().positive().max(30).optional(),
})

const listDeals: AgentTool = {
  spec: {
    name: 'list_deals',
    description:
      'List CRM deals (the sales pipeline). Optionally filter by stage (lead, qualified, proposal, negotiation, won, lost). Returns title, stage, value and expected close date.',
    inputSchema: {
      type: 'object',
      properties: {
        stage: {
          type: 'string',
          enum: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
        },
        limit: { type: 'number', description: 'Max rows (default 15, max 30).' },
      },
    },
  },
  async run(ctx, raw) {
    const p = ListDealsInput.safeParse(raw)
    if (!p.success) return { error: 'invalid input for list_deals' }
    const { stage, limit } = p.data
    let q = ctx.supabase
      .from('crm_deals')
      .select('title, stage, value_cents, currency, expected_close_date, probability')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('value_cents', { ascending: false, nullsFirst: false })
      .limit(clampLimit(limit))
    if (stage) q = q.eq('stage', stage)
    const { data, error } = await q
    if (error) return { error: 'could not list deals' }
    return {
      count: data?.length ?? 0,
      deals: (data ?? []).map((d) => ({
        title: d.title,
        stage: d.stage,
        value: formatMoney(d.value_cents ?? 0, d.currency),
        probability: d.probability,
        expectedCloseDate: d.expected_close_date,
      })),
    }
  },
}

// ── list_invoices ─────────────────────────────────────────────────────────────
const ListInvoicesInput = z.object({
  status: z
    .enum(['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void', 'outstanding'])
    .optional(),
  limit: z.number().int().positive().max(30).optional(),
})

const listInvoices: AgentTool = {
  spec: {
    name: 'list_invoices',
    description:
      'List invoices. status can be a specific status or "outstanding" (sent, viewed, partial or overdue — i.e. owed but unpaid). Returns number, status, total and due date.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void', 'outstanding'],
        },
        limit: { type: 'number', description: 'Max rows (default 15, max 30).' },
      },
    },
  },
  async run(ctx, raw) {
    const p = ListInvoicesInput.safeParse(raw)
    if (!p.success) return { error: 'invalid input for list_invoices' }
    const { status, limit } = p.data
    let q = ctx.supabase
      .from('invoices')
      .select('number, status, total_minor, currency, due_date')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(clampLimit(limit))
    if (status === 'outstanding') q = q.in('status', OUTSTANDING)
    else if (status) q = q.eq('status', status)
    const { data, error } = await q
    if (error) return { error: 'could not list invoices' }
    return {
      count: data?.length ?? 0,
      invoices: (data ?? []).map((i) => ({
        number: i.number,
        status: i.status,
        total: formatMoney(i.total_minor, i.currency),
        dueDate: i.due_date,
      })),
    }
  },
}

// ── list_projects ─────────────────────────────────────────────────────────────
const ListProjectsInput = z.object({
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  limit: z.number().int().positive().max(30).optional(),
})

const listProjects: AgentTool = {
  spec: {
    name: 'list_projects',
    description:
      'List projects. Optionally filter by status (planning, active, on_hold, completed, archived). Returns name, status, code and due date.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['planning', 'active', 'on_hold', 'completed', 'archived'],
        },
        limit: { type: 'number', description: 'Max rows (default 15, max 30).' },
      },
    },
  },
  async run(ctx, raw) {
    const p = ListProjectsInput.safeParse(raw)
    if (!p.success) return { error: 'invalid input for list_projects' }
    const { status, limit } = p.data
    let q = ctx.supabase
      .from('projects')
      .select('name, status, code, due_date')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(clampLimit(limit))
    if (status) q = q.eq('status', status)
    const { data, error } = await q
    if (error) return { error: 'could not list projects' }
    return {
      count: data?.length ?? 0,
      projects: (data ?? []).map((pr) => ({
        name: pr.name,
        status: pr.status,
        code: pr.code,
        dueDate: pr.due_date,
      })),
    }
  },
}

/** The Aurex agent toolset (read-only). */
export const AGENT_TOOLS: readonly AgentTool[] = [listTasks, listDeals, listInvoices, listProjects]

const TOOL_BY_NAME = new Map(AGENT_TOOLS.map((t) => [t.spec.name, t]))

export function agentToolSpecs(): ToolSpec[] {
  return AGENT_TOOLS.map((t) => t.spec)
}

export function agentTool(name: string): AgentTool | undefined {
  return TOOL_BY_NAME.get(name)
}
