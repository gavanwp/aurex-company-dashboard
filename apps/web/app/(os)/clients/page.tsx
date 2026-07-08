import type { Metadata } from 'next'
import { Plus } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { ClientDialog, ClientsTable, getClients } from '@/modules/clients'

export const metadata: Metadata = { title: 'Clients' }

export default async function ClientsPage() {
  const ctx = await getWorkspaceContext()
  const clients = await getClients(ctx)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="The agencies and companies you work with."
        actions={
          <ClientDialog
            trigger={
              <Button>
                <Plus className="mr-1.5 h-4 w-4" />
                New client
              </Button>
            }
          />
        }
      />
      <ClientsTable clients={clients} />
    </div>
  )
}
