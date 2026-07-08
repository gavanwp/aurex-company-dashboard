'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CreateWorkspaceInput, type DomainEventType } from '@aurexos/core'
import type { TablesInsert } from '@aurexos/db'
import { createClient } from '@/lib/supabase/server'
import { WORKSPACE_COOKIE } from '@/lib/workspace-context'
import type { ActionResult } from '@/lib/action-kit'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/**
 * Onboarding: create the caller's workspace via the create_workspace RPC
 * (the ONLY path that creates workspaces — atomic workspace + owner row),
 * remember it in the workspace cookie, emit workspace.created, and enter
 * the OS. Note: getWorkspaceContext() can't be used here — the caller has
 * no workspace yet — so the domain event is inserted directly.
 */
export async function createWorkspace(name: string): Promise<ActionResult> {
  const parsed = CreateWorkspaceInput.safeParse({ name })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid workspace name' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace, error } = await supabase.rpc('create_workspace', {
    workspace_name: parsed.data.name,
  })
  if (error || !workspace) {
    return { ok: false, error: error?.message ?? 'Could not create workspace' }
  }

  const cookieStore = await cookies()
  cookieStore.set(WORKSPACE_COOKIE, workspace.id, {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  })

  const eventType: DomainEventType = 'workspace.created'
  const { error: eventError } = await supabase.from('domain_events').insert({
    workspace_id: workspace.id,
    actor_id: user.id,
    event_type: eventType,
    entity_type: 'workspace',
    entity_id: workspace.id,
    payload: {
      name: workspace.name,
      slug: workspace.slug,
    } as TablesInsert<'domain_events'>['payload'],
  })
  if (eventError) {
    console.error('emit workspace.created failed:', eventError.message)
  }

  redirect('/dashboard')
}
