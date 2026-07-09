import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  type Content,
  type EnhancedGenerateContentResponse,
  type FunctionDeclaration,
  type GenerativeModel,
  type Part,
  type UsageMetadata,
} from '@google/generative-ai'
import {
  GatewayError,
  PROVIDER_GEMINI,
  describeError,
  isRecord,
  type ChatMessage,
  type ProviderAdapter,
  type ProviderChatParams,
  type ProviderChatResult,
  type ProviderHealth,
  type StreamDelta,
  type TokenUsage,
  type ToolCall,
  type ToolSpec,
} from '../types'

// Gemini adapter — future tertiary fallback (AIArchitecture.md §3.2). One of
// the ONLY places `@google/generative-ai` may be imported (R-AI1).
//
// TOOL-MAPPING CAVEATS (read before routing tool-calling traffic here):
// 1. Gemini functionDeclarations accept a restricted OpenAPI-schema subset —
//    no `$ref`, no `oneOf`/`anyOf` at the top level, no `additionalProperties`.
//    Registry-emitted JSON Schemas may need simplification before this adapter
//    can serve tool-calling tiers; that transform lands with the Phase 3 tool
//    registry.
// 2. Gemini tool calls carry NO ids — this adapter synthesizes stable ids
//    (`gemini-call-N`) per response so upstream correlation keeps working.
// 3. Function responses are correlated by function NAME, so `tool` messages
//    routed here must set `ChatMessage.toolName`.
// Compliance: zero-retention/no-training agreement is NOT yet in place
// (config.ts PROVIDER_DATA_POLICIES) — do not route production tenant data.

export interface GeminiAdapterOptions {
  apiKey: string
  timeoutMs?: number
  id?: string
}

export class GeminiAdapter implements ProviderAdapter {
  readonly id: string
  private readonly client: GoogleGenerativeAI
  private readonly timeoutMs: number | undefined

  constructor(options: GeminiAdapterOptions) {
    this.id = options.id ?? PROVIDER_GEMINI
    this.client = new GoogleGenerativeAI(options.apiKey)
    this.timeoutMs = options.timeoutMs
  }

  async chat(params: ProviderChatParams): Promise<ProviderChatResult> {
    try {
      const model = this.getModel(params)
      const result = await model.generateContent({
        contents: toGeminiContents(params.messages),
        generationConfig: this.toGenerationConfig(params),
      })
      const response = result.response
      const toolCalls = extractToolCalls(response)
      const chatResult: ProviderChatResult = {
        text: extractText(response),
        usage: toUsage(response.usageMetadata),
      }
      if (toolCalls.length > 0) chatResult.toolCalls = toolCalls
      return chatResult
    } catch (error) {
      throw this.toGatewayError(error)
    }
  }

  async *chatStream(params: ProviderChatParams): AsyncIterable<StreamDelta> {
    try {
      const model = this.getModel(params)
      const result = await model.generateContentStream({
        contents: toGeminiContents(params.messages),
        generationConfig: this.toGenerationConfig(params),
      })
      let callIndex = 0
      for await (const chunk of result.stream) {
        const text = extractText(chunk)
        if (text.length > 0) {
          yield { type: 'text', text }
        }
        // Gemini streams function calls whole, not as JSON fragments — each
        // arrives as a single complete tool_call_delta.
        for (const call of chunk.functionCalls() ?? []) {
          yield {
            type: 'tool_call_delta',
            id: `gemini-call-${callIndex}`,
            name: call.name,
            inputJsonDelta: JSON.stringify(call.args ?? {}),
          }
          callIndex += 1
        }
      }
      const response = await result.response
      yield { type: 'usage', usage: toUsage(response.usageMetadata) }
    } catch (error) {
      throw this.toGatewayError(error)
    }
  }

  /** Passive health — see AnthropicAdapter.health for rationale. */
  async health(): Promise<ProviderHealth> {
    return { healthy: true }
  }

  private getModel(params: ProviderChatParams): GenerativeModel {
    const systemInstruction = params.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n')

    return this.client.getGenerativeModel(
      {
        model: params.model,
        ...(systemInstruction.length > 0 ? { systemInstruction } : {}),
        ...(params.tools !== undefined
          ? { tools: [{ functionDeclarations: params.tools.map(toGeminiFunction) }] }
          : {}),
      },
      this.timeoutMs !== undefined ? { timeout: this.timeoutMs } : undefined,
    )
  }

