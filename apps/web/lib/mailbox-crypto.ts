import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { getGmailEnv } from '@/lib/env'

/**
 * App-layer encryption for mailbox OAuth token bundles (SecurityArchitecture.md
 * §4.3 / register S4): AES-256-GCM, key from MAILBOX_TOKEN_KEY (outside the
 * DB), ciphertext stored in mailbox_connections.oauth_token_ciphertext as
 * "iv:tag:data" (each part base64).
 *
 * Hard rules enforced here by construction:
 * - Plaintext tokens never leave this module's return values — they are never
 *   logged, never embedded in Error messages, never serialized into events.
 * - Error messages describe the failure class only, never the payload.
 */

export class MailboxCryptoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MailboxCryptoError'
  }
}

/** The decrypted token bundle shape stored (encrypted) per connection. */
export const MailboxTokenBundleSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  /** ISO datetime the access token expires. */
  expiry: z.string().min(1),
  scope: z.string(),
})
export type MailboxTokenBundle = z.infer<typeof MailboxTokenBundleSchema>

const IV_BYTES = 12 // GCM standard nonce size
const KEY_BYTES = 32 // AES-256

function keyBytes(): Buffer {
  const { mailboxTokenKey } = getGmailEnv()
  const key = Buffer.from(mailboxTokenKey, 'base64')
  if (key.length !== KEY_BYTES) {
    throw new MailboxCryptoError(
      'MAILBOX_TOKEN_KEY is malformed — it must be the base64 encoding of exactly 32 random bytes (e.g. `openssl rand -base64 32`).',
    )
  }
  return key
}

/** Encrypt a token bundle to the "iv:tag:data" ciphertext string. */
export function encryptTokenBundle(bundle: MailboxTokenBundle): string {
  const key = keyBytes()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(bundle), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`
}

/** Decrypt an "iv:tag:data" ciphertext back into the token bundle. */
export function decryptTokenBundle(ciphertext: string): MailboxTokenBundle {
  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new MailboxCryptoError('Stored token ciphertext is malformed.')
  }
  const [iv, tag, data] = parts.map((part) => Buffer.from(part, 'base64'))
  if (!iv || iv.length !== IV_BYTES || !tag || tag.length === 0 || !data) {
    throw new MailboxCryptoError('Stored token ciphertext is malformed.')
  }

  let plaintext: string
  try {
    const decipher = createDecipheriv('aes-256-gcm', keyBytes(), iv)
    decipher.setAuthTag(tag)
    plaintext = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  } catch (err) {
    if (err instanceof MailboxCryptoError) throw err
    // Wrong key or tampered ciphertext — say which class of failure, nothing else.
    throw new MailboxCryptoError(
      'Could not decrypt the stored token bundle — the encryption key may have rotated.',
    )
  }

  let json: unknown
  try {
    json = JSON.parse(plaintext)
  } catch {
    throw new MailboxCryptoError('Decrypted token bundle has an unexpected shape.')
  }
  const parsed = MailboxTokenBundleSchema.safeParse(json)
  if (!parsed.success) {
    throw new MailboxCryptoError('Decrypted token bundle has an unexpected shape.')
  }
  return parsed.data
}
