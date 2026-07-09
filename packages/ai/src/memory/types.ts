// Memory & conversation contracts — CONTRACTS ONLY; implementations are
// Phase 3 (07_AI_Strategy.md §2.5 memory layers; AIArchitecture.md §7 + §11.1
// data model). Field shapes align with the forthcoming ai_conversations /
// ai_messages / ai_memory_items tables (documented as CONVERSATIONS / MESSAGES /
// MEMORY_ITEMS in the AIArchitecture ER diagram) so the Phase 3 stores are a
// mapping exercise, not a redesign. All rows are workspace-scoped under RLS
// (R-D1/R-D2/R-AI4); ids are UUIDv7 (R-D5); timestamps are ISO strings.

/** Long-term explicit memory scope: per user or per workspace (07_AI_Strategy.md §2.5). */
export type MemoryScope = 'user' | 'workspace'

/**
 * What kind of memory this is:
 * - `preference` — "keep my updates brief"
 * - `fact` — "our default payment terms: net-15"
 * - `instruction` — standing directives that shape behavior
 */
export type MemoryKind = 'preference' | 'fact' | 'instruction'

/**
 * A curated long-term memory item. USER-VISIBLE AND EDITABLE — memory is a
 * feature, not surveillance (AIArchitecture.md §7). Writes are L1 (Aurex
 * proposes "should I remember this?") or explicit user command; GDPR erasure
 * cascades here (AIArchitecture.md §14.2).
 */
export interface MemoryItem {
  id: string
  workspaceId: string
  /** Set for user-scoped items; undefined for workspace-scoped ones. */
  userId?: string
  scope: MemoryScope
  kind: MemoryKind
  content: string
  /** Provenance: how this memory was formed, e.g. `user_command`, `aurex_proposal:<conversationId>`. */
  source: string
  createdAt: string
  /** Items expire rather than silently rot; undefined = until edited or deleted. */
  expiresAt?: string
}

/** Aurex surfaces a conversation can originate from (AIArchitecture.md §14.1). */
export type ConversationSurface = 'chat' | 'palette' | 'inline' | 'automation' | 'proactive'

/**
 * Reference to a conversation row (ai_conversations): workspace-scoped, owned
 * by its user, carrying the rolling summary that compresses history beyond a
 * token threshold — pinned facts survive compression (AIArchitecture.md §7).
 */
export interface ConversationRef {
  id: string
  workspaceId: string
  userId: string
  surface: ConversationSurface
  title?: string
  rollingSummary?: string
  createdAt: string
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

/**
 * One message row (ai_messages). `content` is structured (jsonb in the table):
 * text plus tool-call blocks; `citations` and `toolCallReceipts` carry the
 * verifiability surface (07_AI_Strategy.md §1.4 "trust is the product");
 * `aiRunId` links to the AIRun trace (R-AI2).
 */
export interface MessageRecord {
  id: string
  conversationId: string
  role: MessageRole
  content: unknown
  citations?: unknown[]
  toolCallReceipts?: unknown[]
  aiRunId?: string
  createdAt: string
}

/**
 * Long-term explicit memory store (Phase 3 impl over Postgres + RLS).
 * Every method is workspace-scoped by signature — cross-tenant access is
 * unrepresentable in the contract (R-AI4).
 */
export interface MemoryStore {
  list(workspaceId: string, scope: MemoryScope, userId?: string): Promise<MemoryItem[]>
  upsert(item: MemoryItem): Promise<void>
  /** Soft delete (R-D3); hard deletion only via GDPR erasure cascade. */
  remove(workspaceId: string, memoryItemId: string): Promise<void>
}

/**
 * Conversation/short-term memory store (Phase 3 impl). Deletion of a
 * conversation cascades per GDPR erasure rules, including derived memory items
 * and cache entries (AIArchitecture.md §7).
 */
export interface ConversationStore {
  get(workspaceId: string, conversationId: string): Promise<ConversationRef | null>
  create(ref: Omit<ConversationRef, 'id' | 'createdAt'>): Promise<ConversationRef>
  appendMessage(
    workspaceId: string,
    message: Omit<MessageRecord, 'id' | 'createdAt'>,
  ): Promise<MessageRecord>
  listMessages(
    workspaceId: string,
    conversationId: string,
    options?: { limit?: number; before?: string },
  ): Promise<MessageRecord[]>
  /** Rolling summary is regenerated asynchronously beside the conversation (AIArchitecture.md §7). */
  updateRollingSummary(workspaceId: string, conversationId: string, summary: string): Promise<void>
}
