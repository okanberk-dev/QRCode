/**
 * Lemon Squeezy webhook signature verification + payload parsing
 * (CLAUDE.md §44.4).
 *
 * Lemon Squeezy webhook delivery:
 *   • Header: `X-Signature` (HMAC-SHA256 hex digest of raw request body)
 *   • Header: `X-Event-Name` (kolaylık için, payload `meta.event_name` ile aynı)
 *   • Signing secret: LEMON_SQUEEZY_WEBHOOK_SECRET (Settings → Webhooks)
 *
 * Idempotency: SHA256 hash of the raw payload (deterministik) →
 * `LemonSqueezyEvent.payloadHash` UNIQUE constraint ile dedupe. LS retry'lar
 * aynı body gönderir → aynı hash → P2002 catch → increment receivedCount,
 * skip processing.
 *
 * **Yapma**: `req.json()` öncesi `req.text()` çağırma — Next.js'te body
 * sadece bir kez okunabilir. Önce text al, sonra parse et.
 *
 * **Yapma**: signature verify atlayıp doğrudan handler'a geçme — şaka değil,
 * herkes /api/webhooks/lemon-squeezy'e fake event POST'layabilir
 * (subscription_payment_success → ücretsiz Pro tier mount).
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type {
  LemonSqueezyEventName,
  LemonSqueezyWebhookPayload,
} from './types';

export interface SignatureVerifyResult {
  ok: boolean;
  reason?: 'missing_header' | 'invalid_format' | 'mismatch' | 'missing_secret';
}

/**
 * HMAC-SHA256 timing-safe signature verification.
 *
 * @param rawBody Raw request body as string (NOT parsed JSON — must be
 *                exact bytes Lemon Squeezy signed).
 * @param signatureHeader Value of `X-Signature` request header (hex string).
 * @param secret Webhook signing secret from LEMON_SQUEEZY_WEBHOOK_SECRET env.
 * @returns `{ ok: true }` if signature matches, else `{ ok: false, reason }`.
 */
export function verifyLemonSqueezySignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
): SignatureVerifyResult {
  if (!secret) return { ok: false, reason: 'missing_secret' };
  if (!signatureHeader) return { ok: false, reason: 'missing_header' };

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

  // Length check before timingSafeEqual — buffers must be same length
  // or it throws. This is NOT a timing side-channel (length is public).
  if (signatureHeader.length !== expected.length) {
    return { ok: false, reason: 'invalid_format' };
  }

  let received: Buffer;
  let computed: Buffer;
  try {
    received = Buffer.from(signatureHeader, 'hex');
    computed = Buffer.from(expected, 'hex');
  } catch {
    return { ok: false, reason: 'invalid_format' };
  }

  if (received.length !== computed.length) {
    return { ok: false, reason: 'invalid_format' };
  }

  const match = timingSafeEqual(received, computed);
  return match ? { ok: true } : { ok: false, reason: 'mismatch' };
}

/**
 * SHA256 hex hash of raw request body — used as `LemonSqueezyEvent.payloadHash`
 * unique key. Lemon Squeezy retry'lar aynı body gönderdiği için aynı hash
 * üretir → P2002 ile dedupe.
 */
export function computePayloadHash(rawBody: string): string {
  return createHash('sha256').update(rawBody, 'utf8').digest('hex');
}

export interface ParseResult {
  ok: boolean;
  payload?: LemonSqueezyWebhookPayload;
  reason?: 'invalid_json' | 'missing_meta' | 'missing_event_name' | 'missing_data';
}

/**
 * Defansif JSON parse + minimal shape validation. Webhook payload'ının
 * runtime şeklini garantilemek için. Zod kullanmadık — payload zaman içinde
 * genişleyebilir (LS yeni field'lar ekleyebilir), strict schema gereksiz
 * brittle. Sadece `meta.event_name` + `data.id` + `data.type` zorunlu.
 */
export function parseLemonSqueezyPayload(rawBody: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(rawBody);
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }

  if (!raw || typeof raw !== 'object') {
    return { ok: false, reason: 'invalid_json' };
  }

  const obj = raw as Record<string, unknown>;
  const meta = obj.meta;
  const data = obj.data;

  if (!meta || typeof meta !== 'object') {
    return { ok: false, reason: 'missing_meta' };
  }

  const eventName = (meta as Record<string, unknown>).event_name;
  if (typeof eventName !== 'string') {
    return { ok: false, reason: 'missing_event_name' };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'missing_data' };
  }

  const dataObj = data as Record<string, unknown>;
  if (typeof dataObj.id !== 'string' || typeof dataObj.type !== 'string') {
    return { ok: false, reason: 'missing_data' };
  }

  // Caller'da type assertion — minimum şekil garanti edildi, kalan alanlar
  // event handler'da spesifik attribute kontrolü ile doğrulanır.
  return { ok: true, payload: raw as LemonSqueezyWebhookPayload };
}

/** Type guard — runtime narrow event name to known union. */
export function isKnownLemonSqueezyEvent(
  eventName: string,
): eventName is LemonSqueezyEventName {
  return KNOWN_EVENT_NAMES.has(eventName);
}

const KNOWN_EVENT_NAMES = new Set<string>([
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_resumed',
  'subscription_expired',
  'subscription_paused',
  'subscription_unpaused',
  'subscription_payment_success',
  'subscription_payment_failed',
  'subscription_payment_recovered',
  'subscription_payment_refunded',
  'order_created',
  'order_refunded',
  'license_key_created',
  'license_key_updated',
]);
