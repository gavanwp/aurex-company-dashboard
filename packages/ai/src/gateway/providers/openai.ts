import OpenAI from 'openai'
import {
  GatewayError,
  PROVIDER_OPENAI,
  describeError,
  isRecord,
  type ChatMessage,
  type EmbedResult,
  type ProviderAdapter,
  type ProviderChatParams,
  type ProviderChatResult,
  type ProviderHealth,
  type StreamDelta,
  type TokenUsage,
  type ToolCall,
  type ToolSpec,
} from '../types'

// OpenAI adapter — secondary/failover provider and default embeddings tier
// (07_AI_Strategy.md §4.1). One of the ONLY places the `openai` SDK may be
// imported (R-AI1). Also the base for OpenAI-compatible endpoints (see
// openai-compatible.ts): the constructor takes baseUrl + id.

export interface OpenAiAdapterOptions {
  apiKey: string
  /** Override to point at an OpenAI-compatible server (vLLM/Ollama-class). */
  baseUrl?: string
  timeoutMs?: number
  id?: string
}

export class OpenAiAdapter implements ProviderAdapter {
  readonly id: string
  private readonly client: OpenAI

  constructor(options: OpenAiAdapterOptions) {
    this.id = options.id ?? PROVIDER_OPENAI
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
      timeout: options.timeoutMs,
      maxRetries: 0, // retry/backoff policy is owned by the gateway
    })
  }

  async chat(params: ProviderChatParams): Promise<ProviderChatResult> {
    try {
      const response = await this.client.chat.completions.create(this.toCreateParams(params))
      const choice = response.choices[0]
      if (choice === undefined) {
        throw new GatewayError('provider_error', `${this.id}: response contained no choices`, {
          retryable: false,
          provider: this.id,
        })
      }
      const toolCalls = (choice.message.tool_calls ?? []).map((call): ToolCall => ({
        id: call.id,
        name: call.function.name,
        input: parseToolArguments(call.function.arguments, this.id),
      }))
      const result: ProviderChatResult = {
        text: choice.message.content ?? '',
        usage: toUsage(response.usage),
      }
      if (toolCalls.length > 0) result.toolCalls = toolCalls
      return result
    } catch (error) {
      throw this.toGatewayError(error)
    }
  }

  async *chatStream(params: ProviderChatParams): AsyncIterable<StreamDelta> {
    try {
      const stream = await this.client.chat.completions.create({
        ...this.toCreateParams(params),
        stream: true,
        stream_options: { include_usage: true },
      })
      const toolIdsByIndex = new Map<number, string>()
      let usage: TokenUsage | undefined
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        if (delta !== undefined) {
          if (typeof delta.content === 'string' && delta.content.length > 0) {
            yield { type: 'text', text: delta.content }
          }
          for (const call of delta.tool_calls ?? []) {
            const known = toolIdsByIndex.get(call.index)
            const toolId = call.id ?? known
            if (toolId === undefined) continue
            if (known === undefined) toolIdsByIndex.set(call.index, toolId)
            const name = call.function?.name
            const inputJsonDelta = call.function?.arguments ?? ''
            yield name !== undefined
              ? { type: 'tool_call_delta', id: toolId, name, inputJsonDelta }
              : { type: 'tool_call_delta', id: toolId, inputJsonDelta }
          }
        }
        // With include_usage, the final chunk carries usage and an empty choices array.
        if (chunk.usage != null) usage = toUsage(chunk.usage)
      }
      yield { type: 'usage', usage: usage ?? { inputTokens: 0, outputTokens: 0 } }
    } catch (error) {
      throw this.toGatewayError(error)
    }
  }

  /** Serves the pinned embeddings tier (AIArchitecture.md §3.2). */
  async embed(model: string, inputs: string[]): Promise<EmbedResult> {
    try {
      const response = await this.client.embeddings.create({ model, input: inputs })
      return {
        embeddings: response.data.map((item) => item.embedding),
        usage: { inputTokens: response.usage.prompt_tokens },
      }
    } catch (error) {
      throw this.toGatewayError(error)
    }
  }

  /** Passive health — see AnthropicAdapter.health for rationale. */
  async health(): Promise<ProviderHealth> {
    return { healthy: true }
  }

  private toCreateParams(
    params: ProviderChatParams,
  ): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
    const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model: params.model,
      max_tokens: params.maxTokens,
      messages: toOpenAiMessages(params.messages),
    }
    if (params.temperature !== undefined) request.temperature = params.temperature
    if (params.tools !== undefined) request.tools = params.tools.map(toOpenAiTool)
    return request
  }

  private toGatewayError(error: unknown): GatewayError {
    if (error instanceof GatewayError) return error
    if (error instanceof OpenAI.APIConnectionError) {
      return new GatewayError('timeout', `${this.id}: ${error.message}`, {
        retryable: true,
        provider: this.id,
        cause: error,
      })
    }
    if (error instanceof OpenAI.APIError) {
      const status = typeof error.status === 'number' ? error.status : undefined
      if (status === 429) {
        return new GatewayError('rate_limit', `${this.id}: ${error.message}`, {
          retryable: true,
          provider: this.id,
          cause: error,
        })
      }
      if (status === 408) {
        return new GatewayError('timeout', `${this.id}: ${error.message}`, {
          retryable: true,
          provider: this.id,
          cause: error,
        })
      }
      if (status !== undefined && status >= 500) {
        return new GatewayError('provider_error', `${this.id}: ${error.message}`, {
          retryable: true,
          provider: this.id,
          cause: error,
        })
      }
      if (status === 400 || status === 404 || status === 422) {
        return new GatewayError('invalid_request', `${this.id}: ${error.message}`, {
          retryable: false,
          provider: this.id,
          cause: error,
        })
      }
      return new GatewayError('provider_error', `${this.id}: ${error.message}`, {
        retryable: false,
        provider: this.id,
        cause: error,
      })
    }
    return new GatewayError('provider_error', `${this.id}: ${describeError(error)}`, {
      retryable: false,
      provider: this.id,
      cause: error,
    })
  }
}

