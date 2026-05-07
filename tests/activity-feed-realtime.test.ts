/**
 * Stage 16 §38.86 — Realtime activity buffer + row adapter unit tests.
 *
 * Pure logic — no React, no Supabase. The hook (useRealtimeActivity) wires
 * these helpers to React state + WebSocket; we cover the deterministic
 * behavior here so refactors stay safe.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  bufferActivityEvents,
  feedbackInsertToActivity,
  type FeedbackInsertRow,
} from '../src/lib/activity-feed-realtime';
import type { ActivityEvent } from '../src/lib/activity-feed';

function makeEvent(id: string, ts: string): ActivityEvent {
  return {
    id,
    type: 'feedback',
    timestamp: new Date(ts),
    actor: 'Test',
    action: 'left a review',
    target: 'Buaze',
    sentiment: 'neu',
  };
}

describe('bufferActivityEvents', () => {
  it('returns existing unchanged when incoming is empty', () => {
    const existing = [makeEvent('a', '2026-05-01T10:00:00Z')];
    const result = bufferActivityEvents({ existing, incoming: [] });
    assert.equal(result, existing);
  });

  it('returns existing unchanged when all incoming are duplicates', () => {
    const existing = [makeEvent('a', '2026-05-01T10:00:00Z')];
    const incoming = [makeEvent('a', '2026-05-01T10:00:00Z')];
    const result = bufferActivityEvents({ existing, incoming });
    assert.equal(result, existing);
  });

  it('prepends new events and sorts newest first', () => {
    const existing = [
      makeEvent('a', '2026-05-01T10:00:00Z'),
      makeEvent('b', '2026-05-01T09:00:00Z'),
    ];
    const incoming = [makeEvent('c', '2026-05-01T11:00:00Z')];
    const result = bufferActivityEvents({ existing, incoming });
    assert.deepEqual(
      result.map((e) => e.id),
      ['c', 'a', 'b'],
    );
  });

  it('dedupes by id (existing wins)', () => {
    const existing = [makeEvent('a', '2026-05-01T10:00:00Z')];
    const incoming = [
      { ...makeEvent('a', '2026-05-01T10:00:00Z'), actor: 'Different' },
      makeEvent('b', '2026-05-01T11:00:00Z'),
    ];
    const result = bufferActivityEvents({ existing, incoming });
    assert.equal(result.length, 2);
    const aEvent = result.find((e) => e.id === 'a');
    assert.equal(aEvent?.actor, 'Test', 'existing instance preserved');
  });

  it('caps total length at maxSize, dropping oldest', () => {
    // 50 events with strictly increasing timestamps (1 hour apart) so the
    // sort order is unambiguous and the slice cleanly drops the oldest.
    const startMs = Date.UTC(2025, 0, 1, 0, 0, 0);
    const existing = Array.from({ length: 50 }, (_, i) =>
      makeEvent(`old-${i}`, new Date(startMs + i * 3600 * 1000).toISOString()),
    );
    const incoming = [makeEvent('new', '2026-12-01T00:00:00Z')];
    const result = bufferActivityEvents({ existing, incoming, maxSize: 50 });
    assert.equal(result.length, 50);
    assert.equal(result[0].id, 'new', 'newest at top');
    const oldIds = new Set(result.map((e) => e.id));
    assert.ok(!oldIds.has('old-0'), 'oldest event dropped');
    assert.ok(oldIds.has('old-49'), 'most recent of the existing window kept');
  });

  it('handles same timestamps with stable iteration (insertion order)', () => {
    // Two events with identical timestamps; sort is stable in modern V8 so
    // newOnes-first ordering is preserved when timestamps tie.
    const existing = [makeEvent('a', '2026-05-01T10:00:00Z')];
    const incoming = [makeEvent('b', '2026-05-01T10:00:00Z')];
    const result = bufferActivityEvents({ existing, incoming });
    assert.deepEqual(
      result.map((e) => e.id),
      ['b', 'a'],
    );
  });

  it('uses default maxSize=50 when omitted', () => {
    const existing = Array.from({ length: 60 }, (_, i) =>
      makeEvent(`e-${i}`, `2026-05-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`),
    );
    // existing is already 60 items but bufferActivityEvents only caps when
    // it merges — call with empty incoming returns existing as-is. Use a
    // single new event to trigger the slice path.
    const incoming = [makeEvent('top', '2027-01-01T00:00:00Z')];
    const result = bufferActivityEvents({ existing, incoming });
    assert.equal(result.length, 50);
    assert.equal(result[0].id, 'top');
  });
});

describe('feedbackInsertToActivity', () => {
  function makeRow(overrides: Partial<FeedbackInsertRow> = {}): FeedbackInsertRow {
    return {
      id: 'feedback_xyz',
      name: 'Ayşe Demir',
      rating: 5,
      platform: 'google',
      created_at: '2026-05-01T12:34:56Z',
      restaurant_id: 'rest_1',
      has_kvkk_consent: true,
      ...overrides,
    };
  }

  it('returns null when created_at is malformed', () => {
    const result = feedbackInsertToActivity(makeRow({ created_at: 'not-a-date' }));
    assert.equal(result, null);
  });

  it('builds a feedback event with TR copy + positive sentiment for 5★', () => {
    const result = feedbackInsertToActivity(makeRow(), true);
    assert.ok(result);
    assert.equal(result!.type, 'feedback');
    assert.equal(result!.id, 'feedback:feedback_xyz');
    assert.equal(result!.actor, 'Ayşe D.');
    assert.equal(result!.action, 'yorum bıraktı');
    assert.equal(result!.sentiment, 'pos');
    assert.match(result!.target, /Google/);
    assert.equal(result!.href, '/tr/dashboard/feedbacks?id=feedback_xyz');
  });

  it('falls back to "Müşteri" when has_kvkk_consent is false (KVKK guard)', () => {
    const result = feedbackInsertToActivity(
      makeRow({ has_kvkk_consent: false }),
      true,
    );
    assert.equal(result?.actor, 'Müşteri');
  });

  it('uses EN copy when isTr=false', () => {
    const result = feedbackInsertToActivity(makeRow(), false);
    assert.equal(result?.action, 'left a review');
    assert.equal(result?.href, '/en/dashboard/feedbacks?id=feedback_xyz');
  });

  it('marks low rating (≤2) as negative sentiment', () => {
    const result = feedbackInsertToActivity(makeRow({ rating: 1 }));
    assert.equal(result?.sentiment, 'neg');
  });

  it('marks 3 stars as neutral', () => {
    const result = feedbackInsertToActivity(makeRow({ rating: 3 }));
    assert.equal(result?.sentiment, 'neu');
  });

  it('handles null platform → "Buaze" target label', () => {
    const result = feedbackInsertToActivity(makeRow({ platform: null, rating: 5 }));
    assert.match(result?.target ?? '', /Buaze/);
  });

  it('handles null name + consent given → "Müşteri" fallback (shortName)', () => {
    const result = feedbackInsertToActivity(
      makeRow({ name: null, has_kvkk_consent: true }),
      true,
    );
    assert.equal(result?.actor, 'Müşteri');
  });
});
