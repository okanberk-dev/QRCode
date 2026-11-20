/**
 * AES-256-GCM primitive (src/lib/crypto/aes-gcm.ts) and the proof that the
 * Google token helper kept its stored format after moving onto it:
 * ciphertexts written by the previous implementation still decrypt, and new
 * ones are readable by it. Keys are random per run.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { b64uDecodeStrict, b64uEncode, GcmError, gcmOpen, gcmSeal } from '../src/lib/crypto/aes-gcm';
import { decryptToken, encryptToken } from '../src/lib/google-token-crypto';

const KEY = randomBytes(32);

describe('gcmSeal / gcmOpen', () => {
  it('round-trips with and without AAD; fresh IV per seal', () => {
    const a = gcmSeal(KEY, 'ABCDEFGHJK1', 'ctx');
    const b = gcmSeal(KEY, 'ABCDEFGHJK1', 'ctx');
    assert.equal(a.iv.length, 12);
    assert.equal(a.tag.length, 16);
    assert.notDeepEqual(a.iv, b.iv);
    assert.equal(gcmOpen(KEY, a, 'ctx'), 'ABCDEFGHJK1');
    const plain = gcmSeal(KEY, 'türkçe-🔐');
    assert.equal(gcmOpen(KEY, plain), 'türkçe-🔐');
  });

  it('rejects a wrong AAD, a wrong key and any modified byte', () => {
    const sealed = gcmSeal(KEY, 'payload', 'ctx');
    const code = (fn: () => unknown) => {
      try {
        fn();
      } catch (err) {
        return err instanceof GcmError ? err.code : 'other';
      }
      return 'none';
    };
    assert.equal(code(() => gcmOpen(KEY, sealed, 'other')), 'auth_failed');
    assert.equal(code(() => gcmOpen(KEY, sealed)), 'auth_failed');
    assert.equal(code(() => gcmOpen(randomBytes(32), sealed, 'ctx')), 'auth_failed');
    for (const part of ['iv', 'ct', 'tag'] as const) {
      const copy = { iv: Buffer.from(sealed.iv), ct: Buffer.from(sealed.ct), tag: Buffer.from(sealed.tag) };
      copy[part][0] ^= 0x01;
      assert.equal(code(() => gcmOpen(KEY, copy, 'ctx')), 'auth_failed', part);
    }
  });

  it('enforces key, IV and tag lengths (no truncated-tag acceptance)', () => {
    const sealed = gcmSeal(KEY, 'payload');
    assert.throws(() => gcmSeal(randomBytes(31), 'x'), (e: unknown) => e instanceof GcmError && e.code === 'key_length');
    assert.throws(
      () => gcmOpen(KEY, { ...sealed, iv: Buffer.concat([sealed.iv, Buffer.from([0])]) }),
      (e: unknown) => e instanceof GcmError && e.code === 'iv_length',
    );
    for (const len of [4, 12]) {
      assert.throws(
        () => gcmOpen(KEY, { ...sealed, tag: sealed.tag.subarray(0, len) }),
        (e: unknown) => e instanceof GcmError && e.code === 'tag_length',
      );
    }
  });

  it('error messages never contain the plaintext', () => {
    const sealed = gcmSeal(KEY, 'SECRETPLAIN');
    try {
      gcmOpen(randomBytes(32), sealed);
      assert.fail('should throw');
    } catch (err) {
      assert.ok(!String((err as Error).message).includes('SECRETPLAIN'));
    }
  });
});

describe('strict base64url', () => {
  it('round-trips canonical input', () => {
    const buf = randomBytes(17);
    assert.deepEqual(b64uDecodeStrict(b64uEncode(buf)), buf);
    assert.equal(b64uDecodeStrict('').length, 0);
  });

  it('rejects padding, standard-alphabet characters, garbage and non-canonical tails', () => {
    for (const bad of ['QUJD=', 'ab+c', 'ab/c', 'ab c', 'ab.c', 'A', 'AB']) {
      assert.throws(() => b64uDecodeStrict(bad), Error, bad);
    }
  });
});

/** The pre-refactor Google implementation, verbatim in behaviour (reference for compatibility). */
function legacyEncrypt(key: Buffer, plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${ciphertext.toString('base64')}:${authTag.toString('base64')}`;
}

function legacyDecrypt(key: Buffer, blob: string): string {
  const parts = blob.slice(3).split(':');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(parts[0], 'base64'));
  decipher.setAuthTag(Buffer.from(parts[2], 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(parts[1], 'base64')), decipher.final()]).toString('utf8');
}

function withEncryptionKey<T>(value: string, fn: () => T): T {
  const original = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = value;
  try {
    return fn();
  } finally {
    if (original === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = original;
  }
}

describe('google-token-crypto keeps its stored format', () => {
  const googleKey = randomBytes(32);
  const samples = ['ya29.a0ARrdaM-google-access-token', '', 'türkçe-İğÜş-🔐', 'x'.repeat(4096)];

  it('existing ciphertexts (previous implementation) still decrypt', () => {
    withEncryptionKey(googleKey.toString('base64'), () => {
      for (const plain of samples) assert.equal(decryptToken(legacyEncrypt(googleKey, plain)), plain);
    });
  });

  it('new ciphertexts have the same v1 format and are readable by the previous implementation', () => {
    withEncryptionKey(googleKey.toString('base64'), () => {
      for (const plain of samples) {
        const blob = encryptToken(plain);
        assert.match(blob, /^v1:[A-Za-z0-9+/]{16}:[A-Za-z0-9+/]*=*:[A-Za-z0-9+/]{22}==$/);
        assert.equal(legacyDecrypt(googleKey, blob), plain);
      }
    });
  });
});
