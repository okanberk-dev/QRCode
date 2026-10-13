/**
 * Platform availability of the optional Business Profile reply feature.
 *
 * Only the pure decision logic is tested here; the `Settings`-table reads and
 * writes are covered by the database verification script that accompanies
 * this change (CLAUDE.md §32.2: no DB integration tests in `npm test`).
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BUSINESS_API_STATE_KEY,
  NOT_PROVISIONED_TTL_MS,
  computeReplyAvailability,
  formatApiStateStamp,
  isReplySwitchedOff,
  parseApiStateStamp,
} from '../src/lib/google-business-availability';

const NOW = new Date('2026-10-13T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('stamp format', () => {
  it('uses a dedicated key that site settings never read', () => {
    assert.equal(BUSINESS_API_STATE_KEY, 'google.business_api_state');
    assert.equal(BUSINESS_API_STATE_KEY.startsWith('site.'), false);
  });

  it('round-trips a timestamp', () => {
    const stamp = formatApiStateStamp(NOW);
    assert.equal(stamp, 'not_provisioned@2026-10-13T12:00:00.000Z');
    assert.equal(parseApiStateStamp(stamp)?.toISOString(), NOW.toISOString());
  });

  it('stores no personal data — just a state word and a time', () => {
    assert.match(formatApiStateStamp(NOW), /^not_provisioned@\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
  });

  it('parses nothing from absent or malformed values', () => {
    for (const v of [null, undefined, '', 'available', 'not_provisioned', 'not_provisioned@', 'not_provisioned@nope', 'not_provisioned@2026-13-45T99:00:00Z', '2026-10-13T12:00:00.000Z', 42 as unknown as string]) {
      assert.equal(parseApiStateStamp(v), null, String(v));
    }
  });
});

describe('isReplySwitchedOff — the operator switch', () => {
  it('is off only for the word "false" (any case, surrounding spaces)', () => {
    for (const v of ['false', 'FALSE', 'False', ' false ', '\tfalse\n']) assert.equal(isReplySwitchedOff(v), true, JSON.stringify(v));
  });

  it('every other value, including unset, leaves the feature on', () => {
    for (const v of [undefined, null, '', 'true', 'TRUE', '0', 'no', 'off', 'falsey', 'false!', '1']) {
      assert.equal(isReplySwitchedOff(v), false, JSON.stringify(v));
    }
  });
});

describe('computeReplyAvailability', () => {
  const fresh = formatApiStateStamp(new Date(NOW.getTime() - HOUR));

  it('is available with no switch and no stamp', () => {
    assert.equal(computeReplyAvailability({ envValue: undefined, stampValue: null, now: NOW }), 'available');
    assert.equal(computeReplyAvailability({ envValue: 'true', stampValue: undefined, now: NOW }), 'available');
  });

  it('the operator switch wins over everything', () => {
    assert.equal(computeReplyAvailability({ envValue: 'false', stampValue: null, now: NOW }), 'disabled');
    assert.equal(computeReplyAvailability({ envValue: 'false', stampValue: fresh, now: NOW }), 'disabled');
  });

  it('a recent stamp means not provisioned', () => {
    assert.equal(computeReplyAvailability({ envValue: undefined, stampValue: fresh, now: NOW }), 'not_provisioned');
    const justNow = formatApiStateStamp(NOW);
    assert.equal(computeReplyAvailability({ envValue: undefined, stampValue: justNow, now: NOW }), 'not_provisioned');
  });

  it('expires after three days, so the connect button returns', () => {
    assert.equal(NOT_PROVISIONED_TTL_MS, 3 * DAY);
    const almost = formatApiStateStamp(new Date(NOW.getTime() - (3 * DAY - 1)));
    assert.equal(computeReplyAvailability({ envValue: undefined, stampValue: almost, now: NOW }), 'not_provisioned');
    const exactly = formatApiStateStamp(new Date(NOW.getTime() - 3 * DAY));
    assert.equal(computeReplyAvailability({ envValue: undefined, stampValue: exactly, now: NOW }), 'available');
    const old = formatApiStateStamp(new Date(NOW.getTime() - 30 * DAY));
    assert.equal(computeReplyAvailability({ envValue: undefined, stampValue: old, now: NOW }), 'available');
  });

  it('a stamp from the future (clock skew between instances) still counts as fresh', () => {
    const future = formatApiStateStamp(new Date(NOW.getTime() + 5 * 60_000));
    assert.equal(computeReplyAvailability({ envValue: undefined, stampValue: future, now: NOW }), 'not_provisioned');
  });

  it('a malformed stamp is ignored rather than trusted', () => {
    for (const stampValue of ['garbage', 'not_provisioned@', 'not_provisioned@never']) {
      assert.equal(computeReplyAvailability({ envValue: undefined, stampValue, now: NOW }), 'available', stampValue);
    }
  });
});
