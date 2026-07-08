'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ArrowRight, Handshake, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DEAL_STAGES, formatMoney, type DealStage } from '@aurexos/core'
import { Button } from '@aurexos/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@aurexos/ui/components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@aurexos/ui/components/dropdown-menu'
import { EmptyState } from '@aurexos/ui/components/empty-state'
import { cn } from '@aurexos/ui/lib/utils'
import { deleteDeal, moveDealStage } from '../actions/deals'
import { STAGE_LABELS, type ClientOption, type ContactRow, type DealRow } from '../types'
import { DealDialog } from './deal-dialog'

function isPastDate(isoDate: string): boolean {
  return isoDate < format(new Date(), 'yyyy-MM-dd')
}

function formatCloseDate(isoDate: string): string {
  return format(new Date(`${isoDate}T00:00:00`), 'MMM d, yyyy')
}

export interface PipelineBoardProps {
  deals: DealRow[]
  clients: ClientOption[]
  contacts: ContactRow[]
  /** Opens the create-deal dialog owned by the parent view. */
  onCreateDeal: () => void
}

export function PipelineBoard({ deals, clients, contacts, onCreateDeal }: PipelineBoardProps) {
  // Optimistic stage overrides: deal id → stage shown while the move is in flight.
  const [overrides, setOverrides] = React.useState<Record<string, DealStage>>({})
  const [editing, setEditing] = React.useState<DealRow | null>(null)
  const [deleting, setDeleting] = React.useState<DealRow | null>(null)
  const [isDeleting, startDelete] = React.useTransition()

  const effectiveDeals = deals.map((d) =>
    overrides[d.id] && overrides[d.id] !== d.stage ? { ...d, stage: overrides[d.id]! } : d,
  )

  function handleMove(deal: DealRow, to: DealStage) {
    if (deal.stage === to) return
    setOverrides((prev) => ({ ...prev, [deal.id]: to }))
    void moveDealStage({ id: deal.id, stage: to }).then((result) => {
      if (!result.ok) toast.error(result.error)
      setOverrides((prev) => {
        const next = { ...prev }
        delete next[deal.id]
        return next
      })
    })
  }

  function handleDelete() {
    if (!deleting) return
    const deal = deleting
    startDelete(async () => {
      const result = await deleteDeal({ id: deal.id })
      if (result.ok) {
        toast.success('Deal deleted')
        setDeleting(null)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (deals.length === 0) {
    return (
      <EmptyState
        icon={Handshake}
        title="No deals yet"
        description="Track every opportunity from lead to close. Create your first deal to see the pipeline."
        action={<Button onClick={onCreateDeal}>New deal</Button>}
      />
    )
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {DEAL_STAGES.map((stage) => {
          const stageDeals = effectiveDeals.filter((d) => d.stage === stage)
          const totalCents = stageDeals.reduce((sum, d) => sum + (d.valueCents ?? 0), 0)
          return (
            <div key={stage} className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40">
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{STAGE_LABELS[stage]}</span>
                  <span className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                    {stageDeals.length}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                  {formatMoney(totalCents)}
                </span>
              </div>
              <div className="flex flex-col gap-2 px-2 pb-2">
                {stageDeals.length === 0 ? (
                  <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    No deals
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className={cn(
                        'group rounded-md border bg-card p-3 shadow-sm',
                        deal.stage === 'won' && 'border-success/40 bg-success/5',
                        deal.stage === 'lost' && 'opacity-60',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{deal.title}</p>
                          {deal.clientName ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {deal.clientName}
                            </p>
                          ) : null}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Deal actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onSelect={() => setEditing(deal)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                              Move to
                            </DropdownMenuLabel>
                            {DEAL_STAGES.filter((s) => s !== deal.stage).map((s) => (
                              <DropdownMenuItem key={s} onSelect={() => handleMove(deal, s)}>
                                <ArrowRight className="mr-2 h-4 w-4" />
                                {STAGE_LABELS[s]}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => setDeleting(deal)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-medium [font-variant-numeric:tabular-nums]">
                          {formatMoney(deal.valueCents, deal.currency)}
                        </span>
                        {deal.probability != null ? (
                          <span className="text-muted-foreground [font-variant-numeric:tabular-nums]">
                            {deal.probability}%
                          </span>
                        ) : null}
                      </div>
                      {deal.expectedCloseDate ? (
                        <p
                          className={cn(
                            'mt-1 text-xs text-muted-foreground',
                            isPastDate(deal.expectedCloseDate) &&
                              deal.stage !== 'won' &&
                              deal.stage !== 'lost' &&
                              'font-medium text-warning',
                          )}
                        >
                          Close {formatCloseDate(deal.expectedCloseDate)}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      <DealDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        deal={editing}
        clients={clients}
        contacts={contacts}
      />

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete deal</DialogTitle>
            <DialogDescription>
              “{deleting?.title}” will be removed from the pipeline. You can’t undo this here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
