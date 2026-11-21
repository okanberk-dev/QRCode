import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapHomeFeedbackStats,
  type HomeFeedbackStatsRow,
} from '../src/app/[locale]/dashboard/_lib/home-feedback-stats';

// The dashboard home reads several feedback counts in one raw statement.
// These tests pin which column feeds which number on the page.

test('maps every column of the raw stats row to its page value', () => {
  const oldest = new Date('2026-08-31T12:48:22.646Z');
  const checkedAt = new Date('2026-11-20T04:12:00.000Z');
  const row: HomeFeedbackStatsRow = {
    low_rated_in_scope: BigInt(11),
    low_rated_replied_in_scope: BigInt(7),
    unreplied_count: BigInt(23),
    oldest_unreplied_at: oldest,
    new_customers: BigInt(5),
    churned_customers: BigInt(3),
    activation_qr_count: BigInt(2),
    google_failing_check_at: checkedAt,
  };
  assert.deepEqual(mapHomeFeedbackStats(row), {
    lowRatedInScope: 11,
    lowRatedRepliedInScope: 7,
    unrepliedCount: 23,
    oldestUnrepliedAt: oldest,
    newCustomers: 5,
    churnedCustomers: 3,
    activationQrCount: 2,
    googleFailingCheckAt: checkedAt,
  });
});

test('BigInt counts become plain numbers (same type the Prisma counts returned)', () => {
  const stats = mapHomeFeedbackStats({
    low_rated_in_scope: BigInt(4),
    low_rated_replied_in_scope: BigInt(0),
    unreplied_count: BigInt(4),
    oldest_unreplied_at: null,
    new_customers: BigInt(0),
    churned_customers: BigInt(0),
    activation_qr_count: BigInt(0),
    google_failing_check_at: null,
  });
  for (const value of [
    stats.lowRatedInScope,
    stats.lowRatedRepliedInScope,
    stats.unrepliedCount,
    stats.newCustomers,
    stats.churnedCustomers,
    stats.activationQrCount,
  ]) {
    assert.equal(typeof value, 'number');
  }
  assert.equal(stats.lowRatedInScope, 4);
  assert.equal(stats.oldestUnrepliedAt, null);
  // No failing Google check → the pending "platform" task stays off.
  assert.equal(stats.googleFailingCheckAt, null);
});

test('number and null column values are accepted as well', () => {
  const stats = mapHomeFeedbackStats({
    low_rated_in_scope: 9,
    low_rated_replied_in_scope: null,
    unreplied_count: 1,
    oldest_unreplied_at: null,
    new_customers: null,
    churned_customers: 6,
    activation_qr_count: null,
    google_failing_check_at: null,
  });
  assert.equal(stats.lowRatedInScope, 9);
  assert.equal(stats.lowRatedRepliedInScope, 0);
  assert.equal(stats.unrepliedCount, 1);
  assert.equal(stats.newCustomers, 0);
  assert.equal(stats.churnedCustomers, 6);
  assert.equal(stats.activationQrCount, 0);
});

test('no row (no business in scope) gives the empty-scope values', () => {
  assert.deepEqual(mapHomeFeedbackStats(undefined), {
    lowRatedInScope: 0,
    lowRatedRepliedInScope: 0,
    unrepliedCount: 0,
    oldestUnrepliedAt: null,
    newCustomers: 0,
    churnedCustomers: 0,
    activationQrCount: 0,
    googleFailingCheckAt: null,
  });
});

test('Response rate inputs: replied never exceeds the scope total it came from', () => {
  // The page divides replied by total; the mapping must not swap them.
  const stats = mapHomeFeedbackStats({
    low_rated_in_scope: BigInt(10),
    low_rated_replied_in_scope: BigInt(4),
    unreplied_count: BigInt(30),
    oldest_unreplied_at: null,
    new_customers: BigInt(0),
    churned_customers: BigInt(0),
    activation_qr_count: BigInt(0),
    google_failing_check_at: null,
  });
  assert.equal(Math.round((stats.lowRatedRepliedInScope / stats.lowRatedInScope) * 100), 40);
});
