import { z } from 'zod'
import { COMP_PERIODS, EMPLOYMENT_TYPES, LEAVE_TYPES, SKILL_LEVELS } from '../types/index'

// Zod at every boundary (R-T3). These govern the Team & HR action inputs and the
// hr_profiles.skills jsonb payload (0016).

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD)')

// Governs hr_profiles.skills — a tagged, leveled skill.
export const HrSkillSchema = z.object({
  name: z.string().min(1).max(60),
  level: z.enum(SKILL_LEVELS),
})
export type HrSkill = z.infer<typeof HrSkillSchema>

export const HrSkillsSchema = z.array(HrSkillSchema).max(40)

// ── Upsert profile ──────────────────────────────────────────────────────────
export const UpsertMemberProfileInput = z.object({
  userId: z.string().uuid(),
  title: z.string().trim().min(1).max(160).nullish(),
  employmentType: z.enum(EMPLOYMENT_TYPES).nullish(),
  managerId: z.string().uuid().nullish(),
  startDate: isoDate.nullish(),
  location: z.string().trim().max(160).nullish(),
  timezone: z.string().trim().max(64).nullish(),
  phone: z.string().trim().max(40).nullish(),
  bio: z.string().trim().max(2000).nullish(),
  skills: HrSkillsSchema.default([]),
  weeklyCapacityHours: z.coerce.number().int().min(0).max(168).nullish(),
  // Compensation — only accepted from authorized roles (guarded in the action).
  compAmountMinor: z.coerce.number().int().min(0).nullish(),
  compCurrency: z.string().length(3).default('USD'),
  compPeriod: z.enum(COMP_PERIODS).nullish(),
})
export type UpsertMemberProfileInput = z.infer<typeof UpsertMemberProfileInput>

// ── Leave ─────────────────────────────────────────────────────────────────────
export const RequestLeaveInput = z
  .object({
    userId: z.string().uuid().optional(),
    type: z.enum(LEAVE_TYPES),
    startDate: isoDate,
    endDate: isoDate,
    reason: z.string().trim().max(1000).nullish(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'End date cannot be before the start date',
    path: ['endDate'],
  })
export type RequestLeaveInput = z.infer<typeof RequestLeaveInput>

export const DecideLeaveInput = z.object({
  id: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(1000).nullish(),
})
export type DecideLeaveInput = z.infer<typeof DecideLeaveInput>

export const CancelLeaveInput = z.object({
  id: z.string().uuid(),
})
export type CancelLeaveInput = z.infer<typeof CancelLeaveInput>
