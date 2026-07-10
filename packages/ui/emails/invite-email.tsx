import * as React from 'react'
import { Button, Section, Text } from '@react-email/components'

import { BaseLayout, emailStyles } from './components/base-layout'

/**
 * Workspace invite email — docs/design/BrandGuidelines.md §8,
 * docs/design/Notifications.md §7 (email chrome discipline).
 *
 * Inviter, workspace, role, one accept CTA. Minimal-premium: sentence
 * case, one accent action, no marketing copy.
 */

export interface InviteEmailProps {
  /** Who sent the invite, e.g. "Dana Whitman". */
  inviterName: string
  workspaceName: string
  /** The role the invitee joins as, e.g. "Member", "Admin". */
  role: string
  /** Accept CTA deep link. */
  acceptUrl: string
  /** Optional expiry note, e.g. "This invite expires in 7 days." */
  expiryNote?: string
  /** Workspace-brand header slot. */
  brand?: React.ReactNode
}

/** Workspace invitation: inviter, role, accept CTA. */
export const InviteEmail = ({
  inviterName,
  workspaceName,
  role,
  acceptUrl,
  expiryNote,
  brand,
}: InviteEmailProps) => (
  <BaseLayout
    previewText={`${inviterName} invited you to ${workspaceName}`}
    brand={brand}
    footer={
      expiryNote ? <Text style={emailStyles.caption}>{expiryNote}</Text> : null
    }
  >
    <Text style={emailStyles.heading}>
      {inviterName} invited you to {workspaceName}
    </Text>
    <Text style={emailStyles.paragraph}>
      You&apos;ve been invited to join the {workspaceName} workspace on
      AurexOS as {role}. Accept the invite to get started.
    </Text>
    <Section style={{ margin: '0 0 16px' }}>
      <Button href={acceptUrl} style={emailStyles.button}>
        Accept invite
      </Button>
    </Section>
    <Text style={emailStyles.caption}>
      If you weren&apos;t expecting this invite, you can ignore this email.
    </Text>
  </BaseLayout>
)

export default InviteEmail
