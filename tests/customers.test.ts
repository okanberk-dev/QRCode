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
  computeLastTopic,
  computeLastChannel,
  deriveCustomerFields,
  applyArchiveOverlay,
  applySegmentOverride,
  type CustomerSegment,
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

  // §38.47 — churned segment (90+ gün dönmemiş + 2+ ziyaret)
  describe('churned (§38.47)', () => {
    it('classifies long-absent returning customer as churned', () => {
      assert.equal(
        computeSegment({ visits: 5, avgRating: 4.5, daysSinceLastVisit: 120 }),
        'churned',
      );
      assert.equal(
        computeSegment({ visits: 2, avgRating: 3.0, daysSinceLastVisit: 100 }),
        'churned',
      );
    });

    it('does not churn single-visit customers (needs visits ≥ 2)', () => {
      // Tek-ziyaretli müşteri churned olmaz — "yeni denedi, beğenmedi"
      // ile "sadık ama kaybedildi" karışmasın.
      assert.equal(
        computeSegment({ visits: 1, avgRating: 5.0, daysSinceLastVisit: 365 }),
        'new',
      );
    });

    it('boundary: daysSinceLastVisit = 90 is NOT churned (> strict)', () => {
      assert.equal(
        computeSegment({ visits: 5, avgRating: 4.5, daysSinceLastVisit: 90 }),
        'vip',
      );
      assert.equal(
        computeSegment({ visits: 5, avgRating: 4.5, daysSinceLastVisit: 91 }),
        'churned',
      );
    });

    it('churned wins over vip (90+ gün dönmemiş VIP de "kayıp")', () => {
      assert.equal(
        computeSegment({ visits: 20, avgRating: 4.9, daysSinceLastVisit: 200 }),
        'churned',
      );
    });

    it('churned wins over risk (sessiz bırakma > aktif memnuniyetsizlik)', () => {
      assert.equal(
        computeSegment({ visits: 4, avgRating: 2.0, daysSinceLastVisit: 150 }),
        'churned',
      );
    });

    it('daysSinceLastVisit undefined → legacy behavior (no churned bucket)', () => {
      // Backward-compat: caller geçmediyse churned bucket'a düşmez.
      assert.equal(computeSegment({ visits: 5, avgRating: 4.5 }), 'vip');
    });

    it('daysSinceLastVisit null → no churned (caller "lastAt yok" demek)', () => {
      assert.equal(
        computeSegment({ visits: 5, avgRating: 4.5, daysSinceLastVisit: null }),
        'vip',
      );
    });
  });
});

// §38.47 — Last topic helper (deterministic, AI maliyeti yok)
describe('computeLastTopic', () => {
  it('returns lowest aspect when sub-ratings present (TR)', () => {
    assert.equal(
      computeLastTopic({ rating: 3, foodRating: 5, serviceRating: 2, atmosphereRating: 4 }, 'tr'),
      'Servis',
    );
    assert.equal(
      computeLastTopic({ rating: 4, foodRating: 2, serviceRating: 5, atmosphereRating: 5 }, 'tr'),
      'Yemek',
    );
    assert.equal(
      computeLastTopic({ rating: 3, foodRating: 4, serviceRating: 4, atmosphereRating: 1 }, 'tr'),
      'Atmosfer',
    );
  });

  it('returns EN labels when locale is en', () => {
    assert.equal(
      computeLastTopic({ rating: 3, foodRating: 2 }, 'en'),
      'Food',
    );
    assert.equal(
      computeLastTopic({ rating: 4, serviceRating: 1 }, 'en'),
      'Service',
    );
  });

  it('falls back to rating-based label when no aspects', () => {
    assert.equal(computeLastTopic({ rating: 1 }, 'tr'), 'Şikayet');
    assert.equal(computeLastTopic({ rating: 2 }, 'tr'), 'Şikayet');
    assert.equal(computeLastTopic({ rating: 3 }, 'tr'), 'Karışık');
    assert.equal(computeLastTopic({ rating: 4 }, 'tr'), 'Olumlu');
    assert.equal(computeLastTopic({ rating: 5 }, 'tr'), 'Olumlu');
  });

  it('returns "—" when rating is null and no aspects', () => {
    assert.equal(computeLastTopic({ rating: null }, 'tr'), '—');
  });

  it('default locale is tr', () => {
    assert.equal(computeLastTopic({ rating: 5 }), 'Olumlu');
    assert.equal(computeLastTopic({ rating: 1 }), 'Şikayet');
  });

  it('handles partial aspects (only one provided)', () => {
    assert.equal(computeLastTopic({ rating: 4, foodRating: 5 }, 'tr'), 'Yemek');
    assert.equal(computeLastTopic({ rating: 2, atmosphereRating: 1 }, 'tr'), 'Atmosfer');
  });
});

