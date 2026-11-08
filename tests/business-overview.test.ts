import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attentionReasons,
  portfolioTotals,
  sortPortfolioRows,
  type PortfolioRow,
} from '../src/lib/business-overview';

function row(overrides: Partial<PortfolioRow> = {}): PortfolioRow {
  return {
    id: 'x',
    name: 'X',
    category: 'Restoran',
    isActive: true,
    reviewsTotal: 10,
    reviews30d: 4,
    avgRating30d: 4.5,
    unread: 0,
    lastFeedbackAt: '2026-11-01T10:00:00.000Z',
    platforms: { connected: 2, issue: 0, missing: 1, off: 0 },
    ...overrides,
  };
}

test('attentionReasons lists what to fix, paused first and alone', () => {
  assert.deepEqual(attentionReasons(row()), []);
  assert.deepEqual(attentionReasons(row({ isActive: false, unread: 3 })), ['paused']);
  assert.deepEqual(
    attentionReasons(row({ platforms: { connected: 0, issue: 1, missing: 0, off: 0 }, unread: 2, reviews30d: 0 })),
    ['platform_issue', 'unread', 'quiet'],
  );
  assert.deepEqual(attentionReasons(row({ platforms: { connected: 0, issue: 0, missing: 5, off: 1 } })), ['no_platform']);
});

test('portfolioTotals weights the rating by review count and skips paused businesses', () => {
  const totals = portfolioTotals([
    row({ id: 'a', reviews30d: 10, avgRating30d: 5 }),
    row({ id: 'b', reviews30d: 30, avgRating30d: 4, unread: 2 }),
    row({ id: 'c', reviews30d: 0, avgRating30d: null }),
    row({ id: 'd', isActive: false, reviews30d: 50, avgRating30d: 1, unread: 9 }),
  ]);
  assert.equal(totals.businesses, 4);
  assert.equal(totals.active, 3);
  assert.equal(totals.reviews30d, 40);
  assert.equal(totals.avgRating30d, 4.3);
  assert.equal(totals.unread, 2);
  // b (unread) + c (quiet)
  assert.equal(totals.needsAttention, 2);
  assert.equal(portfolioTotals([]).avgRating30d, null);
});

test('sortPortfolioRows sorts by key and keeps missing ratings last', () => {
  const rows = [
    row({ id: 'a', name: 'Çankaya', avgRating30d: 4.1, reviews30d: 3 }),
    row({ id: 'b', name: 'Bakırköy', avgRating30d: null, reviews30d: 0 }),
    row({ id: 'c', name: 'Ataşehir', avgRating30d: 4.8, reviews30d: 9 }),
  ];
  assert.deepEqual(sortPortfolioRows(rows, 'name', 'asc', 'tr').map((r) => r.id), ['c', 'b', 'a']);
  assert.deepEqual(sortPortfolioRows(rows, 'rating', 'desc', 'tr').map((r) => r.id), ['c', 'a', 'b']);
  assert.deepEqual(sortPortfolioRows(rows, 'rating', 'asc', 'tr').map((r) => r.id), ['a', 'c', 'b']);
  assert.deepEqual(sortPortfolioRows(rows, 'reviews30d', 'desc', 'tr').map((r) => r.id), ['c', 'a', 'b']);
  // Input is not mutated.
  assert.deepEqual(rows.map((r) => r.id), ['a', 'b', 'c']);
});
