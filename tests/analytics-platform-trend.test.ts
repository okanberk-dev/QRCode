import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPlatformDailyTrend,
  aggregatePlatformTotals,
  type FeedbackForPlatformTrend,
} from '../src/lib/analytics-platform-trend';

// Stage 66 §38.147 — analytics-platform-trend helper unit tests.
// Saf fonksiyon, deterministik fixed `now` injection ile SSR + test friendly.

const FIXED_NOW = new Date('2026-05-08T12:00:00Z');

function fb(
  platform: string | null,
  daysAgo: number,
  hour = 10,
): FeedbackForPlatformTrend {
  const d = new Date(FIXED_NOW);
  d.setUTCHours(hour, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return { platform, rating: 5, createdAt: d };
}

describe('buildPlatformDailyTrend', () => {
  it('empty feedbacks → all zeros', () => {
    const points = buildPlatformDailyTrend([], {
      windowDays: 7,
      locale: 'tr',
      now: FIXED_NOW,
    });
    assert.equal(points.length, 7);
    for (const p of points) {
      assert.equal(p.google, 0);
      assert.equal(p.tripadvisor, 0);
      assert.equal(p.buazeQr, 0);
      assert.equal(p.other, 0);
      assert.equal(p.total, 0);
    }
  });

  it('windowDays = 0 → empty array', () => {
    const points = buildPlatformDailyTrend([], {
      windowDays: 0,
      locale: 'tr',
      now: FIXED_NOW,
    });
    assert.equal(points.length, 0);
  });

  it('Google feedback bucket → google=1', () => {
    const points = buildPlatformDailyTrend([fb('google', 0)], {
      windowDays: 7,
      locale: 'tr',
      now: FIXED_NOW,
    });
    const today = points[points.length - 1];
    assert.equal(today.google, 1);
    assert.equal(today.tripadvisor, 0);
    assert.equal(today.buazeQr, 0);
    assert.equal(today.other, 0);
    assert.equal(today.total, 1);
  });

  it('Tripadvisor feedback bucket → tripadvisor=1', () => {
    const points = buildPlatformDailyTrend([fb('tripadvisor', 0)], {
      windowDays: 7,
      locale: 'tr',
      now: FIXED_NOW,
    });
    const today = points[points.length - 1];
    assert.equal(today.tripadvisor, 1);
    assert.equal(today.total, 1);
  });

  it('null platform → buazeQr=1 (Buaze QR runtime label)', () => {
    const points = buildPlatformDailyTrend([fb(null, 0)], {
      windowDays: 7,
      locale: 'tr',
      now: FIXED_NOW,
    });
    const today = points[points.length - 1];
    assert.equal(today.buazeQr, 1);
    assert.equal(today.total, 1);
  });

  it('Yemeksepeti feedback → other bucket', () => {
    const points = buildPlatformDailyTrend([fb('yemeksepeti', 0)], {
      windowDays: 7,
      locale: 'tr',
      now: FIXED_NOW,
    });
    const today = points[points.length - 1];
    assert.equal(today.google, 0);
    assert.equal(today.other, 1);
    assert.equal(today.total, 1);
  });

  it('Outside window → ignored', () => {
    // 30 günden eski feedback'ler 7-day window'da görünmez.
    const points = buildPlatformDailyTrend([fb('google', 30)], {
      windowDays: 7,
      locale: 'tr',
      now: FIXED_NOW,
    });
    for (const p of points) {
      assert.equal(p.total, 0);
    }
  });

  it('Mixed platforms multi-day → correct daily breakdown', () => {
    const feedbacks: FeedbackForPlatformTrend[] = [
      fb('google', 0),
      fb('google', 0),
      fb('tripadvisor', 0),
      fb(null, 0),
      fb('yemeksepeti', 1),
      fb('GOOGLE', 1), // Case-insensitive (helper toLowerCase)
    ];
    const points = buildPlatformDailyTrend(feedbacks, {
      windowDays: 7,
      locale: 'tr',
      now: FIXED_NOW,
    });
    const today = points[points.length - 1];
    const yesterday = points[points.length - 2];
    assert.equal(today.google, 2);
    assert.equal(today.tripadvisor, 1);
    assert.equal(today.buazeQr, 1);
    assert.equal(today.other, 0);
    assert.equal(today.total, 4);
    assert.equal(yesterday.google, 1); // GOOGLE → google
    assert.equal(yesterday.other, 1); // yemeksepeti
    assert.equal(yesterday.total, 2);
  });

  it('Date format locale-aware (tr-TR)', () => {
    const points = buildPlatformDailyTrend([], {
      windowDays: 1,
      locale: 'tr',
      now: FIXED_NOW,
    });
    // Sadece "08/05" formatında (dd/mm Türkçe)
    assert.match(points[0].date, /^\d{2}[./]\d{2}$/);
    assert.equal(points[0].isoDate, '2026-05-08');
  });
});

describe('aggregatePlatformTotals', () => {
  it('empty points → zeros', () => {
    const totals = aggregatePlatformTotals([]);
    assert.deepEqual(totals, {
      google: 0,
      tripadvisor: 0,
      buazeQr: 0,
      other: 0,
      total: 0,
    });
  });

  it('aggregates correctly across days', () => {
    const points = buildPlatformDailyTrend(
      [
        fb('google', 0),
        fb('google', 1),
        fb('tripadvisor', 0),
        fb(null, 2),
        fb('yemeksepeti', 3),
      ],
      { windowDays: 7, locale: 'tr', now: FIXED_NOW },
    );
    const totals = aggregatePlatformTotals(points);
    assert.equal(totals.google, 2);
    assert.equal(totals.tripadvisor, 1);
    assert.equal(totals.buazeQr, 1);
    assert.equal(totals.other, 1);
    assert.equal(totals.total, 5);
  });
});
