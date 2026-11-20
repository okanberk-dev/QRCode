import { createHash, createHmac, hkdfSync, timingSafeEqual } from 'node:crypto';
import { b64uDecodeStrict, b64uEncode, GCM_IV_LENGTH, GCM_TAG_LENGTH, gcmOpen, gcmSeal } from '@/lib/crypto/aes-gcm';
import { CUSTOMER_KEY_RE } from '@/lib/payment/paynkolay-cards';
import { Sensitive, sensitive } from './sensitive';

/**
 * Billing vault crypto (billing spec §3.5, §6.1). Fail-closed: every loader
 * throws `VaultKeyError` instead of degrading — unlike `encryptToken()`
 * (google-token-crypto.ts), which stores plaintext when its key is missing.
 *
 * Two independent keys, both 32 random bytes in base64, runtime-only:
 *  - `BILLING_VAULT_KEY` → HKDF → the AES-256-GCM seal key for PayNKolay
 *    customer keys. Rotatable: `BILLING_VAULT_KEY_PREVIOUS` opens blobs whose
 *    `kid` matches it.
 *  - `BILLING_HMAC_KEY` → HKDF → keys for every derived identifier (card
 *    handles, key / reference fingerprints, erasure pseudonyms, off-link
 *    tokens). Long-lived and NOT rotated with the seal key, so handles and
 *    fingerprints survive a vault-key rotation. `BILLING_HMAC_KEY_PREVIOUS`
 *    exists only after an HMAC-key compromise and is then kept permanently.
 * `ENCRYPTION_KEY` (Google tokens) is never read here, and no key may be used
 * both raw and as HKDF input.
 */

export type VaultKeyErrorCode = 'missing' | 'invalid' | 'wrong_key' | 'malformed' | 'tampered';

/** Fixed messages only — never key material, plaintext or blob contents. */
export class VaultKeyError extends Error {
  readonly code: VaultKeyErrorCode;
  constructor(code: VaultKeyErrorCode) {
    super(`billing vault: ${code}`);
    this.name = 'VaultKeyError';
    this.code = code;
  }
}

export interface VaultKeys {
  seal: Buffer;
  kid: string;
  previous: { seal: Buffer; kid: string } | null;
}

export interface HmacKeySet {
  handle: Buffer;
  ref: Buffer;
  ckfp: Buffer;
  card: Buffer;
  pseud: Buffer;
  offLink: Buffer;
}

export interface HmacKeys extends HmacKeySet {
  previous: HmacKeySet | null;
}

type EnvSource = Readonly<Record<string, string | undefined>>;

const VAULT_SALT = 'buaze-billing-vault-v2';
const HMAC_SALT = 'buaze-billing-hmac-v1';
const KEY_B64_RE = /^[A-Za-z0-9+/_-]{43}=?$/;

/** 32-byte base64 / base64url key, or null when malformed. */
function decodeKey(raw: string): Buffer | null {
  const value = raw.trim();
  if (!KEY_B64_RE.test(value)) return null;
  const buf = Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return buf.length === 32 ? buf : null;
}

function readKey(env: EnvSource, name: string, required: boolean): Buffer | null {
  const raw = env[name];
  if (!raw || !raw.trim()) {
    if (required) throw new VaultKeyError('missing');
    return null;
  }
  const key = decodeKey(raw);
  if (!key) throw new VaultKeyError('invalid');
  return key;
}

/** True when `key` equals `ENCRYPTION_KEY` (the Google key, used raw by AES). */
function reusesGoogleKey(env: EnvSource, key: Buffer): boolean {
  const raw = env.ENCRYPTION_KEY;
  if (!raw || !raw.trim()) return false;
  const google = Buffer.from(raw.trim(), 'base64');
  return google.length === key.length && timingSafeEqual(google, key);
}

function hkdf(ikm: Buffer, salt: string, info: string): Buffer {
  return Buffer.from(hkdfSync('sha256', ikm, Buffer.from(salt, 'utf8'), Buffer.from(info, 'utf8'), 32));
}

function vaultEntry(ikm: Buffer): { seal: Buffer; kid: string } {
  const seal = hkdf(ikm, VAULT_SALT, 'seal');
  const kid = createHash('sha256').update('kid|', 'utf8').update(seal).digest('hex').slice(0, 8);
  return { seal, kid };
}

/**
 * seal = HKDF-SHA256(ikm = b64(BILLING_VAULT_KEY), salt = "buaze-billing-vault-v2", info = "seal", 32).
 * kid = first 8 hex of sha256("kid|" + seal). Throws VaultKeyError('missing'|'invalid'); never returns null.
 */
export function loadVaultKeys(env: EnvSource = process.env): VaultKeys {
  const current = readKey(env, 'BILLING_VAULT_KEY', true) as Buffer;
  const previous = readKey(env, 'BILLING_VAULT_KEY_PREVIOUS', false);
  if (reusesGoogleKey(env, current) || (previous && reusesGoogleKey(env, previous))) {
    throw new VaultKeyError('invalid');
  }
  const entry = vaultEntry(current);
  const prev = previous ? vaultEntry(previous) : null;
  return { seal: entry.seal, kid: entry.kid, previous: prev && prev.kid !== entry.kid ? prev : null };
}

