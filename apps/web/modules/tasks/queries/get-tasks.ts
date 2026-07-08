import 'server-only'

import type { WorkspaceContext } from '@/lib/workspace-context'
import type { MemberOption, ProjectOption, TaskRow } from '../types'

export interface TaskFilters {
  projectId?: string
  assigneeId?: string
}

/**
 * List tasks (not deleted, workspace-scoped) with their project and assignee
 * profile resolved in JS — the generated types carry no FK relationships, so
 * embedded selects are avoided on purpose (same pattern as settings).
 */
export async function getTasks(ctx: WorkspaceContext, filters?: TaskFilters): Promise<TaskRow[]> {
  let query = ctx.supabase
    .from('tasks')
    .select(
      'id, project_id, title, description, status, priority, assignee_id, due_date, labels, position, created_at',
    )
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })

  if (filters?.projectId) query = query.eq('project_id', filters.projectId)
  if (filters?.assigneeId) query = query.eq('assignee_id', filters.assigneeId)

  const { data: tasks } = await query
  if (!tasks || tasks.length === 0) return []

  const projectIds = [...new Set(tasks.map((t) => t.project_id).filter((id): id is string => !!id))]
  const assigneeIds = [
    ...new Set(tasks.map((t) => t.assignee_id).filter((id): id is string => !!id)),
  ]

  const [projectsRes, profilesRes] = await Promise.all([
    projectIds.length > 0
      ? ctx.supabase
          .from('projects')
          .select('id, name, color')
          .eq('workspace_id', ctx.workspace.id)
          .in('id', projectIds)
      : Promise.resolve({ data: [] as { id: string; name: string; color: string | null }[] }),
    assigneeIds.length > 0
      ? ctx.supabase.from('profiles').select('id, full_name, avatar_url').in('id', assigneeIds)
      : Promise.resolve({
          data: [] as { id: string; full_name: string | null; avatar_url: string | null }[],
        }),
  ])

  const projectById = new Map((projectsRes.data ?? []).map((p) => [p.id, p]))
  const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]))

  return tasks.map((t) => {
    const project = t.project_id ? projectById.get(t.project_id) : undefined
    const assignee = t.assignee_id ? profileById.get(t.assignee_id) : undefined
    return {
      id: t.id,
      projectId: t.project_id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assigneeId: t.assignee_id,
      dueDate: t.due_date,
      labels: t.labels,
      position: t.position,
      createdAt: t.created_at,
      project: project ? { id: project.id, name: project.name, color: project.color } : null,
      assignee: assignee
        ? { id: assignee.id, fullName: assignee.full_name, avatarUrl: assignee.avatar_url }
        : null,
    }
  })
}

/** Workspace members (joined to profiles) for assignee pickers. */
export async function getMembers(ctx: WorkspaceContext): Promise<MemberOption[]> {
  const { data: members } = await ctx.supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', ctx.workspace.id)
    .order('created_at', { ascending: true })
  if (!members || members.length === 0) return []

  const { data: profiles } = await ctx.supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in(
      'id',
      members.map((m) => m.user_id),
    )
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  return members.flatMap((m) => {
    const profile = profileById.get(m.user_id)
    if (!profile) return []
    return [
      {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        avatarUrl: profile.avatar_url,
      },
    ]
  })
}

/** Lightweight project list for project pickers (create dialog, chips). */
export async function getProjectOptions(ctx: WorkspaceContext): Promise<ProjectOption[]> {
  const { data } = await ctx.supabase
    .from('projects')
    .select('id, name, color')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('name', { ascending: true })
  return (data ?? []).map((p) => ({ id: p.id, name: p.name, color: p.color }))
}
