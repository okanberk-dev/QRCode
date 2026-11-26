/**
 * One-click opt-out for loyalty marketing mail (CLAUDE.md §61, ETK 6563):
 * a signed link per card member. HMAC over the member id with a key derived
 * from JWT_SECRET (separate label), so the link cannot be forged or used
 * for another member. Server only.
 */
import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto';
import { loyaltyPublicBaseUrl } from '@/lib/loyalty-server';

function key(): Buffer | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return Buffer.from(hkdfSync('sha256', secret, 'buaze-loyalty', 'unsubscribe-v1', 32));
}

export function loyaltyUnsubscribeSignature(memberId: string, k: Buffer | null = key()): string | null {
  if (!k) return null;
  return createHmac('sha256', k).update(`loyalty-unsub:${memberId}`).digest('base64url').slice(0, 32);
}

export function verifyLoyaltyUnsubscribe(memberId: string, signature: string, k: Buffer | null = key()): boolean {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(memberId) || !/^[A-Za-z0-9_-]{32}$/.test(signature)) return false;
  const expected = loyaltyUnsubscribeSignature(memberId, k);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function loyaltyUnsubscribeUrl(memberId: string): string | null {
  const sig = loyaltyUnsubscribeSignature(memberId);
  if (!sig) return null;
  return `${loyaltyPublicBaseUrl()}/api/public/loyalty/unsubscribe?m=${encodeURIComponent(memberId)}&s=${sig}`;
}
