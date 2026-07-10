import type {
  BucketTarget,
  PresignUploadRequest,
  SignedDownloadUrl,
  SignedUploadUrl,
  StorageObjectRef,
  StorageProvider,
} from '@aurexos/core'
import type { DbClient } from './index'

// StorageProvider implementations — StorageArchitecture.md §2.
//
// These are the ONLY places in the codebase that touch a bucket SDK
// (Principle 4: application code never imports one). Callers reach them
// through the core interface, routed by asset class via selectProvider().
// Authorization happens BEFORE these run: the presign edge function checks
// permission + quota + policy (checkUploadPolicy) and only then asks a
// provider for a URL — providers mint, they never re-authorize.

/**
 * Supabase Storage signs upload URLs with a platform-fixed TTL (2 hours in
 * supabase-js v2 — not caller-configurable). Recorded here so pending-row
 * expiry (§3.1) and the orphan sweep (§8.4) agree with reality; revisit when
 * the SDK exposes a TTL parameter.
 */
const SUPABASE_SIGNED_UPLOAD_TTL_SECONDS = 7_200

function isoIn(seconds: number): string {
  return new Date(Date.now() + seconds * 1_000).toISOString()
}

/**
 * Phase 1 provider: Supabase Storage for the standard classes (documents,
 * avatars, PDFs, receipts — the 95% case, §2.1). One provider instance per
 * bucket; buckets are ALWAYS private — signed access only, no public buckets,
 * ever (§7.4: a public bucket is a SEV-1, checked in CI).
 *
 * Requires a service-role client: URL minting is a server-side act that
 * happens after the caller's own permission check, and the files-table RLS
 * remains the authority on visibility (Principle 1).
 */
export class SupabaseStorageProvider implements StorageProvider {
  readonly target: BucketTarget = 'supabase'

  constructor(
    private readonly client: DbClient,
    /** The private bucket this provider fronts (files.bucket, 0006). */
    private readonly bucket: string,
  ) {}

  async createSignedUploadUrl(input: {
    request: PresignUploadRequest
    objectKey: string
  }): Promise<SignedUploadUrl> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(input.objectKey)

    if (error !== null || data === null) {
      throw new Error(
        `SupabaseStorageProvider: presign upload failed for "${input.objectKey}": ${error?.message ?? 'no data returned'}`,
      )
    }
    return {
      url: data.signedUrl,
      token: data.token,
      objectKey: data.path,
      expiresAtIso: isoIn(SUPABASE_SIGNED_UPLOAD_TTL_SECONDS),
    }
  }

  async createSignedDownloadUrl(
    ref: StorageObjectRef,
    ttlSeconds: number,
  ): Promise<SignedDownloadUrl> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(ref.objectKey, ttlSeconds)

    if (error !== null || data === null) {
      throw new Error(
        `SupabaseStorageProvider: presign download failed for "${ref.objectKey}": ${error?.message ?? 'no data returned'}`,
      )
    }
    return { url: data.signedUrl, expiresAtIso: isoIn(ttlSeconds) }
  }

  async delete(ref: StorageObjectRef): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([ref.objectKey])
    if (error !== null) {
      throw new Error(
        `SupabaseStorageProvider: delete failed for "${ref.objectKey}": ${error.message}`,
      )
    }
  }
}

const R2_NOT_CONFIGURED =
  'R2StorageProvider is not configured. Cloudflare R2 is the Phase 2 store for ' +
  'large/CDN-heavy asset classes (deliverable, video, recording, ' +
  'monitoring_screenshot — StorageArchitecture.md §2.1/§2.2). Until R2 ' +
  'credentials and the S3-compatible signing implementation land, route these ' +
  'classes nowhere: do NOT fall back to Supabase Storage — the routing table ' +
  'is normative, and its economics (zero-egress client delivery, §5.4) are ' +
  'the reason these classes exist.'

/**
 * Phase 2 provider stub: interface-complete so the routing map and every call
 * site can be written and typed today, but throwing until R2 is provisioned.
 * The real implementation signs S3-compatible presigned URLs against R2 with
 * the Cloudflare CDN in front (cache keyed to the full signed URL, §5.2).
 */
export class R2StorageProvider implements StorageProvider {
  readonly target: BucketTarget = 'r2'

  createSignedUploadUrl(_input: {
    request: PresignUploadRequest
    objectKey: string
  }): Promise<SignedUploadUrl> {
    return Promise.reject(new Error(R2_NOT_CONFIGURED))
  }

  createSignedDownloadUrl(_ref: StorageObjectRef, _ttlSeconds: number): Promise<SignedDownloadUrl> {
    return Promise.reject(new Error(R2_NOT_CONFIGURED))
  }

  delete(_ref: StorageObjectRef): Promise<void> {
    return Promise.reject(new Error(R2_NOT_CONFIGURED))
  }
}

/**
 * The standard provider map for selectProvider() from @aurexos/core — one
 * construction site, so "swapping or adding a backend touches one package"
 * (§2.4) stays literally true.
 */
export function createStorageProviders(
  client: DbClient,
  options: { supabaseBucket: string },
): Readonly<Record<BucketTarget, StorageProvider>> {
  return {
    supabase: new SupabaseStorageProvider(client, options.supabaseBucket),
    r2: new R2StorageProvider(),
  }
}
