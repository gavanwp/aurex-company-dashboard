import type { Metadata } from 'next'
import { FileQuestion } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPublicProposal, PublicProposalView } from '@/modules/proposals'

// The tokenized client page. Deliberately OUTSIDE the (os) shell: no app
// navigation, no auth guard, no workspace context. The unguessable token is the
// sole capability; data comes only from the SECURITY DEFINER RPC (0013) via an
// anonymous Supabase client. Always dynamic — never cache a private proposal.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Proposal',
  robots: { index: false, follow: false },
}

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()
  const proposal = await getPublicProposal(supabase, token)

  if (!proposal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Proposal not available</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This link is invalid or the proposal is no longer shared. Please check with your contact
            for an up-to-date link.
          </p>
        </div>
      </div>
    )
  }

  return <PublicProposalView proposal={proposal} token={token} />
}
