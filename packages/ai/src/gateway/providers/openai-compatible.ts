import type { ProviderAdapter } from '../types'
import { OpenAiAdapter } from './openai'

// OpenAI-compatible adapter — the Phase 5 cost lever seam
// (FutureArchitecture.md; AIArchitecture.md §3.2 "Open-source / self-hosted").
// vLLM/Ollama-class servers speak the OpenAI wire protocol, so this is the
// OpenAI adapter parameterized by baseURL + apiKey under its own adapter id.
//
// Routing an OSS model here is NOT a free lunch: it must pass the same
// Light-tier eval quality bar as hosted models before the router config points
// at it — an OSS model that misses the bar does not route, regardless of price
// (AIArchitecture.md §3.2).

export interface OpenAiCompatibleOptions {
  /**
   * Adapter id used in tier routes, e.g. `openai-compatible` or a suffixed id
   * (`openai-compatible:vllm-local`) when several endpoints coexist.
   */
  id: string
  baseUrl: string
  apiKey: string
  timeoutMs?: number
}

/**
 * Creates an adapter for any OpenAI-compatible endpoint. Because it reuses
 * OpenAiAdapter, chat, streaming, tool calls, and embeddings all work as long
 * as the target server implements the corresponding OpenAI endpoints.
 */
export function createOpenAiCompatibleAdapter(options: OpenAiCompatibleOptions): ProviderAdapter {
  return new OpenAiAdapter({
    id: options.id,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    timeoutMs: options.timeoutMs,
  })
}
