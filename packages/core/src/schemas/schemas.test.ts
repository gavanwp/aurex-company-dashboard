import { describe, expect, it } from 'vitest'
import { CreateTaskInput, UpdateTaskInput } from './task'
import {
  CreateExpenseInput,
  CreateInvoiceInput,
  CreatePaymentInput,
  InvoiceLineItemSchema,
} from './finance'

// R-Q2: schema validation is the write-path gate for every server action.
// Money assertions enforce R-D8: integer minor units — floats must never parse.

const UUID = '00000000-0000-0000-0000-000000000001'

describe('CreateTaskInput', () => {
  it('parses a minimal valid input and applies defaults', () => {
    const parsed = CreateTaskInput.parse({ title: 'Ship the QA foundation' })
    expect(parsed.title).toBe('Ship the QA foundation')
    expect(parsed.status).toBe('todo')
    expect(parsed.priority).toBe('none')
    expect(parsed.labels).toEqual([])
  })

  it('parses a fully-specified input', () => {
    const parsed = CreateTaskInput.parse({
      title: 'Review RLS policies',
      projectId: UUID,
      description: 'Adversarial pass over 0002-0011.',
      status: 'in_progress',
      priority: 'high',
      assigneeId: UUID,
      dueDate: '2026-08-01',
      estimateHours: '2.5', // coerced
      labels: ['security'],
    })
    expect(parsed.estimateHours).toBe(2.5)
    expect(parsed.dueDate).toBe('2026-08-01')
  })

  it('rejects an empty title', () => {
    expect(CreateTaskInput.safeParse({ title: '' }).success).toBe(false)
  })

  it('rejects a title over 300 characters', () => {
    expect(CreateTaskInput.safeParse({ title: 'x'.repeat(301) }).success).toBe(false)
  })

  it('rejects a non-date due date', () => {
    expect(CreateTaskInput.safeParse({ title: 'ok', dueDate: 'next tuesday' }).success).toBe(false)
  })

  it('rejects a negative estimate', () => {
    expect(CreateTaskInput.safeParse({ title: 'ok', estimateHours: -1 }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(CreateTaskInput.safeParse({ title: 'ok', status: 'blocked' }).success).toBe(false)
  })
})

describe('UpdateTaskInput', () => {
  it('requires a uuid id even though all fields are partial', () => {
    expect(UpdateTaskInput.safeParse({ title: 'renamed' }).success).toBe(false)
    expect(UpdateTaskInput.safeParse({ id: 'not-a-uuid', title: 'renamed' }).success).toBe(false)
    expect(UpdateTaskInput.safeParse({ id: UUID, title: 'renamed' }).success).toBe(true)
  })
})

describe('CreateInvoiceInput (money = integer minor units, R-D8)', () => {
  const valid = {
    clientId: UUID,
    number: 'INV-2026-001',
    subtotalMinor: 450000,
    taxMinor: 0,
    totalMinor: 450000,
  }

  it('parses a valid invoice and applies defaults', () => {
    const parsed = CreateInvoiceInput.parse(valid)
    expect(parsed.status).toBe('draft')
    expect(parsed.currency).toBe('USD')
    expect(parsed.lineItems).toEqual([])
    expect(parsed.totalMinor).toBe(450000)
  })

  it('rejects fractional money — floats never reach the database', () => {
    expect(CreateInvoiceInput.safeParse({ ...valid, totalMinor: 4500.5 }).success).toBe(false)
    expect(CreateInvoiceInput.safeParse({ ...valid, subtotalMinor: 0.01 }).success).toBe(false)
    expect(CreateInvoiceInput.safeParse({ ...valid, taxMinor: 12.34 }).success).toBe(false)
  })

  it('rejects negative amounts', () => {
    expect(CreateInvoiceInput.safeParse({ ...valid, totalMinor: -1 }).success).toBe(false)
  })

  it('coerces numeric strings from form input into integers', () => {
    const parsed = CreateInvoiceInput.parse({ ...valid, totalMinor: '450000' })
    expect(parsed.totalMinor).toBe(450000)
  })

  it('rejects currencies that are not exactly 3 letters', () => {
    expect(CreateInvoiceInput.safeParse({ ...valid, currency: 'US' }).success).toBe(false)
    expect(CreateInvoiceInput.safeParse({ ...valid, currency: 'USDX' }).success).toBe(false)
  })

  it('requires an invoice number and a client', () => {
    expect(CreateInvoiceInput.safeParse({ ...valid, number: '' }).success).toBe(false)
    expect(CreateInvoiceInput.safeParse({ ...valid, clientId: 'client-1' }).success).toBe(false)
  })
})

describe('InvoiceLineItemSchema', () => {
  it('accepts an integer-priced line item', () => {
    expect(
      InvoiceLineItemSchema.safeParse({
        description: 'Design sprint',
        quantity: 2,
        unitPriceMinor: 150000,
        amountMinor: 300000,
      }).success,
    ).toBe(true)
  })

  it('rejects fractional unit prices and amounts', () => {
    const item = {
      description: 'Design sprint',
      quantity: 1,
      unitPriceMinor: 12.34,
      amountMinor: 12.34,
    }
    expect(InvoiceLineItemSchema.safeParse(item).success).toBe(false)
  })

  it('rejects tax rates outside 0-100', () => {
    const base = { description: 'x', quantity: 1, unitPriceMinor: 100, amountMinor: 100 }
    expect(InvoiceLineItemSchema.safeParse({ ...base, taxRatePct: 101 }).success).toBe(false)
    expect(InvoiceLineItemSchema.safeParse({ ...base, taxRatePct: -1 }).success).toBe(false)
  })
})

describe('CreatePaymentInput', () => {
  it('requires a strictly positive amount', () => {
    const base = { invoiceId: UUID, method: 'stripe' }
    expect(CreatePaymentInput.safeParse({ ...base, amountMinor: 0 }).success).toBe(false)
    expect(CreatePaymentInput.safeParse({ ...base, amountMinor: 100.5 }).success).toBe(false)
    expect(CreatePaymentInput.safeParse({ ...base, amountMinor: 100 }).success).toBe(true)
  })

  it('rejects unknown payment methods', () => {
    expect(
      CreatePaymentInput.safeParse({ invoiceId: UUID, method: 'paypal', amountMinor: 100 }).success,
    ).toBe(false)
  })
})

describe('CreateExpenseInput', () => {
  it('parses a valid expense', () => {
    const parsed = CreateExpenseInput.parse({
      vendor: 'Figma',
      amountMinor: 1500,
      expenseDate: '2026-07-01',
    })
    expect(parsed.currency).toBe('USD')
    expect(parsed.billable).toBe(false)
  })

  it('rejects fractional amounts and missing vendor', () => {
    expect(
      CreateExpenseInput.safeParse({
        vendor: 'Figma',
        amountMinor: 15.99,
        expenseDate: '2026-07-01',
      }).success,
    ).toBe(false)
    expect(
      CreateExpenseInput.safeParse({ vendor: '', amountMinor: 1500, expenseDate: '2026-07-01' })
        .success,
    ).toBe(false)
  })
})
