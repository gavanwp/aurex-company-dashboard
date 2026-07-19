import 'server-only'

import type { WorkspaceContext } from '@/lib/workspace-context'

// Read model for /settings/profile. Every field is real: the member's profiles
// row, their resolved role name, live counts (active projects, their open tasks,
// team size), their recent audit trail, and any connected mailboxes.

export interface ProfileStat {
  key: string
  label: string
  value: number
}

export interface ProfileActivity {
  id: string
  action: string
  label: string
  at: string
}

export interface ProfileConnection {
  provider: string
  address: string
  status: string
  connected: boolean
}

export interface ProfileOverview {
  id: string
  fullName: string
  email: string
  avatarUrl: string | null
  title: string | null
  timezone: string | null
  location: string | null
  roleName: string
  joinedAt: string
  stats: ProfileStat[]
  activity: ProfileActivity[]
  connections: ProfileConnection[]
}

const ACTIVE_PROJECT_STATUSES = ['planning', 'active', 'on_hold'] as const
const OPEN_TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'in_review'] as const

/** Turn an audit action key (module.entity.verb) into a human label. */
function humanizeAction(action: string): string {
  const parts = action.split('.')
  const verb = (parts[parts.length - 1] ?? action).replace(/_/g, ' ')
  const entity = (parts[parts.length - 2] ?? '').replace(/_/g, ' ')
  const label = entity ? `${verb} ${entity}` : verb
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export async function getProfileOverview(ctx: WorkspaceContext): Promise<ProfileOverview> {
  const { supabase, userId, workspace, profile } = ctx

  const [
    membership,
    { count: activeProjects },
    { count: openTasks },
    { count: teamSize },
    { data: activityRows },
    { data: connectionRows },
  ] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('role_id, role, created_at')
      .eq('workspace_id', workspace.id)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .is('deleted_at', null)
      .in('status', ACTIVE_PROJECT_STATUSES),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .eq('assignee_id', userId)
      .is('deleted_at', null)
      .in('status', OPEN_TASK_STATUSES),
    supabase
      .from('workspace_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id),
    supabase
      .from('audit_log')
      .select('id, action, created_at')
      .eq('workspace_id', workspace.id)
      .eq('actor_id', userId)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('mailbox_connections')
      .select('provider, address, status')
      .eq('workspace_id', workspace.id)
      .eq('user_id', userId)
      .is('deleted_at', null),
  ])

  // Resolve the engine role name; fall back to the legacy role enum if unset.
  let roleName: string = membership.data?.role ?? ctx.role
  if (membership.data?.role_id) {
    const { data: role } = await supabase
      .from('roles')
      .select('name')
      .eq('id', membership.data.role_id)
      .maybeSingle()
    if (role?.name) roleName = role.name
  }

  return {
    id: profile.id,
    fullName: profile.full_name ?? profile.email,
    email: profile.email,
    avatarUrl: profile.avatar_url,
    title: profile.title,
    timezone: profile.timezone,
    location: profile.location,
    roleName,
    joinedAt: membership?.data?.created_at ?? profile.created_at,
    stats: [
      { key: 'projects', label: 'Active projects', value: activeProjects ?? 0 },
      { key: 'tasks', label: 'My open tasks', value: openTasks ?? 0 },
      { key: 'team', label: 'Team members', value: teamSize ?? 0 },
    ],
    activity: (activityRows ?? []).map((a) => ({
      id: a.id,
      action: a.action,
      label: humanizeAction(a.action),
      at: a.created_at,
    })),
    connections: (connectionRows ?? []).map((c) => ({
      provider: c.provider,
      address: c.address,
      status: c.status,
      connected: c.status === 'connected',
    })),
  }
}
