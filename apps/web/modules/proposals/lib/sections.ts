// Pure section-normalization shared by the internal query (server) and the public
// tokenized path. Zero I/O — safe on either side. Turns the loose sections jsonb
// (governed by ProposalSectionSchema) into ordered, render-ready views and back.

import { ProposalSectionSchema, type ProposalSection } from '@aurexos/core'
import {
  PROPOSAL_SECTION_TYPES,
  SECTION_TYPE_LABELS,
  type AcceptanceEvidence,
  type ProposalSectionType,
  type ProposalSectionView,
} from '../types'

const SECTION_TYPE_SET = new Set<string>(PROPOSAL_SECTION_TYPES)

export function coerceSectionType(value: string): ProposalSectionType {
  return SECTION_TYPE_SET.has(value) ? (value as ProposalSectionType) : 'scope'
}

/** Extract a plain-text body from a section's loose `content` jsonb. */
function bodyOf(content: unknown): string {
  if (content && typeof content === 'object' && 'body' in content) {
    return String((content as { body?: unknown }).body ?? '')
  }
  return typeof content === 'string' ? content : ''
}

/** Parse the sections jsonb into ordered, render-ready views. */
export function toSectionViews(value: unknown): ProposalSectionView[] {
  const parsed = ProposalSectionSchema.array().safeParse(value)
  if (!parsed.success) return []
  return parsed.data
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((section) => {
      const type = coerceSectionType(section.type)
      return {
        id: section.id,
        type,
        title: section.title ?? SECTION_TYPE_LABELS[type],
        body: bodyOf(section.content),
      }
    })
}

/** Turn editor section views back into the storage jsonb (ProposalSection[]). */
export function toSectionRecords(views: ProposalSectionView[]): ProposalSection[] {
  return views.map((view, index) => ({
    id: view.id,
    type: view.type,
    title: view.title,
    content: { body: view.body },
    order: index,
  }))
}

/** Parse the accepted_by jsonb into typed acceptance evidence. */
export function parseAcceptedBy(value: unknown): AcceptanceEvidence | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.name !== 'string' || typeof v.email !== 'string') return null
  return { name: v.name, email: v.email, at: typeof v.at === 'string' ? v.at : '' }
}
