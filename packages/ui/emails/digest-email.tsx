import * as React from 'react'
import { Hr, Link, Section, Text } from '@react-email/components'

import {
  BaseLayout,
  emailStyles,
  emailTheme,
} from './components/base-layout'

/**
 * Digest email — docs/design/Notifications.md §7.
 *
 * Sections mirror the dashboard digest in fixed order (Priorities · Risks ·
 * Meetings · Overdue · Everything else); empty sections are omitted
 * upstream. Aurex-narrated openings carry the ✦ mark and "Narrated by
 * Aurex" in the header. Every item deep-links to its entity — no dead text
 * in a digest. Neutral, text-first, single-column; the footer links
 * cadence controls, never "unsubscribe from everything" as the only exit.
 */

export interface DigestItem {
  /** The rendered sentence for the item. */
  text: string
  /** Deep link to the exact entity (permission-checked at click time). */
  href: string
}

export interface DigestSection {
  /** Section title, e.g. "Priorities", "Risks", "Meetings", "Overdue". */
  title: string
  items: DigestItem[]
}

export interface DigestEmailProps {
  /** Heading, e.g. "Your Tuesday digest". */
  title: string
  /** Inbox preview line, e.g. "3 priorities, 1 risk, 2 meetings today". */
  previewText: string
  /** Aurex's opening brief — first person, concrete, cites entities. */
  narration?: string
  sections: DigestSection[]
  /** Cadence controls + preference center deep link. */
  preferenceUrl?: string
  /** Workspace-brand header slot. */
  brand?: React.ReactNode
}

/** Day/week digest: narrated opening, sectioned items, per-item deep links. */
export const DigestEmail = ({
  title,
  previewText,
  narration,
  sections,
  preferenceUrl,
  brand,
}: DigestEmailProps) => (
  <BaseLayout
    previewText={previewText}
    brand={brand}
    preferenceUrl={preferenceUrl}
  >
    <Text style={emailStyles.heading}>{title}</Text>
    {narration ? (
      <Section style={{ margin: '0 0 8px' }}>
        <Text style={{ ...emailStyles.caption, margin: '0 0 8px' }}>
          {/* The ✦ attribution mark — AI narration is never unmarked. */}
          <span style={{ color: emailTheme.accent }}>✦</span> Narrated by Aurex
        </Text>
        <Text style={emailStyles.paragraph}>{narration}</Text>
      </Section>
    ) : null}
    {sections.map((section, index) => (
      <Section key={section.title}>
        {index > 0 || narration ? <Hr style={emailStyles.hr} /> : null}
        <Text
          style={{
            fontSize: '12px',
            lineHeight: '16px',
            fontWeight: 600,
            color: emailTheme.muted,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.04em',
            margin: '0 0 8px',
          }}
        >
          {section.title}
        </Text>
        {section.items.map((item) => (
          <Text
            key={item.href}
            style={{ ...emailStyles.paragraph, margin: '0 0 8px' }}
          >
            <Link href={item.href} style={emailStyles.link}>
              {item.text}
            </Link>
          </Text>
        ))}
      </Section>
    ))}
  </BaseLayout>
)

export default DigestEmail
