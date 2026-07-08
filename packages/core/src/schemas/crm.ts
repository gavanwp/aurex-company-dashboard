import { z } from 'zod'
import { CLIENT_STATUSES, DEAL_STAGES } from '../types/index.js'

export const ClientSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(160),
  website: z.string().url().nullable(),
  industry: z.string().max(80).nullable(),
  status: z.enum(CLIENT_STATUSES),
  ownerId: z.string().uuid().nullable(),
  notes: z.string().max(20_000).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Client = z.infer<typeof ClientSchema>

export const CreateClientInput = z.object({
  name: z.string().min(1, 'Client name is required').max(160),
  website: z.string().url().nullable().optional().or(z.literal('').transform(() => null)),
  industry: z.string().max(80).optional(),
  status: z.enum(CLIENT_STATUSES).default('prospect'),
  notes: z.string().max(20_000).optional(),
})
export type CreateClientInput = z.infer<typeof CreateClientInput>

export const UpdateClientInput = CreateClientInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateClientInput = z.infer<typeof UpdateClientInput>

export const ContactSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
  fullName: z.string().min(1).max(160),
  email: z.string().email().nullable(),
  phone: z.string().max(40).nullable(),
  title: z.string().max(120).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Contact = z.infer<typeof ContactSchema>

export const CreateContactInput = z.object({
  fullName: z.string().min(1, 'Contact name is required').max(160),
  clientId: z.string().uuid().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('').transform(() => null)),
  phone: z.string().max(40).optional(),
  title: z.string().max(120).optional(),
})
export type CreateContactInput = z.infer<typeof CreateContactInput>

export const UpdateContactInput = CreateContactInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateContactInput = z.infer<typeof UpdateContactInput>

export const DealSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
  contactId: z.string().uuid().nullable(),
  title: z.string().min(1).max(200),
  stage: z.enum(DEAL_STAGES),
  valueCents: z.number().int().nonnegative().nullable(),
  currency: z.string().length(3),
  probability: z.number().int().min(0).max(100).nullable(),
  expectedCloseDate: z.string().nullable(),
  ownerId: z.string().uuid().nullable(),
  source: z.string().max(80).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Deal = z.infer<typeof DealSchema>

export const CreateDealInput = z.object({
  title: z.string().min(1, 'Deal title is required').max(200),
  clientId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  stage: z.enum(DEAL_STAGES).default('lead'),
  valueCents: z.coerce.number().int().nonnegative().nullable().optional(),
  currency: z.string().length(3).default('USD'),
  probability: z.coerce.number().int().min(0).max(100).nullable().optional(),
  expectedCloseDate: z.string().date().nullable().optional(),
  source: z.string().max(80).optional(),
})
export type CreateDealInput = z.infer<typeof CreateDealInput>

export const UpdateDealInput = CreateDealInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateDealInput = z.infer<typeof UpdateDealInput>
