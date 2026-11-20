import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM primitive shared by the Google token helper
 * (`google-token-crypto.ts`, `ENCRYPTION_KEY`) and the billing vault
 * (`billing/vault-crypto.ts`, `BILLING_VAULT_KEY`). Each caller owns its key,
 * its blob format and its error policy; this module only seals and opens.
 *
 * Opening is strict: the key must be 32 bytes, the IV 12 bytes and the tag
 * exactly 16 bytes. `authTagLength: 16` is passed to Node as well, so a
 * truncated tag can never be accepted (a 4-byte tag would otherwise be
 * forgeable by brute force).
 */

export const GCM_IV_LENGTH = 12;
export const GCM_TAG_LENGTH = 16;
export const GCM_KEY_LENGTH = 32;

export type GcmErrorCode = 'key_length' | 'iv_length' | 'tag_length' | 'auth_failed';

/** Fixed messages only: never a key, IV, ciphertext or plaintext. */
export class GcmError extends Error {
  readonly code: GcmErrorCode;
  constructor(code: GcmErrorCode) {
    super(`aes-gcm: ${code}`);
    this.name = 'GcmError';
    this.code = code;
  }
}

export interface GcmParts {
  iv: Buffer;
  ct: Buffer;
  tag: Buffer;
}

function assertKey(key: Buffer): void {
  if (!Buffer.isBuffer(key) || key.length !== GCM_KEY_LENGTH) throw new GcmError('key_length');
}

/** Encrypts `plain` (UTF-8) under a fresh random 12-byte IV. */
export function gcmSeal(key: Buffer, plain: string, aad?: string): GcmParts {
  assertKey(key);
  if (typeof plain !== 'string') throw new TypeError('gcmSeal: plain text must be a string');
  const iv = randomBytes(GCM_IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: GCM_TAG_LENGTH });
  if (aad !== undefined) cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, ct, tag };
}

/**
 * Decrypts and authenticates. Throws `GcmError` on a wrong key length, an IV
 * that is not 12 bytes, a tag that is not 16 bytes, or any authentication
 * failure (wrong key, wrong AAD, modified IV/ciphertext/tag).
 */
export function gcmOpen(key: Buffer, parts: GcmParts, aad?: string): string {
  assertKey(key);
  if (!Buffer.isBuffer(parts.iv) || parts.iv.length !== GCM_IV_LENGTH) throw new GcmError('iv_length');
  if (!Buffer.isBuffer(parts.tag) || parts.tag.length !== GCM_TAG_LENGTH) throw new GcmError('tag_length');
  if (!Buffer.isBuffer(parts.ct)) throw new GcmError('auth_failed');
  const decipher = createDecipheriv('aes-256-gcm', key, parts.iv, { authTagLength: GCM_TAG_LENGTH });
  if (aad !== undefined) decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(parts.tag);
  try {
    return Buffer.concat([decipher.update(parts.ct), decipher.final()]).toString('utf8');
  } catch {
    throw new GcmError('auth_failed');
  }
}

const B64U_RE = /^[A-Za-z0-9_-]*$/;

/**
 * Strict base64url: only `[A-Za-z0-9_-]`, no padding, and the decoded bytes
 * must re-encode to exactly the input (rejects non-canonical trailing bits and
 * impossible lengths). Throws a fixed-message Error otherwise.
 */
export function b64uDecodeStrict(s: string): Buffer {
  if (typeof s !== 'string' || !B64U_RE.test(s)) throw new Error('b64u: invalid characters');
  const buf = Buffer.from(s, 'base64url');
  if (buf.toString('base64url') !== s) throw new Error('b64u: not canonical');
  return buf;
}

export function b64uEncode(b: Buffer): string {
  return b.toString('base64url');
}