function hmacSet(ikm: Buffer): HmacKeySet {
  return {
    handle: hkdf(ikm, HMAC_SALT, 'handle'),
    ref: hkdf(ikm, HMAC_SALT, 'ref'),
    ckfp: hkdf(ikm, HMAC_SALT, 'ckfp'),
    card: hkdf(ikm, HMAC_SALT, 'card'),
    pseud: hkdf(ikm, HMAC_SALT, 'pseud'),
    offLink: hkdf(ikm, HMAC_SALT, 'off-link'),
  };
}

/**
 * HKDF-SHA256(ikm = b64(BILLING_HMAC_KEY), salt = "buaze-billing-hmac-v1",
 * info = "handle"|"ref"|"ckfp"|"card"|"pseud"|"off-link", 32).
 * Refuses a key equal to `BILLING_VAULT_KEY` or `ENCRYPTION_KEY` (separate lifecycles).
 */
export function loadHmacKeys(env: EnvSource = process.env): HmacKeys {
  const current = readKey(env, 'BILLING_HMAC_KEY', true) as Buffer;
  const previous = readKey(env, 'BILLING_HMAC_KEY_PREVIOUS', false);
  const vault = env.BILLING_VAULT_KEY ? decodeKey(env.BILLING_VAULT_KEY) : null;
  if (vault && vault.length === current.length && timingSafeEqual(vault, current)) throw new VaultKeyError('invalid');
  if (reusesGoogleKey(env, current) || (previous && reusesGoogleKey(env, previous))) {
    throw new VaultKeyError('invalid');
  }
  const set = hmacSet(current);
  const prev = previous && !previous.equals(current) ? hmacSet(previous) : null;
  return { ...set, previous: prev };
}

/** Both loaders succeed. */
export function vaultReady(env: EnvSource = process.env): boolean {
  try {
    loadVaultKeys(env);
    loadHmacKeys(env);
    return true;
  } catch {
    return false;
  }
}

// ── Customer-key sealing ───────────────────────────────────────────────────

const USER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const KID_RE = /^[0-9a-f]{8}$/;

function assertUserId(userId: string): void {
  if (typeof userId !== 'string' || !USER_ID_RE.test(userId)) throw new VaultKeyError('malformed');
}

function aadFor(kid: string, userId: string): string {
  return `cv1|${kid}|customer-key|${userId}`;
}

/** "cv1.<kid>.<iv>.<ct>.<tag>" (base64url parts), AAD `cv1|<kid>|customer-key|<userId>`. */
export function sealCustomerKey(plain: Sensitive, userId: string, keys: VaultKeys): string {
  assertUserId(userId);
  const value = plain.reveal();
  if (!CUSTOMER_KEY_RE.test(value)) throw new VaultKeyError('malformed');
  const { iv, ct, tag } = gcmSeal(keys.seal, value, aadFor(keys.kid, userId));
  return `cv1.${keys.kid}.${b64uEncode(iv)}.${b64uEncode(ct)}.${b64uEncode(tag)}`;
}

/**
 * Strict parse (5 parts, strict base64url, IV 12 bytes, tag 16 bytes), picks
 * the current or previous seal key by `kid` (else 'wrong_key'), authenticates
 * with the AAD of that kid and `userId` (else 'tampered') and validates the
 * customer-key shape. Tombstones call it with their `aadUserId`.
 */
export function openCustomerKey(blob: string, userId: string, keys: VaultKeys): Sensitive {
  assertUserId(userId);
  if (typeof blob !== 'string') throw new VaultKeyError('malformed');
  const parts = blob.split('.');
  if (parts.length !== 5 || parts[0] !== 'cv1' || !KID_RE.test(parts[1])) throw new VaultKeyError('malformed');
  let iv: Buffer;
  let ct: Buffer;
  let tag: Buffer;
  try {
    iv = b64uDecodeStrict(parts[2]);
    ct = b64uDecodeStrict(parts[3]);
    tag = b64uDecodeStrict(parts[4]);
  } catch {
    throw new VaultKeyError('malformed');
  }
  if (iv.length !== GCM_IV_LENGTH || tag.length !== GCM_TAG_LENGTH || ct.length === 0) {
    throw new VaultKeyError('malformed');
  }
  const kid = parts[1];
  const seal = kid === keys.kid ? keys.seal : keys.previous && kid === keys.previous.kid ? keys.previous.seal : null;
  if (!seal) throw new VaultKeyError('wrong_key');
  let value: string;
  try {
    value = gcmOpen(seal, { iv, ct, tag }, aadFor(kid, userId));
  } catch {
    throw new VaultKeyError('tampered');
  }
  if (!CUSTOMER_KEY_RE.test(value)) throw new VaultKeyError('malformed');
  return sensitive(value);
}

