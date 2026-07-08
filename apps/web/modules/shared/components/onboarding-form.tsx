'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CreateWorkspaceInput } from '@aurexos/core'
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
import { createWorkspace } from '@/modules/shared/actions/workspace'

type OnboardingValues = z.infer<typeof CreateWorkspaceInput>

export function OnboardingForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(CreateWorkspaceInput),
    defaultValues: { name: '' },
  })

  const onSubmit = handleSubmit((values) => {
    setServerError(null)
    startTransition(async () => {
      const result = await createWorkspace(values.name)
      // On success the action sets the workspace cookie and redirects.
      if (!result.ok) setServerError(result.error)
    })
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Name your workspace</CardTitle>
        <CardDescription>
          Your workspace is your agency&apos;s home in AurexOS. You can rename it later.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace name</Label>
            <Input id="name" placeholder="Aurex Designs" autoFocus {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Creating workspace…' : 'Create workspace'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
