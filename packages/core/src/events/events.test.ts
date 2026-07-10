import { describe, expect, it } from 'vitest'
import { DOMAIN_EVENTS, type DomainEvent, type DomainEventType } from './index'
import { CreateTaskInput } from '../schemas/task'
import { CreatePaymentInput } from '../schemas/finance'

// R-Q2: the event catalog is a contract — automations, audit, and read models
// key off these strings. Shape drift here breaks consumers silently.

const WORKSPACE_ID = '00000000-0000-0000-0000-00000000aa01'
const ACTOR_ID = '00000000-0000-0000-0000-000000000001'
const ENTITY_ID = '00000000-0000-0000-0000-00000000f001'

describe('DOMAIN_EVENTS catalog', () => {
  it('contains no duplicates', () => {
    expect(new Set(DOMAIN_EVENTS).size).toBe(DOMAIN_EVENTS.length)
  })

  it('every event is snake.dot, lowercase, module-prefixed (module[.entity].verb)', () => {
    const shape = /^[a-z]+(?:_[a-z]+)*(?:\.[a-z]+(?:_[a-z]+)*){1,2}$/
    for (const event of DOMAIN_EVENTS) {
      expect(event, `${event} violates the naming convention`).toMatch(shape)
    }
  })

  it('every event verb is past tense (13_Folder_Structure.md §7)', () => {
    // Regular past tense ends in -ed; the catalog's sanctioned irregular/state
    // forms are listed explicitly so a new present-tense verb fails this test.
    const irregularPastForms = new Set(['sent', 'paid', 'overdue'])
    for (const event of DOMAIN_EVENTS) {
      const verb = event.split('.').at(-1)!
      const isPastTense = verb.endsWith('ed') || irregularPastForms.has(verb)
      expect(isPastTense, `${event} verb "${verb}" is not past tense`).toBe(true)
    }
  })

  it('covers the lifecycle events each shipped module relies on', () => {
    const required: DomainEventType[] = [
      'workspace.created',
      'projects.project.created',
      'tasks.task.status_changed',
      'crm.deal.stage_changed',
      'finance.invoice.paid',
      'ai.run.completed',
    ]
    for (const event of required) {
      expect(DOMAIN_EVENTS).toContain(event)
    }
  })
})

describe('DomainEvent payload round-trips', () => {
  it('tasks.task.created carries a payload that CreateTaskInput accepts', () => {
    const payload = CreateTaskInput.parse({ title: 'Wire the RLS smoke suite', priority: 'high' })
    const event: DomainEvent<typeof payload> = {
      eventType: 'tasks.task.created',
      workspaceId: WORKSPACE_ID,
      actorId: ACTOR_ID,
      entityType: 'task',
      entityId: ENTITY_ID,
      payload,
    }
    expect(DOMAIN_EVENTS).toContain(event.eventType)
    // Round-trip: re-parsing the emitted payload is lossless.
    expect(CreateTaskInput.parse(event.payload)).toEqual(payload)
  })

  it('finance.invoice.paid carries a payload that CreatePaymentInput accepts', () => {
    const payload = CreatePaymentInput.parse({
      invoiceId: '00000000-0000-0000-0000-00000000b001',
      amountMinor: 450000,
      method: 'stripe',
    })
    const event: DomainEvent<typeof payload> = {
      eventType: 'finance.invoice.paid',
      workspaceId: WORKSPACE_ID,
      actorId: ACTOR_ID,
      entityType: 'invoice',
      entityId: ENTITY_ID,
      payload,
    }
    expect(DOMAIN_EVENTS).toContain(event.eventType)
    expect(CreatePaymentInput.parse(event.payload)).toEqual(payload)
    expect(event.payload.feesMinor).toBe(0) // default applied and survives the trip
  })

  it('serializes through JSON without loss (events cross the wire as jsonb)', () => {
    const event: DomainEvent = {
      eventType: 'crm.deal.stage_changed',
      workspaceId: WORKSPACE_ID,
      actorId: ACTOR_ID,
      entityType: 'deal',
      entityId: ENTITY_ID,
      payload: { from: 'proposal', to: 'won', valueCents: 1850000 },
    }
    expect(JSON.parse(JSON.stringify(event))).toEqual(event)
  })
})
