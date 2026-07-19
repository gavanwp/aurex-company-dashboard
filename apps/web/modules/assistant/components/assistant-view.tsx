'use client'

import * as React from 'react'
import { ArrowUp, Sparkles } from 'lucide-react'
import type { AssistantMessage } from '@aurexos/core'
import { AurexGlyph } from '@aurexos/ui/components/ai/aurex-mark'
import { Button } from '@aurexos/ui/components/button'
import { Card } from '@aurexos/ui/components/card'
import { askAurex } from '../actions/assistant-actions'
import type { AssistantContext } from '../queries/get-assistant-context'

/** A chat entry — a message plus, for Aurex turns, which read tools it used. */
type ChatItem = AssistantMessage & { toolsUsed?: string[] }

const TOOL_LABELS: Record<string, string> = {
  list_tasks: 'tasks',
  list_deals: 'pipeline',
  list_invoices: 'invoices',
  list_projects: 'projects',
}

function AurexAvatar() {
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--accent-soft))]"
      style={{ color: 'hsl(var(--accent-text))' }}
      aria-hidden="true"
    >
      <AurexGlyph size={16} />
    </span>
  )
}

function MessageRow({ message }: { message: ChatItem }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    )
  }
  const tools = message.toolsUsed ?? []
  return (
    <div className="flex gap-2.5">
      <AurexAvatar />
      <div className="min-w-0 flex-1 pt-0.5">
        {tools.length > 0 ? (
          <p className="mb-1 text-xs text-muted-foreground">
            Looked up {tools.map((t) => TOOL_LABELS[t] ?? t).join(', ')}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
          {message.content}
        </p>
      </div>
    </div>
  )
}

function ThinkingRow() {
  return (
    <div className="flex gap-2.5">
      <AurexAvatar />
      <div className="flex items-center gap-1 pt-2" aria-label="Aurex is thinking">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

export function AssistantView({ context }: { context: AssistantContext }) {
  const [messages, setMessages] = React.useState<ChatItem[]>([])
  const [input, setInput] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const taRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isPending])

  const send = (text: string) => {
    const content = text.trim()
    if (!content || isPending) return
    const next: ChatItem[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setError(null)
    startTransition(async () => {
      const res = await askAurex({
        messages: next.map((m) => ({ role: m.role, content: m.content })),
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: res.data.reply, toolsUsed: res.data.toolsUsed },
      ])
    })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const empty = messages.length === 0

  return (
    <Card className="flex h-[calc(100dvh-7.5rem)] min-h-[440px] flex-col overflow-hidden">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {empty ? (
          <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center text-center">
            <span
              className="flex size-12 items-center justify-center rounded-2xl bg-[hsl(var(--accent-soft))]"
              style={{ color: 'hsl(var(--accent-text))' }}
              aria-hidden="true"
            >
              <AurexGlyph size={16} />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              Hi {context.userDisplayName.split(' ')[0]}, I’m Aurex.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              I can see your workspace at a glance and help you make sense of it. Ask me anything,
              or start with one of these:
            </p>
            <div className="mt-5 flex w-full flex-col gap-2">
              {context.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="group flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm text-foreground transition-colors hover:border-[hsl(var(--accent-text))] hover:bg-accent/40"
                >
                  <Sparkles
                    className="size-4 shrink-0 text-muted-foreground group-hover:text-[hsl(var(--accent-text))]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-5">
            {messages.map((m, i) => (
              <MessageRow key={i} message={m} />
            ))}
            {isPending ? <ThinkingRow /> : null}
            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-foreground">
                {error}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask Aurex…"
            className="max-h-40 min-h-[2.5rem] flex-1 resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-[hsl(var(--accent-text))] focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <Button
            size="icon"
            className="size-10 shrink-0 rounded-xl"
            onClick={() => send(input)}
            disabled={isPending || input.trim().length === 0}
            aria-label="Send message"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <p className="mx-auto mt-1.5 max-w-2xl text-center text-[11px] text-muted-foreground">
          Aurex sees a summary of your workspace and can make mistakes — double-check anything
          important.
        </p>
      </div>
    </Card>
  )
}
