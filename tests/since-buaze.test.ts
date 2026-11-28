import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSinceBuaze, percentChange, type SinceBuazeInput } from '../src/lib/since-buaze';

const NOW = new Date('2026-11-28T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function input(over: Partial<SinceBuazeInput> = {}): SinceBuazeInput {
  return {
    now: NOW,
    firstRatingAt: daysAgo(120),
    google: { baseRating: 4.2, baseCount: 120, baseAt: daysAgo(90), currentRating: 4.5, currentCount: 180 },
    qr: { firstAvg: 3.9, firstCount: 20, lastAvg: 4.3, lastCount: 30 },
    totals: { ratings: 312, redirects: 96 },
    ...over,
  };
}

test('percentChange rounds and refuses a zero base', () => {
  assert.equal(percentChange(4.2, 4.5), 7);
  assert.equal(percentChange(120, 180), 50);
  assert.equal(percentChange(0, 5), null);
});

test('full card: Google rating, Google count, QR average, totals (TR)', () => {
  const view = buildSinceBuaze(input(), true, 'Europe/Istanbul');
  assert.ok(view);
  assert.deepEqual(view.rows.map((r) => r.key), ['googleRating', 'googleCount', 'qrRating', 'collected']);
  assert.equal(view.rows[0].value, '4,2 → 4,5');
  assert.deepEqual(view.rows[0].change, { text: '+%7', tone: 'up' });
  assert.deepEqual(view.rows[1].change, { text: '+%50', tone: 'up' });
  assert.equal(view.rows[1].sub, '60 yeni Google yorumu');
  assert.deepEqual(view.rows[2].change, { text: '+%10', tone: 'up' });
  assert.equal(view.rows[3].value, '312');
  assert.match(view.since ?? '', /tarihinden beri$/);
});

test('a drop is shown as a drop, not hidden', () => {
  const view = buildSinceBuaze(input({ google: { baseRating: 4.5, baseCount: 100, baseAt: daysAgo(60), currentRating: 4.4, currentCount: 110 } }), false);
  assert.ok(view);
  assert.deepEqual(view.rows[0].change, { text: '−2%', tone: 'down' });
});

test('young baseline and thin QR history show nothing invented', () => {
  const view = buildSinceBuaze(
    input({
      firstRatingAt: daysAgo(5),
      google: { baseRating: 4.2, baseCount: 120, baseAt: daysAgo(3), currentRating: 4.6, currentCount: 130 },
      qr: { firstAvg: 3.9, firstCount: 20, lastAvg: 4.3, lastCount: 30 },
      totals: { ratings: 4, redirects: 1 },
    }),
    true,
  );
  assert.equal(view, null);
});

test('QR row needs 60 days of history and 5 ratings in each window', () => {
  const short = buildSinceBuaze(input({ google: null, firstRatingAt: daysAgo(40) }), true);
  assert.ok(short);
  assert.deepEqual(short.rows.map((r) => r.key), ['collected']);
  const thin = buildSinceBuaze(input({ google: null, qr: { firstAvg: 3, firstCount: 2, lastAvg: 5, lastCount: 30 } }), true);
  assert.ok(thin);
  assert.deepEqual(thin.rows.map((r) => r.key), ['collected']);
});

test('the pill follows the shown one-decimal values', () => {
  const view = buildSinceBuaze(input({ google: null, qr: { firstAvg: 3.84, firstCount: 20, lastAvg: 3.76, lastCount: 30 } }), true);
  assert.ok(view);
  const qr = view.rows.find((r) => r.key === 'qrRating');
  assert.equal(qr?.value, '3,8 → 3,8');
  assert.deepEqual(qr?.change, { text: 'Değişim yok', tone: 'flat' });
});

test('no Google baseline (Places only): no Google rows', () => {
  const view = buildSinceBuaze(input({ google: null }), true);
  assert.ok(view);
  assert.ok(!view.rows.some((r) => r.key.startsWith('google')));
});
