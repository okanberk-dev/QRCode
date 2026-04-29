// Manuel TOTP (RFC 6238) implementasyonu — `otplib` veya başka dep eklenmedi
// (CLAUDE.md §7 minimum-dep). Node `crypto` modülü ile HMAC-SHA1 üretip 6 hane.
//
// Kullanım: 2FA setup endpoint'inde `generateSecret()` ile yeni base32 secret;
// QR kodu için `buildOtpauthUrl(...)`. Verify endpoint'inde `verifyToken(secret, code)`.
//
// Time step ±1 tolerans: kullanıcı kod expire ederken yetiştiremezse hala geçer.

import { createHmac, randomBytes } from 'crypto';

// RFC 4648 Base32 alphabet (no padding, uppercase). otpauth:// URL'leri bunu zorunlu kılar.
const B32_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHA[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHA[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string): Buffer {
  const cleaned = str.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const idx = B32_ALPHA.indexOf(cleaned[i]);
    if (idx < 0) throw new Error('invalid_base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** 20 byte (160 bit) secret — RFC 6238 önerilen minimum. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

/**
 * RFC 6238 TOTP — 30sn step, 6 hane, HMAC-SHA1.
 * `step` parametresi explicit verilirse o time-step için kod üretir (verify
 * tarafında ±1 window check'i için). Default: now.
 */
export function generateToken(secret: string, step?: number): string {
  const time = step ?? Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(time), 0);
  const key = base32Decode(secret);
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

/**
 * Verify with ±1 step tolerance (geliş gecikmesi + saat kayması için).
 * Constant-time comparison.
 */
export function verifyToken(secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const now = Math.floor(Date.now() / 1000 / 30);
  for (const offset of [-1, 0, 1]) {
    const expected = generateToken(secret, now + offset);
    if (constantTimeEq(expected, token)) return true;
  }
  return false;
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * otpauth:// URL — Google Authenticator / 1Password QR scan'i için.
 * Issuer ve label URL-encoded.
 */
export function buildOtpauthUrl(opts: {
  secret: string;
  account: string; // genellikle email
  issuer?: string; // default 'Buaze'
}): string {
  const issuer = opts.issuer ?? 'Buaze';
  const label = encodeURIComponent(`${issuer}:${opts.account}`);
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** XXXX-XXXX backup codes — 8 adet, hex 8 hane gruplu. */
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}
