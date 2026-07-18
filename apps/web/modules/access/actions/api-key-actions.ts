'use server'

import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { writeAudit, type ActionResult } from '@/lib/action-kit'
import { requirePermission } from '@/lib/permissions'
import { getWorkspaceContext } from '@/lib/workspace-context'

// API key lifecycle. Keys are generated server-side, HASHED (SHA-256) at rest,
// and the plaintext is returned exactly once (0021 / SecurityArchitecture §6.2).
// Guarded by settings.apikey.manage; every change is audited.

// Scope presets → the permission keys a key may exercise. Fine-grained per-
// permission scoping is a later refinement; these two cover the common cases.
const SCOPE_PRESETS: Record<string, string[]> = {
  read: ['read'],
  full: ['full'],
}

const CreateInput = z.object({
  name: z.string().trim().min(1, 'Name the key').max(120),
  scope: z.enum(['read', 'full']),
  expiresInDays: z.coerce.number().int().min(0).max(3650).optional(),
})

function revalidate(): void {
  revalidatePath('/settings/api-keys')
}

export async function createApiKey(
  input: z.input<typeof CreateInput>,
): Promise<ActionResult<{ id: string; plaintextKey: string }>> {
  const parsed = CreateInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid key' }
  }
  try {
    const ctx = await getWorkspaceContext()
    await requirePermission(ctx, 'settings.apikey.manage')
    const d = parsed.data

    // aur_<8 hex>_<48 hex>. The prefix (first 12 chars) identifies the key in the
    // UI; the whole string is hashed and never stored in plaintext.
    const body = randomBytes(24).toString('hex')
    const tag = randomBytes(4).toString('hex')
    const prefix = `aur_${tag}`
    const plaintextKey = `${prefix}_${body}`
    const hash = createHash('sha256').update(plaintextKey).digest('hex')
    const expiresAt =
      d.expiresInDays && d.expiresInDays > 0
        ? new Date(Date.now() + d.expiresInDays * 86_400_000).toISOString()
        : null

    const { data: created, error } = await ctx.supabase
      .from('api_keys')
      .insert({
        organization_id: ctx.workspace.organization_id,
        workspace_id: ctx.workspace.id,
        name: d.name,
        prefix,
        hash,
        scopes: SCOPE_PRESETS[d.scope] ?? [],
        created_by: ctx.userId,
        ...(expiresAt ? { expires_at: expiresAt } : {}),
      })
      .select('id')
      .single()
    if (error || !created) return { ok: false, error: 'Could not create the API key' }

    await writeAudit(ctx, {
      action: 'security.apikey.created',
      entityType: 'api_key',
      entityId: created.id,
      after: { name: d.name, scope: d.scope, prefix },
    })
    revalidate()
    return { ok: true, data: { id: created.id, plaintextKey } }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error && err.message === 'forbidden' ? 'forbidden' : 'Something went wrong',
    }
  }
}

const RevokeInput = z.object({ id: z.string().uuid() })

export async function revokeApiKey(
  input: z.input<typeof RevokeInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = RevokeInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request' }
  try {
    const ctx = await getWorkspaceContext()
    await requirePermission(ctx, 'settings.apikey.manage')
    const { error } = await ctx.supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', parsed.data.id)
      .eq('organization_id', ctx.workspace.organization_id)
    if (error) return { ok: false, error: 'Could not revoke the key' }

    await writeAudit(ctx, {
      action: 'security.apikey.revoked',
      entityType: 'api_key',
      entityId: parsed.data.id,
    })
    revalidate()
    return { ok: true, data: { id: parsed.data.id } }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error && err.message === 'forbidden' ? 'forbidden' : 'Something went wrong',
    }
  }
}
