import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveFeedbackSubscriberCount, publishFeedbackCreated, subscribeFeedback, toLiveFeedbackRow } from '../src/lib/live-events';

const row = (restaurantId: string | null, id = 'f1') =>
  toLiveFeedbackRow({ id, name: 'Ayşe', rating: 5, platform: null, createdAt: new Date('2026-11-24T10:00:00Z'), restaurantId, hasKvkkConsent: true });

test('only the subscribed businesses receive an event', () => {
  const got: string[] = [];
  const off = subscribeFeedback(new Set(['r1', 'r2']), (r) => got.push(`${r.restaurant_id}:${r.id}`));
  publishFeedbackCreated(row('r1', 'a'));
  publishFeedbackCreated(row('r3', 'b'));
  publishFeedbackCreated(row('r2', 'c'));
  publishFeedbackCreated(row(null, 'd'));
  off();
  publishFeedbackCreated(row('r1', 'e'));
  assert.deepEqual(got, ['r1:a', 'r2:c']);
});

test('unsubscribe removes the listener', () => {
  const before = liveFeedbackSubscriberCount();
  const off = subscribeFeedback(new Set(['r1']), () => {});
  assert.equal(liveFeedbackSubscriberCount(), before + 1);
  off();
  assert.equal(liveFeedbackSubscriberCount(), before);
});

test('the live row carries no e-mail, phone, IP or comment', () => {
  const r = row('r1');
  assert.deepEqual(Object.keys(r).sort(), ['created_at', 'has_kvkk_consent', 'id', 'name', 'platform', 'rating', 'redirected', 'restaurant_id']);
  assert.equal(r.created_at, '2026-11-24T10:00:00.000Z');
});
