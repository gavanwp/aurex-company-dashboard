'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MailX } from 'lucide-react'
import { toast } from 'sonner'
import { AurexGlyph } from '@aurexos/ui/components/ai/aurex-mark'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { acceptInvitation } from '../actions/accept-actions'
import type { InvitationPreview } from '../queries/get-invitation'

export interface InviteAcceptProps {
  token: string
  preview: InvitationPreview | null
  isAuthed: boolean
}

export function InviteAccept({ token, preview, isAuthed }: InviteAcceptProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <span
          className="flex size-9 items-center justify-center rounded-lg bg-[hsl(var(--accent-soft))]"
          style={{ color: 'hsl(var(--accent-text))' }}
          aria-hidden="true"
        >
          <AurexGlyph size={16} />
        </span>
        <span className="text-sm font-semibold text-foreground">AurexOS</span>
      </div>
      {children}
    </div>
  )

  if (!preview || !preview.valid) {
    return shell(
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <MailX className="size-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-foreground">Invitation unavailable</h1>
          <p className="text-sm text-muted-foreground">
            This invitation link is invalid or has expired. Ask an admin to send a new one.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link href="/login">Go to sign in</Link>
          </Button>
        </CardContent>
      </Card>,
    )
  }

  const accept = () => {
    startTransition(async () => {
      const result = await acceptInvitation({ token })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Invitation accepted')
      router.push('/dashboard')
      router.refresh()
    })
  }

  const where = preview.workspaceName ?? preview.orgName ?? 'the workspace'

  return shell(
    <Card>
      <CardContent className="space-y-5 p-8">
        <div className="space-y-1.5 text-center">
          <h1 className="text-lg font-semibold text-foreground">You’re invited to {where}</h1>
          <p className="text-sm text-muted-foreground">
            Join as{' '}
            <Badge variant="accent-soft" className="align-middle">
              {preview.roleName ?? 'a member'}
            </Badge>
          </p>
        </div>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p className="text-muted-foreground">
            Invitation for <span className="font-medium text-foreground">{preview.email}</span>
          </p>
        </div>

        {isAuthed ? (
          <Button onClick={accept} disabled={isPending} className="w-full">
            <CheckCircle2 className="mr-1.5 size-4" aria-hidden="true" />
            {isPending ? 'Joining…' : 'Accept invitation'}
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-sm text-muted-foreground">
              Sign in as {preview.email} to accept.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Sign in to accept</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>,
  )
}
