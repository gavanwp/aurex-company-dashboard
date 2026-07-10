'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertCircle, Check } from 'lucide-react'

import { cn } from '../../lib/utils'
import { Button } from '../button'
import { AurexMark } from './aurex-mark'

/**
 * AI Action / Approval card — canonical spec, docs/design/Components.md
 * §6.4; keyboard rules per docs/design/Accessibility.md §11.
 *
 * The mandatory gate for every side-effecting AI action — there is no
 * silent execution path. Anatomy top→bottom: ✦ + proposal verb phrase →
 * affected-entities list → diff/preview → cost line (tabular, never
 * hidden) → Approve (primary) / Edit (secondary) / Dismiss (ghost).
 * Approve is never default-focused; there is no "always approve" checkbox
 * (autonomy lives in AI governance settings). The card is a focus group
 * announced as a whole; A/E/D deliberately do not shortcut — approval
 * requires explicit Tab+Enter.
 *
 * One proposal per card. The title states what will happen, never
 * "I suggest maybe…" hedging.
 */

const approvalCardVariants = cva('rounded-lg border bg-card p-4 text-card-foreground', {
  variants: {
    variant: {
      default: '',
      /** Destructive proposals — danger border + danger-styled Approve. */
      danger: 'border-destructive/50',
    },
    status: {
      pending: '',
      approved: '',
      dismissed: 'opacity-50',
      expired: 'opacity-50',
      failed: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    status: 'pending',
  },
})

export interface ApprovalCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof approvalCardVariants> {
  /** Proposal verb phrase, plain language: "Send payment reminder to Meridian Co." */
  title: string
  /** Affected-entities list slot — entity chips, every record that will be touched. */
  entities?: React.ReactNode
  /** Diff / preview block slot — the exact artifact (email preview, field diff). */
  preview?: React.ReactNode
  /** Cost caption where relevant: money, quota, send-count. Never hidden. */
  cost?: string
  /** Expiry caption, e.g. "This proposal expired — the invoice was paid." */
  expiryNote?: string
  /** Receipt line once approved: "Approved by Dana · Sent 14:02". */
  receipt?: string
  /** Specific failure copy when status="failed" (approved but execution failed). */
  errorMessage?: string
  onApprove?: () => void
  onEdit?: () => void
  onDismiss?: () => void
  /** Retry for the failed state — inline, never a toast-error. */
  onRetry?: () => void
  /** Disables the action row while a decision is in flight. */
  busy?: boolean
}

/**
 * The canonical AI approval card. Fully keyboard-operable: real buttons in
 * tab order after all content, focus-group semantics via role="group" with
 * the proposal as the accessible name.
 */
const ApprovalCard = React.forwardRef<HTMLDivElement, ApprovalCardProps>(
  (
    {
      className,
      variant,
      status = 'pending',
      title,
      entities,
      preview,
      cost,
      expiryNote,
      receipt,
      errorMessage,
      onApprove,
      onEdit,
      onDismiss,
      onRetry,
      busy = false,
      ...props
    },
    ref,
  ) => {
    const resolvedStatus = status ?? 'pending'
    const decided = resolvedStatus !== 'pending' && resolvedStatus !== 'failed'

    return (
      <div
        ref={ref}
        role="group"
        aria-label={`Aurex proposes: ${title}. Approve, edit, or dismiss.`}
        className={cn(
          approvalCardVariants({ variant, status: resolvedStatus }),
          className,
        )}
        {...props}
      >
        {/* Header: ✦ + proposal verb phrase */}
        <div className="flex items-start gap-2">
          <AurexMark size={16} className="mt-0.5" />
          <p className="text-sm font-medium text-foreground">{title}</p>
        </div>

        {entities ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {entities}
          </div>
        ) : null}

        {preview ? (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-md border bg-muted/50 p-3 text-sm">
            {preview}
          </div>
        ) : null}

        {cost ? (
          <p className="mt-3 text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
            {cost}
          </p>
        ) : null}

        {/* Status states */}
        {resolvedStatus === 'approved' && receipt ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="h-4 w-4 text-success" aria-hidden="true" />
            {receipt}
          </p>
        ) : null}

        {resolvedStatus === 'expired' ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {expiryNote ?? 'This proposal expired'}
          </p>
        ) : null}

        {resolvedStatus === 'failed' ? (
          <div role="alert" className="mt-3 flex items-start gap-1.5 text-xs">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <span className="text-destructive">
              {errorMessage ?? "This didn't go through — nothing was changed."}
            </span>
          </div>
        ) : null}

        {/* Action row — content precedes actions in DOM order */}
        {resolvedStatus === 'pending' ? (
          <div className="mt-4 flex items-center gap-2">
            <Button
              variant={variant === 'danger' ? 'destructive' : 'default'}
              size="sm"
              disabled={busy}
              onClick={onApprove}
            >
              Approve
            </Button>
            {onEdit ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={onEdit}
              >
                Edit
              </Button>
            ) : null}
            {onDismiss ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            ) : null}
          </div>
        ) : null}

        {resolvedStatus === 'failed' ? (
          <div className="mt-3 flex items-center gap-2">
            {onRetry ? (
              <Button variant="secondary" size="sm" disabled={busy} onClick={onRetry}>
                Retry
              </Button>
            ) : null}
            {onDismiss ? (
              <Button variant="ghost" size="sm" disabled={busy} onClick={onDismiss}>
                Dismiss
              </Button>
            ) : null}
          </div>
        ) : null}

        {resolvedStatus === 'expired' && onDismiss ? (
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        ) : null}

        {decided && resolvedStatus === 'dismissed' ? (
          <p className="mt-3 text-xs text-muted-foreground">Dismissed</p>
        ) : null}
      </div>
    )
  },
)
ApprovalCard.displayName = 'ApprovalCard'

export { ApprovalCard, approvalCardVariants }
