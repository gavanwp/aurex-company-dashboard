import { z } from 'zod'

// Storage contracts — StorageArchitecture.md (binding) and 08_Tech_Stack.md §6.
//
// One interface, two stores: Supabase Storage for standard files (Phase 1),
// Cloudflare R2 for large/CDN-heavy client-facing assets (Phase 2, zero
// egress). Postgres metadata is the authority — every object has exactly one
// public.files row (0006) under RLS, and a file's visibility IS that row's
// visibility. Application code never imports a bucket SDK (§2.4); it speaks
// the StorageProvider interface in ./storage, routed by asset class here.

// ── Stores ──────────────────────────────────────────────────────────────────

export const BUCKET_TARGETS = ['supabase', 'r2'] as const
export type BucketTarget = (typeof BUCKET_TARGETS)[number]

/** CDN/browser caching posture per asset class (StorageArchitecture.md §5.2). */
export const CACHE_POLICIES = [
  /** No caching anywhere — signed URL per request (documents, PDFs, transcripts). */
  'none',
  /** Short browser cache on the signed URL (avatars). */
  'short_browser',
  /**
   * Cloudflare CDN in front of R2, cache keyed to the FULL signed URL — the
   * CDN accelerates, it never widens access (§5.2).
   */
  'cdn_signed',
] as const
export type CachePolicy = (typeof CACHE_POLICIES)[number]

// ── Asset classes ───────────────────────────────────────────────────────────

/**
 * The closed asset-class registry (§2.2 normative table + §2.4): callers name
 * a class from this list; an unknown class is a REJECTED presign, and adding
 * a class is a PR to packages/core reviewed against the architecture table.
 */
export const ASSET_CLASSES = [
  'avatar',
  'document_attachment',
  'kb_attachment',
  'invoice_pdf',
  'contract_pdf',
  'receipt',
  'email_attachment',
  'transcript',
  'deliverable',
  'video',
  'recording',
  'monitoring_screenshot',
] as const
export type AssetClass = (typeof ASSET_CLASSES)[number]

// ── Object references ───────────────────────────────────────────────────────

/**
 * A stored object, as application code refers to it. The authoritative
 * metadata (visibility, AV status, lifecycle) lives on the public.files row;
 * this ref is the value object handed to a StorageProvider.
 */
export const StorageObjectRefSchema = z.object({
  bucketTarget: z.enum(BUCKET_TARGETS),
  /** Workspace-prefixed key from buildObjectKey() — never user-supplied. */
  objectKey: z.string().min(1).max(1024),
  mime: z.string().min(1).max(255),
  sizeBytes: z.number().int().nonnegative(),
})
export type StorageObjectRef = z.infer<typeof StorageObjectRefSchema>

// ── Upload policy table ─────────────────────────────────────────────────────

/** Per-asset-class upload policy, enforced at presign time (§3.1 policy gate). */
export interface UploadPolicy {
  /** Which store this class routes to (§2.2 — normative, not advisory). */
  readonly target: BucketTarget
  /** Per-file ceiling in bytes; Phase 5 makes these plan-configurable (§9). */
  readonly maxSizeBytes: number
  /**
   * MIME allowlist checked before a URL is minted; null = unrestricted
   * (large deliverable classes). Declared MIME is a gate input only — the
   * post-upload server-side content sniff is the real check (§3.1).
   */
  readonly allowedMime: readonly string[] | null
  readonly cachePolicy: CachePolicy
  /**
   * Immutable classes (invoice/contract PDFs) are written once and
   * content-hashed; correction means a NEW document, never an overwrite
   * (§6.2 — integrity with legal weight).
   */
  readonly immutable: boolean
}

const MB = 1_048_576
const GB = 1_073_741_824

const DOCUMENT_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
] as const

const IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const

/**
 * The typed upload-policy table — a 1:1 encoding of the normative asset-class
 * table in StorageArchitecture.md §2.2. Changing a row here is changing that
 * table: same PR, same review (R-DOC3).
 */
