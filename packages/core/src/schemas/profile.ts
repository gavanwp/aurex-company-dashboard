import { z } from 'zod'

// Schema for the personal profile surface (/settings/profile). The member edits
// their own profiles row (self-update, RLS profiles_update_self). Email is NOT
// here — it's managed by the auth flow, not this form.

export const UpdateProfileInput = z.object({
  fullName: z.string().trim().min(1, 'Your name is required').max(160, 'Name is too long'),
  title: z.string().trim().max(120, 'Title is too long').optional(),
  timezone: z.string().trim().max(64).optional(),
  location: z.string().trim().max(120, 'Location is too long').optional(),
})
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>

// A curated IANA-ish timezone list for the picker (label + IANA value). Kept in
// core so the form and any future server-side normalization share one source.
export const TIMEZONE_OPTIONS = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Sao_Paulo', label: 'Brasília Time' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Central European Time' },
  { value: 'Europe/Istanbul', label: 'Istanbul (TRT)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time' },
  { value: 'Asia/Kolkata', label: 'India Standard Time' },
  { value: 'Asia/Singapore', label: 'Singapore Time' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
] as const

export type TimezoneOption = (typeof TIMEZONE_OPTIONS)[number]