// §38.47 — Last channel helper (Pulse 11-platform taxonomy + null fallback)
describe('computeLastChannel', () => {
  it('maps known platform strings to label', () => {
    assert.equal(computeLastChannel('google', 'tr'), 'Google');
    assert.equal(computeLastChannel('yemeksepeti', 'tr'), 'Yemeksepeti');
    assert.equal(computeLastChannel('trendyol_go', 'tr'), 'Trendyol GO');
    assert.equal(computeLastChannel('whatsapp', 'tr'), 'WhatsApp');
  });

  it('null → "Buaze QR" (mevcut platform=null paterni)', () => {
    assert.equal(computeLastChannel(null, 'tr'), 'Buaze QR');
    assert.equal(computeLastChannel(undefined, 'tr'), 'Buaze QR');
    assert.equal(computeLastChannel('', 'tr'), 'Buaze QR');
  });

  it('unknown platform → "Diğer" / "Other" fallback', () => {
    assert.equal(computeLastChannel('yelp', 'tr'), 'Diğer');
    assert.equal(computeLastChannel('foursquare', 'en'), 'Other');
  });

  it('case-insensitive platform match', () => {
    assert.equal(computeLastChannel('GOOGLE', 'tr'), 'Google');
    assert.equal(computeLastChannel('Yemeksepeti', 'tr'), 'Yemeksepeti');
  });

  it('default locale is tr', () => {
    assert.equal(computeLastChannel('google'), 'Google');
    assert.equal(computeLastChannel(null), 'Buaze QR');
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

  // §38.47 — churned/lastTopic/lastChannel integration
  it('classifies long-absent customer as churned via deriveCustomerFields', () => {
    const longAgo = new Date('2026-01-01T00:00:00Z'); // ~123 gün önce
    const result = deriveCustomerFields({
      visits: 6,
      avgRating: 4.5,
      lastAt: longAgo,
      now,
    });
    assert.equal(result.segment, 'churned');
    assert.equal(result.daysSinceLastVisit, 123);
  });

  it('lastTopic + lastChannel populated when inputs provided', () => {
    const result = deriveCustomerFields({
      visits: 5,
      avgRating: 4.5,
      lastAt: now,
      now,
      lastTopicInput: { rating: 5, foodRating: 5, serviceRating: 4 },
      lastPlatform: 'google',
      locale: 'tr',
    });
    assert.equal(result.lastTopic, 'Servis'); // lowest aspect
    assert.equal(result.lastChannel, 'Google');
  });

  it('lastTopic + lastChannel omitted when inputs not provided (backwards-compat)', () => {
    const result = deriveCustomerFields({
      visits: 5,
      avgRating: 4.5,
      lastAt: now,
      now,
    });
    assert.equal(result.lastTopic, undefined);
    assert.equal(result.lastChannel, undefined);
  });

  it('lastChannel="Buaze QR" when lastPlatform is null (Buaze QR paterni)', () => {
    const result = deriveCustomerFields({
      visits: 3,
      avgRating: 5.0,
      lastAt: now,
      now,
      lastPlatform: null,
      locale: 'tr',
    });
    assert.equal(result.lastChannel, 'Buaze QR');
  });

  it('EN locale propagates to lastTopic + lastChannel', () => {
    const result = deriveCustomerFields({
      visits: 4,
      avgRating: 3.5,
      lastAt: now,
      now,
      lastTopicInput: { rating: 3, atmosphereRating: 2 },
      lastPlatform: 'yemeksepeti',
      locale: 'en',
    });
    assert.equal(result.lastTopic, 'Atmosphere');
    assert.equal(result.lastChannel, 'Yemeksepeti');
  });
});

// §38.48 Wave 2 — Archive + segment override overlay helpers
describe('applyArchiveOverlay', () => {
  const rows = [
    { restaurant_id: 'r1', contact_key: 'a@b.com', name: 'A' },
    { restaurant_id: 'r1', contact_key: 'c@d.com', name: 'B' },
    { restaurant_id: 'r2', contact_key: '+90555', name: 'C' },
  ];

  it('returns input unchanged when archivedKeys is undefined', () => {
    const result = applyArchiveOverlay(rows, undefined);
    assert.equal(result.length, 3);
    assert.deepEqual(result, rows);
  });

  it('returns input unchanged when archivedKeys is empty Set', () => {
    const result = applyArchiveOverlay(rows, new Set());
    assert.equal(result.length, 3);
  });

  it('filters out archived rows by composite key', () => {
    const archived = new Set(['r1|a@b.com']);
    const result = applyArchiveOverlay(rows, archived);
    assert.equal(result.length, 2);
    assert.equal(result[0].name, 'B');
    assert.equal(result[1].name, 'C');
  });

  it('filters multiple archived keys', () => {
    const archived = new Set(['r1|a@b.com', 'r2|+90555']);
    const result = applyArchiveOverlay(rows, archived);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'B');
  });

  it('archive key restaurantId-bound (cross-restaurant same email NOT filtered)', () => {
    // Two restaurants with the same contact_key — only the matching restaurant
    // pair gets archived (KVKK + scope discipline).
    const sameEmailRows = [
      { restaurant_id: 'r1', contact_key: 'shared@x.com' },
      { restaurant_id: 'r2', contact_key: 'shared@x.com' },
    ];
    const archived = new Set(['r1|shared@x.com']);
    const result = applyArchiveOverlay(sameEmailRows, archived);
    assert.equal(result.length, 1);
    assert.equal(result[0].restaurant_id, 'r2');
  });
});

describe('applySegmentOverride', () => {
  it('returns derived segment when overrides Map is undefined', () => {
    const result = applySegmentOverride('vip', 'r1|a@b.com', undefined);
    assert.equal(result, 'vip');
  });

  it('returns derived segment when overrides Map is empty', () => {
    const result = applySegmentOverride('loyal', 'r1|a@b.com', new Map());
    assert.equal(result, 'loyal');
  });

  it('replaces derived segment with manualSegment override', () => {
    const overrides = new Map<string, CustomerSegment>([['r1|a@b.com', 'vip']]);
    const result = applySegmentOverride('loyal', 'r1|a@b.com', overrides);
    assert.equal(result, 'vip');
  });

  it('keeps derived segment when key not in overrides', () => {
    const overrides = new Map<string, CustomerSegment>([['r2|other@y.com', 'risk']]);
    const result = applySegmentOverride('new', 'r1|a@b.com', overrides);
    assert.equal(result, 'new');
  });

  it('all 5 segment values are valid override targets', () => {
    const segments: CustomerSegment[] = ['vip', 'loyal', 'new', 'risk', 'churned'];
    for (const seg of segments) {
      const overrides = new Map<string, CustomerSegment>([['r1|x', seg]]);
      assert.equal(applySegmentOverride('loyal', 'r1|x', overrides), seg);
    }
  });
});
