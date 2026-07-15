import { z } from 'zod'
import {
  CONTRACT_STATUSES,
  CONTRACT_TYPES,
  PROPOSAL_ACCEPT_METHODS,
  PROPOSAL_STATUSES,
} from '../types/index'

// Governs proposals.sections (0009).
export const ProposalSectionSchema = z
  .object({
    id: z.string(),
    type: z.string().max(40),
    title: z.string().max(300).optional(),
    content: z.unknown().optional(),
    order: z.number().int().nonnegative(),
  })
  .passthrough()
export type ProposalSection = z.infer<typeof ProposalSectionSchema>

// Governs proposals.pricing (0009). Money is minor units (R-D8).
export const ProposalPricingLineSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().nonnegative(),
  rateMinor: z.number().int(),
  optional: z.boolean().default(false),
  selected: z.boolean().optional(),
})
export type ProposalPricingLine = z.infer<typeof ProposalPricingLineSchema>

export const ProposalPricingSchema = z.object({
  currency: z.string().length(3).default('USD'),
  lines: z.array(ProposalPricingLineSchema).default([]),
  discountMinor: z.number().int().nonnegative().default(0),
  totalMinor: z.number().int().nonnegative().default(0),
})
export type ProposalPricing = z.infer<typeof ProposalPricingSchema>

// Governs proposal_views.section_dwell (0009): section id → dwell time in ms.
export const ProposalSectionDwellSchema = z.record(z.string(), z.number().int().nonnegative())
export type ProposalSectionDwell = z.infer<typeof ProposalSectionDwellSchema>

export const ProposalSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  dealId: z.string().uuid().nullable(),
  clientId: z.string().uuid(),
  title: z.string().min(1).max(300),
  status: z.enum(PROPOSAL_STATUSES),
  validUntil: z.string().nullable(),
  acceptMethod: z.enum(PROPOSAL_ACCEPT_METHODS),
  publicToken: z.string(),
  version: z.number().int().min(1),
  sections: z.array(ProposalSectionSchema),
  pricing: ProposalPricingSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Proposal = z.infer<typeof ProposalSchema>

export const CreateProposalInput = z.object({
  title: z.string().min(1, 'Proposal title is required').max(300),
  clientId: z.string().uuid(),
  dealId: z.string().uuid().nullable().optional(),
  status: z.enum(PROPOSAL_STATUSES).default('draft'),
  validUntil: z.string().date().nullable().optional(),
  acceptMethod: z.enum(PROPOSAL_ACCEPT_METHODS).default('checkbox'),
  sections: z.array(ProposalSectionSchema).default([]),
  pricing: ProposalPricingSchema.default({}),
})
export type CreateProposalInput = z.infer<typeof CreateProposalInput>

export const UpdateProposalInput = CreateProposalInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateProposalInput = z.infer<typeof UpdateProposalInput>

// Client-facing e-acceptance on the public tokenized page. Validated by the
// /api/proposals/[token]/accept route handler before it calls the definer RPC.
export const AcceptProposalInput = z.object({
  accepterName: z.string().min(1, 'Please enter your name').max(200),
  accepterEmail: z.string().email('Enter a valid email').max(320),
})
export type AcceptProposalInput = z.infer<typeof AcceptProposalInput>

// Governs contract_obligations.due_rule (0009).
export const ObligationDueRuleSchema = z
  .object({
    kind: z.enum(['once', 'recurring']),
    dueDate: z.string().date().optional(),
    rrule: z.string().max(500).optional(),
    leadTimeDays: z.number().int().nonnegative().optional(),
  })
  .passthrough()
export type ObligationDueRule = z.infer<typeof ObligationDueRuleSchema>

// Governs contracts.body (0015): ordered clause/section blocks, the same loose
// shape idea as proposals.sections. content.body carries the clause text, which
// may include merge-field placeholders like {{client_name}} resolved at render.
export const ContractSectionSchema = z
  .object({
    id: z.string(),
    type: z.string().max(40),
    title: z.string().max(300).optional(),
    content: z.unknown().optional(),
    order: z.number().int().nonnegative(),
  })
  .passthrough()
export type ContractSection = z.infer<typeof ContractSectionSchema>

// Governs contracts.signer (0015): the client's typed signing evidence, stamped
// by sign_contract_by_token. Mirrors the proposals accepted_by convention.
export const ContractSignerSchema = z
  .object({
    name: z.string().min(1).max(200),
    email: z.string().email().max(320),
    at: z.string(),
  })
  .passthrough()
export type ContractSigner = z.infer<typeof ContractSignerSchema>

export const ContractSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  type: z.enum(CONTRACT_TYPES),
  clientId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  proposalId: z.string().uuid().nullable(),
  title: z.string().min(1).max(300),
  status: z.enum(CONTRACT_STATUSES),
  effectiveDate: z.string().nullable(),
  endDate: z.string().nullable(),
  autoRenew: z.boolean(),
  valueMinor: z.number().int().nonnegative().nullable(),
  currency: z.string().length(3),
  body: z.array(ContractSectionSchema),
  version: z.number().int().min(1),
  sentAt: z.string().nullable(),
  signedAt: z.string().nullable(),
  publicToken: z.string().nullable(),
  signer: ContractSignerSchema.nullable(),
  signedFileId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Contract = z.infer<typeof ContractSchema>

export const CreateContractInput = z.object({
  title: z.string().min(1, 'Contract title is required').max(300),
  type: z.enum(CONTRACT_TYPES),
  clientId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  proposalId: z.string().uuid().nullable().optional(),
  status: z.enum(CONTRACT_STATUSES).default('draft'),
  effectiveDate: z.string().date().nullable().optional(),
  endDate: z.string().date().nullable().optional(),
  autoRenew: z.boolean().default(false),
  valueMinor: z.coerce.number().int().nonnegative().nullable().optional(),
  currency: z.string().length(3).default('USD'),
  body: z.array(ContractSectionSchema).default([]),
})
export type CreateContractInput = z.infer<typeof CreateContractInput>

export const UpdateContractInput = CreateContractInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateContractInput = z.infer<typeof UpdateContractInput>

// Client-facing e-signing on the public tokenized page. Validated by the
// /api/contracts/[token]/sign route handler before it calls the definer RPC.
export const SignContractInput = z.object({
  signerName: z.string().min(1, 'Please enter your full name').max(200),
  signerEmail: z.string().email('Enter a valid email').max(320),
})
export type SignContractInput = z.infer<typeof SignContractInput>

export const ContractObligationSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  contractId: z.string().uuid(),
  description: z.string().min(1).max(2_000),
  dueRule: ObligationDueRuleSchema,
  ownerUserId: z.string().uuid().nullable(),
  sourceClause: z.string().max(2_000).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type ContractObligation = z.infer<typeof ContractObligationSchema>

export const CreateContractObligationInput = z.object({
  contractId: z.string().uuid(),
  description: z.string().min(1, 'Obligation description is required').max(2_000),
  dueRule: ObligationDueRuleSchema,
  ownerUserId: z.string().uuid().nullable().optional(),
  sourceClause: z.string().max(2_000).optional(),
})
export type CreateContractObligationInput = z.infer<typeof CreateContractObligationInput>

export const UpdateContractObligationInput = CreateContractObligationInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateContractObligationInput = z.infer<typeof UpdateContractObligationInput>
