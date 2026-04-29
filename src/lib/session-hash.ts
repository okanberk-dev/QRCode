import { createHash } from 'crypto';

/**
 * Section 8 — UserSession token hash (Faz 3).
 *
 * JWT raw token DB'de asla saklanmaz. Login sırasında SHA-256 hash UserSession
 * row'una yazılır; auth middleware her request'te aynı hash ile DB'yi kontrol
 * eder. Revoke = `revokedAt` set, böylece eski token'lar anında geçersizleşir.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
