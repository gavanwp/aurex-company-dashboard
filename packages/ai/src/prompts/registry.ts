import { aurexSystemFrameV1 } from './aurex-system-frame'
import { automationAssistantV1 } from './automation-assistant'
import { automationDraftV1 } from './automation-draft'
import type { RegisteredPrompt } from './define-prompt'

// Prompt registry (R-AI5). Definitions register here so callers resolve
// prompts by id and the gateway/AIRun trace can pin (id, version) —
// AIArchitecture.md §11.2. The `prompt_versions` table (content hash + eval
// result ref) lands with the ai migrations; this in-memory registry is its
// build-time source of truth.

const definitions: readonly RegisteredPrompt[] = [
  aurexSystemFrameV1,
  automationAssistantV1,
  automationDraftV1,
]

export const promptRegistry: ReadonlyMap<string, RegisteredPrompt> = new Map(
  definitions.map((definition) => [definition.id, definition]),
)

/** Returns undefined for unknown ids — callers that can degrade choose to (R-AI6). */
export function getPrompt(id: string): RegisteredPrompt | undefined {
  return promptRegistry.get(id)
}

/** Throws for unknown ids — for call sites where a missing prompt is a build error, not a runtime condition. */
export function requirePrompt(id: string): RegisteredPrompt {
  const prompt = promptRegistry.get(id)
  if (prompt === undefined) {
    throw new Error(
      `unknown prompt id "${id}" — prompts must be registered in packages/ai/src/prompts/registry.ts (R-AI5)`,
    )
  }
  return prompt
}
