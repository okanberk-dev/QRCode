/**
 * Unsubscribe token verifier tests. The campaign mail sender is gone, but the
 * links in already-delivered mails must keep verifying (KVKK / ETK). HMAC-SHA256
 * + constant-time compare → tampering resistance is the critical property.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  verifyUnsubscribeToken,
} from '../src/lib/customer-unsubscribe-token';

// Internal helper not exported; we re-implement the same logic here for round-trip.
import crypto from 'node:crypto';
function buildToken(campaignId: string, contactKey: string): string {
  const secret = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';
  const payload = `${campaignId}:${contactKey}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

describe('verifyUnsubscribeToken', () => {
  it('round-trips campaignId + contactKey', () => {
    const token = buildToken('camp123', 'user@example.com');
    const decoded = verifyUnsubscribeToken(token);
    assert.ok(decoded);
    assert.equal(decoded?.campaignId, 'camp123');
    assert.equal(decoded?.contactKey, 'user@example.com');
  });

  it('handles phone contactKey (with + prefix)', () => {
    const token = buildToken('camp456', '+905551234567');
    const decoded = verifyUnsubscribeToken(token);
    assert.equal(decoded?.contactKey, '+905551234567');
  });

  it('returns null on tampered signature', () => {
    const token = buildToken('camp1', 'a@b.com');
    // Flip a byte in the base64url payload.
    const tampered = token.slice(0, -3) + 'XXX';
    const decoded = verifyUnsubscribeToken(tampered);
    assert.equal(decoded, null);
  });

  it('returns null on completely invalid base64url', () => {
    const decoded = verifyUnsubscribeToken('not-a-valid-token!!!');
    assert.equal(decoded, null);
  });

  it('returns null on empty string', () => {
    const decoded = verifyUnsubscribeToken('');
    assert.equal(decoded, null);
  });

  it('handles contactKey with colons (edge case — last colon is sig delimiter)', () => {
    // Phone format `+90:555:1234` is unusual but contact_key can theoretically
    // contain colons. Helper splits on LAST colon (signature delimiter), so
    // payload retains its internal colons. Verify round-trip.
    const token = buildToken('camp1', 'a:b:c@x.com');
    const decoded = verifyUnsubscribeToken(token);
    assert.equal(decoded?.campaignId, 'camp1');
    assert.equal(decoded?.contactKey, 'a:b:c@x.com');
  });
});
