'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, KeyRound, MessageSquare, Sparkles, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { AurexGlyph } from '@aurexos/ui/components/ai/aurex-mark'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { Textarea } from '@aurexos/ui/components/textarea'
import { cn } from '@aurexos/ui/lib/utils'
import { askAutomationAssistant, draftAutomation } from '../actions/ai-actions'
import { actionLabel, triggerLabel } from '../constants'
import { DRAFT_HANDOFF_KEY } from '../lib/handoff'
import type { DraftResult } from '../types'

type Mode = 'ask' | 'draft'

interface QaEntry {
  question: string
  answer: string
  model: string
}

const ASK_SUGGESTIONS = [
  'What can I automate when an invoice goes overdue?',
  'How do I notify the team when a deal is won?',
  'Which triggers are available for contracts?',
]

export interface AutomationAssistantProps {
  aiConfigured: boolean
  canManage: boolean
}

export function AutomationAssistant({ aiConfigured, canManage }: AutomationAssistantProps) {
  const router = useRouter()
  const [mode, setMode] = React.useState<Mode>('ask')
  const [input, setInput] = React.useState('')
  const [isPending, startTransition] = React.useTransition()
  const [log, setLog] = React.useState<QaEntry[]>([])
  const [draft, setDraft] = React.useState<DraftResult | null>(null)

  const submit = (text?: string) => {
    const value = (text ?? input).trim()
    if (!value || isPending) return
    startTransition(async () => {
      if (mode === 'ask') {
        const result = await askAutomationAssistant({ question: value })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        setLog((prev) => [
          ...prev,
          { question: value, answer: result.data.answer, model: result.data.model },
        ])
        setInput('')
      } else {
        const result = await draftAutomation({ description: value })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        setDraft(result.data)
      }
    })
  }

  const useDraft = () => {
    if (!draft) return
    try {
      window.sessionStorage.setItem(DRAFT_HANDOFF_KEY, JSON.stringify(draft.draft))
    } catch {
      toast.error('Could not open the draft in the builder.')
      return
    }
    router.push('/automations/new?from=ai')
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2.5 border-b bg-[hsl(var(--accent-soft))]/40 px-5 py-3">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-soft))]"
          style={{ color: 'hsl(var(--accent-text))' }}
          aria-hidden="true"
        >
          <AurexGlyph size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Aurex for Automation</p>
          <p className="truncate text-xs text-muted-foreground">
            Ask what you can automate, or describe one and Aurex drafts it.
          </p>
        </div>
        <div className="flex shrink-0 items-center rounded-md border p-0.5">
          <button
            type="button"
            onClick={() => setMode('ask')}
            className={cn(
              'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
              mode === 'ask'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <MessageSquare className="size-3.5" aria-hidden="true" />
            Ask
          </button>
          <button
            type="button"
            onClick={() => setMode('draft')}
            className={cn(
              'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
              mode === 'draft'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Wand2 className="size-3.5" aria-hidden="true" />
            Draft
          </button>
        </div>
      </div>

      <CardContent className="space-y-4 p-5">
        {!aiConfigured ? (
          <div className="flex items-start gap-3 rounded-md border border-dashed p-4">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Connect Aurex to enable AI</p>
              <p className="mt-0.5 text-muted-foreground">
                Add an{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">ANTHROPIC_API_KEY</code> to
                the app environment. Automations still work fully without it — you can build them by
                hand below.
              </p>
            </div>
          </div>
        ) : null}

        {/* Ask log */}
        {mode === 'ask' && log.length > 0 ? (
          <div className="space-y-3">
            {log.map((entry, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">{entry.question}</p>
                <div className="flex gap-2.5 rounded-md border bg-muted/30 p-3">
                  <span
                    className="mt-0.5 shrink-0"
                    style={{ color: 'hsl(var(--accent-text))' }}
                    aria-hidden="true"
                  >
                    <AurexGlyph size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {entry.answer}
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Aurex · {entry.model}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Draft result */}
        {mode === 'draft' && draft ? (
          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{draft.draft.name}</p>
                {draft.draft.summary ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{draft.draft.summary}</p>
                ) : null}
              </div>
              <Badge variant="accent-soft" className="shrink-0 gap-1">
                <Sparkles className="size-3" aria-hidden="true" />
                Draft
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">When</span>
                <Badge variant={draft.unknownTrigger ? 'warning-soft' : 'secondary'}>
                  {triggerLabel(draft.draft.triggerEventType)}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Then</span>
                {draft.draft.actions.length === 0 ? (
                  <span className="text-xs text-muted-foreground">no actions proposed</span>
                ) : (
                  draft.draft.actions.map((a, i) => (
                    <Badge
                      key={`${a.actionKey}-${i}`}
                      variant={
                        draft.unknownActions.includes(a.actionKey) ? 'warning-soft' : 'outline'
                      }
                    >
                      {actionLabel(a.actionKey)}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            {draft.unknownTrigger || draft.unknownActions.length > 0 ? (
              <p className="text-xs text-[hsl(var(--warning-text))]">
                Some items aren’t in the registry yet — review them in the builder before saving.
              </p>
            ) : null}
            <div className="flex items-center gap-2 pt-1">
              {canManage ? (
                <Button size="sm" onClick={useDraft}>
                  Open in builder
                  <ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ask an owner or admin to save this automation.
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">Aurex · {draft.model}</p>
            </div>
          </div>
        ) : null}

        {/* Suggestions (ask mode, empty) */}
        {mode === 'ask' && log.length === 0 && aiConfigured ? (
          <div className="flex flex-wrap gap-1.5">
            {ASK_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                disabled={isPending}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {/* Composer */}
        <div className="space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                submit()
              }
            }}
            rows={mode === 'draft' ? 3 : 2}
            disabled={!aiConfigured || isPending}
            placeholder={
              mode === 'ask'
                ? 'Ask Aurex about automating your workspace…'
                : 'Describe an automation, e.g. “when an invoice is 7 days overdue, draft a reminder and notify Finance”'
            }
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">⌘↵ to send</p>
            <Button size="sm" onClick={() => submit()} disabled={!aiConfigured || isPending}>
              {isPending
                ? mode === 'ask'
                  ? 'Thinking…'
                  : 'Drafting…'
                : mode === 'ask'
                  ? 'Ask Aurex'
                  : 'Draft it'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
