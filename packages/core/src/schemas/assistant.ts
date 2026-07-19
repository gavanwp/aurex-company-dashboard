import { z } from 'zod'

// Contract for the Aurex assistant surface. The client sends the running
// conversation (user + assistant turns); the server prepends the system prompt
// and workspace snapshot. Bounded so a runaway history can't blow the context.

export const AssistantMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1, 'Say something to Aurex').max(4000, 'Message is too long'),
})
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>

export const AskAurexInput = z.object({
  /** Full conversation so far, oldest first; the last entry must be the user. */
  messages: z.array(AssistantMessageSchema).min(1).max(40),
})
export type AskAurexInput = z.infer<typeof AskAurexInput>
