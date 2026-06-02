/**
 * AES-256-GCM token encryption tests (CLAUDE.md §40.12).
 *
 * Coverage:
 *  - encrypt → decrypt round-trip (ASCII, Unicode, large blob, empty string)
 *  - Backward-compat: plain text (no `v1:` prefix) → returned as-is
 *  - Graceful degrade: ENCRYPTION_KEY missing → encrypt returns plain
 *  - Decrypt fails fast on malformed blob (truncated auth tag / wrong key)
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'crypto';

import {
  encryptToken,
  decryptToken,
  isEncryptedToken,
} from '../src/lib/google-token-crypto';

const VALID_KEY = randomBytes(32).toString('base64');
const OTHER_KEY = randomBytes(32).toString('base64');

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const original: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    original[key] = process.env[key];
    if (env[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = env[key];
    }
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(env)) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  }
}

describe('isEncryptedToken', () => {
  it('returns true for v1: prefix', () => {
    assert.equal(isEncryptedToken('v1:abc:def:ghi'), true);
  });
  it('returns false for plain text', () => {
    assert.equal(isEncryptedToken('ya29.plain-google-token'), false);
  });
  it('returns false for empty string', () => {
    assert.equal(isEncryptedToken(''), false);
  });
});

describe('encryptToken / decryptToken', () => {
  it('round-trips ASCII token', () => {
    withEnv({ ENCRYPTION_KEY: VALID_KEY }, () => {
      const plain = 'ya29.a0ARrdaM-google-access-token-sample';
      const enc = encryptToken(plain);
      assert.ok(isEncryptedToken(enc), 'encrypted blob should have v1: prefix');
      assert.notEqual(enc, plain, 'encrypted blob differs from plain');
      assert.equal(decryptToken(enc), plain);
    });
  });

  it('round-trips Unicode (Turkish + emoji)', () => {
    withEnv({ ENCRYPTION_KEY: VALID_KEY }, () => {
      const plain = 'token-with-türkçe-İğÜş-and-emoji-🔐-payload';
      const enc = encryptToken(plain);
      assert.equal(decryptToken(enc), plain);
    });
  });

  it('round-trips large blob (4 KB)', () => {
    withEnv({ ENCRYPTION_KEY: VALID_KEY }, () => {
      const plain = 'x'.repeat(4096);
      const enc = encryptToken(plain);
      assert.equal(decryptToken(enc), plain);
    });
  });

  it('round-trips empty string', () => {
    withEnv({ ENCRYPTION_KEY: VALID_KEY }, () => {
      const enc = encryptToken('');
      assert.equal(decryptToken(enc), '');
    });
  });

  it('produces different ciphertext for same plain (random IV)', () => {
    withEnv({ ENCRYPTION_KEY: VALID_KEY }, () => {
      const plain = 'identical-input';
      const a = encryptToken(plain);
      const b = encryptToken(plain);
      assert.notEqual(a, b, 'each encryption should use a fresh IV');
      assert.equal(decryptToken(a), plain);
      assert.equal(decryptToken(b), plain);
    });
  });
});

describe('backward compatibility (plain text passthrough)', () => {
  it('decryptToken returns plain token without v1: prefix unchanged', () => {
    withEnv({ ENCRYPTION_KEY: VALID_KEY }, () => {
      const legacy = 'ya29.legacy-plain-token-from-pre-encryption-era';
      assert.equal(decryptToken(legacy), legacy);
    });
  });

  it('decryptToken passes plain text even when key is missing', () => {
    withEnv({ ENCRYPTION_KEY: undefined }, () => {
      const legacy = 'ya29.legacy-plain';
      assert.equal(decryptToken(legacy), legacy);
    });
  });
});

describe('ENCRYPTION_KEY missing (graceful degrade)', () => {
  it('encryptToken returns plain text when key not set', () => {
    withEnv({ ENCRYPTION_KEY: undefined }, () => {
      const plain = 'ya29.token-without-encryption-config';
      const out = encryptToken(plain);
      assert.equal(out, plain, 'encrypt no-op when key missing');
      assert.equal(isEncryptedToken(out), false);
    });
  });

  it('decryptToken throws when blob is encrypted but key missing', () => {
    let encrypted!: string;
    withEnv({ ENCRYPTION_KEY: VALID_KEY }, () => {
      encrypted = encryptToken('secret');
    });
    withEnv({ ENCRYPTION_KEY: undefined }, () => {
      assert.throws(() => decryptToken(encrypted), /ENCRYPTION_KEY/);
    });
  });
});

describe('decryptToken corruption detection', () => {
  it('throws on malformed blob (missing parts)', () => {
    withEnv({ ENCRYPTION_KEY: VALID_KEY }, () => {
      assert.throws(() => decryptToken('v1:onlyonepart'), /malformed/);
      assert.throws(() => decryptToken('v1:a:b'), /malformed/);
    });
  });

  it('throws on truncated auth tag', () => {
    withEnv({ ENCRYPTION_KEY: VALID_KEY }, () => {
      const enc = encryptToken('secret-payload');
      const parts = enc.slice(3).split(':');
      const truncated = `v1:${parts[0]}:${parts[1]}:${Buffer.from('shorttag').toString('base64')}`;
      assert.throws(() => decryptToken(truncated));
    });
  });

  it('throws when wrong key cannot verify auth tag', () => {
    let encrypted!: string;
    withEnv({ ENCRYPTION_KEY: VALID_KEY }, () => {
      encrypted = encryptToken('secret');
    });
    withEnv({ ENCRYPTION_KEY: OTHER_KEY }, () => {
      assert.throws(() => decryptToken(encrypted));
    });
  });
});
