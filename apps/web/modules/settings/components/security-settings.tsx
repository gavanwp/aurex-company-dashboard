'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Eye, EyeOff, LogOut } from 'lucide-react'
import { Button } from '@aurexos/ui/components/button'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@aurexos/ui/components/card'
import { changePassword, logoutEverywhere } from '@/modules/shared'

const ChangePasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "These passwords don't match — retype them",
    path: ['confirmPassword'],
  })
type ChangePasswordValues = z.infer<typeof ChangePasswordSchema>

export interface SecuritySettingsProps {
  /** The signed-in user's email, shown as the current-session identity. */
  email: string
}

/** Settings → Security: change password and session management. */
export function SecuritySettings({ email }: SecuritySettingsProps) {
  return (
    <div className="space-y-6">
      <ChangePasswordCard />
      <SessionsCard email={email} />
    </div>
  )
}

function ChangePasswordCard() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const inputType = showPassword ? 'text' : 'password'

  const onSubmit = handleSubmit((values) => {
    setServerError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await changePassword(values.password)
      if (!result.ok) {
        setServerError(result.error)
        return
      }
      reset()
      setSaved(true)
    })
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Set a new password for your account. You stay signed in on this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="max-w-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={inputType}
                autoComplete="new-password"
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm new password</Label>
            <Input
              id="confirm-new-password"
              type={inputType}
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}
          {saved && !serverError && (
            <p role="status" className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              Password updated
            </p>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Updating password…' : 'Update password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function SessionsCard({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions</CardTitle>
        <CardDescription>Where you&apos;re signed in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/*
          Phase-2 limitation, stated honestly: Supabase Auth only exposes the
          session held by this client — there is no API to enumerate a user's
          other devices/sessions from the browser. The per-device list with
          IP + last-active (AuthenticationArchitecture §3.3 "Device & session
          management, Phase 2") needs a server-side sessions table or the
          admin API behind an endpoint. Until then: current session + a
          global revoke, which Supabase does support.
        */}
        <div className="flex items-center justify-between rounded-md border p-3 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium">This device</p>
            <p className="truncate text-xs text-muted-foreground">Signed in as {email}</p>
          </div>
          <span className="shrink-0 text-xs text-success">Active now</span>
        </div>
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await logoutEverywhere()
              })
            }}
          >
            <LogOut aria-hidden="true" />
            {isPending ? 'Signing out…' : 'Sign out everywhere'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Ends your session on every device, including this one. A list of individual devices
            arrives in a later release.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
