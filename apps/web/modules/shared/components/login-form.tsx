'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, MailCheck } from 'lucide-react'
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
import { login } from '@/modules/shared/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { mapAuthError, mapAuthErrorCode } from '@/lib/auth-errors'
import { AuthDivider, OAuthButtons } from '@/modules/shared/components/oauth-buttons'

const RESEND_COOLDOWN_SECONDS = 30

const LoginFormSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type LoginFormValues = z.infer<typeof LoginFormSchema>

const MagicLinkSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})
type MagicLinkValues = z.infer<typeof MagicLinkSchema>

const NOTICE_COPY: Record<string, string> = {
  password_updated: 'Your password has been updated — sign in with your new password.',
}

export interface LoginFormProps {
  /** Auth error code forwarded by /auth/callback (e.g. otp_expired). */
  errorCode?: string | null
  /** Success notice key (e.g. password_updated after a reset). */
  notice?: string | null
}

type LoginMode = 'password' | 'magic-link'

export function LoginForm({ errorCode = null, notice = null }: LoginFormProps) {
  const [mode, setMode] = useState<LoginMode>('password')
  const [serverError, setServerError] = useState<string | null>(mapAuthErrorCode(errorCode))
  const noticeCopy = notice ? (NOTICE_COPY[notice] ?? null) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your agency workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        {noticeCopy && !serverError && (
          <p role="status" className="flex items-start gap-2 text-sm text-success">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {noticeCopy}
          </p>
        )}
        <OAuthButtons />
        <AuthDivider />
      </CardContent>
      {mode === 'password' ? (
        <PasswordLoginForm
          serverError={serverError}
          setServerError={setServerError}
          onSwitchMode={() => {
            setServerError(null)
            setMode('magic-link')
          }}
        />
      ) : (
        <MagicLinkForm
          serverError={serverError}
          setServerError={setServerError}
          onSwitchMode={() => {
            setServerError(null)
            setMode('password')
          }}
        />
      )}
    </Card>
  )
}

interface LoginModeProps {
  serverError: string | null
  setServerError: (error: string | null) => void
  onSwitchMode: () => void
}

function PasswordLoginForm({ serverError, setServerError, onSwitchMode }: LoginModeProps) {
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit((values) => {
    setServerError(null)
    startTransition(async () => {
      const result = await login(values.email, values.password)
      // On success the action redirects and never resolves here.
      if (!result.ok) setServerError(result.error)
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@agency.com"
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>
        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>
        <button
          type="button"
          onClick={onSwitchMode}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Email me a magic link instead
        </button>
        <p className="text-sm text-muted-foreground">
          No account yet?{' '}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </CardFooter>
    </form>
  )
}

function MagicLinkForm({ serverError, setServerError, onSwitchMode }: LoginModeProps) {
  const [isPending, startTransition] = useTransition()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MagicLinkValues>({
    resolver: zodResolver(MagicLinkSchema),
    defaultValues: { email: '' },
  })

  useEffect(() => {
    if (cooldown === 0) return
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  function sendMagicLink(email: string) {
    setServerError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          // Login surface, not signup — never create an account from here.
          shouldCreateUser: false,
        },
      })
      // otp_disabled = "no such user + signups off for otp". Rendering it
      // would reveal whether the email has an account, so it reads as sent.
      if (error && error.code !== 'otp_disabled') {
        setServerError(mapAuthError(error))
        return
      }
      setSentTo(email)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    })
  }

  const onSubmit = handleSubmit((values) => sendMagicLink(values.email))

  if (sentTo) {
    return (
      <>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center gap-2 text-center">
            <MailCheck className="size-8 text-success" aria-hidden="true" />
            <p className="text-sm font-medium">Check your email</p>
            <p role="status" className="text-sm text-muted-foreground">
              We sent a sign-in link to {sentTo}. It expires shortly — open it on this device.
            </p>
          </div>
          {serverError && (
            <p role="alert" className="mt-4 text-sm text-destructive">
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
            onClick={() => sendMagicLink(sentTo)}
          >
            {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend link'}
          </Button>
          <button
            type="button"
            onClick={onSwitchMode}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Use a password instead
          </button>
        </CardFooter>
      </>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-2">
          <Label htmlFor="magic-link-email">Email</Label>
          <Input
            id="magic-link-email"
            type="email"
            autoComplete="email"
            placeholder="you@agency.com"
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          <p className="text-xs text-muted-foreground">
            We&apos;ll email you a one-time link — no password needed.
          </p>
        </div>
        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Sending link…' : 'Email me a magic link'}
        </Button>
        <button
          type="button"
          onClick={onSwitchMode}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Use a password instead
        </button>
        <p className="text-sm text-muted-foreground">
          No account yet?{' '}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </CardFooter>
    </form>
  )
}
