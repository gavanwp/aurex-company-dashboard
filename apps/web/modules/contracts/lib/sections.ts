// Pure clause-normalization shared by the internal query (server) and the public
// tokenized path. Zero I/O — safe on either side. Turns the loose body jsonb
// (governed by ContractSectionSchema) into ordered, render-ready views and back.

import { ContractSectionSchema, type ContractSection } from '@aurexos/core'
import {
  CONTRACT_SECTION_LABELS,
  CONTRACT_SECTION_TYPES,
  type ContractSectionType,
  type ContractSectionView,
  type SignerEvidence,
} from '../types'

const SECTION_TYPE_SET = new Set<string>(CONTRACT_SECTION_TYPES)

export function coerceSectionType(value: string): ContractSectionType {
  return SECTION_TYPE_SET.has(value) ? (value as ContractSectionType) : 'custom'
}

/** Extract a plain-text body from a clause's loose `content` jsonb. */
function bodyOf(content: unknown): string {
  if (content && typeof content === 'object' && 'body' in content) {
    return String((content as { body?: unknown }).body ?? '')
  }
  return typeof content === 'string' ? content : ''
}

/** Parse the body jsonb into ordered, render-ready clause views. */
export function toSectionViews(value: unknown): ContractSectionView[] {
  const parsed = ContractSectionSchema.array().safeParse(value)
  if (!parsed.success) return []
  return parsed.data
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((section) => {
      const type = coerceSectionType(section.type)
      return {
        id: section.id,
        type,
        title: section.title ?? CONTRACT_SECTION_LABELS[type],
        body: bodyOf(section.content),
      }
    })
}

/** Turn editor clause views back into the storage jsonb (ContractSection[]). */
export function toSectionRecords(views: ContractSectionView[]): ContractSection[] {
  return views.map((view, index) => ({
    id: view.id,
    type: view.type,
    title: view.title,
    content: { body: view.body },
    order: index,
  }))
}

/** Parse the signer jsonb into typed signing evidence. */
export function parseSigner(value: unknown): SignerEvidence | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.name !== 'string' || typeof v.email !== 'string') return null
  return { name: v.name, email: v.email, at: typeof v.at === 'string' ? v.at : '' }
}
