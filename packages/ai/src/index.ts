// @aurexos/ai — curated public surface.
// Everything AI in AurexOS imports from here; module internals (error-mapping
// helpers, adapter translation functions) stay unexported. Provider SDK types
// never appear on this surface (R-AI1).

// Gateway contracts
export {
  MODEL_TIERS,
  PROVIDER_ANTHROPIC,
  PROVIDER_OPENAI,
  PROVIDER_GEMINI,
  PROVIDER_OPENAI_COMPATIBLE,
  GATEWAY_ERROR_CODES,
  GatewayError,
  GatewayRequestSchema,
  ChatMessageSchema,
  ToolCallSchema,
  ToolSpecSchema,
  TokenUsageSchema,
  StreamDeltaSchema,
} from './gateway/types'
export type {
  ModelTier,
  GatewayErrorCode,
  GatewayRequest,
  GatewayResponse,
  ChatMessage,
  ToolCall,
  ToolSpec,
  TokenUsage,
  StreamDelta,
  ProviderAdapter,
  ProviderChatParams,
  ProviderChatResult,
  ProviderHealth,
  EmbedResult,
  GatewayLogger,
  Redactor,
} from './gateway/types'

// Gateway config
export { loadGatewayConfig, gatewayEnvSchema, PROVIDER_DATA_POLICIES } from './gateway/config'
export type {
  AiGatewayConfig,
  TierRoute,
  RetryConfig,
  GatewayDefaults,
  GatewayEnv,
} from './gateway/config'

// Gateway engine + factory
export {
  AiGateway,
  buildGateway,
  asGatewayError,
  ConsoleLogger,
  DefaultRedactor,
  EmbedRequestSchema,
} from './gateway/gateway'
export type {
  AiGatewayDeps,
  BuildGatewayOptions,
  EmbedRequest,
  EmbedResponse,
} from './gateway/gateway'

// Provider adapters (constructing one directly is rare — prefer buildGateway)
export { AnthropicAdapter } from './gateway/providers/anthropic'
export type { AnthropicAdapterOptions } from './gateway/providers/anthropic'
export { OpenAiAdapter } from './gateway/providers/openai'
export type { OpenAiAdapterOptions } from './gateway/providers/openai'
export { GeminiAdapter } from './gateway/providers/gemini'
export type { GeminiAdapterOptions } from './gateway/providers/gemini'
export { createOpenAiCompatibleAdapter } from './gateway/providers/openai-compatible'
export type { OpenAiCompatibleOptions } from './gateway/providers/openai-compatible'

// Router
export { ModelRouter } from './router/router'
export type { RouteInput, RouteDecision, WorkspaceRoutePrefs } from './router/router'

// Prompts
export { definePrompt } from './prompts/define-prompt'
export type {
  PromptDefinition,
  RegisteredPrompt,
  DefinePromptOptions,
} from './prompts/define-prompt'
export { promptRegistry, getPrompt, requirePrompt } from './prompts/registry'
export { aurexSystemFrameV1, aurexSystemFrameVariablesSchema } from './prompts/aurex-system-frame'
export type { AurexSystemFrameVariables } from './prompts/aurex-system-frame'
export { aurexAssistantV1, aurexAssistantVariablesSchema } from './prompts/aurex-assistant'
export type { AurexAssistantVariables } from './prompts/aurex-assistant'
export {
  automationAssistantV1,
  automationAssistantVariablesSchema,
} from './prompts/automation-assistant'
export type { AutomationAssistantVariables } from './prompts/automation-assistant'
export { automationDraftV1, automationDraftVariablesSchema } from './prompts/automation-draft'
export type { AutomationDraftVariables } from './prompts/automation-draft'

// Usage metering
export {
  AiUsageEventSchema,
  AI_USAGE_OUTCOMES,
  ConsoleUsageSink,
  SupabaseUsageSink,
} from './usage/usage'
export type { AiUsageEvent, AiUsageOutcome, UsageSink, UsageTableClient } from './usage/usage'

// Budgets
export { NoopBudgetGuard } from './budget/budget'
export type { BudgetGuard, BudgetDecision } from './budget/budget'

// Memory & conversation contracts (Phase 3 implementations)
export type {
  MemoryScope,
  MemoryKind,
  MemoryItem,
  MemoryStore,
  ConversationSurface,
  ConversationRef,
  MessageRole,
  MessageRecord,
  ConversationStore,
} from './memory/types'

// Retrieval contract (Phase 3 pgvector implementation)
export { RETRIEVAL_SOURCE_TYPES } from './retrieval/types'
export type {
  Retrieval,
  RetrievalChunk,
  RetrievalQueryOptions,
  RetrievalSourceType,
} from './retrieval/types'

// SSE streaming helpers
export {
  serializeStreamDelta,
  serializeSseDone,
  toSseStream,
  parseSseLine,
  SSE_DONE_PAYLOAD,
} from './streaming/sse'
