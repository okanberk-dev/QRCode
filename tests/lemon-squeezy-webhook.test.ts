/**
 * Lemon Squeezy webhook primitive tests (CLAUDE.md §44).
 *
 * Coverage:
 *   - HMAC-SHA256 signature verify (valid / invalid / missing / length mismatch)
 *   - Payload SHA256 hash (deterministic + collision-resistant)
 *   - Defansif JSON parse (valid / malformed / missing fields)
 *   - Known event type guard
 *   - Config sanity check (mode/key mismatch detection)
 *
 * No DB / no network. Pure logic.
 *
 * Run: npm test
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import {
  verifyLemonSqueezySignature,
  computePayloadHash,
  parseLemonSqueezyPayload,
  isKnownLemonSqueezyEvent,
} from '../src/lib/lemon-squeezy/webhook';

import {
  getLemonSqueezyConfig,
  __resetLemonSqueezyConfigForTests,
} from '../src/lib/lemon-squeezy/config';

const SECRET = 'test_webhook_secret_buaze_2026';

function sign(body: string, secret: string = SECRET): string {
  return createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

function samplePayload(eventName = 'subscription_created'): string {
  return JSON.stringify({
    meta: {
      event_name: eventName,
      custom_data: { user_id: 'user_123' },
      test_mode: true,
    },
    data: {
      type: 'subscriptions',
      id: '42',
      attributes: {
        store_id: 1,
        customer_id: 1001,
        order_id: 7,
        variant_id: 999,
        user_email: 'owner@example.com',
        status: 'active',
        cancelled: false,
        renews_at: '2026-06-25T10:00:00.000Z',
        created_at: '2026-05-25T10:00:00.000Z',
        updated_at: '2026-05-25T10:00:00.000Z',
        card_brand: 'visa',
        card_last_four: '4242',
        trial_ends_at: null,
        billing_anchor: 25,
        status_formatted: 'Active',
        pause: null,
        test_mode: true,
        product_id: 5,
        order_item_id: 9,
        product_name: 'Buaze Pro',
        variant_name: 'Monthly',
        user_name: 'Owner',
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
// Signature verification
// ─────────────────────────────────────────────────────────────────────

describe('verifyLemonSqueezySignature', () => {
  it('accepts a valid signature', () => {
    const body = samplePayload();
    const sig = sign(body);
    const result = verifyLemonSqueezySignature(body, sig, SECRET);
    assert.equal(result.ok, true);
  });

  it('rejects when secret is empty', () => {
    const body = samplePayload();
    const sig = sign(body);
    const result = verifyLemonSqueezySignature(body, sig, '');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'missing_secret');
  });

  it('rejects when signature header is missing', () => {
    const body = samplePayload();
    const result = verifyLemonSqueezySignature(body, null, SECRET);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'missing_header');
  });

  it('rejects when signature header is empty string', () => {
    const body = samplePayload();
    const result = verifyLemonSqueezySignature(body, '', SECRET);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'missing_header');
  });

  it('rejects mismatched signature (different secret)', () => {
    const body = samplePayload();
    const sig = sign(body, 'wrong_secret');
    const result = verifyLemonSqueezySignature(body, sig, SECRET);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'mismatch');
  });

  it('rejects mismatched signature (different body)', () => {
    const original = samplePayload();
    const tampered = samplePayload('subscription_payment_success'); // attacker changes event
    const sig = sign(original);
    const result = verifyLemonSqueezySignature(tampered, sig, SECRET);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'mismatch');
  });

  it('rejects signature with wrong length (not 64 hex chars)', () => {
    const body = samplePayload();
    const result = verifyLemonSqueezySignature(body, 'abc123', SECRET);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid_format');
  });

  it('rejects signature with non-hex characters', () => {
    const body = samplePayload();
    // 64 chars but contains 'z' which is not hex — Buffer.from('hex')
    // produces a shorter buffer, so length check trips invalid_format.
    const result = verifyLemonSqueezySignature(body, 'z'.repeat(64), SECRET);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid_format');
  });
});

// ─────────────────────────────────────────────────────────────────────
// Payload hashing (idempotency dedupe key)
// ─────────────────────────────────────────────────────────────────────

describe('computePayloadHash', () => {
  it('produces deterministic SHA256 hex (64 chars)', () => {
    const body = samplePayload();
    const h1 = computePayloadHash(body);
    const h2 = computePayloadHash(body);
    assert.equal(h1, h2);
    assert.equal(h1.length, 64);
    assert.ok(/^[a-f0-9]{64}$/.test(h1), 'hash should be lowercase hex');
  });

  it('produces different hashes for different bodies', () => {
    const h1 = computePayloadHash(samplePayload('subscription_created'));
    const h2 = computePayloadHash(samplePayload('subscription_updated'));
    assert.notEqual(h1, h2);
  });

  it('is sensitive to whitespace (LS sends exact bytes)', () => {
    const a = '{"meta":{"event_name":"x"},"data":{"id":"1","type":"subscriptions"}}';
    const b = '{"meta": {"event_name": "x"}, "data": {"id": "1", "type": "subscriptions"}}';
    assert.notEqual(computePayloadHash(a), computePayloadHash(b));
  });
});

// ─────────────────────────────────────────────────────────────────────
// Defansif payload parse
// ─────────────────────────────────────────────────────────────────────

describe('parseLemonSqueezyPayload', () => {
  it('accepts a valid payload', () => {
    const result = parseLemonSqueezyPayload(samplePayload());
    assert.equal(result.ok, true);
    assert.equal(result.payload?.meta.event_name, 'subscription_created');
    assert.equal(result.payload?.data.id, '42');
  });

  it('rejects malformed JSON', () => {
    const result = parseLemonSqueezyPayload('not json {{{ broken');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid_json');
  });

  it('rejects when meta is missing', () => {
    const body = JSON.stringify({ data: { type: 'subscriptions', id: '1' } });
    const result = parseLemonSqueezyPayload(body);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'missing_meta');
  });

  it('rejects when meta.event_name is missing', () => {
    const body = JSON.stringify({
      meta: { custom_data: {} },
      data: { type: 'subscriptions', id: '1' },
    });
    const result = parseLemonSqueezyPayload(body);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'missing_event_name');
  });

  it('rejects when data is missing', () => {
    const body = JSON.stringify({ meta: { event_name: 'subscription_created' } });
    const result = parseLemonSqueezyPayload(body);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'missing_data');
  });

  it('rejects when data.id is missing', () => {
    const body = JSON.stringify({
      meta: { event_name: 'subscription_created' },
      data: { type: 'subscriptions', attributes: {} },
    });
    const result = parseLemonSqueezyPayload(body);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'missing_data');
  });

  it('rejects null body', () => {
    const result = parseLemonSqueezyPayload('null');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid_json');
  });

  it('rejects array root', () => {
    const result = parseLemonSqueezyPayload('[1,2,3]');
    assert.equal(result.ok, false);
    // Array passes `typeof obj === 'object'` but lacks `meta` field.
    assert.equal(result.reason, 'missing_meta');
  });
});

// ─────────────────────────────────────────────────────────────────────
// Known event type guard
// ─────────────────────────────────────────────────────────────────────

describe('isKnownLemonSqueezyEvent', () => {
  it('recognises canonical event names', () => {
    assert.equal(isKnownLemonSqueezyEvent('subscription_created'), true);
    assert.equal(isKnownLemonSqueezyEvent('subscription_payment_success'), true);
    assert.equal(isKnownLemonSqueezyEvent('order_refunded'), true);
    assert.equal(isKnownLemonSqueezyEvent('license_key_created'), true);
  });

  it('rejects unknown events', () => {
    assert.equal(isKnownLemonSqueezyEvent('subscription_destroyed'), false);
    assert.equal(isKnownLemonSqueezyEvent('SUBSCRIPTION_CREATED'), false);
    assert.equal(isKnownLemonSqueezyEvent(''), false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Config sanity (mode/key mismatch detection)
// ─────────────────────────────────────────────────────────────────────

describe('getLemonSqueezyConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    __resetLemonSqueezyConfigForTests();
  });

  it('reports enabled:false when API key missing', () => {
    delete process.env.LEMON_SQUEEZY_API_KEY;
    process.env.LEMON_SQUEEZY_STORE_ID = '12345';
    process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = 'secret';
    const config = getLemonSqueezyConfig();
    assert.equal(config.enabled, false);
    assert.equal(config.disabledReason, 'missing_api_key');
  });

  it('reports enabled:false when store ID missing', () => {
    process.env.LEMON_SQUEEZY_API_KEY = 'test_abc';
    delete process.env.LEMON_SQUEEZY_STORE_ID;
    process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = 'secret';
    const config = getLemonSqueezyConfig();
    assert.equal(config.enabled, false);
    assert.equal(config.disabledReason, 'missing_store_id');
  });

  it('reports enabled:false when webhook secret missing', () => {
    process.env.LEMON_SQUEEZY_API_KEY = 'test_abc';
    process.env.LEMON_SQUEEZY_STORE_ID = '12345';
    delete process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    const config = getLemonSqueezyConfig();
    assert.equal(config.enabled, false);
    assert.equal(config.disabledReason, 'missing_webhook_secret');
  });

  it('detects mode/key mismatch (test_xxx with production mode)', () => {
    process.env.LEMON_SQUEEZY_API_KEY = 'test_abc';
    process.env.LEMON_SQUEEZY_STORE_ID = '12345';
    process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = 'secret';
    process.env.LEMON_SQUEEZY_MODE = 'production';
    const config = getLemonSqueezyConfig();
    assert.equal(config.enabled, false);
    assert.equal(config.disabledReason, 'mode_key_mismatch');
  });

  it('detects mode/key mismatch (live_xxx with test mode)', () => {
    process.env.LEMON_SQUEEZY_API_KEY = 'live_abc';
    process.env.LEMON_SQUEEZY_STORE_ID = '12345';
    process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = 'secret';
    process.env.LEMON_SQUEEZY_MODE = 'test';
    const config = getLemonSqueezyConfig();
    assert.equal(config.enabled, false);
    assert.equal(config.disabledReason, 'mode_key_mismatch');
  });

  it('enables when all set and prefixes match', () => {
    process.env.LEMON_SQUEEZY_API_KEY = 'test_abc';
    process.env.LEMON_SQUEEZY_STORE_ID = '12345';
    process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = 'secret';
    process.env.LEMON_SQUEEZY_MODE = 'test';
    const config = getLemonSqueezyConfig();
    assert.equal(config.enabled, true);
    assert.equal(config.mode, 'test');
    assert.equal(config.disabledReason, undefined);
  });

  it('defaults mode to test when env unset', () => {
    process.env.LEMON_SQUEEZY_API_KEY = 'test_abc';
    process.env.LEMON_SQUEEZY_STORE_ID = '12345';
    process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = 'secret';
    delete process.env.LEMON_SQUEEZY_MODE;
    const config = getLemonSqueezyConfig();
    assert.equal(config.mode, 'test');
    assert.equal(config.enabled, true);
  });

  it('accepts legacy key without prefix (silent pass)', () => {
    process.env.LEMON_SQUEEZY_API_KEY = 'abcd1234nomprefix';
    process.env.LEMON_SQUEEZY_STORE_ID = '12345';
    process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = 'secret';
    process.env.LEMON_SQUEEZY_MODE = 'production';
    const config = getLemonSqueezyConfig();
    assert.equal(config.enabled, true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// End-to-end primitives sanity check
// ─────────────────────────────────────────────────────────────────────

describe('webhook primitives integration', () => {
  it('valid signature + parse + hash all align', () => {
    const body = samplePayload();
    const sig = sign(body);

    const verify = verifyLemonSqueezySignature(body, sig, SECRET);
    assert.equal(verify.ok, true);

    const parsed = parseLemonSqueezyPayload(body);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.payload?.meta.event_name, 'subscription_created');

    const hash = computePayloadHash(body);
    assert.equal(hash.length, 64);

    // Same body re-delivered produces same hash (idempotent dedupe key)
    const hashAgain = computePayloadHash(body);
    assert.equal(hash, hashAgain);
  });
});
