import 'server-only'

import type { MemberSpecialization, WorkspaceRole } from '@aurexos/core'
import type { Tables } from '@aurexos/db'
import type { WorkspaceContext } from '@/lib/workspace-context'
import { canViewCompensation } from '../actions/team-access'
import { coversToday, leaveDays, parseSkills } from '../lib/hr'
import type { DirectoryMember, LeaveRow, MemberDetail, MemberOption, TeamOverview } from '../types'

// RLS (0016) scopes hr_profiles / hr_leave_requests to workspace members; these
// queries add workspace + soft-delete filters and fold membership, profile and
// leave into the read models the UI renders. The directory is a LEFT join in
// spirit: every workspace member appears, enriched by an HR profile if one
// exists — so the page is never empty before HR fills profiles in.

type ProfileRow = Tables<'hr_profiles'>
type LeaveRequestRow = Tables<'hr_leave_requests'>

interface MemberRow {
  user_id: string
  role: WorkspaceRole
  specialization: MemberSpecialization | null
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

async function nameDirectory(
  ctx: WorkspaceContext,
): Promise<Map<string, { name: string; email: string; avatarUrl: string | null }>> {
  const { data: members } = await ctx.supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', ctx.workspace.id)
  const ids = (members ?? []).map((m) => m.user_id)
  const map = new Map<string, { name: string; email: string; avatarUrl: string | null }>()
  if (ids.length === 0) return map
  const { data: profiles } = await ctx.supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', ids)
  for (const p of profiles ?? []) {
    map.set(p.id, {
      name: p.full_name ?? p.email ?? 'Unknown',
      email: p.email ?? '',
      avatarUrl: p.avatar_url,
    })
  }
  return map
}

/** Set of user ids with an approved leave covering today. */
async function onLeaveTodaySet(ctx: WorkspaceContext, today: string): Promise<Set<string>> {
  const { data } = await ctx.supabase
    .from('hr_leave_requests')
    .select('user_id, start_date, end_date')
    .eq('workspace_id', ctx.workspace.id)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .lte('start_date', today)
    .gte('end_date', today)
  const set = new Set<string>()
  for (const r of data ?? []) {
    if (coversToday(r.start_date, r.end_date, today)) set.add(r.user_id)
  }
  return set
}

// ── Directory ─────────────────────────────────────────────────────────────────

export interface GetDirectoryFilters {
  specialization?: MemberSpecialization
  search?: string
}

export async function getTeamDirectory(
  ctx: WorkspaceContext,
  filters: GetDirectoryFilters = {},
): Promise<DirectoryMember[]> {
  const today = todayISO()
  const [{ data: memberData }, names, onLeave, { data: profileData }] = await Promise.all([
    ctx.supabase
      .from('workspace_members')
      .select('user_id, role, specialization')
      .eq('workspace_id', ctx.workspace.id),
    nameDirectory(ctx),
    onLeaveTodaySet(ctx, today),
    ctx.supabase
      .from('hr_profiles')
      .select('*')
      .eq('workspace_id', ctx.workspace.id)
      .is('deleted_at', null),
  ])

  const members = (memberData ?? []) as MemberRow[]
  const profileByUser = new Map<string, ProfileRow>()
  for (const p of (profileData ?? []) as ProfileRow[]) profileByUser.set(p.user_id, p)

  let rows: DirectoryMember[] = members.map((m) => {
    const identity = names.get(m.user_id)
    const profile = profileByUser.get(m.user_id) ?? null
    const managerName = profile?.manager_id ? (names.get(profile.manager_id)?.name ?? null) : null
    return {
      userId: m.user_id,
      name: identity?.name ?? 'Unknown',
      email: identity?.email ?? '',
      avatarUrl: identity?.avatarUrl ?? null,
      role: m.role,
      specialization: m.specialization,
      hasProfile: profile !== null,
      title: profile?.title ?? null,
      employmentType: profile?.employment_type ?? null,
      location: profile?.location ?? null,
      timezone: profile?.timezone ?? null,
      startDate: profile?.start_date ?? null,
      skills: parseSkills(profile?.skills),
      weeklyCapacityHours: profile?.weekly_capacity_hours ?? null,
      managerId: profile?.manager_id ?? null,
      managerName,
      onLeaveToday: onLeave.has(m.user_id),
    }
  })

  if (filters.specialization) {
    rows = rows.filter((r) => r.specialization === filters.specialization)
  }
  if (filters.search) {
    const q = filters.search.toLowerCase()
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.title?.toLowerCase().includes(q) ?? false) ||
        r.skills.some((s) => s.name.toLowerCase().includes(q)),
    )
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

// ── Member detail ──────────────────────────────────────────────────────────────

export async function getMemberDetail(
  ctx: WorkspaceContext,
  memberId: string,
): Promise<MemberDetail | null> {
  const { data: member } = await ctx.supabase
    .from('workspace_members')
    .select('user_id, role, specialization')
    .eq('workspace_id', ctx.workspace.id)
    .eq('user_id', memberId)
    .maybeSingle()
  if (!member) return null

  const today = todayISO()
  const [names, onLeave, { data: profileRaw }, leave] = await Promise.all([
    nameDirectory(ctx),
    onLeaveTodaySet(ctx, today),
    ctx.supabase
      .from('hr_profiles')
      .select('*')
      .eq('workspace_id', ctx.workspace.id)
      .eq('user_id', memberId)
      .is('deleted_at', null)
      .maybeSingle(),
    getLeaveRequests(ctx, { userId: memberId }),
  ])

  const identity = names.get(memberId)
  const profile = (profileRaw as ProfileRow | null) ?? null
  const managerName = profile?.manager_id ? (names.get(profile.manager_id)?.name ?? null) : null

  // Direct reports: profiles that name this member as manager.
  const { data: reportRows } = await ctx.supabase
    .from('hr_profiles')
    .select('user_id, title')
    .eq('workspace_id', ctx.workspace.id)
    .eq('manager_id', memberId)
    .is('deleted_at', null)
  const reports = (reportRows ?? []).map((r) => ({
    userId: r.user_id,
    name: names.get(r.user_id)?.name ?? 'Unknown',
    title: r.title,
    avatarUrl: names.get(r.user_id)?.avatarUrl ?? null,
  }))

  const showComp = await canViewCompensation(ctx)

  return {
    userId: memberId,
    name: identity?.name ?? 'Unknown',
    email: identity?.email ?? '',
    avatarUrl: identity?.avatarUrl ?? null,
    role: (member as MemberRow).role,
    specialization: (member as MemberRow).specialization,
    hasProfile: profile !== null,
    title: profile?.title ?? null,
    employmentType: profile?.employment_type ?? null,
    location: profile?.location ?? null,
    timezone: profile?.timezone ?? null,
    startDate: profile?.start_date ?? null,
    skills: parseSkills(profile?.skills),
    weeklyCapacityHours: profile?.weekly_capacity_hours ?? null,
    managerId: profile?.manager_id ?? null,
    managerName,
    onLeaveToday: onLeave.has(memberId),
    phone: profile?.phone ?? null,
    bio: profile?.bio ?? null,
    comp:
      showComp && profile
        ? {
            amountMinor: profile.comp_amount_minor,
            currency: profile.comp_currency,
            period: profile.comp_period,
          }
        : null,
    reports,
    leave,
  }
}

// ── Leave ────────────────────────────────────────────────────────────────────

export interface GetLeaveFilters {
  userId?: string
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
}

export async function getLeaveRequests(
  ctx: WorkspaceContext,
  filters: GetLeaveFilters = {},
): Promise<LeaveRow[]> {
  let query = ctx.supabase
    .from('hr_leave_requests')
    .select('*')
    .eq('workspace_id', ctx.workspace.id)
    .is('deleted_at', null)
    .order('start_date', { ascending: false })

  if (filters.userId) query = query.eq('user_id', filters.userId)
  if (filters.status) query = query.eq('status', filters.status)

  const { data: raw } = await query
  const rows = (raw ?? []) as LeaveRequestRow[]
  if (rows.length === 0) return []

  const names = await nameDirectory(ctx)
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    userName: names.get(r.user_id)?.name ?? 'Unknown',
    avatarUrl: names.get(r.user_id)?.avatarUrl ?? null,
    type: r.type,
    startDate: r.start_date,
    endDate: r.end_date,
    days: leaveDays(r.start_date, r.end_date),
    status: r.status,
    reason: r.reason,
    decidedByName: r.decided_by ? (names.get(r.decided_by)?.name ?? null) : null,
    decidedAt: r.decided_at,
    decisionNote: r.decision_note,
    createdAt: r.created_at,
  }))
}

