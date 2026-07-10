import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@aurexos/ui/components/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@aurexos/ui/components/card'
import { createClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from '@/modules/shared/components/reset-password-form'

export const metadata: Metadata = { title: 'Set a new password' }

/**
 * Landing page of the recovery link (/auth/callback?next=/reset-password).
 * The recovery-session check lives here, not in middleware: the route is
 * publicly reachable so a direct or expired visit renders a calm
 * request-a-new-link state instead of bouncing to /login.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>This link is no longer valid</CardTitle>
          <CardDescription>
            Reset links are single-use and expire quickly. Request a new one and try again.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-4">
          <Button asChild className="w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Remembered it?{' '}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    )
  }

  return <ResetPasswordForm />
}
