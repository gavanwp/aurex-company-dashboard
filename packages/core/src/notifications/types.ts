import { z } from 'zod'

// Notification engine contracts — NotificationsArchitecture.md (binding) and
// ADR-0004 (Channel-Adapter Notification Architecture).
//
// AurexOS has exactly ONE notification engine. Modules never notify directly:
// they emit domain events, and the pipeline (event → match → resolve
// recipients → permission check → render → route → deliver) decides whether,
// whom, how, and when. These are the pure contracts for that pipeline; the
// runtime lives in supabase/functions workers on the jobs substrate.

// ── Channels ────────────────────────────────────────────────────────────────

/**
 * First-party channels (ADR-0004). Long-tail channels (Slack/SMS/WhatsApp/
 * Discord/Telegram) are NOT listed here — they arrive as n8n-bridged
 * implementations of the same ChannelAdapter contract (./channel-adapter),
 * never as new pipeline stages.
 */
export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'push', 'digest'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

// ── Type registry ───────────────────────────────────────────────────────────

/** Module-aligned categories; preferences can target a whole category (§6.1). */
export const NOTIFICATION_CATEGORIES = [
  'tasks',
  'projects',
  'crm',
  'finance',
  'documents',
  'meetings',
  'approvals',
  'security',
  'system',
] as const
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

/**
 * Priority bands (NotificationsArchitecture.md §9): below the recipient's
 * digest threshold → digest queue; above → individual delivery. `critical` is
 * reserved for the mandatory categories (security, approvals).
 */
export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number]

/** Default on/off per channel for a type — the seed of the preference matrix. */
export type ChannelMatrix = Readonly<Record<NotificationChannel, boolean>>

/** One entry in the notification type registry. */
export interface NotificationTypeDefinition {
  /** Category used for grouped preferences and the mandatory-set policy. */
  readonly category: NotificationCategory
  /** Default priority band; per-recipient learned priority adjusts it (§10). */
  readonly priority: NotificationPriority
  /**
   * Mandatory types (§6.3) may be rerouted but never fully silenced, bypass
   * quiet hours and digest folding. The mandatory set is deliberately tiny;
   * every addition needs Owner sign-off.
   */
  readonly mandatory: boolean
  /** Default channel matrix — must be right for ~90% of users (§6.2). */
  readonly defaultChannels: ChannelMatrix
  /**
   * Coalescer folding window in seconds (§9). 0 = never delayed (approvals,
   * security). Default engine window is 600 (10 minutes).
   */
  readonly foldWindowSeconds: number
}

/**
 * The versioned notification type registry: typed keys per module
 * (`module.event_moment`), each declared against a domain event — the engine
 * consumes events, it is never called imperatively (Principle 4). Adding a
 * type is adding an entry here; a type users mass-disable gets DELETED, not
 * re-enabled (§6.4). notifications.type (0005) stores these keys.
 */
