'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, FileCheck2 } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { createContractFromProposal } from '../actions/convert-actions'
import type { ContractFormOptions } from '../types'

/**
 * Draft a contract from an accepted proposal. Surfaced on the new-contract page
 * when the workspace has accepted proposals — the proposal→contract on-ramp.
 */
export function ContractFromProposal({
  proposals,
}: {
  proposals: ContractFormOptions['proposals']
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = React.useState<string | null>(null)

  if (proposals.length === 0) return null

  async function draft(proposalId: string) {
    setPendingId(proposalId)
    const result = await createContractFromProposal(proposalId)
    setPendingId(null)
    if (result.ok) {
      toast.success(
        result.data.alreadyDrafted
          ? 'A contract already exists for this proposal — opening it'
          : 'Contract drafted from proposal',
      )
      router.push(`/contracts/${result.data.contractId}/edit`)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">Start from an accepted proposal</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Prefill the client, value and clauses from a proposal the client already accepted.
        </p>
        <div className="space-y-1.5">
          {proposals.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.clientName ?? 'No client'}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={pendingId !== null}
                onClick={() => void draft(p.id)}
              >
                Draft contract
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
