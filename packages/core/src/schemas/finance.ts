import { z } from 'zod'
import {
  EXPENSE_APPROVAL_STATUSES,
  INVOICE_SCHEDULE_CADENCES,
  INVOICE_SCHEDULE_SOURCES,
  INVOICE_STATUSES,
  PAYMENT_METHODS,
} from '../types/index'

// Governs invoices.line_items (0008). Money is minor units (R-D8) — never floats.
export const InvoiceLineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().nonnegative(),
  unitPriceMinor: z.number().int(),
  amountMinor: z.number().int(),
  taxRatePct: z.number().min(0).max(100).optional(),
})
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>

export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  number: z.string().min(1).max(40),
  status: z.enum(INVOICE_STATUSES),
  currency: z.string().length(3),
  subtotalMinor: z.number().int().nonnegative(),
  taxMinor: z.number().int().nonnegative(),
  totalMinor: z.number().int().nonnegative(),
  issueDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  lineItems: z.array(InvoiceLineItemSchema),
  paymentLinkUrl: z.string().url().nullable(),
  pdfFileId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Invoice = z.infer<typeof InvoiceSchema>

export const CreateInvoiceInput = z.object({
  clientId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  number: z.string().min(1, 'Invoice number is required').max(40),
  status: z.enum(INVOICE_STATUSES).default('draft'),
  currency: z.string().length(3).default('USD'),
  subtotalMinor: z.coerce.number().int().nonnegative().default(0),
  taxMinor: z.coerce.number().int().nonnegative().default(0),
  totalMinor: z.coerce.number().int().nonnegative().default(0),
  issueDate: z.string().date().nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
  lineItems: z.array(InvoiceLineItemSchema).default([]),
})
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInput>

export const UpdateInvoiceInput = CreateInvoiceInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceInput>

// Governs invoice_schedules.template (0008).
export const InvoiceScheduleTemplateSchema = z.object({
  lineItems: z.array(InvoiceLineItemSchema).default([]),
  currency: z.string().length(3).default('USD'),
  dueInDays: z.number().int().nonnegative().default(14),
  notes: z.string().max(2_000).optional(),
})
export type InvoiceScheduleTemplate = z.infer<typeof InvoiceScheduleTemplateSchema>

export const InvoiceScheduleSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
  source: z.enum(INVOICE_SCHEDULE_SOURCES),
  cadence: z.enum(INVOICE_SCHEDULE_CADENCES),
  nextIssueDate: z.string().nullable(),
  template: InvoiceScheduleTemplateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type InvoiceSchedule = z.infer<typeof InvoiceScheduleSchema>

export const CreateInvoiceScheduleInput = z.object({
  clientId: z.string().uuid().nullable().optional(),
  source: z.enum(INVOICE_SCHEDULE_SOURCES),
  cadence: z.enum(INVOICE_SCHEDULE_CADENCES),
  nextIssueDate: z.string().date().nullable().optional(),
  template: InvoiceScheduleTemplateSchema,
})
export type CreateInvoiceScheduleInput = z.infer<typeof CreateInvoiceScheduleInput>

export const UpdateInvoiceScheduleInput = CreateInvoiceScheduleInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateInvoiceScheduleInput = z.infer<typeof UpdateInvoiceScheduleInput>

export const ExpenseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  vendor: z.string().min(1).max(200),
  amountMinor: z.number().int().nonnegative(),
  currency: z.string().length(3),
  category: z.string().max(80).nullable(),
  expenseDate: z.string(),
  receiptFileId: z.string().uuid().nullable(),
  submittedBy: z.string().uuid().nullable(),
  billable: z.boolean(),
  projectId: z.string().uuid().nullable(),
  approvalStatus: z.enum(EXPENSE_APPROVAL_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Expense = z.infer<typeof ExpenseSchema>

export const CreateExpenseInput = z.object({
  vendor: z.string().min(1, 'Vendor is required').max(200),
  amountMinor: z.coerce.number().int().nonnegative(),
  currency: z.string().length(3).default('USD'),
  category: z.string().max(80).optional(),
  expenseDate: z.string().date(),
  receiptFileId: z.string().uuid().nullable().optional(),
  billable: z.boolean().default(false),
  projectId: z.string().uuid().nullable().optional(),
})
export type CreateExpenseInput = z.infer<typeof CreateExpenseInput>

export const UpdateExpenseInput = CreateExpenseInput.partial().extend({
  id: z.string().uuid(),
})
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseInput>

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
  currency: z.string().length(3),
  method: z.enum(PAYMENT_METHODS),
  receivedAt: z.string(),
  feesMinor: z.number().int().nonnegative(),
  externalRef: z.string().max(200).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Payment = z.infer<typeof PaymentSchema>

export const CreatePaymentInput = z.object({
  invoiceId: z.string().uuid(),
  amountMinor: z.coerce.number().int().positive(),
  currency: z.string().length(3).default('USD'),
  method: z.enum(PAYMENT_METHODS),
  receivedAt: z.string().optional(),
  feesMinor: z.coerce.number().int().nonnegative().default(0),
  externalRef: z.string().max(200).optional(),
})
export type CreatePaymentInput = z.infer<typeof CreatePaymentInput>
