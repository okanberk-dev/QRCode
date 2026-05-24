import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import * as Sentry from '@sentry/nextjs';

/**
 * AES-256-GCM at-rest encryption for Google OAuth tokens (CLAUDE.md §40.12).
 *
 * **Format**: `v1:${ivBase64}:${ciphertextBase64}:${authTagBase64}`
 *
 * **Backward compat (CRITICAL — lazy migration paterni)**:
 * - `decryptToken` `v1:` prefix yoksa → plain text döner (mevcut row'lar etkilenmez)
 * - `ENCRYPTION_KEY` env yoksa → encrypt/decrypt plain text döner + Sentry warn
 *   (graceful degrade; feature çalışır, sadece at-rest encryption devre dışı)
 * - Mevcut Plain row'lar her refresh'te otomatik encrypted format'a geçer
 *   (in-place lazy migration, schema değişikliği gerekmez)
 *
 * **`ENCRYPTION_KEY` formatı**: 32-byte base64-encoded (256-bit AES key).
 * Üretim: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
 */

const VERSION_PREFIX = 'v1:';
const IV_LENGTH = 12; // GCM standart
const AUTH_TAG_LENGTH = 16;

let warnedMissingKey = false;

function loadKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || !raw.trim()) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      Sentry.captureMessage(
        'ENCRYPTION_KEY env var not set; Google tokens stored as plain text (graceful degrade).',
        { level: 'warning', tags: { integration: 'google-oauth', reason: 'encryption-key-missing' } },
      );
    }
    return null;
  }
  try {
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
      Sentry.captureMessage(
        `ENCRYPTION_KEY length invalid: expected 32 bytes (base64 of 256-bit key), got ${key.length} bytes.`,
        { level: 'error', tags: { integration: 'google-oauth', reason: 'encryption-key-invalid' } },
      );
      return null;
    }
    return key;
  } catch {
    Sentry.captureMessage(
      'ENCRYPTION_KEY base64 decode failed; falling back to plain text.',
      { level: 'error', tags: { integration: 'google-oauth', reason: 'encryption-key-malformed' } },
    );
    return null;
  }
}

export function isEncryptedToken(blob: string): boolean {
  return typeof blob === 'string' && blob.startsWith(VERSION_PREFIX);
}

export function encryptToken(plain: string): string {
  if (typeof plain !== 'string') {
    throw new TypeError('encryptToken: plain text must be a string');
  }
  const key = loadKey();
  if (!key) {
    // graceful degrade — key yoksa plain depola, sonraki key set'inde
    // okuma path'i plain'i kabul eder, yeni write encrypted yapar
    return plain;
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${VERSION_PREFIX}${iv.toString('base64')}:${ciphertext.toString('base64')}:${authTag.toString('base64')}`;
}

export function decryptToken(blob: string): string {
  if (typeof blob !== 'string') {
    throw new TypeError('decryptToken: blob must be a string');
  }
  // Backward compat: legacy plain text row'lar (no version prefix)
  if (!isEncryptedToken(blob)) {
    return blob;
  }
  const key = loadKey();
  if (!key) {
    // Encrypted blob var ama key yok — bu DB inconsistency, hata fırlat
    const err = new Error('decryptToken: blob is encrypted but ENCRYPTION_KEY is not set');
    Sentry.captureException(err, {
      tags: { integration: 'google-oauth', reason: 'decrypt-key-missing' },
    });
    throw err;
  }
  const parts = blob.slice(VERSION_PREFIX.length).split(':');
  if (parts.length !== 3) {
    const err = new Error(`decryptToken: malformed blob (expected 3 parts after prefix, got ${parts.length})`);
    Sentry.captureException(err, {
      tags: { integration: 'google-oauth', reason: 'decrypt-malformed' },
    });
    throw err;
  }
  try {
    const iv = Buffer.from(parts[0], 'base64');
    const ciphertext = Buffer.from(parts[1], 'base64');
    const authTag = Buffer.from(parts[2], 'base64');
    if (iv.length !== IV_LENGTH) {
      throw new Error(`invalid iv length: ${iv.length}`);
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`invalid auth tag length: ${authTag.length}`);
    }
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plain.toString('utf8');
  } catch (err) {
    // Auth tag mismatch (wrong key) veya truncated blob
    Sentry.captureException(err, {
      tags: { integration: 'google-oauth', reason: 'decrypt-failed' },
    });
    throw err;
  }
}
