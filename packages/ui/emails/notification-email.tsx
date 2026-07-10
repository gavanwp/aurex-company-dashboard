import * as React from 'react'
import { Button, Link, Section, Text } from '@react-email/components'

import {
  BaseLayout,
  emailStyles,
  emailTheme,
} from './components/base-layout'

/**
 * Single-notification email — docs/design/Notifications.md §2 (default
 * channels), docs/design/BrandGuidelines.md §8.
 *
 * One rendered sentence, an entity context block, one accent CTA, and a
 * "why am I getting this" caption. Deep links are permission-checked at
 * click time by the app — no dead text in a notification.
 */

export interface NotificationEmailProps {
  /** Inbox preview + heading, e.g. "Omar assigned you 4 tasks". */
  sentence: string
  /** Entity context lines, e.g. ["Project: Meridian redesign", "Due: Fri, Jul 11"]. */
  contextLines?: string[]
  /** CTA verb, e.g. "Open task". */
  ctaLabel: string
  /** Deep link to the exact entity and position. */
  ctaUrl: string
  /** Why-am-I-getting-this caption, e.g. "You're assigned to this task." */
  reason?: string
  /** Preference-center deep link for the footer. */
  preferenceUrl?: string
  /** Workspace-brand header slot (client-facing sends). */
  brand?: React.ReactNode
}

/** One notification, one CTA — minimal-premium, sentence case. */
export const NotificationEmail = ({
  sentence,
  contextLines,
  ctaLabel,
  ctaUrl,
  reason,
  preferenceUrl,
  brand,
}: NotificationEmailProps) => (
  <BaseLayout
    previewText={sentence}
    brand={brand}
    preferenceUrl={preferenceUrl}
  >
    <Text style={emailStyles.heading}>{sentence}</Text>
    {contextLines && contextLines.length > 0 ? (
      <Section style={emailStyles.contextBlock}>
        {contextLines.map((line) => (
          <Text
            key={line}
            style={{ ...emailStyles.paragraph, margin: '0 0 4px' }}
          >
            {line}
          </Text>
        ))}
      </Section>
    ) : null}
    <Section style={{ margin: '0 0 16px' }}>
      <Button href={ctaUrl} style={emailStyles.button}>
        {ctaLabel}
      </Button>
    </Section>
    <Text style={emailStyles.paragraph}>
      Or open it directly:{' '}
      <Link href={ctaUrl} style={emailStyles.link}>
        {ctaLabel.toLowerCase()}
      </Link>
    </Text>
    {reason ? (
      <Text style={{ ...emailStyles.caption, color: emailTheme.muted }}>
        {reason}
      </Text>
    ) : null}
  </BaseLayout>
)

export default NotificationEmail
