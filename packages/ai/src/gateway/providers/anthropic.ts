import Anthropic from '@anthropic-ai/sdk'
import {
  GatewayError,
  PROVIDER_ANTHROPIC,
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

// Anthropic adapter — primary provider (07_AI_Strategy.md §4.1). This file is
// one of the ONLY places `@anthropic-ai/sdk` may be imported (R-AI1). It
// translates our contracts to/from the Messages API and never lets SDK types
// leak upward.

export interface AnthropicAdapterOptions {
  apiKey: string
  /** Per-request HTTP timeout in ms (from gateway config, R-S4). */
  timeoutMs?: number
  id?: string
}

export class AnthropicAdapter implements ProviderAdapter {
  readonly id: string
  private readonly client: Anthropic

  constructor(options: AnthropicAdapterOptions) {
    this.id = options.id ?? PROVIDER_ANTHROPIC
    this.client = new Anthropic({
      apiKey: options.apiKey,
      timeout: options.timeoutMs,
      maxRetries: 0, // retry/backoff policy is owned by the gateway, not the SDK
    })
  }

  async chat(params: ProviderChatParams): Promise<ProviderChatResult> {
    try {
      const response = await this.client.messages.create(this.toCreateParams(params))
      return this.toResult(response)
    } catch (error) {
      throw this.toGatewayError(error)
    }
  }

  async *chatStream(params: ProviderChatParams): AsyncIterable<StreamDelta> {
    // messages.stream() gives typed events plus finalMessage() for authoritative usage.
    const stream = this.client.messages.stream(this.toCreateParams(params))
    const toolIdsByIndex = new Map<number, string>()
    try {
      for await (const event of stream) {
        if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
          toolIdsByIndex.set(event.index, event.content_block.id)
          yield {
            type: 'tool_call_delta',
            id: event.content_block.id,
            name: event.content_block.name,
            inputJsonDelta: '',
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            yield { type: 'text', text: event.delta.text }
          } else if (event.delta.type === 'input_json_delta') {
            const toolId = toolIdsByIndex.get(event.index)
            if (toolId !== undefined) {
              yield { type: 'tool_call_delta', id: toolId, inputJsonDelta: event.delta.partial_json }
            }
          }
        }
      }
      const finalMessage = await stream.finalMessage()
      yield { type: 'usage', usage: this.toUsage(finalMessage.usage) }
    } catch (error) {
      throw this.toGatewayError(error)
    }
  }

  /**
   * Passive health: the gateway infers liveness from call outcomes (cooldown
   * cache). Active health probes are scheduled work that lands in Phase 3
   * alongside the orchestrator (AIArchitecture.md §3.1 health thresholds).
   */
  async health(): Promise<ProviderHealth> {
    return { healthy: true }
  }

  private toCreateParams(params: ProviderChatParams): Anthropic.MessageCreateParamsNonStreaming {
    const system = params.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n')

    const request: Anthropic.MessageCreateParamsNonStreaming = {
      model: params.model,
      max_tokens: params.maxTokens,
      messages: toAnthropicMessages(params.messages),
    }
    if (system.length > 0) request.system = system
    if (params.temperature !== undefined) request.temperature = params.temperature
    if (params.tools !== undefined) request.tools = params.tools.map(toAnthropicTool)
    return request
  }

  private toResult(response: Anthropic.Message): ProviderChatResult {
    const textParts: string[] = []
    const toolCalls: ToolCall[] = []
    for (const block of response.content) {
      if (block.type === 'text') {
        textParts.push(block.text)
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: isRecord(block.input) ? block.input : {},
        })
      }
    }
    const result: ProviderChatResult = {
      text: textParts.join(''),
      usage: this.toUsage(response.usage),
    }
    if (toolCalls.length > 0) result.toolCalls = toolCalls
    return result
  }

  /** Maps usage incl. prompt-cache reads — feeds the >60% cached-input target (07_AI_Strategy.md §9). */
  private toUsage(usage: Anthropic.Usage): TokenUsage {
    const mapped: TokenUsage = {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
    }
    const cached = usage.cache_read_input_tokens
    if (typeof cached === 'number') mapped.cachedInputTokens = cached
    return mapped
  }

  /** Vendor errors → GatewayError taxonomy; `retryable` drives failover (AIArchitecture.md §14.2). */
  private toGatewayError(error: unknown): GatewayError {
    if (error instanceof GatewayError) return error
    if (error instanceof Anthropic.APIConnectionError) {
      return new GatewayError('timeout', `anthropic: ${error.message}`, {
        retryable: true,
        provider: this.id,
        cause: error,
      })
    }
    if (error instanceof Anthropic.APIError) {
      const status = typeof error.status === 'number' ? error.status : undefined
      if (status === 429) {
        return new GatewayError('rate_limit', `anthropic: ${error.message}`, {
          retryable: true,
          provider: this.id,
          cause: error,
        })
      }
      if (status === 408) {
        return new GatewayError('timeout', `anthropic: ${error.message}`, {
          retryable: true,
          provider: this.id,
          cause: error,
        })
      }
      if (status !== undefined && status >= 500) {
        return new GatewayError('provider_error', `anthropic: ${error.message}`, {
          retryable: true,
          provider: this.id,
          cause: error,
        })
      }
      if (status === 400 || status === 404 || status === 422) {
        return new GatewayError('invalid_request', `anthropic: ${error.message}`, {
          retryable: false,
          provider: this.id,
          cause: error,
        })
      }
      // 401/403 and anything else: broken config, not transient — do not retry.
      return new GatewayError('provider_error', `anthropic: ${error.message}`, {
        retryable: false,
        provider: this.id,
        cause: error,
      })
    }
    return new GatewayError('provider_error', `anthropic: ${describeError(error)}`, {
      retryable: false,
      provider: this.id,
      cause: error,
    })
  }
}

function toAnthropicMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
  const mapped: Anthropic.MessageParam[] = []
  for (const message of messages) {
    if (message.role === 'system') continue // hoisted to the system param
    if (message.role === 'user') {
      mapped.push({ role: 'user', content: message.content })
    } else if (message.role === 'assistant') {
      const blocks: Anthropic.ContentBlockParam[] = []
      if (message.content.length > 0) {
        blocks.push({ type: 'text', text: message.content })
      }
      for (const call of message.toolCalls ?? []) {
        blocks.push({ type: 'tool_use', id: call.id, name: call.name, input: call.input })
      }
      mapped.push({
        role: 'assistant',
        content: blocks.length > 0 ? blocks : message.content,
      })
    } else {
      // 'tool' role: Anthropic represents tool results as user-turn tool_result blocks.
      mapped.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: message.toolCallId ?? '',
            content: message.content,
          },
        ],
      })
    }
  }
  return mapped
}

function toAnthropicTool(spec: ToolSpec): Anthropic.Tool {
  return {
    name: spec.name,
    description: spec.description,
    // The registry emits standard JSON Schema; the SDK type only narrows the
    // top-level `type: "object"` discriminator, which the registry guarantees.
    input_schema: spec.inputSchema as Anthropic.Tool.InputSchema,
  }
}
