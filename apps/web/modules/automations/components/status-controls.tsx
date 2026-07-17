'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pause, Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { AutomationStatus } from '@aurexos/core'
import { Button } from '@aurexos/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@aurexos/ui/components/dialog'
import { deleteAutomation, setAutomationStatus } from '../actions/automation-actions'

export interface StatusControlsProps {
  id: string
  status: AutomationStatus
  hasActions: boolean
}

export function StatusControls({ id, status, hasActions }: StatusControlsProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const changeStatus = (next: AutomationStatus) => {
    startTransition(async () => {
      const result = await setAutomationStatus({ id, status: next })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(next === 'active' ? 'Automation activated' : 'Automation paused')
      router.refresh()
    })
  }

  const remove = () => {
    startTransition(async () => {
      const result = await deleteAutomation({ id })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Automation deleted')
      router.push('/automations')
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'active' ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => changeStatus('paused')}
          disabled={isPending}
        >
          <Pause className="mr-1.5 h-4 w-4" />
          Pause
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => changeStatus('active')}
          disabled={isPending || !hasActions}
          title={hasActions ? undefined : 'Add an action before activating'}
        >
          <Play className="mr-1.5 h-4 w-4" />
          Activate
        </Button>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Delete automation">
            <Trash2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this automation?</DialogTitle>
            <DialogDescription>
              It stops running immediately and moves to your deleted items. This can’t be undone
              from here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={isPending}>
              {isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
