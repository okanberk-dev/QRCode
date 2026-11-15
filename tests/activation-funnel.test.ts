/**
 * Admin setup funnel (src/lib/activation-funnel.ts). Pure, no DB.
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildActivationFunnel } from '../src/lib/activation-funnel';

const counts = (f: ReturnType<typeof buildActivationFunnel>) =>
  Object.fromEntries(f.steps.map((s) => [s.key, [s.count, s.pctOfSignups]]));

test('counts each owner once, across all of their businesses', () => {
  const f = buildActivationFunnel({
    windowDays: 30,
    ownerIds: ['u1', 'u2', 'u3', 'u4'],
    restaurants: [
      { id: 'r1', userId: 'u1' },
      { id: 'r2', userId: 'u1' },
      { id: 'r3', userId: 'u2' },
      { id: 'r4', userId: 'u3' },
    ],
    qrRestaurantIds: ['r1', 'r2', 'r3'],
    feedbackRestaurantIds: ['r2'],
  });
  assert.deepEqual(counts(f), {
    signup: [4, 100],
    business: [3, 75],
    qr: [2, 50],
    feedback: [1, 25],
  });
  assert.equal(f.windowDays, 30);
});

test('ignores businesses of owners outside the window', () => {
  const f = buildActivationFunnel({
    windowDays: 30,
    ownerIds: ['u1'],
    restaurants: [
      { id: 'r1', userId: 'old' },
      { id: 'r2', userId: null },
    ],
    qrRestaurantIds: ['r1', 'r2'],
    feedbackRestaurantIds: ['r1'],
  });
  assert.deepEqual(counts(f), {
    signup: [1, 100],
    business: [0, 0],
    qr: [0, 0],
    feedback: [0, 0],
  });
});

test('a rating without an in-panel QR still counts', () => {
  const f = buildActivationFunnel({
    windowDays: 90,
    ownerIds: ['u1', 'u2', 'u3'],
    restaurants: [{ id: 'r1', userId: 'u1' }],
    qrRestaurantIds: [],
    feedbackRestaurantIds: ['r1'],
  });
  assert.equal(f.steps.find((s) => s.key === 'qr')?.count, 0);
  assert.equal(f.steps.find((s) => s.key === 'feedback')?.count, 1);
  assert.equal(f.steps.find((s) => s.key === 'feedback')?.pctOfSignups, 33.3);
});

test('no signups gives zero percentages, not NaN', () => {
  const f = buildActivationFunnel({
    windowDays: 30,
    ownerIds: [],
    restaurants: [],
    qrRestaurantIds: [],
    feedbackRestaurantIds: [],
  });
  assert.ok(f.steps.every((s) => s.count === 0 && s.pctOfSignups === 0));
  assert.deepEqual(f.steps.map((s) => s.key), ['signup', 'business', 'qr', 'feedback']);
});
