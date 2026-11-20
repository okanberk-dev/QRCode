/**
 * Billing vault crypto (src/lib/billing/vault-crypto.ts, billing spec §15.2).
 * All keys are generated at runtime; nothing here is a real secret.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { sensitive } from '../src/lib/billing/sensitive';
import {
  CARD_HANDLE_RE,
  cardHandle,
  customerKeyFingerprint,
  customerKeyFingerprints,
  loadHmacKeys,
  loadVaultKeys,
  offLinkToken,
  openCustomerKey,
  referenceFingerprint,
  referenceFingerprints,
  sealCustomerKey,
  userPseudonym,
  vaultReady,
  verifyOffLinkToken,
  VaultKeyError,
} from '../src/lib/billing/vault-crypto';
import { randomTestKey } from './fixtures/paynkolay-fakes';

const VAULT = randomTestKey();
const VAULT_2 = randomTestKey();
const HMAC = randomTestKey();
const HMAC_2 = randomTestKey();
const env = { BILLING_VAULT_KEY: VAULT, BILLING_HMAC_KEY: HMAC };
const keys = loadVaultKeys(env);
const hk = loadHmacKeys(env);
const CK = sensitive('ABCDEFGHJK1');
const USER = 'cluser0000000000000000001';
const OTHER_USER = 'cluser0000000000000000002';
const DB_CHECK = /^cv1\.[0-9a-f]{8}\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{22}$/;

function vaultCode(fn: () => unknown): string {
  try {
    fn();
  } catch (err) {
    return err instanceof VaultKeyError ? err.code : `other:${(err as Error).name}`;
  }
  return 'none';
}

function b64u(buf: Buffer): string {
  return buf.toString('base64url');
}

describe('seal / open customer keys', () => {
  it('1. round-trips and the blob matches the DB CHECK', () => {
    const blob = sealCustomerKey(CK, USER, keys);
    assert.match(blob, DB_CHECK);
    assert.equal(openCustomerKey(blob, USER, keys).reveal(), 'ABCDEFGHJK1');
    assert.equal(blob.split('.')[1], keys.kid);
  });

  it('2. never contains the plaintext; two seals differ (random IV)', () => {
    const a = sealCustomerKey(CK, USER, keys);
    const b = sealCustomerKey(CK, USER, keys);
    assert.ok(!a.includes('ABCDEFGHJK1'));
    assert.ok(!Buffer.from(a.split('.')[3], 'base64url').toString('latin1').includes('ABCDEFGHJK1'));
    assert.notEqual(a, b);
  });

  it('3. AAD binds the user id and the kid', () => {
    const blob = sealCustomerKey(CK, USER, keys);
    assert.equal(vaultCode(() => openCustomerKey(blob, OTHER_USER, keys)), 'tampered');
    const parts = blob.split('.');
    const otherKid = parts[1] === '00000000' ? '00000001' : '00000000';
    assert.ok(['wrong_key', 'tampered'].includes(vaultCode(() => openCustomerKey([parts[0], otherKid, ...parts.slice(2)].join('.'), USER, keys))));
    // Swapping in the previous key's kid authenticates against a different AAD → tampered.
    const rotated = loadVaultKeys({ BILLING_VAULT_KEY: VAULT_2, BILLING_VAULT_KEY_PREVIOUS: VAULT });
    const relabelled = [parts[0], rotated.kid, ...parts.slice(2)].join('.');
    const both = { ...rotated, seal: keys.seal };
    assert.equal(vaultCode(() => openCustomerKey(relabelled, USER, both)), 'tampered');
  });

  it('4. modified bytes → tampered; truncated tags, bad base64url, padding, 13-byte IV → malformed', () => {
    const blob = sealCustomerKey(CK, USER, keys);
    const parts = blob.split('.');
    for (const index of [2, 3, 4]) {
      const raw = Buffer.from(parts[index], 'base64url');
      raw[0] ^= 0x01;
      const changed = [...parts];
      changed[index] = b64u(raw);
      assert.equal(vaultCode(() => openCustomerKey(changed.join('.'), USER, keys)), 'tampered', `part ${index}`);
    }
    const tag = Buffer.from(parts[4], 'base64url');
    for (const len of [4, 12]) {
      const changed = [...parts];
      changed[4] = b64u(tag.subarray(0, len));
      assert.equal(vaultCode(() => openCustomerKey(changed.join('.'), USER, keys)), 'malformed', `tag ${len}`);
    }
    const withPadding = [...parts];
    withPadding[3] = `${parts[3]}=`;
    assert.equal(vaultCode(() => openCustomerKey(withPadding.join('.'), USER, keys)), 'malformed');
    const badChars = [...parts];
    badChars[2] = `${parts[2].slice(0, -1)}+`;
    assert.equal(vaultCode(() => openCustomerKey(badChars.join('.'), USER, keys)), 'malformed');
    const longIv = [...parts];
    longIv[2] = b64u(Buffer.concat([Buffer.from(parts[2], 'base64url'), Buffer.from([7])]));
    assert.equal(vaultCode(() => openCustomerKey(longIv.join('.'), USER, keys)), 'malformed');
    assert.equal(vaultCode(() => openCustomerKey('ABCDEFGHJK1', USER, keys)), 'malformed');
    assert.equal(vaultCode(() => openCustomerKey(`${blob}.x`, USER, keys)), 'malformed');
  });

  it('5. BILLING_VAULT_KEY_PREVIOUS opens the old kid; neither key matching → wrong_key', () => {
    const blob = sealCustomerKey(CK, USER, keys);
    const rotated = loadVaultKeys({ BILLING_VAULT_KEY: VAULT_2, BILLING_VAULT_KEY_PREVIOUS: VAULT });
    assert.notEqual(rotated.kid, keys.kid);
    assert.equal(rotated.previous?.kid, keys.kid);
    assert.equal(openCustomerKey(blob, USER, rotated).reveal(), 'ABCDEFGHJK1');
    const resealed = sealCustomerKey(openCustomerKey(blob, USER, rotated), USER, rotated);
    assert.equal(resealed.split('.')[1], rotated.kid);
    const unrelated = loadVaultKeys({ BILLING_VAULT_KEY: VAULT_2 });
    assert.equal(vaultCode(() => openCustomerKey(blob, USER, unrelated)), 'wrong_key');
  });

  it('6. a missing or invalid BILLING_VAULT_KEY throws; never plaintext; ENCRYPTION_KEY alone is not enough', () => {
    assert.equal(vaultCode(() => loadVaultKeys({})), 'missing');
    assert.equal(vaultCode(() => loadVaultKeys({ BILLING_VAULT_KEY: '   ' })), 'missing');
    assert.equal(vaultCode(() => loadVaultKeys({ BILLING_VAULT_KEY: 'c2hvcnQ=' })), 'invalid');
    assert.equal(vaultCode(() => loadVaultKeys({ BILLING_VAULT_KEY: 'not base64 at all, definitely not 32 bytes!!' })), 'invalid');
    assert.equal(vaultCode(() => loadHmacKeys({ BILLING_VAULT_KEY: VAULT })), 'missing');
    const google = randomTestKey();
    assert.equal(vaultReady({ ENCRYPTION_KEY: google }), false);
    assert.equal(vaultReady({ ENCRYPTION_KEY: google, BILLING_VAULT_KEY: VAULT }), false);
    assert.equal(vaultReady({ BILLING_VAULT_KEY: VAULT, BILLING_HMAC_KEY: HMAC }), true);
    // No key reuse: the Google key cannot double as a billing key, and the two billing keys must differ.
    assert.equal(vaultCode(() => loadVaultKeys({ BILLING_VAULT_KEY: google, ENCRYPTION_KEY: google })), 'invalid');
    assert.equal(vaultCode(() => loadHmacKeys({ BILLING_HMAC_KEY: VAULT, BILLING_VAULT_KEY: VAULT })), 'invalid');
    // A bad customer key is refused instead of being sealed.
    assert.equal(vaultCode(() => sealCustomerKey(sensitive('abcdefghjk1'), USER, keys)), 'malformed');
    assert.equal(vaultCode(() => sealCustomerKey(sensitive('ABCDEFGHJK12'), USER, keys)), 'malformed');
  });
});

describe('derived identifiers', () => {
  it('7. cardHandle: format, determinism, per user/identity, no identity window, HMAC-key bound, vault-key independent', () => {
    const identity = sensitive('Buaze-7K2Q9X|5454|082028|998877');
    const h = cardHandle(USER, identity, hk);
    assert.match(h, CARD_HANDLE_RE);
    assert.equal(h.length, 25);
    assert.equal(cardHandle(USER, identity, hk), h);
    assert.notEqual(cardHandle(OTHER_USER, identity, hk), h);
    assert.notEqual(cardHandle(USER, sensitive('Buaze-7K2Q9X|5454|082028|998878'), hk), h);
    const raw = identity.reveal();
    for (let i = 0; i + 4 <= raw.length; i++) assert.ok(!h.slice(3).includes(raw.slice(i, i + 4)), raw.slice(i, i + 4));
    assert.notEqual(cardHandle(USER, identity, loadHmacKeys({ BILLING_HMAC_KEY: HMAC_2 })), h);
    const otherVault = loadHmacKeys({ BILLING_HMAC_KEY: HMAC, BILLING_VAULT_KEY: VAULT_2 });
    assert.equal(cardHandle(USER, identity, otherVault), h);
  });

  it('8. referenceFingerprint: rf1_, deterministic, opaque, keyed (not HMAC(ref, ref)), previous key adds a value', () => {
    const ref = 'R1234567890ABCDEF';
    const fp = referenceFingerprint(ref, hk);
    assert.match(fp, /^rf1_[A-Za-z0-9_-]{22}$/);
    assert.equal(referenceFingerprint(ref, hk), fp);
    assert.ok(!fp.includes(ref));
    const selfKeyed = createHmac('sha256', ref).update(ref).digest('base64url').slice(0, 22);
    assert.notEqual(fp.slice(4), selfKeyed);
    const selfKeyedPrefixed = createHmac('sha256', ref).update(`rf:v1|${ref}`).digest('base64url').slice(0, 22);
    assert.notEqual(fp.slice(4), selfKeyedPrefixed);
    const other = loadHmacKeys({ BILLING_HMAC_KEY: HMAC_2 });
    assert.notEqual(referenceFingerprint(ref, other), fp);
    assert.deepEqual(referenceFingerprints(ref, hk), [fp]);
    const withPrevious = loadHmacKeys({ BILLING_HMAC_KEY: HMAC_2, BILLING_HMAC_KEY_PREVIOUS: HMAC });
    const both = referenceFingerprints(ref, withPrevious);
    assert.equal(both.length, 2);
    assert.equal(both[1], fp);
    assert.equal(both[0], referenceFingerprint(ref, other));
  });

  it('9. customerKeyFingerprint and userPseudonym: deterministic, key-dependent, prefixed', () => {
    const fp = customerKeyFingerprint(CK, hk);
    assert.match(fp, /^ckf1_[A-Za-z0-9_-]{32}$/);
    assert.equal(customerKeyFingerprint(sensitive('ABCDEFGHJK1'), hk), fp);
    assert.notEqual(customerKeyFingerprint(sensitive('ABCDEFGHJK2'), hk), fp);
    const other = loadHmacKeys({ BILLING_HMAC_KEY: HMAC_2 });
    assert.notEqual(customerKeyFingerprint(CK, other), fp);
    assert.equal(customerKeyFingerprints(CK, loadHmacKeys({ BILLING_HMAC_KEY: HMAC_2, BILLING_HMAC_KEY_PREVIOUS: HMAC }))[1], fp);
    const p = userPseudonym(USER, hk);
    assert.match(p, /^del_[A-Za-z0-9_-]{22}$/);
    assert.equal(userPseudonym(USER, hk), p);
    assert.notEqual(userPseudonym(OTHER_USER, hk), p);
    assert.notEqual(userPseudonym(USER, other), p);
    assert.ok(!p.includes(USER));
  });

  it('10. off-link token: valid for 30 days, then invalid; bound to consent and user; unforgeable', () => {
    const now = new Date('2026-12-01T10:00:00Z');
    const exp = new Date(now.getTime() + 30 * 24 * 3600_000);
    const token = offLinkToken('clconsent00000000000001', USER, exp, hk);
    assert.deepEqual(verifyOffLinkToken(token, hk, now), { consentId: 'clconsent00000000000001', userId: USER });
    assert.ok(verifyOffLinkToken(token, hk, new Date(exp.getTime() - 1000)));
    assert.equal(verifyOffLinkToken(token, hk, new Date(exp.getTime() + 1000)), null);
    const [prefix, payload, sig] = token.split('.');
    const forgedPayload = Buffer.from(`clconsent00000000000002|${USER}|${Math.floor(exp.getTime() / 1000)}`).toString('base64url');
    assert.equal(verifyOffLinkToken(`${prefix}.${forgedPayload}.${sig}`, hk, now), null);
    const otherUserPayload = Buffer.from(`clconsent00000000000001|${OTHER_USER}|${Math.floor(exp.getTime() / 1000)}`).toString('base64url');
    assert.equal(verifyOffLinkToken(`${prefix}.${otherUserPayload}.${sig}`, hk, now), null);
    assert.equal(verifyOffLinkToken(token, loadHmacKeys({ BILLING_HMAC_KEY: HMAC_2 }), now), null);
    const guessed = createHmac('sha256', 'guess').update(`off:v1|${payload}`).digest('base64url');
    assert.equal(verifyOffLinkToken(`${prefix}.${payload}.${guessed}`, hk, now), null);
    assert.equal(verifyOffLinkToken('garbage', hk, now), null);
    // Still valid after an HMAC-key compromise rotation (previous key kept).
    assert.ok(verifyOffLinkToken(token, loadHmacKeys({ BILLING_HMAC_KEY: HMAC_2, BILLING_HMAC_KEY_PREVIOUS: HMAC }), now));
  });
});
