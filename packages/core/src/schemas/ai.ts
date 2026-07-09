import { z } from 'zod'
import {
  AI_APPROVAL_DECISIONS,
  AI_MESSAGE_ROLES,
  AI_RISK_CLASSES,
  AI_RUN_STATUSES,
  AI_RUN_TRIGGERS,
  EMBEDDING_SOURCE_TYPES,
  MEMORY_KINDS,
  MEMORY_SCOPES,
} from '../types/index'

// Governs ai_conversations.context_anchors (0007): entity refs the chat is "about".
export const AiContextAnchorSchema = z.object({
  entityType: z.string().max(40),
  entityId: z.string().uuid(),
})
export type AiContextAnchor = z.infer<typeof AiContextAnchorSchema>

export const AiContextAnchorsSchema = z.array(AiContextAnchorSchema)
export type AiContextAnchors = z.infer<typeof AiContextAnchorsSchema>

export const AiConversationSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().max(300).nullable(),
  contextAnchors: AiContextAnchorsSchema,
  pinned: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type AiConversation = z.infer<typeof AiConversationSchema>

export const CreateAiConversationInput = z.object({
  title: z.string().max(300).optional(),
  contextAnchors: AiContextAnchorsSchema.default([]),
  pinned: z.boolean().default(false),
})
export type CreateAiConversationInput = z.infer<typeof CreateAiConversationInput>

export const UpdateAiConversationInput = CreateAiConversationInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateAiConversationInput = z.infer<typeof UpdateAiConversationInput>

// Governs ai_messages.content (0007): text parts, tool calls, citations.
export const AiMessageContentSchema = z
  .object({
    text: z.string().optional(),
    toolCalls: z.array(z.unknown()).optional(),
    citations: z.array(z.unknown()).optional(),
  })
  .passthrough()
export type AiMessageContent = z.infer<typeof AiMessageContentSchema>

export const AiMessageSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: z.enum(AI_MESSAGE_ROLES),
  content: AiMessageContentSchema,
  model: z.string().max(120).nullable(),
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type AiMessage = z.infer<typeof AiMessageSchema>

export const CreateAiMessageInput = z.object({
  conversationId: z.string().uuid(),
  role: z.enum(AI_MESSAGE_ROLES),
  content: AiMessageContentSchema,
  model: z.string().max(120).optional(),
})
export type CreateAiMessageInput = z.infer<typeof CreateAiMessageInput>

// Governs ai_runs.plan (0007): plan + tool invocation trace.
export const AiRunPlanSchema = z
  .object({
    steps: z.array(z.unknown()).default([]),
    autonomyLevel: z.enum(['L0', 'L1', 'L2', 'L3']).optional(),
  })
  .passthrough()
export type AiRunPlan = z.infer<typeof AiRunPlanSchema>

export const AiRunSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  trigger: z.enum(AI_RUN_TRIGGERS),
  surface: z.string().max(80).nullable(),
  status: z.enum(AI_RUN_STATUSES),
  plan: AiRunPlanSchema,
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  costEstimateMinorUnits: z.number().int().nonnegative(),
  currency: z.string().length(3),
  registryVersion: z.string().max(40).nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type AiRun = z.infer<typeof AiRunSchema>

// Governs ai_approvals.proposed_action (0007): the typed action awaiting approval.
export const AiProposedActionSchema = z
  .object({
    actionKey: z.string().min(1).max(120),
    input: z.record(z.string(), z.unknown()).default({}),
    summary: z.string().max(2_000).optional(),
  })
  .passthrough()
export type AiProposedAction = z.infer<typeof AiProposedActionSchema>

export const AiApprovalSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  runId: z.string().uuid(),
  proposedAction: AiProposedActionSchema,
  riskClass: z.enum(AI_RISK_CLASSES),
  approverUserId: z.string().uuid().nullable(),
  decision: z.enum(AI_APPROVAL_DECISIONS).nullable(),
  decidedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type AiApproval = z.infer<typeof AiApprovalSchema>

export const DecideAiApprovalInput = z.object({
  id: z.string().uuid(),
  decision: z.enum(AI_APPROVAL_DECISIONS),
})
export type DecideAiApprovalInput = z.infer<typeof DecideAiApprovalInput>

export const MemoryItemSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  scope: z.enum(MEMORY_SCOPES),
  kind: z.enum(MEMORY_KINDS),
  content: z.string().min(1).max(10_000),
  source: z.string().max(200).nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type MemoryItem = z.infer<typeof MemoryItemSchema>

export const CreateMemoryItemInput = z.object({
  scope: z.enum(MEMORY_SCOPES),
  kind: z.enum(MEMORY_KINDS),
  content: z.string().min(1, 'Memory content is required').max(10_000),
  source: z.string().max(200).optional(),
  expiresAt: z.string().nullable().optional(),
})
export type CreateMemoryItemInput = z.infer<typeof CreateMemoryItemInput>

export const UpdateMemoryItemInput = CreateMemoryItemInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateMemoryItemInput = z.infer<typeof UpdateMemoryItemInput>

// Governs embeddings.metadata (0007): chunking/source metadata.
export const EmbeddingMetadataSchema = z
  .object({
    chunkTotal: z.number().int().positive().optional(),
    sourceTitle: z.string().max(300).optional(),
    sourceUpdatedAt: z.string().optional(),
  })
  .passthrough()
export type EmbeddingMetadata = z.infer<typeof EmbeddingMetadataSchema>

export const EmbeddingSourceTypeSchema = z.enum(EMBEDDING_SOURCE_TYPES)

// ai_usage (0007) is an append-only stream written by the AI gateway only.
export const AiUsageSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  feature: z.string().max(80),
  provider: z.string().max(80),
  model: z.string().max(120),
  tier: z.string().max(40).nullable(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cachedInputTokens: z.number().int().nonnegative(),
  costEstimateMinorUnits: z.number().int().nonnegative(),
  currency: z.string().length(3),
  latencyMs: z.number().int().nonnegative().nullable(),
  outcome: z.string().max(40).nullable(),
  requestId: z.string().max(200).nullable(),
  createdAt: z.string(),
})
export type AiUsage = z.infer<typeof AiUsageSchema>
