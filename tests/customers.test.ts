/**
 * Customer segment + LTV + sentiment helper tests.
 *
 * Phase 8c (CLAUDE.md §38.16). Pure functions — no DB, no network.
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeSegment,
  computeLTV,
  computeSentiment,
  computeDaysSinceLastVisit,
  deriveCustomerFields,
} from '../src/lib/customers';

describe('computeSegment', () => {
  it('classifies single-visit customer as new', () => {
    assert.equal(computeSegment({ visits: 1, avgRating: 5.0 }), 'new');
    assert.equal(computeSegment({ visits: 2, avgRating: 4.5 }), 'new');
    assert.equal(computeSegment({ visits: 1, avgRating: 1.0 }), 'new');
    assert.equal(computeSegment({ visits: 0, avgRating: null }), 'new');
  });

  it('classifies low-rating returning customer as risk', () => {
    assert.equal(computeSegment({ visits: 3, avgRating: 2.0 }), 'risk');
    assert.equal(computeSegment({ visits: 10, avgRating: 2.9 }), 'risk');
  });

  it('prioritizes risk over vip when ratings are low', () => {
    // visits ≥ 5 + avgRating < 3 → risk wins (memnuniyetsizlik kritik)
    assert.equal(computeSegment({ visits: 8, avgRating: 2.5 }), 'risk');
  });

  it('classifies frequent + happy customer as vip', () => {
    assert.equal(computeSegment({ visits: 5, avgRating: 4.0 }), 'vip');
    assert.equal(computeSegment({ visits: 20, avgRating: 4.8 }), 'vip');
  });

  it('falls back to loyal for medium customers', () => {
    // visits 3-4 with mid-high rating → loyal (not vip — needs ≥5 visits)
    assert.equal(computeSegment({ visits: 3, avgRating: 4.5 }), 'loyal');
    assert.equal(computeSegment({ visits: 4, avgRating: 4.0 }), 'loyal');
    // visits ≥ 5 with mid rating (3.0–3.9) → loyal (not vip — needs ≥4)
    assert.equal(computeSegment({ visits: 6, avgRating: 3.5 }), 'loyal');
  });

  it('boundary: avgRating = 3.0 + visits ≥ 2 is loyal (not risk, < strict)', () => {
    assert.equal(computeSegment({ visits: 4, avgRating: 3.0 }), 'loyal');
  });

  it('boundary: avgRating = 4.0 + visits = 5 is vip (≥ inclusive)', () => {
    assert.equal(computeSegment({ visits: 5, avgRating: 4.0 }), 'vip');
  });

  it('null avgRating with low visits → new (visits guard wins)', () => {
    assert.equal(computeSegment({ visits: 1, avgRating: null }), 'new');
  });

  it('null avgRating with high visits → loyal (cannot be risk or vip without rating)', () => {
    assert.equal(computeSegment({ visits: 10, avgRating: null }), 'loyal');
  });
});

describe('computeLTV', () => {
  it('returns visits × avgRating × 10 rounded', () => {
    assert.equal(computeLTV({ visits: 5, avgRating: 4.2 }), 210);
    assert.equal(computeLTV({ visits: 10, avgRating: 4.5 }), 450);
    assert.equal(computeLTV({ visits: 1, avgRating: 5.0 }), 50);
  });

  it('uses 3.0 fallback when avgRating is null', () => {
    assert.equal(computeLTV({ visits: 4, avgRating: null }), 120);
  });

  it('zero visits → 0 LTV', () => {
    assert.equal(computeLTV({ visits: 0, avgRating: 5.0 }), 0);
  });

  it('rounds half away from zero', () => {
    // 3 × 3.55 × 10 = 106.5 → 107 (Math.round half-to-even on .5; 106.5 → 107)
    const result = computeLTV({ visits: 3, avgRating: 3.55 });
    assert.ok(result === 106 || result === 107, `expected ~107, got ${result}`);
  });
});

describe('computeSentiment', () => {
  it('classifies high ratings as positive (≥ 3.5)', () => {
    assert.equal(computeSentiment(5.0), 'pos');
    assert.equal(computeSentiment(4.0), 'pos');
    assert.equal(computeSentiment(3.5), 'pos');
  });

  it('classifies low ratings as negative (< 2.5)', () => {
    assert.equal(computeSentiment(1.0), 'neg');
    assert.equal(computeSentiment(2.4), 'neg');
  });

  it('classifies mid ratings as neutral (2.5 ≤ x < 3.5)', () => {
    assert.equal(computeSentiment(2.5), 'neu');
    assert.equal(computeSentiment(3.0), 'neu');
    assert.equal(computeSentiment(3.4), 'neu');
  });

  it('null avgRating falls back to neutral', () => {
    assert.equal(computeSentiment(null), 'neu');
  });
});

describe('computeDaysSinceLastVisit', () => {
  const now = new Date('2026-05-04T12:00:00Z');

  it('returns 0 for same-day visit', () => {
    const today = new Date('2026-05-04T08:00:00Z');
    assert.equal(computeDaysSinceLastVisit(today, now), 0);
  });

  it('returns 1 for yesterday', () => {
    const yesterday = new Date('2026-05-03T12:00:00Z');
    assert.equal(computeDaysSinceLastVisit(yesterday, now), 1);
  });

  it('returns 90 for 90 days ago', () => {
    const ninetyAgo = new Date('2026-02-03T12:00:00Z');
    assert.equal(computeDaysSinceLastVisit(ninetyAgo, now), 90);
  });

  it('handles ISO string input', () => {
    assert.equal(computeDaysSinceLastVisit('2026-05-03T12:00:00Z', now), 1);
  });

  it('null input → null output', () => {
    assert.equal(computeDaysSinceLastVisit(null, now), null);
  });

  it('invalid date string → null', () => {
    assert.equal(computeDaysSinceLastVisit('not-a-date', now), null);
  });

  it('future-dated visit → 0 (clamps below zero)', () => {
    const future = new Date('2026-05-10T12:00:00Z');
    assert.equal(computeDaysSinceLastVisit(future, now), 0);
  });
});

describe('deriveCustomerFields', () => {
  const now = new Date('2026-05-04T12:00:00Z');

  it('produces consistent output for typical VIP', () => {
    const result = deriveCustomerFields({
      visits: 8,
      avgRating: 4.5,
      lastAt: '2026-05-01T00:00:00Z',
      now,
    });
    assert.equal(result.segment, 'vip');
    assert.equal(result.ltv, 360);
    assert.equal(result.sentiment, 'pos');
    assert.equal(result.daysSinceLastVisit, 3);
  });

  it('produces consistent output for risk customer', () => {
    const result = deriveCustomerFields({
      visits: 4,
      avgRating: 2.2,
      lastAt: now,
      now,
    });
    assert.equal(result.segment, 'risk');
    assert.equal(result.ltv, 88);
    assert.equal(result.sentiment, 'neg');
    assert.equal(result.daysSinceLastVisit, 0);
  });

  it('produces consistent output for new customer (single visit)', () => {
    const result = deriveCustomerFields({
      visits: 1,
      avgRating: 5.0,
      lastAt: now,
      now,
    });
    assert.equal(result.segment, 'new');
    assert.equal(result.ltv, 50);
    assert.equal(result.sentiment, 'pos');
    assert.equal(result.daysSinceLastVisit, 0);
  });

  it('handles null lastAt + null avgRating gracefully', () => {
    const result = deriveCustomerFields({
      visits: 3,
      avgRating: null,
      lastAt: null,
      now,
    });
    assert.equal(result.segment, 'loyal'); // visits ≥ 3 + null rating → loyal
    assert.equal(result.ltv, 90); // 3 × 3.0 × 10
    assert.equal(result.sentiment, 'neu');
    assert.equal(result.daysSinceLastVisit, null);
  });
});
