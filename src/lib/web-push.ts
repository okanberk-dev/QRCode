/**
 * Web Push without a library (CLAUDE.md §61): VAPID (RFC 8292) + message
 * encryption "aes128gcm" (RFC 8291 / RFC 8188), on node:crypto only.
 * `tests/web-push.test.ts` checks the encryption against the RFC 8291
 * example byte for byte.
 *
 * Keys: `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` (base64url, P-256) when
 * set; otherwise a key pair derived from JWT_SECRET with HKDF (separate
 * label, so it reveals nothing about the JWT key). Rotating JWT_SECRET
 * without VAPID env therefore invalidates existing subscriptions; the card
 * page simply offers "turn on" again.
 *
 * SSRF guard: the server only POSTs to the known browser push services
 * (`isAllowedPushEndpoint`). Server only.
 */
import { createECDH, createHmac, createCipheriv, createPrivateKey, hkdfSync, randomBytes, sign as cryptoSign } from 'node:crypto';

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushResult = 'sent' | 'gone' | 'failed';

const b64url = (buf: Buffer | Uint8Array) => Buffer.from(buf).toString('base64url');
const fromB64url = (s: string) => Buffer.from(s, 'base64url');

// ─── endpoint allowlist ───────────────────────────────────────────────────

/** Hosts of the push services browsers use (Chrome / Android, Firefox, Edge, Safari / iOS). */
const PUSH_HOST_SUFFIXES = ['.googleapis.com', '.push.services.mozilla.com', '.notify.windows.com', '.push.apple.com'];
const PUSH_HOSTS = new Set(['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com']);

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.port || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (endpoint.length > 1000) return false;
  return PUSH_HOSTS.has(host) || PUSH_HOST_SUFFIXES.some((s) => host.endsWith(s) && host.length > s.length);
}

/** Browser keys: p256dh is an uncompressed P-256 point (65 bytes), auth 16 bytes. */
export function validPushKeys(p256dh: string, auth: string): boolean {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(p256dh) || !/^[A-Za-z0-9_-]+={0,2}$/.test(auth)) return false;
  const key = fromB64url(p256dh);
  return key.length === 65 && key[0] === 0x04 && fromB64url(auth).length === 16;
}

// ─── VAPID keys ───────────────────────────────────────────────────────────

export interface VapidKeys {
  publicKey: Buffer; // 65-byte uncompressed point
  privateKey: Buffer; // 32-byte scalar
}

let cachedKeys: VapidKeys | null | undefined;

export function vapidKeysFrom(env: { VAPID_PUBLIC_KEY?: string; VAPID_PRIVATE_KEY?: string; JWT_SECRET?: string }): VapidKeys | null {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    try {
      const privateKey = fromB64url(env.VAPID_PRIVATE_KEY.trim());
      const ecdh = createECDH('prime256v1');
      ecdh.setPrivateKey(privateKey);
      const publicKey = ecdh.getPublicKey();
      if (b64url(publicKey) !== env.VAPID_PUBLIC_KEY.trim().replace(/=+$/, '')) return null;
      return { publicKey, privateKey };
    } catch {
      return null;
    }
  }
  const secret = env.JWT_SECRET;
  if (!secret) return null;
  for (let i = 0; i < 8; i++) {
    const privateKey = Buffer.from(hkdfSync('sha256', secret, 'buaze-web-push', `vapid-p256-v1-${i}`, 32));
    try {
      const ecdh = createECDH('prime256v1');
      ecdh.setPrivateKey(privateKey);
      return { publicKey: ecdh.getPublicKey(), privateKey };
    } catch {
      /* scalar outside the curve order (p ≈ 2^-32): next label */
    }
  }
  return null;
}

export function vapidKeys(): VapidKeys | null {
  if (cachedKeys === undefined) {
    cachedKeys = vapidKeysFrom({
      VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
      JWT_SECRET: process.env.JWT_SECRET,
    });
  }
  return cachedKeys;
}

/** Public key for `pushManager.subscribe({ applicationServerKey })`, or null when push is off. */
export function vapidPublicKey(): string | null {
  const keys = vapidKeys();
  return keys ? b64url(keys.publicKey) : null;
}

function privateKeyObject(keys: VapidKeys) {
  return createPrivateKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      d: b64url(keys.privateKey),
      x: b64url(keys.publicKey.subarray(1, 33)),
      y: b64url(keys.publicKey.subarray(33, 65)),
    },
    format: 'jwk',
  });
}

/** `Authorization: vapid t=<JWT>, k=<public key>` for one push service origin (RFC 8292). */
export function vapidAuthorization(endpoint: string, keys: VapidKeys, subject: string, now = Date.now()): string {
  const header = b64url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(
    Buffer.from(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })),
  );
  const signature = cryptoSign('sha256', Buffer.from(`${header}.${claims}`), {
    key: privateKeyObject(keys),
    dsaEncoding: 'ieee-p1363',
  });
  return `vapid t=${header}.${claims}.${b64url(signature)}, k=${b64url(keys.publicKey)}`;
}

// ─── message encryption (RFC 8291) ────────────────────────────────────────

const hmac = (key: Buffer, data: Buffer) => createHmac('sha256', key).update(data).digest();

/**
 * Encrypts one push message (single record, record size 4096). `salt` and
 * `serverPrivateKey` are only passed by the tests; normally both are random.
 */
export function encryptPushPayload(
  plaintext: Buffer,
  p256dh: string,
  auth: string,
  opts: { salt?: Buffer; serverPrivateKey?: Buffer } = {},
): Buffer {
  const uaPublic = fromB64url(p256dh);
  const authSecret = fromB64url(auth);
  const salt = opts.salt ?? randomBytes(16);
  const ecdh = createECDH('prime256v1');
  if (opts.serverPrivateKey) ecdh.setPrivateKey(opts.serverPrivateKey);
  else ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);

  const prkKey = hmac(authSecret, shared);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = hmac(prkKey, Buffer.concat([keyInfo, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);

  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  // Last (and only) record: data followed by the 0x02 delimiter, no padding.
  const ciphertext = Buffer.concat([cipher.update(Buffer.concat([plaintext, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, ciphertext]);
}

// ─── send ─────────────────────────────────────────────────────────────────

export interface PushMessage {
  title: string;
  body: string;
  /** Same-origin path the notification opens. */
  url: string;
  icon?: string;
  /** Replaces an earlier notification with the same tag. */
  tag?: string;
}

/**
 * Sends one message. 404 / 410 → `gone` (the caller deletes the
 * subscription); any other failure → `failed` (kept, tried again next time).
 */
export async function sendWebPush(
  sub: PushSubscriptionKeys,
  message: PushMessage,
  opts: { ttlSeconds?: number; subject?: string; fetchImpl?: typeof fetch } = {},
): Promise<PushResult> {
  const keys = vapidKeys();
  if (!keys || !isAllowedPushEndpoint(sub.endpoint) || !validPushKeys(sub.p256dh, sub.auth)) return 'failed';
  const body = encryptPushPayload(Buffer.from(JSON.stringify(message)), sub.p256dh, sub.auth);
  try {
    const res = await (opts.fetchImpl ?? fetch)(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: vapidAuthorization(sub.endpoint, keys, opts.subject ?? 'mailto:support@buaze.com'),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: String(opts.ttlSeconds ?? 24 * 3600),
        Urgency: 'normal',
      },
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404 || res.status === 410) return 'gone';
    return res.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}