export const UPLOAD_POLICIES: Readonly<Record<AssetClass, UploadPolicy>> = {
  avatar: {
    target: 'supabase',
    maxSizeBytes: 10 * MB,
    allowedMime: IMAGE_MIME,
    cachePolicy: 'short_browser',
    immutable: false,
  },
  document_attachment: {
    target: 'supabase',
    maxSizeBytes: 50 * MB,
    allowedMime: DOCUMENT_MIME,
    cachePolicy: 'none',
    immutable: false,
  },
  kb_attachment: {
    target: 'supabase',
    maxSizeBytes: 50 * MB,
    allowedMime: DOCUMENT_MIME,
    cachePolicy: 'none',
    immutable: false,
  },
  invoice_pdf: {
    target: 'supabase',
    maxSizeBytes: 20 * MB,
    allowedMime: ['application/pdf'],
    cachePolicy: 'none',
    immutable: true,
  },
  contract_pdf: {
    target: 'supabase',
    maxSizeBytes: 50 * MB,
    allowedMime: ['application/pdf'],
    cachePolicy: 'none',
    immutable: true,
  },
  receipt: {
    target: 'supabase',
    maxSizeBytes: 20 * MB,
    allowedMime: ['application/pdf', ...IMAGE_MIME],
    cachePolicy: 'none',
    immutable: false,
  },
  email_attachment: {
    target: 'supabase',
    maxSizeBytes: 25 * MB,
    allowedMime: null,
    cachePolicy: 'none',
    immutable: false,
  },
  transcript: {
    target: 'supabase',
    maxSizeBytes: 50 * MB,
    allowedMime: ['text/plain', 'text/vtt', 'application/json'],
    cachePolicy: 'none',
    immutable: false,
  },
  deliverable: {
    target: 'r2',
    maxSizeBytes: 5 * GB,
    allowedMime: null,
    cachePolicy: 'cdn_signed',
    immutable: false,
  },
  video: {
    target: 'r2',
    maxSizeBytes: 20 * GB,
    allowedMime: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'],
    cachePolicy: 'cdn_signed',
    immutable: false,
  },
  recording: {
    // Tenant-sensitive: R2 but NO CDN caching, defense in depth (§5.2).
    target: 'r2',
    maxSizeBytes: 2 * GB,
    allowedMime: ['video/mp4', 'video/webm', 'audio/mpeg', 'audio/mp4', 'audio/webm'],
    cachePolicy: 'none',
    immutable: false,
  },
  monitoring_screenshot: {
    target: 'r2',
    maxSizeBytes: 5 * MB,
    allowedMime: ['image/png', 'image/jpeg', 'image/webp'],
    cachePolicy: 'cdn_signed',
    immutable: false,
  },
}

// ── Key builder ─────────────────────────────────────────────────────────────

const KEY_SEGMENT = /^[a-z0-9_-]{1,64}$/
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Sanitizes a user-supplied filename into a safe key leaf: path separators
 * and control characters stripped, whitespace collapsed to `-`, length
 * capped, extension preserved. Injection posture per SecurityArchitecture.md
 * §7.4 — the filename is the ONLY user-influenced fragment of a key, and it
 * is neutralized here.
 */
export function sanitizeFilename(filename: string): string {
  const leaf = filename.split(/[/\\]/).pop() ?? 'file'
  const cleaned = leaf
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+/, '')
  const safe = cleaned.length > 0 ? cleaned : 'file'
  if (safe.length <= 128) return safe
  const dot = safe.lastIndexOf('.')
  const ext = dot > 0 ? safe.slice(dot).slice(0, 16) : ''
  return `${safe.slice(0, 128 - ext.length)}${ext}`
}

/**
 * Builds the workspace-prefixed object key:
 * `{workspaceId}/{module}/{entityType}/{entityId}/{filename}` — tenancy in
 * EVERY key, both stores, so cross-tenant object references are structurally
 * invalid, not merely denied (StorageArchitecture.md Principle 2). Keys are
 * constructed server-side only; every segment except the sanitized filename
 * is validated, and invalid input throws rather than degrades.
 *
 * `discriminator` (recommended: the files-row id) is prefixed onto the
 * filename so two uploads of `logo.png` to the same entity never collide on
 * the (bucket, object_key) unique constraint.
 */
export function buildObjectKey(
  workspaceId: string,
  module: string,
  entityType: string,
  entityId: string,
  filename: string,
  options?: { discriminator?: string },
): string {
  if (!UUID_SEGMENT.test(workspaceId)) throw new Error('buildObjectKey: invalid workspaceId')
  if (!KEY_SEGMENT.test(module)) throw new Error('buildObjectKey: invalid module segment')
  if (!KEY_SEGMENT.test(entityType)) throw new Error('buildObjectKey: invalid entityType segment')
  if (!UUID_SEGMENT.test(entityId)) throw new Error('buildObjectKey: invalid entityId')
  const discriminator = options?.discriminator
  if (discriminator !== undefined && !KEY_SEGMENT.test(discriminator)) {
    throw new Error('buildObjectKey: invalid discriminator segment')
  }
  const leaf = sanitizeFilename(filename)
  const name = discriminator === undefined ? leaf : `${discriminator}-${leaf}`
  return `${workspaceId.toLowerCase()}/${module}/${entityType}/${entityId.toLowerCase()}/${name}`
}