export const NOTIFICATION_TYPES = {
  /** tasks.task.assigned → "Priya assigned you 'Homepage hero'". */
  'tasks.assigned': {
    category: 'tasks',
    priority: 'normal',
    mandatory: false,
    defaultChannels: { in_app: true, email: true, push: false, digest: false },
    foldWindowSeconds: 600,
  },
  /** tasks.comment.created → mention/watcher fan-out on a task thread. */
  'tasks.commented': {
    category: 'tasks',
    priority: 'normal',
    mandatory: false,
    defaultChannels: { in_app: true, email: false, push: false, digest: true },
    foldWindowSeconds: 600,
  },
  /** projects.project.updated (status transitions) → watchers. */
  'projects.status_changed': {
    category: 'projects',
    priority: 'low',
    mandatory: false,
    defaultChannels: { in_app: true, email: false, push: false, digest: true },
    foldWindowSeconds: 600,
  },
  /** crm.deal.stage_changed → deal watchers and owners. */
  'crm.deal_stage_changed': {
    category: 'crm',
    priority: 'low',
    mandatory: false,
    defaultChannels: { in_app: true, email: false, push: false, digest: true },
    foldWindowSeconds: 600,
  },
  /** documents.document.published → space watchers / shared audience. */
  'documents.published': {
    category: 'documents',
    priority: 'low',
    mandatory: false,
    defaultChannels: { in_app: true, email: false, push: false, digest: true },
    foldWindowSeconds: 600,
  },
  /** finance.invoice.overdue → finance role + invoice watchers. */
  'finance.invoice_overdue': {
    category: 'finance',
    priority: 'high',
    mandatory: false,
    defaultChannels: { in_app: true, email: true, push: false, digest: false },
    foldWindowSeconds: 600,
  },
  /**
   * finance.expense.submitted / ai.approval.requested → the approver.
   * Mandatory category: reroutable, never silenced; window 0 (§6.3, §9).
   */
  'approvals.requested': {
    category: 'approvals',
    priority: 'critical',
    mandatory: true,
    defaultChannels: { in_app: true, email: true, push: true, digest: false },
    foldWindowSeconds: 0,
  },
  /** Security events (auth anomalies, DLQ spikes) → admins. Mandatory. */
  'security.alert': {
    category: 'security',
    priority: 'critical',
    mandatory: true,
    defaultChannels: { in_app: true, email: true, push: true, digest: false },
    foldWindowSeconds: 0,
  },
} as const satisfies Record<string, NotificationTypeDefinition>

export type NotificationTypeKey = keyof typeof NOTIFICATION_TYPES

/** All registered type keys, derived — never hand-listed. */
export const NOTIFICATION_TYPE_KEYS = Object.keys(
  NOTIFICATION_TYPES,
) as readonly NotificationTypeKey[]

// ── Notification row (mirrors public.notifications, 0005) ──────────────────

/**
 * The rendered, per-recipient notification row. Title/body are stored
 * DENORMALIZED on purpose: the inbox keeps displaying what was said even if
 * the source entity is renamed or deleted — but click-through re-checks
 * permission live (NotificationsArchitecture.md §3).
 */
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  /** The recipient (notifications.user_id). */
  userId: z.string().uuid(),
  /** A NotificationTypeKey; typed loosely because rows outlive registry edits. */
  type: z.string().min(1),
  title: z.string().min(1),
  body: z.string().nullable(),
  entityType: z.string().nullable(),
  entityId: z.string().uuid().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
})
export type Notification = z.infer<typeof NotificationSchema>

// ── Channel delivery record ─────────────────────────────────────────────────

/**
 * Delivery state machine (NotificationsArchitecture.md §8): pending → sent →
 * delivered, with bounced/complained driven by provider webhooks, failed for
 * in-flight retryable errors, and dead as the admin-replayable DLQ state.
 */
export const CHANNEL_DELIVERY_STATES = [
  'pending',
  'sent',
  'delivered',
  'bounced',
  'complained',
  'failed',
  'dead',
] as const
export type ChannelDeliveryState = (typeof CHANNEL_DELIVERY_STATES)[number]

/**
 * One row per (notification, channel) — the at-least-once safety net. The
 * idempotency key absorbs worker replays: a crashed worker re-delivering
 * upserts this record, it never duplicates a send. Persistence lands as the
 * notification_deliveries table in a future migration; this schema governs it.
 */
export const ChannelDeliverySchema = z.object({
  notificationId: z.string().uuid(),
  channel: z.enum(NOTIFICATION_CHANNELS),
  /** Always buildDeliveryIdempotencyKey(notificationId, channel). */
  idempotencyKey: z.string().min(1),
  state: z.enum(CHANNEL_DELIVERY_STATES),
  attempts: z.number().int().nonnegative(),
  providerMessageId: z.string().nullable(),
  /** Adapter-classified error class of the last failure (never a raw dump). */
  lastErrorClass: z.string().nullable(),
})
export type ChannelDelivery = z.infer<typeof ChannelDeliverySchema>

