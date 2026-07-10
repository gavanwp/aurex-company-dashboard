import type { Notification, NotificationChannel } from './types'
import type { RenderedPayload } from './render'

// The channel-adapter seam — ADR-0004 (Channel-Adapter Notification
// Architecture) and NotificationsArchitecture.md §4.
//
// Every channel — first-party or bridged — implements this one contract.
// Adding a channel NEVER touches the pipeline: the preference router hands a
// rendered notification to whatever adapter claims the channel, and the
// adapter owns provider specifics (what a 429 from Resend means, what a push
// endpoint's 410 means). Long-tail channels (Slack, SMS, WhatsApp, Discord,
// Telegram — ADR-0004 §4.3) implement this SAME interface later as
// n8n-bridged adapters: `deliver()` posts to an n8n workflow that owns the
// third-party plumbing, and each is promoted to first-party only on measured
// demand. Bridged or owned, the pipeline cannot tell the difference — that is
// the point of the seam.

/**
 * What the adapter needs to know about the recipient to render and deliver.
 * Deliberately minimal: adapters never query user tables themselves — the
 * pipeline resolves recipients (and permission-checks them, Principle 3)
 * before any adapter runs.
 */
export interface NotificationRecipient {
  userId: string
  /** Delivery address for the email channel; null recipients skip email. */
  email: string | null
  /** BCP 47 tag driving template resolution (i18n-ready rendering). */
  locale: string
  /** IANA timezone — quiet hours and digest send times are recipient-local. */
  timezone: string
}

/**
 * deliver() outcome, discriminated by `status`. This union IS the `classify`
 * capability of the §4.1 adapter sketch, folded into the result: the retry
 * machinery stays channel-agnostic because the adapter — not the pipeline —
 * decides what a provider error means.
 */
export type DeliveryResult =
  | {
      /** Accepted by the provider (or written, for in-app). */
      status: 'delivered'
      /** Provider receipt id, stored on the ChannelDelivery record. */
      providerMessageId?: string
    }
  | {
      /**
       * Transient failure — retried on the 30s → 2m → 10m → 1h → 6h schedule
       * (max 5 attempts, jittered), then dead-lettered (§8).
       */
      status: 'retryable'
      /** Stable, low-cardinality class ('timeout', 'throttled', '5xx'). */
      errorClass: string
      /** Provider retry-after hint; overrides the backoff step when present. */
      retryAfterSeconds?: number
    }
  | {
      /**
       * Permanent failure (hard bounce, invalid address) — skips retries
       * entirely and goes straight to the DLQ state (§8).
       */
      status: 'permanent_failure'
      errorClass: string
    }

/** Delivery-state update produced from a provider webhook (bounce, complaint). */
export interface DeliveryReceipt {
  providerMessageId: string
  state: 'delivered' | 'bounced' | 'complained'
}

/**
 * The adapter contract (ADR-0004). One implementation per channel; the
 * pipeline discovers adapters by their `channel` and never special-cases one.
 *
 * Failure isolation is a pipeline invariant: one channel's failure never
 * blocks another channel (§2) — adapters must therefore never throw for
 * provider-side problems; they return a classified DeliveryResult. Throwing
 * is reserved for programmer errors (bad wiring, malformed rendered payload).
 */
export interface ChannelAdapter {
  /** The channel this adapter serves. */
  readonly channel: NotificationChannel

  /**
   * Produce the channel-specific payload from the stored notification and
   * recipient: email subject/HTML, push title/body, inbox row fields. Pure —
   * rendering never performs I/O; templates resolve via the render contracts
   * in ./render. A render error dead-letters the notification (§2): the
   * engine never sends a half-rendered payload.
   */
  render(notification: Notification, recipient: NotificationRecipient): RenderedPayload

  /**
   * Deliver a rendered payload. `idempotencyKey` is always
   * buildDeliveryIdempotencyKey(notificationId, channel); adapters pass it to
   * providers that support idempotent sends and MUST tolerate replays —
   * at-least-once delivery is absorbed here and at the delivery record,
   * never assumed away.
   */
  deliver(rendered: RenderedPayload, idempotencyKey: string): Promise<DeliveryResult>

  /**
   * Optional: translate a provider webhook (Resend bounce/complaint, push
   * endpoint gone) into a delivery-state update. Channels without webhooks
   * (in-app) omit this. The §4.1 `receipt` capability.
   */
  receipt?(webhookEvent: unknown): DeliveryReceipt | null
}
