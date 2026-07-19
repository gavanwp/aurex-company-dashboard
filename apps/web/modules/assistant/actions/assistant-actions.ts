'use server'

import type { z } from 'zod'
import { AskAurexInput } from '@aurexos/core'
import { aurexAssistantV1, GatewayError, type ChatMessage } from '@aurexos/ai'
import { writeAudit, type ActionResult } from '@/lib/action-kit'
import { buildWorkspaceGateway } from '@/lib/ai/gateway'
import { isAiConfigured } from '@/lib/env'
import { requirePermission } from '@/lib/permissions'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { getAssistantContext } from '../queries/get-assistant-context'

// Aurex assistant chat (R-AI1: all model calls via packages/ai; R-AI2: usage
// metered by the gateway; R-AI6: honest degrade when no provider is configured).
// Phase 1 — grounded in the workspace snapshot; no tools yet.

function friendlyGatewayError(err: GatewayError): string {
  switch (err.code) {
    case 'rate_limit':
      return 'Aurex is rate-limited right now — try again in a moment.'
    case 'timeout':
      return 'Aurex took too long to respond — try again.'
    case 'budget_exceeded':
      return 'This workspace has reached its AI budget.'
    case 'invalid_request':
      return 'That request could not be processed.'
    default:
      return 'Aurex is unavailable right now.'
  }
}

export async function askAurex(
  input: z.input<typeof AskAurexInput>,
): Promise<ActionResult<{ reply: string; model: string }>> {
  const parsed = AskAurexInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Say something to Aurex' }
  }
  try {
    const ctx = await getWorkspaceContext()
    await requirePermission(ctx, 'ai.workspace.use')

    if (!isAiConfigured()) {
      return {
        ok: false,
        error: 'AI isn’t configured yet — add an ANTHROPIC_API_KEY to enable Aurex.',
      }
    }

    const context = await getAssistantContext(ctx)
    const system = aurexAssistantV1.render({
      workspaceName: context.workspaceName,
      userDisplayName: context.userDisplayName,
      userRole: context.userRole,
      snapshot: context.snapshot,
      todayIso: context.todayIso,
    })

    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      ...parsed.data.messages.map((m): ChatMessage => ({ role: m.role, content: m.content })),
    ]

    const gateway = buildWorkspaceGateway(ctx)
    const response = await gateway.complete({
      tier: 'standard',
      feature: 'assistant.chat',
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      messages,
      maxTokens: 800,
      temperature: 0.4,
    })

    await writeAudit(ctx, {
      action: 'assistant.ai.asked',
      entityType: 'ai_run',
      entityId: ctx.workspace.id,
      after: { turns: parsed.data.messages.length, model: response.model },
    })

    return { ok: true, data: { reply: response.text.trim(), model: response.model } }
  } catch (err) {
    if (err instanceof GatewayError) return { ok: false, error: friendlyGatewayError(err) }
    return {
      ok: false,
      error:
        err instanceof Error && err.message === 'forbidden'
          ? 'You don’t have access to Aurex in this workspace.'
          : 'Aurex is unavailable right now.',
    }
  }
}
