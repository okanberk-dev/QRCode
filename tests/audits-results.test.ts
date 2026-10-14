/**
 * Denetim Merkezi — sonuç sayfası yardımcıları (spec §6.5, C5) birim testleri.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  bucketScores,
  parseAuditRangeStart,
  parsePaging,
  passRate,
} from '../src/lib/audits/results';

const g = (score: number | null, count: number) => ({ score, _count: { _all: count } });

describe('bucketScores — histogram from groupBy(score) rows', () => {
  it('always returns 10 buckets with the canonical labels', () => {
    const b = bucketScores([]);
    assert.equal(b.length, 10);
    assert.equal(b[0].bucket, '0-9');
    assert.equal(b[1].bucket, '10-19');
    assert.equal(b[9].bucket, '90-100');
    assert.equal(b[9].max, 100);
    assert.ok(b.every((x) => x.count === 0));
  });

  it('0, 9, 10, 99 and 100 land in the right buckets', () => {
    const b = bucketScores([g(0, 1), g(9, 2), g(10, 3), g(99, 4), g(100, 5)]);
    assert.equal(b[0].count, 3, '0 and 9 → 0-9');
    assert.equal(b[1].count, 3, '10 → 10-19');
    assert.equal(b[9].count, 9, '99 and 100 → 90-100');
    assert.equal(b[5].count, 0);
  });

  it('counts sum to the input total (nulls excluded)', () => {
    const rows = [g(83, 7), g(100, 2), g(null, 4), g(40, 1), g(55, 6)];
    const b = bucketScores(rows);
    assert.equal(b.reduce((s, x) => s + x.count, 0), 7 + 2 + 1 + 6);
  });

  it('accepts plain numeric _count and clamps out-of-range scores to the edge buckets', () => {
    const b = bucketScores([
      { score: -5, _count: 2 },
      { score: 250, _count: 3 },
    ]);
    assert.equal(b[0].count, 2);
    assert.equal(b[9].count, 3);
  });

  it('handles > 500 responses worth of counts (no row cap involved)', () => {
    const b = bucketScores([g(100, 612), g(80, 40)]);
    assert.equal(b.reduce((s, x) => s + x.count, 0), 652);
  });
});

describe('passRate', () => {
  it('null without a passing score or without evaluated responses', () => {
    assert.equal(passRate(3, 10, null), null);
    assert.equal(passRate(3, 10, undefined), null);
    assert.equal(passRate(0, 0, 80), null);
  });

  it('whole-number percent of the evaluated responses', () => {
    assert.equal(passRate(3, 4, 80), 75);
    assert.equal(passRate(1, 3, 80), 33);
    assert.equal(passRate(0, 5, 80), 0);
    assert.equal(passRate(5, 5, 0), 100, 'a 0 threshold is still a threshold');
  });
});

describe('parseAuditRangeStart', () => {
  const now = Date.UTC(2026, 9, 13, 12, 0, 0);

  it('7d / 30d / 90d → that many days back', () => {
    assert.equal(parseAuditRangeStart('7d', now)!.getTime(), now - 7 * 86_400_000);
    assert.equal(parseAuditRangeStart('30d', now)!.getTime(), now - 30 * 86_400_000);
    assert.equal(parseAuditRangeStart('90d', now)!.getTime(), now - 90 * 86_400_000);
  });

  it('all / null / unknown → unbounded', () => {
    assert.equal(parseAuditRangeStart('all', now), null);
    assert.equal(parseAuditRangeStart(null, now), null);
    assert.equal(parseAuditRangeStart(undefined, now), null);
    assert.equal(parseAuditRangeStart('1y', now), null);
  });
});

describe('parsePaging', () => {
  it('defaults: page 1, pageSize 50', () => {
    assert.deepEqual(parsePaging(null, null), { page: 1, pageSize: 50, skip: 0 });
  });

  it('reads and clamps values (page ≥ 1, pageSize 1..100)', () => {
    assert.deepEqual(parsePaging('3', '20'), { page: 3, pageSize: 20, skip: 40 });
    assert.deepEqual(parsePaging('0', '0'), { page: 1, pageSize: 50, skip: 0 });
    assert.deepEqual(parsePaging('-4', '9999'), { page: 1, pageSize: 100, skip: 0 });
    assert.deepEqual(parsePaging('abc', 'xyz'), { page: 1, pageSize: 50, skip: 0 });
  });

  it('caps an absurd page number so skip stays sane', () => {
    const p = parsePaging('99999999', '100');
    assert.equal(p.page, 10_000);
    assert.equal(p.skip, 9_999 * 100);
  });
});
