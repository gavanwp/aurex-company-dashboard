import 'server-only'

import type { WorkspaceContext } from '@/lib/workspace-context'
import type { ClientOption, ProjectDetailData, ProjectListRow } from '../types'

/**
 * List projects (not deleted) with client name, owner profile, and open/total
 * task counts. Tasks are fetched in ONE query and counted in JS — no N+1.
 */
export async function getProjects(ctx: WorkspaceContext): Promise<ProjectListRow[]> {
  const { data: projects } = await ctx.supabase
    .from('projects')
    .select('id, name, code, color, status, client_id, start_date, due_date, owner_id')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (!projects || projects.length === 0) return []

  const clientIds = [...new Set(projects.map((p) => p.client_id).filter((id): id is string => !!id))]
  const ownerIds = [...new Set(projects.map((p) => p.owner_id).filter((id): id is string => !!id))]

  const [tasksRes, clientsRes, ownersRes] = await Promise.all([
    ctx.supabase
      .from('tasks')
      .select('project_id, status')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null)
      .not('project_id', 'is', null),
    clientIds.length > 0
      ? ctx.supabase
          .from('clients')
          .select('id, name')
          .eq('workspace_id', ctx.workspace.id)
          .in('id', clientIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ownerIds.length > 0
      ? ctx.supabase.from('profiles').select('id, full_name, avatar_url').in('id', ownerIds)
      : Promise.resolve({
          data: [] as { id: string; full_name: string | null; avatar_url: string | null }[],
        }),
  ])

  const counts = new Map<string, { open: number; total: number; done: number }>()
  for (const task of tasksRes.data ?? []) {
    if (!task.project_id) continue
    const entry = counts.get(task.project_id) ?? { open: 0, total: 0, done: 0 }
    entry.total += 1
    if (task.status === 'done') entry.done += 1
    else if (task.status !== 'canceled') entry.open += 1
    counts.set(task.project_id, entry)
  }

  const clientById = new Map((clientsRes.data ?? []).map((c) => [c.id, c]))
  const ownerById = new Map((ownersRes.data ?? []).map((o) => [o.id, o]))

  return projects.map((p) => {
    const count = counts.get(p.id)
    const owner = p.owner_id ? ownerById.get(p.owner_id) : undefined
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      color: p.color,
      status: p.status,
      clientId: p.client_id,
      clientName: (p.client_id && clientById.get(p.client_id)?.name) || null,
      startDate: p.start_date,
      dueDate: p.due_date,
      owner: owner ? { id: owner.id, fullName: owner.full_name, avatarUrl: owner.avatar_url } : null,
      openTasks: count?.open ?? 0,
      totalTasks: count?.total ?? 0,
      doneTasks: count?.done ?? 0,
    }
  })
}

/** Single project (not deleted) with client and owner profile resolved. */
export async function getProject(
  ctx: WorkspaceContext,
  projectId: string,
): Promise<ProjectDetailData | null> {
  const { data: project } = await ctx.supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!project) return null

  const [clientRes, ownerRes] = await Promise.all([
    project.client_id
      ? ctx.supabase
          .from('clients')
          .select('id, name')
          .eq('workspace_id', ctx.workspace.id)
          .eq('id', project.client_id)
          .is('deleted_at', null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    project.owner_id
      ? ctx.supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', project.owner_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return {
    id: project.id,
    name: project.name,
    code: project.code,
    color: project.color,
    status: project.status,
    description: project.description,
    startDate: project.start_date,
    dueDate: project.due_date,
    budgetCents: project.budget_cents,
    createdAt: project.created_at,
    client: clientRes.data ? { id: clientRes.data.id, name: clientRes.data.name } : null,
    owner: ownerRes.data
      ? {
          id: ownerRes.data.id,
          fullName: ownerRes.data.full_name,
          avatarUrl: ownerRes.data.avatar_url,
        }
      : null,
  }
}

/** Client list for the project create/edit pickers. */
export async function getClientOptions(ctx: WorkspaceContext): Promise<ClientOption[]> {
  const { data } = await ctx.supabase
    .from('clients')
    .select('id, name')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('name', { ascending: true })
  return (data ?? []).map((c) => ({ id: c.id, name: c.name }))
}
