'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ShieldPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@aurexos/ui/components/badge'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import {
  confirmMfaEnrollment,
  removeMfaFactor,
  startMfaEnrollment,
  type MfaEnrollment,
} from '../actions/mfa-actions'
import type { MfaStatus } from '../queries/get-mfa'

export function MfaManager({ status }: { status: MfaStatus }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [enrollment, setEnrollment] = React.useState<MfaEnrollment | null>(null)
  const [code, setCode] = React.useState('')

  const begin = () => {
    startTransition(async () => {
      const result = await startMfaEnrollment()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setEnrollment(result.data)
    })
  }

  const confirm = () => {
    if (!enrollment) return
    startTransition(async () => {
      const result = await confirmMfaEnrollment({
        factorId: enrollment.factorId,
        code: code.trim(),
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Two-factor authentication enabled')
      setEnrollment(null)
      setCode('')
      router.refresh()
    })
  }

  const remove = () => {
    const factorId = status.factorId
    if (!factorId) return
    startTransition(async () => {
      const result = await removeMfaFactor({ factorId })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Two-factor authentication removed')
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Two-factor authentication</h2>
      <Card>
        <CardContent className="p-5">
          {status.enrolled ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-md bg-[hsl(var(--success-soft))] text-[hsl(var(--success-text))]">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    Authenticator app <Badge variant="success-soft">On</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A code from your authenticator is required at sign-in.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={remove} disabled={isPending}>
                Remove
              </Button>
            </div>
          ) : enrollment ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan this QR code in your authenticator app, then enter the 6-digit code to confirm.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                {/* Supabase returns an SVG data URI QR code. */}
                <img
                  src={enrollment.qrCode}
                  alt="MFA QR code"
                  className="size-40 rounded-md border bg-white p-2"
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Or enter this key manually</p>
                    <code className="break-all font-mono text-xs text-foreground">
                      {enrollment.secret}
                    </code>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mfa-code">6-digit code</Label>
                    <Input
                      id="mfa-code"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className="w-40 tracking-[0.3em]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={confirm} disabled={isPending || code.length !== 6}>
                      {isPending ? 'Verifying…' : 'Verify & enable'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEnrollment(null)
                        setCode('')
                      }}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <ShieldPlus className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">Add an authenticator app</p>
                  <p className="text-xs text-muted-foreground">
                    Protect your account with a time-based one-time code.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={begin} disabled={isPending}>
                {isPending ? 'Starting…' : 'Enable'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
