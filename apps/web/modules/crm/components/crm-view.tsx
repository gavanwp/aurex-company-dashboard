'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { formatMoney } from '@aurexos/core'
import { Button } from '@aurexos/ui/components/button'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { StatCard } from '@aurexos/ui/components/stat-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@aurexos/ui/components/tabs'
import type { ClientOption, ContactRow, DealRow, PipelineSummary } from '../types'
import { ContactDialog } from './contact-dialog'
import { ContactsTable } from './contacts-table'
import { DealDialog } from './deal-dialog'
import { PipelineBoard } from './pipeline-board'

export type CrmTab = 'pipeline' | 'contacts'

export interface CrmViewProps {
  tab: CrmTab
  deals: DealRow[]
  contacts: ContactRow[]
  clients: ClientOption[]
  summary: PipelineSummary
}

export function CrmView({ tab, deals, contacts, clients, summary }: CrmViewProps) {
  const router = useRouter()
  const [newDealOpen, setNewDealOpen] = React.useState(false)
  const [newContactOpen, setNewContactOpen] = React.useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM"
        description="Contacts, deals and your pipeline."
        actions={
          tab === 'pipeline' ? (
            <Button onClick={() => setNewDealOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New deal
            </Button>
          ) : (
            <Button onClick={() => setNewContactOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New contact
            </Button>
          )
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) =>
          router.replace(value === 'pipeline' ? '/crm' : `/crm?tab=${value}`, { scroll: false })
        }
      >
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Open pipeline"
              value={formatMoney(summary.openValueCents)}
              hint={`${summary.openCount} open ${summary.openCount === 1 ? 'deal' : 'deals'}`}
            />
            <StatCard
              label="Weighted forecast"
              value={formatMoney(summary.weightedValueCents)}
              hint="open value × probability"
            />
            <StatCard
              label="Won"
              value={formatMoney(summary.wonValueCents)}
              hint={`${summary.wonCount} ${summary.wonCount === 1 ? 'deal' : 'deals'} won`}
            />
          </div>
          <PipelineBoard
            deals={deals}
            clients={clients}
            contacts={contacts}
            onCreateDeal={() => setNewDealOpen(true)}
          />
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <ContactsTable
            contacts={contacts}
            clients={clients}
            onCreateContact={() => setNewContactOpen(true)}
          />
        </TabsContent>
      </Tabs>

      <DealDialog
        open={newDealOpen}
        onOpenChange={setNewDealOpen}
        clients={clients}
        contacts={contacts}
      />
      <ContactDialog open={newContactOpen} onOpenChange={setNewContactOpen} clients={clients} />
    </div>
  )
}
