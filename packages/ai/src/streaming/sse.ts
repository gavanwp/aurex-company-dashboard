import { StreamDeltaSchema, type StreamDelta } from '../gateway/types'

// SSE (de)serialization for StreamDelta — the wire format between the
// gateway's streaming output and the app's route handlers / EventSource
// consumers (07_AI_Strategy.md §4: SSE first-class end-to-end). The gateway
// itself never writes HTTP; these helpers keep the framing in one place so
// apps/web route handlers and the Aurex panel agree on it.

/** Sentinel payload marking end-of-stream, mirroring the common `[DONE]` convention. */
export const SSE_DONE_PAYLOAD = '[DONE]'

/** Serializes one delta to a complete SSE frame (`data: {...}\n\n`). */
export function serializeStreamDelta(delta: StreamDelta): string {
  return `data: ${JSON.stringify(delta)}\n\n`
}

/** Terminal SSE frame. */
export function serializeSseDone(): string {
  return `data: ${SSE_DONE_PAYLOAD}\n\n`
}

/**
 * Wraps a gateway delta stream as SSE frames, appending the `[DONE]` sentinel.
 * Usage in a route handler: pipe these strings into the response body.
 */
export async function* toSseStream(deltas: AsyncIterable<StreamDelta>): AsyncIterable<string> {
  for await (const delta of deltas) {
    yield serializeStreamDelta(delta)
  }
  yield serializeSseDone()
}

/**
 * Parses one SSE line back into a StreamDelta. Returns null for non-data lines
 * (comments, event names, blanks) and for the `[DONE]` sentinel. The payload
 * is Zod-validated (R-T3) — a malformed frame throws rather than yielding a
 * half-shaped delta into the UI.
 */
export function parseSseLine(line: string): StreamDelta | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return null
  const payload = trimmed.slice('data:'.length).trim()
  if (payload.length === 0 || payload === SSE_DONE_PAYLOAD) return null
  const json: unknown = JSON.parse(payload)
  return StreamDeltaSchema.parse(json)
}
