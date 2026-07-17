'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, Workflow, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { Badge } from '@aurexos/ui/components/badge'
import { createAutomation, updateAutomation } from '../actions/automation-actions'
import { ACTION_DEFS, TRIGGER_DEFS, actionDef, recipeDef, triggerDef } from '../constants'
import { DRAFT_HANDOFF_KEY } from '../lib/handoff'
import type { AutomationDetail } from '../types'

interface ActionItem {
  key: string // stable react key
  actionKey: string
}

let counter = 0
const nextKey = () => `a${(counter += 1)}`
const DEFAULT_ACTION_KEY = ACTION_DEFS[0]?.actionKey ?? 'notify.team'

type TriggerDefItem = (typeof TRIGGER_DEFS)[number]

// Group triggers by module for the picker.
const TRIGGER_GROUPS: Array<[string, TriggerDefItem[]]> = (() => {
  const map = new Map<string, TriggerDefItem[]>()
  for (const t of TRIGGER_DEFS) {
    const list = map.get(t.module) ?? []
    list.push(t)
    map.set(t.module, list)
  }
  return [...map.entries()]
})()

export interface AutomationBuilderProps {
  /** Present in edit mode. */
  automation?: AutomationDetail
}

export function AutomationBuilder({ automation }: AutomationBuilderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEdit = !!automation

  const [name, setName] = React.useState(automation?.name ?? '')
  const [triggerEventType, setTriggerEventType] = React.useState(automation?.triggerEventType ?? '')
  const [actions, setActions] = React.useState<ActionItem[]>(
    automation?.actions.map((a) => ({ key: nextKey(), actionKey: a.actionKey })) ?? [],
  )
  const [notifyOwner, setNotifyOwner] = React.useState(automation?.errorPolicy.notifyOwner ?? true)
  const [retryCount, setRetryCount] = React.useState(
    String(automation?.errorPolicy.retryCount ?? 0),
  )
  const [isPending, startTransition] = React.useTransition()

  // Prefill from an AI draft (sessionStorage) or a recipe (?recipe=key) on mount.
  React.useEffect(() => {
    if (isEdit) return
    const from = searchParams.get('from')
    const recipeKey = searchParams.get('recipe')
    if (from === 'ai') {
      try {
        const raw = window.sessionStorage.getItem(DRAFT_HANDOFF_KEY)
        if (raw) {
          const draft = JSON.parse(raw) as {
            name?: string
            triggerEventType?: string
            actions?: { actionKey: string }[]
          }
          if (draft.name) setName(draft.name)
          if (draft.triggerEventType) setTriggerEventType(draft.triggerEventType)
          if (Array.isArray(draft.actions)) {
            setActions(draft.actions.map((a) => ({ key: nextKey(), actionKey: a.actionKey })))
          }
          window.sessionStorage.removeItem(DRAFT_HANDOFF_KEY)
        }
      } catch {
        /* ignore malformed handoff */
      }
    } else if (recipeKey) {
      const recipe = recipeDef(recipeKey)
      if (recipe) {
        setName(recipe.name)
        setTriggerEventType(recipe.triggerEventType)
        setActions(recipe.actionKeys.map((k) => ({ key: nextKey(), actionKey: k })))
      }
    }
  }, [isEdit, searchParams])

  const addAction = () =>
    setActions((prev) => [...prev, { key: nextKey(), actionKey: DEFAULT_ACTION_KEY }])
  const removeAction = (key: string) => setActions((prev) => prev.filter((a) => a.key !== key))
  const setAction = (key: string, actionKey: string) =>
    setActions((prev) => prev.map((a) => (a.key === key ? { ...a, actionKey } : a)))

  const save = () => {
    if (!name.trim()) {
      toast.error('Give the automation a name')
      return
    }
    if (!triggerEventType) {
      toast.error('Choose a trigger event')
      return
    }
    startTransition(async () => {
      const payload = {
        name: name.trim(),
        triggerEventType,
        triggerFilter: {},
        conditionGraph: {},
        actions: actions.map((a) => ({ actionKey: a.actionKey, input: {} })),
        errorPolicy: {
          retryCount: Number(retryCount) || 0,
          circuitBreakAfter: 5,
          notifyOwner,
        },
        scope: 'workspace' as const,
      }
      const result = automation
        ? await updateAutomation({ id: automation.id, ...payload })
        : await createAutomation(payload)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(isEdit ? 'Automation saved' : 'Automation created as draft')
      router.push(`/automations/${result.data.id}`)
      router.refresh()
    })
  }

  const selectedTrigger = triggerEventType ? triggerDef(triggerEventType) : undefined

  return (
    <div className="space-y-6">
      {/* Trigger */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="auto-name">Name</Label>
            <Input
              id="auto-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chase overdue invoices"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>When this happens</Label>
            <Select value={triggerEventType} onValueChange={setTriggerEventType}>
              <SelectTrigger aria-label="Trigger event">
                <SelectValue placeholder="Choose a trigger event…" />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_GROUPS.map(([module, defs]) => (
                  <SelectGroup key={module}>
                    <SelectLabel>{module}</SelectLabel>
                    {defs.map((t) => (
                      <SelectItem key={t.eventType} value={t.eventType}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {selectedTrigger ? (
              <p className="text-xs text-muted-foreground">{selectedTrigger.hint}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Do this</h2>
              <p className="text-xs text-muted-foreground">
                Actions run in order when the trigger fires.
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addAction}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add action
            </Button>
          </div>

          {actions.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
              No actions yet. Add at least one before activating.
            </p>
          ) : (
            <div className="space-y-2">
              {actions.map((a, i) => {
                const def = actionDef(a.actionKey)
                return (
                  <div key={a.key} className="flex items-center gap-2 rounded-md border p-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <Select value={a.actionKey} onValueChange={(v) => setAction(a.key, v)}>
                        <SelectTrigger className="h-8" aria-label={`Action ${i + 1}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_DEFS.map((d) => (
                            <SelectItem key={d.actionKey} value={d.actionKey}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {def ? (
                        <p className="mt-1 pl-1 text-xs text-muted-foreground">
                          {def.description}
                          {def.requiresApproval ? (
                            <Badge
                              variant="warning-soft"
                              className="ml-1.5 px-1.5 py-0 align-middle"
                            >
                              needs approval
                            </Badge>
                          ) : null}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeAction(a.key)}
                      aria-label="Remove action"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error handling */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold text-foreground">On failure</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="auto-retry">Retry attempts</Label>
              <Input
                id="auto-retry"
                type="number"
                min={0}
                max={5}
                value={retryCount}
                onChange={(e) => setRetryCount(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                checked={notifyOwner}
                onChange={(e) => setNotifyOwner(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Notify me if it fails
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Workflow className="size-3.5" aria-hidden="true" />
          {isEdit ? 'Changes apply on save.' : 'Saved as a draft — activate it when you’re ready.'}
        </p>
        <div className="flex items-center gap-2">
          <Button asChild type="button" variant="ghost">
            <Link href={automation ? `/automations/${automation.id}` : '/automations'}>Cancel</Link>
          </Button>
          <Button type="button" onClick={save} disabled={isPending}>
            <Zap className="mr-1.5 h-4 w-4" />
            {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create automation'}
          </Button>
        </div>
      </div>
    </div>
  )
}