  private toGenerationConfig(params: ProviderChatParams): {
    maxOutputTokens: number
    temperature?: number
  } {
    const config: { maxOutputTokens: number; temperature?: number } = {
      maxOutputTokens: params.maxTokens,
    }
    if (params.temperature !== undefined) config.temperature = params.temperature
    return config
  }

  private toGatewayError(error: unknown): GatewayError {
    if (error instanceof GatewayError) return error
    if (error instanceof GoogleGenerativeAIFetchError) {
      const status = typeof error.status === 'number' ? error.status : undefined
      if (status === 429) {
        return new GatewayError('rate_limit', `gemini: ${error.message}`, {
          retryable: true,
          provider: this.id,
          cause: error,
        })
      }
      if (status === 408 || status === 504) {
        return new GatewayError('timeout', `gemini: ${error.message}`, {
          retryable: true,
          provider: this.id,
          cause: error,
        })
      }
      if (status !== undefined && status >= 500) {
        return new GatewayError('provider_error', `gemini: ${error.message}`, {
          retryable: true,
          provider: this.id,
          cause: error,
        })
      }
      if (status === 400 || status === 404) {
        return new GatewayError('invalid_request', `gemini: ${error.message}`, {
          retryable: false,
          provider: this.id,
          cause: error,
        })
      }
      return new GatewayError('provider_error', `gemini: ${error.message}`, {
        retryable: false,
        provider: this.id,
        cause: error,
      })
    }
    return new GatewayError('provider_error', `gemini: ${describeError(error)}`, {
      retryable: false,
      provider: this.id,
      cause: error,
    })
  }
}

function toGeminiContents(messages: ChatMessage[]): Content[] {
  const contents: Content[] = []
  for (const message of messages) {
    if (message.role === 'system') continue // hoisted to systemInstruction
    if (message.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: message.content }] })
    } else if (message.role === 'assistant') {
      const parts: Part[] = []
      if (message.content.length > 0) parts.push({ text: message.content })
      for (const call of message.toolCalls ?? []) {
        parts.push({ functionCall: { name: call.name, args: call.input } })
      }
      contents.push({ role: 'model', parts: parts.length > 0 ? parts : [{ text: '' }] })
    } else {
      // Caveat 3 above: correlation is by name — toolName is required here.
      contents.push({
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: message.toolName ?? 'unknown_tool',
              response: { content: message.content },
            },
          },
        ],
      })
    }
  }
  return contents
}

function toGeminiFunction(spec: ToolSpec): FunctionDeclaration {
  return {
    name: spec.name,
    description: spec.description,
    // Caveat 1 above: Gemini accepts a restricted schema subset; the Phase 3
    // registry transform guarantees compatibility before tool traffic routes here.
    parameters: spec.inputSchema as FunctionDeclaration['parameters'],
  }
}

/**
 * Reads text from candidate parts directly instead of `response.text()`, which
 * throws on safety-blocked responses — we prefer returning what exists and
 * letting the Verifier judge it (R-AI6: honest degradation, not exceptions).
 */
function extractText(response: EnhancedGenerateContentResponse): string {
  const candidate = response.candidates?.[0]
  if (candidate === undefined) return ''
  const parts = candidate.content?.parts ?? []
  return parts
    .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : ''))
    .join('')
}

function extractToolCalls(response: EnhancedGenerateContentResponse): ToolCall[] {
  const calls = response.functionCalls() ?? []
  return calls.map((call, index) => ({
    id: `gemini-call-${index}`, // Caveat 2 above: Gemini has no native call ids
    name: call.name,
    input: isRecord(call.args) ? call.args : {},
  }))
}

function toUsage(metadata: UsageMetadata | undefined): TokenUsage {
  if (metadata === undefined) return { inputTokens: 0, outputTokens: 0 }
  const mapped: TokenUsage = {
    inputTokens: metadata.promptTokenCount ?? 0,
    outputTokens: metadata.candidatesTokenCount ?? 0,
  }
  const cached = metadata.cachedContentTokenCount
  if (typeof cached === 'number') mapped.cachedInputTokens = cached
  return mapped
}
