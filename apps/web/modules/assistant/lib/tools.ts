import 'server-only'

import { z } from 'zod'
import { formatMoney, TASK_PRIORITIES, type ProposedAction } from '@aurexos/core'
import type { ToolSpec } from '@aurexos/ai'
import type { WorkspaceContext } from '@/lib/workspace-context'

// Aurex tools. Read tools (Phase 2) are typed, RLS-scoped reads the model calls
// to look things up itself. Write tools (Phase 3) NEVER mutate — they return a
// ProposedAction the user must approve; only the explicit human Approve runs the
// real mutation, through the normal spine (R-AI3). The model's raw input is never
// trusted: every tool validates with Zod before it touches anything.

export interface AgentTool {
  readonly spec: ToolSpec
  /** Write tools return `{ proposal }` and never mutate; gated on this permission. */
  readonly requiredPermission?: string
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

// ── create_task (write tool — proposes, never creates) ─────────────────────────
// Canonical proposal args; re-validated at approval time before the real mutation.
export const CreateTaskProposalArgs = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(4000).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: z.string().nullable().optional(),
  assignToMe: z.boolean().optional(),
})
export type CreateTaskProposalArgs = z.infer<typeof CreateTaskProposalArgs>

const CreateTaskToolInput = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(4000).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueInDays: z.number().int().min(0).max(365).optional(),
  assignToMe: z.boolean().optional(),
})

const createTaskTool: AgentTool = {
  requiredPermission: 'tasks.task.create',
  spec: {
    name: 'create_task',
    description:
      'Propose creating a task. Provide title, and optionally description, priority (none/low/medium/high/urgent), dueInDays (0 = today, 1 = tomorrow …), and assignToMe. IMPORTANT: this does NOT create the task — it proposes it for the user to approve. After calling it, tell the user you have proposed the task and they can approve it.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: [...TASK_PRIORITIES] },
        dueInDays: { type: 'number', description: '0 = today, 1 = tomorrow.' },
        assignToMe: { type: 'boolean' },
      },
      required: ['title'],
    },
  },
  async run(_ctx, raw) {
    const p = CreateTaskToolInput.safeParse(raw)
    if (!p.success) return { error: 'invalid input for create_task' }
    const { title, description, priority, dueInDays, assignToMe } = p.data
    const dueDate =
      dueInDays === undefined
        ? null
        : new Date(Date.now() + dueInDays * 86_400_000).toISOString().slice(0, 10)
    const args: CreateTaskProposalArgs = {
      title,
      ...(description ? { description } : {}),
      ...(priority && priority !== 'none' ? { priority } : {}),
      dueDate,
      assignToMe: assignToMe ?? false,
    }
    const parts = [`Create a task “${title}”`]
    if (priority && priority !== 'none') parts.push(`· ${priority} priority`)
    if (dueDate) parts.push(`· due ${dueDate}`)
    if (assignToMe) parts.push('· assigned to you')
    const proposal: ProposedAction = { kind: 'create_task', summary: parts.join(' '), args }
    return { proposal }
  },
}

// ── Registry ───────────────────────────────────────────────────────────────────
export const READ_TOOLS: readonly AgentTool[] = [listTasks, listDeals, listInvoices, listProjects]
export const WRITE_TOOLS: readonly AgentTool[] = [createTaskTool]

const ALL_TOOLS: readonly AgentTool[] = [...READ_TOOLS, ...WRITE_TOOLS]
const TOOL_BY_NAME = new Map(ALL_TOOLS.map((t) => [t.spec.name, t]))

export function readToolSpecs(): ToolSpec[] {
  return READ_TOOLS.map((t) => t.spec)
}

export function agentTool(name: string): AgentTool | undefined {
  return TOOL_BY_NAME.get(name)
}

/** True when a tool's `run` returned a proposal instead of data. */
export function isProposalResult(v: unknown): v is { proposal: ProposedAction } {
  return typeof v === 'object' && v !== null && 'proposal' in v
}
