import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateNPS } from '../src/lib/analytics-nps';

test('calculateNPS: empty input returns all zeros', () => {
  const r = calculateNPS([]);
  assert.equal(r.npsScore, 0);
  assert.equal(r.promoters, 0);
  assert.equal(r.passives, 0);
  assert.equal(r.detractors, 0);
  assert.equal(r.total, 0);
  assert.equal(r.promoterPct, 0);
});

test('calculateNPS: all promoters → 100', () => {
  const r = calculateNPS([
    { rating: 5 },
    { rating: 5 },
    { rating: 5 },
  ]);
  assert.equal(r.npsScore, 100);
  assert.equal(r.promoters, 3);
  assert.equal(r.detractors, 0);
  assert.equal(r.promoterPct, 100);
});

test('calculateNPS: all detractors → -100', () => {
  const r = calculateNPS([
    { rating: 1 },
    { rating: 2 },
    { rating: 3 },
  ]);
  assert.equal(r.npsScore, -100);
  assert.equal(r.detractors, 3);
  assert.equal(r.promoters, 0);
});

test('calculateNPS: mixed 5P / 1Pa / 4D = (50-40)*100/10 = 10', () => {
  // 5 promoters, 1 passive, 4 detractors → total 10
  // P% = 50%, D% = 40%, NPS = 50 - 40 = 10
  const feedbacks = [
    { rating: 5 }, { rating: 5 }, { rating: 5 }, { rating: 5 }, { rating: 5 },
    { rating: 4 },
    { rating: 3 }, { rating: 2 }, { rating: 1 }, { rating: 1 },
  ];
  const r = calculateNPS(feedbacks);
  assert.equal(r.promoters, 5);
  assert.equal(r.passives, 1);
  assert.equal(r.detractors, 4);
  assert.equal(r.total, 10);
  assert.equal(r.npsScore, 10);
  assert.equal(r.promoterPct, 50);
});

test('calculateNPS: invalid rating (0/NaN/null cast) excluded', () => {
  // calculateNPS rating !== Number.isFinite veya rating ≤ 0 → skip.
  // null değer test için unknown'dan cast (runtime check helper içinde).
  const feedbacks: { rating: number }[] = [
    { rating: 5 },
    { rating: 0 }, // skip
    { rating: 4 },
    { rating: null as unknown as number },
    { rating: NaN },
    { rating: 1 },
  ];
  const r = calculateNPS(feedbacks);
  assert.equal(r.total, 3); // 5 + 4 + 1
  assert.equal(r.promoters, 1);
  assert.equal(r.passives, 1);
  assert.equal(r.detractors, 1);
});