// ── Overview (headline tiles) ─────────────────────────────────────────────────

export async function getTeamOverview(ctx: WorkspaceContext): Promise<TeamOverview> {
  const today = todayISO()
  const [{ data: memberData }, onLeave, { data: profileData }, { data: pendingData }] =
    await Promise.all([
      ctx.supabase
        .from('workspace_members')
        .select('user_id, specialization')
        .eq('workspace_id', ctx.workspace.id),
      onLeaveTodaySet(ctx, today),
      ctx.supabase
        .from('hr_profiles')
        .select('user_id, weekly_capacity_hours')
        .eq('workspace_id', ctx.workspace.id)
        .is('deleted_at', null),
      ctx.supabase
        .from('hr_leave_requests')
        .select('id')
        .eq('workspace_id', ctx.workspace.id)
        .eq('status', 'pending')
        .is('deleted_at', null),
    ])

  const members = memberData ?? []
  const profiles = profileData ?? []

  const specTally = new Map<MemberSpecialization, number>()
  for (const m of members) {
    if (m.specialization)
      specTally.set(m.specialization, (specTally.get(m.specialization) ?? 0) + 1)
  }

  const capacities = profiles
    .map((p) => p.weekly_capacity_hours)
    .filter((h): h is number => typeof h === 'number')
  const avgWeeklyCapacity =
    capacities.length > 0
      ? Math.round(capacities.reduce((sum, h) => sum + h, 0) / capacities.length)
      : null

  return {
    headcount: members.length,
    profiledCount: profiles.length,
    onLeaveToday: onLeave.size,
    pendingLeave: (pendingData ?? []).length,
    avgWeeklyCapacity,
    specializationCounts: [...specTally.entries()]
      .map(([specialization, count]) => ({ specialization, count }))
      .sort((a, b) => b.count - a.count),
  }
}

// ── Member picker (manager assignment) ─────────────────────────────────────────

export async function getMemberOptions(ctx: WorkspaceContext): Promise<MemberOption[]> {
  const names = await nameDirectory(ctx)
  return [...names.entries()]
    .map(([userId, v]) => ({ userId, name: v.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
