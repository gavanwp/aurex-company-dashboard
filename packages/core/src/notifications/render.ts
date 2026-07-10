import { z } from 'zod'
import type { NotificationChannel } from './types'

// Rendering contracts — NotificationsArchitecture.md §2 (template render
// stage) and §5.4 (deep links).
//
// Two rules make rendering i18n-ready and permission-safe:
// 1. No baked strings. A notification's content is a TEMPLATE KEY plus
//    PARAMS; the sentence is produced by a resolver against the recipient's
//    locale. Params carry display values captured at emit time (the actor's
//    name, the task title) because the stored row must keep reading correctly
//    even after the source entity is renamed or deleted (§3 denormalization).
// 2. Deep links are built, never hand-assembled. Every notification links to
//    the exact entity and position, and the link target re-checks permission
//    at click time (§5.4) — the URL itself carries no authority.

// ── Template contract ───────────────────────────────────────────────────────

/**
 * A reference to a rendered sentence: template key + params, no baked
 * strings. Keys are `notificationTypeKey.part` (e.g. `tasks.assigned.title`)
 * and live in the template catalog reviewed like code (same doctrine as
 * R-AI5 for prompts).
 */
export const TemplateRefSchema = z.object({
  key: z.string().min(1).max(200),
  /**
   * Interpolation values, captured at emit time. Strings and numbers only —
   * a param is display data, never markup or an entity reference.
   */
  params: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
})
export type TemplateRef = z.infer<typeof TemplateRefSchema>

/** A resolved sentence pair in one locale. */
export interface RenderedSentence {
  title: string
  /** Null for types whose template defines no body (title-only rows). */
  body: string | null
}

/**
 * Resolves a TemplateRef into recipient-locale text. Implementations own the
 * template catalog (ICU-style interpolation recommended); the engine only
 * knows this interface. MUST throw on an unknown key or missing param — a
 * template error dead-letters the notification (§2); the engine never ships a
 * half-rendered send.
 */
export interface TemplateResolver {
  resolve(ref: TemplateRef, locale: string): RenderedSentence
}

// ── Deep-link contract ──────────────────────────────────────────────────────

/**
 * What a deep link points at: the exact entity AND position (the comment,
 * the line item) — not just a page (§5.4).
 */
export const DeepLinkRefSchema = z.object({
  workspaceId: z.string().uuid(),
  /** Owning module (routes live under the module's route group). */
  module: z.string().min(1).max(40),
  entityType: z.string().min(1).max(40),
  entityId: z.string().uuid(),
  /** Optional in-page position (comment id, line-item anchor). */
  fragment: z.string().max(120).optional(),
})
export type DeepLinkRef = z.infer<typeof DeepLinkRefSchema>

/**
 * Builds the URL for a DeepLinkRef. The implementation lives with the app
 * that owns routing (apps/web) — core deliberately does not hardcode route
 * shapes (R-S4: no hardcoded environment-dependent URLs). Two invariants for
 * every implementation:
 * 1. The URL confers NO access — the destination re-checks permission at
 *    click time; a forwarded link shows the viewer only what THEY may see.
 * 2. Portal recipients get portal URLs (the notification is the doorbell,
 *    the portal is the room — §11); internal recipients get OS-shell URLs.
 */
export interface DeepLinkBuilder {
  build(ref: DeepLinkRef): string
}

// ── Rendered payload (adapter render() output) ─────────────────────────────

/**
 * The channel-specific payload produced by ChannelAdapter.render() and
 * consumed by deliver(). One shape across channels keeps the pipeline
 * channel-agnostic; fields a channel doesn't use stay null (in-app has no
 * subject, a push has no HTML body).
 */
export interface RenderedPayload {
  channel: NotificationChannel
  /** The TemplateRef this payload was rendered from — kept for audit/replay. */
  templateRef: TemplateRef
  /** Resolved recipient-locale title (push title, email subject basis, inbox row). */
  title: string
  /** Resolved body text; null when the template defines none. */
  body: string | null
  /** Channel body markup (email HTML from packages/ui/emails); null elsewhere. */
  html: string | null
  /** Absolute deep link from a DeepLinkBuilder; null for digest members. */
  deepLink: string | null
}
