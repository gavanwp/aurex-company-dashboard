'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MailCheck } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@aurexos/ui/components/card'
import { requestPasswordReset } from '@/modules/shared/actions/auth'

const RESEND_COOLDOWN_SECONDS = 30

const ForgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})
type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' },
  })

  useEffect(() => {
    if (cooldown === 0) return
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  function sendResetLink(email: string) {
    setServerError(null)
    startTransition(async () => {
      const result = await requestPasswordReset(email)
      if (!result.ok) {
        setServerError(result.error)
        return
      }
      setSentTo(email)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    })
  }

  const onSubmit = handleSubmit((values) => sendResetLink(values.email))

  if (sentTo) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <MailCheck className="mb-2 size-8 text-success" aria-hidden="true" />
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists for {sentTo}, you&apos;ll get a reset link. It expires shortly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isPending || cooldown > 0}
            onClick={() => sendResetLink(sentTo)}
          >
            {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend link'}
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter your account email and we&apos;ll send you a link to set a new password.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@agency.com"
              autoFocus
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Sending link…' : 'Send reset link'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Remembered it?{' '}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
