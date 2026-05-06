/**
 * Stage 16 §38.86 — Supabase Realtime JWT mint helper unit tests.
 *
 * Pure logic: sign with HS256 → verify roundtrip → claim shape + expiry.
 * No network / Prisma / Supabase client touched.
 */

import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import * as jose from 'jose';

import { mintRealtimeToken, verifyRealtimeToken } from '../src/lib/realtime-token';

const TEST_SECRET = 'realtime-test-secret-do-not-use-in-prod-please-32+chars';

describe('mintRealtimeToken', () => {
  beforeEach(() => {
    process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  });

  after(() => {
    delete process.env.SUPABASE_JWT_SECRET;
  });

  it('throws when SUPABASE_JWT_SECRET is unset', async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    await assert.rejects(
      () => mintRealtimeToken({ userId: 'u1', restaurantIds: ['r1'] }),
      /SUPABASE_JWT_SECRET is not configured/,
    );
  });

  it('produces an HS256 JWT verifiable with the same secret', async () => {
    // Use the real wall clock so jose's exp validation accepts the token.
    // We still pin `now` to a captured value so the iat/exp assertions are
    // deterministic against the same baseline.
    const fixedNow = Date.now();
    const result = await mintRealtimeToken({
      userId: 'user_123',
      restaurantIds: ['rest_a', 'rest_b'],
      ttlSeconds: 3600,
      now: () => fixedNow,
    });

    assert.ok(result.token, 'token returned');
    assert.equal(result.expiresAt, (Math.floor(fixedNow / 1000) + 3600) * 1000);

    // Roundtrip via the helper's own verify
    const claims = await verifyRealtimeToken(result.token);
    assert.ok(claims, 'claims parsed');
    assert.equal(claims!.sub, 'user_123');
    assert.equal(claims!.user_id, 'user_123');
    assert.equal(claims!.role, 'authenticated');
    assert.equal(claims!.aud, 'authenticated');
    assert.deepEqual(claims!.restaurant_ids, ['rest_a', 'rest_b']);
    assert.equal(claims!.iat, Math.floor(fixedNow / 1000));
    assert.equal(claims!.exp, Math.floor(fixedNow / 1000) + 3600);
  });

  it('clamps ttlSeconds into [60, 3600]', async () => {
    const t1 = await mintRealtimeToken({
      userId: 'u',
      restaurantIds: [],
      ttlSeconds: 5, // below floor → 60
    });
    const t2 = await mintRealtimeToken({
      userId: 'u',
      restaurantIds: [],
      ttlSeconds: 99_999, // above ceiling → 3600
    });
    const c1 = await verifyRealtimeToken(t1.token);
    const c2 = await verifyRealtimeToken(t2.token);
    assert.ok(c1 && c2);
    assert.equal(c1!.exp - c1!.iat, 60);
    assert.equal(c2!.exp - c2!.iat, 3600);
  });

  it('uses HS256 alg and includes typ:JWT in the protected header', async () => {
    const result = await mintRealtimeToken({
      userId: 'u',
      restaurantIds: ['r'],
    });
    const decoded = jose.decodeProtectedHeader(result.token);
    assert.equal(decoded.alg, 'HS256');
    assert.equal(decoded.typ, 'JWT');
  });

  it('verifyRealtimeToken returns null on a tampered token', async () => {
    const result = await mintRealtimeToken({
      userId: 'u',
      restaurantIds: ['r'],
    });
    const tampered = result.token.slice(0, -2) + (result.token.endsWith('A') ? 'B' : 'A');
    const claims = await verifyRealtimeToken(tampered);
    assert.equal(claims, null);
  });

  it('verifyRealtimeToken returns null when audience mismatches', async () => {
    // Mint a token with the SAME secret but a different audience claim,
    // bypassing the helper. verifyRealtimeToken should reject it because
    // it requires aud === 'authenticated'.
    const secret = new TextEncoder().encode(TEST_SECRET);
    const wrongAud = await new jose.SignJWT({
      sub: 'u',
      role: 'authenticated',
      aud: 'service_role',
      user_id: 'u',
      restaurant_ids: [],
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(secret);
    const claims = await verifyRealtimeToken(wrongAud);
    assert.equal(claims, null);
  });

  it('verifyRealtimeToken returns null when secret is unset', async () => {
    const result = await mintRealtimeToken({
      userId: 'u',
      restaurantIds: [],
    });
    delete process.env.SUPABASE_JWT_SECRET;
    const claims = await verifyRealtimeToken(result.token);
    assert.equal(claims, null);
  });

  it('preserves restaurant id order and content (no sort/dedupe)', async () => {
    const ids = ['c', 'a', 'b', 'a'];
    const result = await mintRealtimeToken({
      userId: 'u',
      restaurantIds: ids,
    });
    const claims = await verifyRealtimeToken(result.token);
    assert.deepEqual(claims!.restaurant_ids, ids);
  });
});