function toOpenAiMessages(
  messages: ChatMessage[],
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return messages.map((message): OpenAI.Chat.Completions.ChatCompletionMessageParam => {
    if (message.role === 'system') {
      return { role: 'system', content: message.content }
    }
    if (message.role === 'user') {
      return { role: 'user', content: message.content }
    }
    if (message.role === 'assistant') {
      const assistant: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
        role: 'assistant',
        content: message.content.length > 0 ? message.content : null,
      }
      const calls = message.toolCalls ?? []
      if (calls.length > 0) {
        assistant.tool_calls = calls.map((call) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: JSON.stringify(call.input) },
        }))
      }
      return assistant
    }
    return {
      role: 'tool',
      tool_call_id: message.toolCallId ?? '',
      content: message.content,
    }
  })
}

function toOpenAiTool(spec: ToolSpec): OpenAI.Chat.Completions.ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: spec.name,
      description: spec.description,
      parameters: spec.inputSchema,
    },
  }
}

/** Malformed tool calls are rejected, never "fixed up" silently (07_AI_Strategy.md §2.3). */
function parseToolArguments(raw: string, provider: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isRecord(parsed)) return parsed
  } catch (error) {
    throw new GatewayError('provider_error', `${provider}: malformed tool call arguments`, {
      retryable: false,
      provider,
      cause: error,
    })
  }
  throw new GatewayError('provider_error', `${provider}: tool call arguments were not an object`, {
    retryable: false,
    provider,
  })
}

function toUsage(usage: OpenAI.Completions.CompletionUsage | undefined | null): TokenUsage {
  if (usage == null) return { inputTokens: 0, outputTokens: 0 }
  const mapped: TokenUsage = {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
  }
  const cached = usage.prompt_tokens_details?.cached_tokens
  if (typeof cached === 'number') mapped.cachedInputTokens = cached
  return mapped
}