/**
 * The delivery idempotency key contract: `(notification_id, channel)` —
 * structural duplicate-send prevention, not hope that the queue delivers
 * exactly once (NotificationsArchitecture.md §8).
 */
export function buildDeliveryIdempotencyKey(
  notificationId: string,
  channel: NotificationChannel,
): string {
  return `${notificationId}:${channel}`
}

// ── Preferences ─────────────────────────────────────────────────────────────

/**
 * Per-(type × channel) preference value (§6.1): `on` delivers individually,
 * `digest_only` folds into the digest, `off` silences that channel. Mandatory
 * types reject matrices that turn every channel off — enforced by the
 * preference router, not this type.
 */
export const CHANNEL_PREFERENCE_VALUES = ['on', 'digest_only', 'off'] as const
export type ChannelPreferenceValue = (typeof CHANNEL_PREFERENCE_VALUES)[number]

/** Quiet hours defer non-mandatory deliveries to the window's end (§6.4). */
export const QuietHoursSchema = z.object({
  /** Local start hour, inclusive (0–23). Windows may wrap midnight. */
  startHour: z.number().int().min(0).max(23),
  /** Local end hour, exclusive (0–23). */
  endHour: z.number().int().min(0).max(23),
  /** IANA timezone the hours are interpreted in. */
  timezone: z.string().min(1),
})
export type QuietHours = z.infer<typeof QuietHoursSchema>

export const DIGEST_CADENCES = ['daily', 'weekly'] as const
export type DigestCadence = (typeof DIGEST_CADENCES)[number]

/**
 * A recipient's full preference matrix (§6.1): overrides are keyed by
 * NotificationTypeKey OR NotificationCategory (type wins over category);
 * absent entries fall back to workspace role defaults (NotificationPolicy),
 * then to the registry's defaultChannels. Persistence lands as the
 * notification_preferences table in a future migration.
 */
export const NotificationPreferenceMatrixSchema = z.object({
  overrides: z
    .record(
      z.string(),
      z.record(z.enum(NOTIFICATION_CHANNELS), z.enum(CHANNEL_PREFERENCE_VALUES)),
    )
    .default({}),
  quietHours: QuietHoursSchema.nullable().default(null),
  digestCadence: z.enum(DIGEST_CADENCES).default('daily'),
})
export type NotificationPreferenceMatrix = z.infer<typeof NotificationPreferenceMatrixSchema>

// ── Coalescing ──────────────────────────────────────────────────────────────

/** Input to the coalescing key — the fold identity of §9. */
export interface CoalescingKeyInput {
  workspaceId: string
  /** Folding is per recipient — two recipients never share a fold group. */
  recipientId: string
  /** The notification type (folding never merges across types). */
  typeKey: string
  /** The acting user; folds "Priya completed 6 tasks", not "6 people did things". */
  actorId: string
  /** Entity group (project id, deal id, …) the folded members share. */
  entityGroupId: string
  /**
   * Bulk-operation batch ref (§9 burst-storm guard 1): when present it
   * REPLACES actor/entity-group identity, so a 500-row import folds into one
   * notification regardless of the window.
   */
  batchRef?: string
}

/**
 * Deterministic coalescing key: notifications sharing this key within the
 * type's foldWindowSeconds merge into one folded row ("Priya completed 6
 * tasks in Meridian" — never 6 rows). Pure and stable so the coalescer can
 * compute it identically on every worker.
 */
export function buildCoalescingKey(input: CoalescingKeyInput): string {
  const scope = input.batchRef !== undefined && input.batchRef !== ''
    ? `batch:${input.batchRef}`
    : `${input.actorId}:${input.entityGroupId}`
  return `${input.workspaceId}:${input.recipientId}:${input.typeKey}:${scope}`
}
