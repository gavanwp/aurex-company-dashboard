'use server'

import type { z } from 'zod'
import { AskAurexInput } from '@aurexos/core'
import { aurexAssistantV2, GatewayError, type ChatMessage } from '@aurexos/ai'
import { writeAudit, type ActionResult } from '@/lib/action-kit'
import { buildWorkspaceGateway } from '@/lib/ai/gateway'
import { isAiConfigured } from '@/lib/env'
import { requirePermission } from '@/lib/permissions'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { getAssistantContext } from '../queries/get-assistant-context'
import { agentTool, agentToolSpecs } from '../lib/tools'

/** Max model↔tool round-trips before we force a final answer (cost + loop guard). */
const MAX_TOOL_ROUNDS = 4

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
): Promise<ActionResult<{ reply: string; model: string; toolsUsed: string[] }>> {
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
    const system = aurexAssistantV2.render({
      workspaceName: context.workspaceName,
      userDisplayName: context.userDisplayName,
      userRole: context.userRole,
      snapshot: context.snapshot,
      todayIso: context.todayIso,
    })

    const convo: ChatMessage[] = [
      { role: 'system', content: system },
      ...parsed.data.messages.map((m): ChatMessage => ({ role: m.role, content: m.content })),
    ]

    const gateway = buildWorkspaceGateway(ctx)
    const toolSpecs = agentToolSpecs()
    const toolsUsed: string[] = []
    let reply = ''
    let model = ''

    // Agent loop: the model may call read tools; we run them (RLS-scoped) and feed
    // results back until it answers in prose, or we hit the round cap. Every model
    // call is metered by the gateway (R-AI2).
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response = await gateway.complete({
        tier: 'standard',
        feature: 'assistant.chat',
        workspaceId: ctx.workspace.id,
        userId: ctx.userId,
        messages: convo,
        tools: toolSpecs,
        maxTokens: 900,
        temperature: 0.4,
      })
      model = response.model
      const calls = response.toolCalls ?? []
      if (calls.length === 0) {
        reply = response.text.trim()
        break
      }
      // The assistant turn that requested the tools, then each tool's result.
      convo.push({ role: 'assistant', content: response.text, toolCalls: calls })
      for (const call of calls) {
        toolsUsed.push(call.name)
        const tool = agentTool(call.name)
        let result: unknown
        if (!tool) {
          result = { error: `unknown tool: ${call.name}` }
        } else {
          try {
            result = await tool.run(ctx, call.input)
          } catch {
            result = { error: `tool ${call.name} failed` }
          }
        }
        convo.push({
          role: 'tool',
          content: JSON.stringify(result),
          toolCallId: call.id,
          toolName: call.name,
        })
      }
    }

    // Hit the round cap still mid-tool: force a final, tool-free answer.
    if (!reply) {
      const wrap = await gateway.complete({
        tier: 'standard',
        feature: 'assistant.chat',
        workspaceId: ctx.workspace.id,
        userId: ctx.userId,
        messages: convo,
        maxTokens: 700,
        temperature: 0.4,
      })
      reply = wrap.text.trim()
      model = wrap.model
    }

    const uniqueTools = [...new Set(toolsUsed)]
    await writeAudit(ctx, {
      action: 'assistant.ai.asked',
      entityType: 'ai_run',
      entityId: ctx.workspace.id,
      after: { turns: parsed.data.messages.length, model, toolsUsed: uniqueTools },
    })

    return { ok: true, data: { reply, model, toolsUsed: uniqueTools } }
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
