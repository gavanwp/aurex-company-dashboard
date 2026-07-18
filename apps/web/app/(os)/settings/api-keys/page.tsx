import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import { PageHeader } from '@aurexos/ui/components/page-header'
import { getWorkspaceContext } from '@/lib/workspace-context'
import { ApiKeysManager, canManageApiKeys, getApiKeys } from '@/modules/access'

export const metadata: Metadata = { title: 'API keys' }

export default async function ApiKeysPage() {
  const ctx = await getWorkspaceContext()
  const canManage = await canManageApiKeys(ctx)
  if (!canManage) notFound()

  const keys = await getApiKeys(ctx)

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
          <Link href="/settings">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Settings
          </Link>
        </Button>
        <PageHeader
          title="API keys"
          description="Programmatic access to the AurexOS API for this organization. Keys are hashed at rest."
        />
      </div>
      <ApiKeysManager keys={keys} canManage={canManage} />
    </div>
  )
}