// ── Derived identifiers (HMAC key is the key, never the message) ───────────

function mac(key: Buffer, message: string): string {
  return b64uEncode(createHmac('sha256', key).update(message, 'utf8').digest());
}

function keySets(hk: HmacKeys): HmacKeySet[] {
  return hk.previous ? [hk, hk.previous] : [hk];
}

/** "ckf1_" + 32 base64url chars of HMAC(hk.ckfp, "ckf:v1|" + key). */
export function customerKeyFingerprint(plain: Sensitive, hk: HmacKeySet): string {
  return `ckf1_${mac(hk.ckfp, `ckf:v1|${plain.reveal()}`).slice(0, 32)}`;
}

/** [current, previous?] — every lookup and uniqueness pre-check uses all of them. */
export function customerKeyFingerprints(plain: Sensitive, hk: HmacKeys): string[] {
  return keySets(hk).map((set) => customerKeyFingerprint(plain, set));
}

/** Card identity (paynkolay-cards `cardIdentity()`), kept `Sensitive` until it is hashed. */
export type CardIdentity = Sensitive;

export const CARD_HANDLE_RE = /^cd_[A-Za-z0-9_-]{22}$/;

/** "cd_" + 22 base64url chars of HMAC(hk.handle, "card-handle:v2|" + userId + "|" + identity). */
export function cardHandle(userId: string, identity: CardIdentity, hk: HmacKeySet): string {
  assertUserId(userId);
  return `cd_${mac(hk.handle, `card-handle:v2|${userId}|${identity.reveal()}`).slice(0, 22)}`;
}

/** "rf1_" + 22 base64url chars of HMAC-SHA256(key = hk.ref, message = "rf:v1|" + referenceCode). */
export function referenceFingerprint(referenceCode: string, hk: HmacKeySet): string {
  if (typeof referenceCode !== 'string' || !referenceCode) throw new VaultKeyError('malformed');
  return `rf1_${mac(hk.ref, `rf:v1|${referenceCode}`).slice(0, 22)}`;
}

/** [current, previous?] */
export function referenceFingerprints(referenceCode: string, hk: HmacKeys): string[] {
  return keySets(hk).map((set) => referenceFingerprint(referenceCode, set));
}

/** "del_" + 22 base64url chars of HMAC(hk.pseud, "del:v1|" + userId) — erasure pseudonym. */
export function userPseudonym(userId: string, hk: HmacKeySet): string {
  assertUserId(userId);
  return `del_${mac(hk.pseud, `del:v1|${userId}`).slice(0, 22)}`;
}

// ── Off-only mail link token ───────────────────────────────────────────────

const OFF_LINK_PREFIX = 'ol1';

function offLinkMac(payload: string, key: Buffer): Buffer {
  return createHmac('sha256', key).update(`off:v1|${payload}`, 'utf8').digest();
}

/**
 * Token for the one-click "turn auto-renew off" mail link:
 * `ol1.<b64u(consentId|userId|expSeconds)>.<b64u(HMAC(hk.offLink, …))>`.
 * It can only ever turn auto-renew off.
 */
export function offLinkToken(consentId: string, userId: string, exp: Date, hk: HmacKeys): string {
  assertUserId(userId);
  if (typeof consentId !== 'string' || !USER_ID_RE.test(consentId)) throw new VaultKeyError('malformed');
  const expSeconds = Math.floor(exp.getTime() / 1000);
  if (!Number.isSafeInteger(expSeconds) || expSeconds <= 0) throw new VaultKeyError('malformed');
  const payload = b64uEncode(Buffer.from(`${consentId}|${userId}|${expSeconds}`, 'utf8'));
  return `${OFF_LINK_PREFIX}.${payload}.${b64uEncode(offLinkMac(payload, hk.offLink))}`;
}

/** The token's consent and user when the signature verifies (current or previous key) and it has not expired. */
export function verifyOffLinkToken(token: string, hk: HmacKeys, now: Date): { consentId: string; userId: string } | null {
  if (typeof token !== 'string' || token.length > 512) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== OFF_LINK_PREFIX) return null;
  let given: Buffer;
  let decoded: string;
  try {
    given = b64uDecodeStrict(parts[2]);
    decoded = b64uDecodeStrict(parts[1]).toString('utf8');
  } catch {
    return null;
  }
  const verified = keySets(hk).some((set) => {
    const expected = offLinkMac(parts[1], set.offLink);
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
  if (!verified) return null;
  const fields = decoded.split('|');
  if (fields.length !== 3) return null;
  const [consentId, userId, expRaw] = fields;
  if (!USER_ID_RE.test(consentId) || !USER_ID_RE.test(userId) || !/^\d{1,12}$/.test(expRaw)) return null;
  if (Number(expRaw) * 1000 <= now.getTime()) return null;
  return { consentId, userId };
}
