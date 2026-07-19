'use server'

import type { z } from 'zod'
import { AskAutomationInput, AutomationDraftSchema, DraftAutomationInput } from '@aurexos/core'
import {
  automationAssistantV1,
  automationDraftV1,
  GatewayError,
  type ChatMessage,
} from '@aurexos/ai'
import { writeAudit, type ActionResult } from '@/lib/action-kit'
import { buildWorkspaceGateway } from '@/lib/ai/gateway'
import { friendlyGatewayError } from '@/lib/ai/gateway-errors'
import { isAiConfigured } from '@/lib/env'
import { actionCatalogText, actionDef, triggerCatalogText, triggerDef } from '../constants'
import { getAutomationsSummary } from '../queries/get-automations'
import { failure, requireAutomationRead } from './automations-access'
import type { AssistantResult, DraftResult } from '../types'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Pull the first balanced JSON object from model text (handles stray prose/fences). */
function extractJsonObject(text: string): string | null {
  const fenced = text.replace(/```(?:json)?/gi, '')
  const start = fenced.indexOf('{')
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < fenced.length; i += 1) {
    const ch = fenced[i]
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) return fenced.slice(start, i + 1)
    }
  }
  return null
}

/**
 * Q&A assistant — "quick answers" about what can be automated, grounded in the
 * trigger/action catalog and the workspace's existing automations. Degrades
 * honestly when no provider is configured (R-AI6). Usage is metered by the
 * gateway (R-AI2); the action itself is audited.
 */
export async function askAutomationAssistant(
  input: z.input<typeof AskAutomationInput>,
): Promise<ActionResult<AssistantResult>> {
  const parsed = AskAutomationInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Ask a question' }
  }
  try {
    const ctx = await requireAutomationRead()
    if (!isAiConfigured()) {
      return {
        ok: false,
        error: 'AI is not configured — add an ANTHROPIC_API_KEY to enable Aurex.',
      }
    }

    const existing = await getAutomationsSummary(ctx)
    const system = automationAssistantV1.render({
      workspaceName: ctx.workspace.name,
      userDisplayName: ctx.profile.full_name ?? ctx.profile.email ?? 'there',
      userRole: ctx.role,
      triggerCatalog: triggerCatalogText(),
      actionCatalog: actionCatalogText(),
      existingAutomations: existing,
      todayIso: todayIso(),
    })
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: parsed.data.question },
    ]

    const gateway = buildWorkspaceGateway(ctx)
    const response = await gateway.complete({
      tier: 'standard',
      feature: 'automations.assistant',
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      messages,
      maxTokens: 700,
      temperature: 0.3,
    })

    await writeAudit(ctx, {
      action: 'automations.ai.asked',
      entityType: 'ai_run',
      entityId: ctx.workspace.id,
      after: { question: parsed.data.question, model: response.model },
    })
    return { ok: true, data: { answer: response.text.trim(), model: response.model } }
  } catch (err) {
    if (err instanceof GatewayError) return { ok: false, error: friendlyGatewayError(err) }
    return failure(err)
  }
}

/**
 * Natural-language automation drafter — turns a description into a proposed
 * automation for human review. It only proposes: the result is never saved or
 * activated automatically (R-AI3). Unknown trigger/action keys are surfaced,
 * not silently dropped.
 */
export async function draftAutomation(
  input: z.input<typeof DraftAutomationInput>,
): Promise<ActionResult<DraftResult>> {
  const parsed = DraftAutomationInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Describe the automation' }
  }
  try {
    const ctx = await requireAutomationRead()
    if (!isAiConfigured()) {
      return {
        ok: false,
        error: 'AI is not configured — add an ANTHROPIC_API_KEY to enable Aurex.',
      }
    }

    const system = automationDraftV1.render({
      triggerCatalog: triggerCatalogText(),
      actionCatalog: actionCatalogText(),
    })
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: parsed.data.description },
    ]

    const gateway = buildWorkspaceGateway(ctx)
    const response = await gateway.complete({
      tier: 'frontier',
      feature: 'automations.draft',
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      messages,
      maxTokens: 900,
      temperature: 0.2,
    })

    const jsonText = extractJsonObject(response.text)
    if (!jsonText) {
      return { ok: false, error: 'Aurex did not return a usable draft — try rephrasing.' }
    }
    let jsonValue: unknown
    try {
      jsonValue = JSON.parse(jsonText)
    } catch {
      return { ok: false, error: 'Aurex returned an invalid draft — try again.' }
    }
    const draftParsed = AutomationDraftSchema.safeParse(jsonValue)
    if (!draftParsed.success) {
      return { ok: false, error: 'Aurex returned a draft that could not be validated — try again.' }
    }

    const draft = draftParsed.data
    const unknownTrigger = triggerDef(draft.triggerEventType) === undefined
    const unknownActions = draft.actions
      .map((a) => a.actionKey)
      .filter((key) => actionDef(key) === undefined)

    await writeAudit(ctx, {
      action: 'automations.ai.drafted',
      entityType: 'ai_run',
      entityId: ctx.workspace.id,
      after: {
        description: parsed.data.description,
        model: response.model,
        triggerEventType: draft.triggerEventType,
        actionKeys: draft.actions.map((a) => a.actionKey),
      },
    })

    return { ok: true, data: { draft, unknownTrigger, unknownActions, model: response.model } }
  } catch (err) {
    if (err instanceof GatewayError) return { ok: false, error: friendlyGatewayError(err) }
    return failure(err)
  }
}
