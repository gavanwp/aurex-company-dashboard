import { z } from 'zod'
import {
  ASSET_CLASSES,
  UPLOAD_POLICIES,
  type AssetClass,
  type BucketTarget,
  type StorageObjectRef,
  type UploadPolicy,
} from './types'

// The storage interface — StorageArchitecture.md §2.4 (conceptual contract,
// made concrete here). Deliberately narrow: presign upload, presign download,
// delete. No list, no raw-key operations, no bucket administration from
// application code — and no application code EVER imports a bucket SDK
// (Principle 4; R-S5 "behind signed URLs" lives here). Implementations:
// SupabaseStorageProvider and R2StorageProvider in packages/db/src/storage.ts.

// ── Presign request (boundary schema, R-T3) ─────────────────────────────────

/**
 * The presign-upload request as it crosses the boundary into the policy gate
 * (§3.1). The gate runs BEFORE any URL exists: permission (caller's
 * defineAction), size ceiling + workspace quota, MIME allowlist. Any failure
 * means no URL is ever minted — there is no "upload then reject" window.
 */
export const PresignUploadRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  /** Owning module — becomes the second object-key segment. */
  module: z.string().min(1).max(64),
  /** Asset class from the closed registry; unknown classes fail the parse. */
  assetClass: z.enum(ASSET_CLASSES),
  /** Attachment target (files.entity_type / entity_id, 0006); optional. */
  entityType: z.string().min(1).max(64).nullable().optional(),
  entityId: z.string().uuid().nullable().optional(),
  /** Original filename — sanitized by buildObjectKey, never trusted. */
  filename: z.string().min(1).max(255),
  /** DECLARED MIME — a gate input; post-upload content sniffing is the truth. */
  mime: z.string().min(1).max(255),
  /** DECLARED size — verified against the actual object on confirm. */
  sizeBytes: z.number().int().positive(),
})
export type PresignUploadRequest = z.infer<typeof PresignUploadRequestSchema>

// ── Policy gate ─────────────────────────────────────────────────────────────

/** Outcome of the pure policy check — a reason, never a thrown string. */
export type UploadPolicyCheck =
  | { ok: true; policy: UploadPolicy }
  | {
      ok: false
      reason: 'size_exceeded' | 'mime_not_allowed'
      policy: UploadPolicy
      /** Human-safe detail for the audited refusal (§3.1: fail = no URL, audited). */
      detail: string
    }

/**
 * The pure size + MIME half of the §3.1 policy gate. Permission and workspace
 * quota are checked by the caller (they need I/O); this function owns the
 * per-class policy table so the rules cannot drift between edge functions.
 */
export function checkUploadPolicy(request: PresignUploadRequest): UploadPolicyCheck {
  const policy = UPLOAD_POLICIES[request.assetClass]
  if (request.sizeBytes > policy.maxSizeBytes) {
    return {
      ok: false,
      reason: 'size_exceeded',
      policy,
      detail: `declared size ${request.sizeBytes} exceeds the ${request.assetClass} ceiling of ${policy.maxSizeBytes} bytes`,
    }
  }
  if (policy.allowedMime !== null && !policy.allowedMime.includes(request.mime)) {
    return {
      ok: false,
      reason: 'mime_not_allowed',
      policy,
      detail: `declared MIME "${request.mime}" is not on the ${request.assetClass} allowlist`,
    }
  }
  return { ok: true, policy }
}

// ── Routing ─────────────────────────────────────────────────────────────────

/**
 * Asset class → target store, per the normative table in
 * StorageArchitecture.md §2.2. Internal to the storage layer: callers name a
 * class; they never name a bucket.
 */
export function routeAssetClass(assetClass: AssetClass): BucketTarget {
  return UPLOAD_POLICIES[assetClass].target
}

/**
 * Picks the provider serving an asset class from a per-target provider map —
 * the "one interface, two stores" dispatch (Principle 4). Swapping or adding
 * a backend touches the map's construction site in packages/db, nothing else.
 */
export function selectProvider(
  providers: Readonly<Record<BucketTarget, StorageProvider>>,
  assetClass: AssetClass,
): StorageProvider {
  return providers[routeAssetClass(assetClass)]
}

// ── Provider contract ───────────────────────────────────────────────────────

/** A minted upload URL — single-use, short-TTL, bound to one exact key. */
export interface SignedUploadUrl {
  url: string
  /** Provider upload token (Supabase signed-upload token); null when unused. */
  token: string | null
  /** The exact key the URL is bound to (from buildObjectKey). */
  objectKey: string
  /** ISO expiry — pending metadata rows past this are failed and swept (§3.1). */
  expiresAtIso: string
}

/** A minted download URL — minutes-scale TTL, never days (§5.1). */
export interface SignedDownloadUrl {
  url: string
  expiresAtIso: string
}

/**
 * One storage backend behind the interface. Contract invariants every
 * implementation must uphold (StorageArchitecture.md §7):
 *
 * 1. Signed access only — no public buckets, ever (a public bucket is SEV-1).
 * 2. The caller has already run the policy gate (checkUploadPolicy) and the
 *    permission check; providers mint URLs, they do not re-authorize. Keeping
 *    authorization out of providers is what keeps it in ONE place.
 * 3. `delete` removes bytes only — the purge job orchestrates metadata-row
 *    ordering (§8.1: bytes are never removed while a live row points at them).
 * 4. Object keys always come from buildObjectKey — workspace-prefixed,
 *    server-side constructed, never user-supplied.
 */
export interface StorageProvider {
  /** The store this provider fronts. */
  readonly target: BucketTarget

  /**
   * Mint a single-use presigned upload URL for a policy-checked request.
   * `objectKey` MUST be a buildObjectKey product; bytes then go browser →
   * bucket directly — app servers never proxy payloads (§3.1).
   */
  createSignedUploadUrl(input: {
    request: PresignUploadRequest
    objectKey: string
  }): Promise<SignedUploadUrl>

  /**
   * Mint a short-lived download URL for an object whose metadata row the
   * caller has ALREADY permission-checked (RBAC, and PortalShare for portal
   * sessions — §5.3). TTL is minutes-scale, sized to the access pattern.
   */
  createSignedDownloadUrl(ref: StorageObjectRef, ttlSeconds: number): Promise<SignedDownloadUrl>

  /** Remove the object's bytes. Called by the purge/orphan-sweep jobs only. */
  delete(ref: StorageObjectRef): Promise<void>
}
