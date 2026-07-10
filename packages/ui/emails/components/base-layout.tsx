import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

/**
 * React Email base layout — docs/architecture/NotificationsArchitecture.md,
 * docs/design/BrandGuidelines.md §8, docs/design/Notifications.md §7.
 *
 * Neutral, text-first, single-column, no hero images. Product notifications
 * carry the AurexOS wordmark small; client-facing sends swap in the
 * workspace's branding via the `brand` slot — we are infrastructure there,
 * not sender. One footer line deep-links to the preference center — never
 * "unsubscribe from everything" as the only exit.
 *
 * Email clients cannot resolve CSS variables, so `emailTheme` pins the
 * light-theme values from ColorSystem.md as inline-style hex — emails
 * always render in the light theme, like exports (Charts.md §7).
 */

/**
 * Email-safe light-theme values derived from ColorSystem.md /
 * DesignTokens.md §2. The only sanctioned raw hex in packages/ui — email
 * clients cannot consume `hsl(var(--token))`.
 */
export const emailTheme = {
  /** bg-app — 0 0% 100% */
  background: '#FFFFFF',
  /** text-primary — 240 10% 3.9% */
  text: '#09090B',
  /** text-muted — 240 4% 42% */
  muted: '#67676F',
  /** border-subtle — 240 6% 90% */
  border: '#E4E4E9',
  /** accent-solid — 231 48% 54% (Aurex Indigo) */
  accent: '#5162C2',
  /** bg-muted — 240 5% 96% */
  mutedBackground: '#F4F4F6',
} as const

export const emailStyles = {
  body: {
    backgroundColor: emailTheme.background,
    color: emailTheme.text,
    fontFamily:
      "'Geist Sans', Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
    margin: 0,
    padding: 0,
  },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  heading: {
    fontSize: '18px',
    lineHeight: '26px',
    fontWeight: 600,
    color: emailTheme.text,
    margin: '0 0 16px',
  },
  paragraph: {
    fontSize: '14px',
    lineHeight: '22px',
    color: emailTheme.text,
    margin: '0 0 16px',
  },
  caption: {
    fontSize: '12px',
    lineHeight: '16px',
    color: emailTheme.muted,
    margin: '0',
  },
  hr: {
    borderColor: emailTheme.border,
    borderTopWidth: '1px',
    margin: '24px 0',
  },
  button: {
    backgroundColor: emailTheme.accent,
    borderRadius: '6px',
    color: '#FFFFFF',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '20px',
    padding: '8px 16px',
    textDecoration: 'none',
  },
  link: {
    color: emailTheme.accent,
    textDecoration: 'underline',
  },
  contextBlock: {
    backgroundColor: emailTheme.mutedBackground,
    border: `1px solid ${emailTheme.border}`,
    borderRadius: '8px',
    padding: '12px 16px',
    margin: '0 0 16px',
  },
} as const

export interface BaseLayoutProps {
  /** Inbox preview line. */
  previewText: string
  /**
   * Workspace-brand slot for the minimal header. Defaults to the AurexOS
   * wordmark (small); client-facing sends pass the agency's branding.
   */
  brand?: React.ReactNode
  /** Preference-center deep link for the single footer line. */
  preferenceUrl?: string
  /** Override the footer line entirely (e.g. portal per-thread mute copy). */
  footer?: React.ReactNode
  children: React.ReactNode
}

/**
 * Minimal-premium base template: brand header, single-column content,
 * one-line preference footer. Sentence case; one accent CTA per email.
 */
export const BaseLayout = ({
  previewText,
  brand,
  preferenceUrl,
  footer,
  children,
}: BaseLayoutProps) => (
  <Html lang="en">
    <Head />
    <Preview>{previewText}</Preview>
    <Body style={emailStyles.body}>
      <Container style={emailStyles.container}>
        <Section style={{ marginBottom: '24px' }}>
          {brand ?? (
            <Text
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: emailTheme.text,
                margin: 0,
              }}
            >
              AurexOS
            </Text>
          )}
        </Section>
        {children}
        <Hr style={emailStyles.hr} />
        <Section>
          {footer ??
            (preferenceUrl ? (
              <Text style={emailStyles.caption}>
                Choose what you get notified about in your{' '}
                <Link href={preferenceUrl} style={emailStyles.link}>
                  notification preferences
                </Link>
                .
              </Text>
            ) : null)}
        </Section>
      </Container>
    </Body>
  </Html>
)

export default BaseLayout
