'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  COMP_PERIODS,
  EMPLOYMENT_TYPES,
  SKILL_LEVELS,
  type CompPeriod,
  type EmploymentType,
  type SkillLevel,
} from '@aurexos/core'
import { Button } from '@aurexos/ui/components/button'
import { Card, CardContent } from '@aurexos/ui/components/card'
import { Input } from '@aurexos/ui/components/input'
import { Label } from '@aurexos/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aurexos/ui/components/select'
import { Textarea } from '@aurexos/ui/components/textarea'
import { upsertMemberProfile } from '../actions/profile-actions'
import { employmentLabel, skillLevelLabel } from '../lib/hr'
import type { MemberDetail, MemberOption } from '../types'

const NONE = '__none__'

const FormSchema = z.object({
  title: z.string().max(160),
  employmentType: z.string(),
  managerId: z.string(),
  startDate: z.string(),
  location: z.string().max(160),
  timezone: z.string().max(64),
  phone: z.string().max(40),
  bio: z.string().max(2000),
  weeklyCapacityHours: z.string(),
  skills: z.array(z.object({ name: z.string().max(60), level: z.enum(SKILL_LEVELS) })),
  compAmount: z.string(),
  compCurrency: z.string(),
  compPeriod: z.string(),
})
type FormValues = z.infer<typeof FormSchema>

function toDefaults(member: MemberDetail): FormValues {
  return {
    title: member.title ?? '',
    employmentType: member.employmentType ?? NONE,
    managerId: member.managerId ?? NONE,
    startDate: member.startDate ?? '',
    location: member.location ?? '',
    timezone: member.timezone ?? '',
    phone: member.phone ?? '',
    bio: member.bio ?? '',
    weeklyCapacityHours:
      member.weeklyCapacityHours != null ? String(member.weeklyCapacityHours) : '',
    skills: member.skills.map((s) => ({ name: s.name, level: s.level })),
    compAmount: member.comp?.amountMinor != null ? String(member.comp.amountMinor / 100) : '',
    compCurrency: member.comp?.currency ?? 'USD',
    compPeriod: member.comp?.period ?? NONE,
  }
}

export interface MemberProfileFormProps {
  member: MemberDetail
  managerOptions: MemberOption[]
  canEditComp: boolean
}

export function MemberProfileForm({ member, managerOptions, canEditComp }: MemberProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const { register, control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: toDefaults(member),
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'skills' })

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const capacity = values.weeklyCapacityHours.trim()
      const compAmount = values.compAmount.trim()
      const result = await upsertMemberProfile({
        userId: member.userId,
        title: values.title.trim() || null,
        employmentType:
          values.employmentType === NONE ? null : (values.employmentType as EmploymentType),
        managerId: values.managerId === NONE ? null : values.managerId,
        startDate: values.startDate || null,
        location: values.location.trim() || null,
        timezone: values.timezone.trim() || null,
        phone: values.phone.trim() || null,
        bio: values.bio.trim() || null,
        weeklyCapacityHours: capacity ? Number(capacity) : null,
        skills: values.skills
          .map((s) => ({ name: s.name.trim(), level: s.level }))
          .filter((s) => s.name.length > 0),
        ...(canEditComp
          ? {
              compAmountMinor: compAmount ? Math.round(Number(compAmount) * 100) : null,
              compCurrency: values.compCurrency.trim().toUpperCase() || 'USD',
              compPeriod: values.compPeriod === NONE ? null : (values.compPeriod as CompPeriod),
            }
          : {}),
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Profile saved')
      router.push(`/team/${member.userId}`)
      router.refresh()
    })
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="p-title">Job title</Label>
            <Input id="p-title" placeholder="Senior designer" {...register('title')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-employment">Employment type</Label>
            <Controller
              control={control}
              name="employmentType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="p-employment">
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not set</SelectItem>
                    {EMPLOYMENT_TYPES.map((t: EmploymentType) => (
                      <SelectItem key={t} value={t}>
                        {employmentLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-manager">Manager</Label>
            <Controller
              control={control}
              name="managerId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="p-manager">
                    <SelectValue placeholder="No manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No manager</SelectItem>
                    {managerOptions
                      .filter((m) => m.userId !== member.userId)
                      .map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-start">Start date</Label>
            <Input id="p-start" type="date" {...register('startDate')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-location">Location</Label>
            <Input id="p-location" placeholder="Bengaluru, IN" {...register('location')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-timezone">Timezone</Label>
            <Input id="p-timezone" placeholder="Asia/Kolkata" {...register('timezone')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-phone">Phone</Label>
            <Input id="p-phone" placeholder="+91 …" {...register('phone')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-capacity">Weekly capacity (hours)</Label>
            <Input
              id="p-capacity"
              type="number"
              min={0}
              max={168}
              placeholder="40"
              {...register('weeklyCapacityHours')}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="p-bio">Bio</Label>
            <Textarea
              id="p-bio"
              rows={4}
              placeholder="A short professional summary…"
              {...register('bio')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Skills editor */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Skills</h2>
              <p className="text-xs text-muted-foreground">
                Tag skills and set a proficiency level.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => append({ name: '', level: 'intermediate' })}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add skill
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
              No skills yet. Add the tools and disciplines this person is strong in.
            </p>
          ) : (
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="e.g. Figma, Webflow, SEO audits"
                    {...register(`skills.${i}.name` as const)}
                  />
                  <Controller
                    control={control}
                    name={`skills.${i}.level` as const}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-[9.5rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_LEVELS.map((lvl: SkillLevel) => (
                            <SelectItem key={lvl} value={lvl}>
                              {skillLevelLabel(lvl)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(i)}
                    aria-label="Remove skill"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compensation — only rendered for authorized roles */}
      {canEditComp ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Compensation</h2>
              <p className="text-xs text-muted-foreground">
                Visible only to Owner, HR and Finance.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="p-comp-amount">Amount</Label>
                <Input
                  id="p-comp-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  {...register('compAmount')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-comp-currency">Currency</Label>
                <Input
                  id="p-comp-currency"
                  maxLength={3}
                  placeholder="USD"
                  {...register('compCurrency')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-comp-period">Period</Label>
                <Controller
                  control={control}
                  name="compPeriod"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="p-comp-period">
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Not set</SelectItem>
                        {COMP_PERIODS.map((p: CompPeriod) => (
                          <SelectItem key={p} value={p}>
                            {p === 'annual'
                              ? 'Per year'
                              : p === 'monthly'
                                ? 'Per month'
                                : 'Per hour'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button asChild type="button" variant="ghost">
          <Link href={`/team/${member.userId}`}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  )
}
