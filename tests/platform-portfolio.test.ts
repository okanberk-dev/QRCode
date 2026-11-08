import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlatformPortfolio } from '../src/lib/platform-portfolio';
import type { PlatformLinkRow } from '../src/lib/platform-link-status';

function business(id: string, overrides: Partial<PlatformLinkRow> = {}): PlatformLinkRow & { id: string; name: string } {
  return {
    id,
    name: id.toUpperCase(),
    category: 'Restoran',
    externalPlatformsEnabled: true,
    defaultRedirectPlatform: null,
    ...overrides,
  };
}

test('buildPlatformPortfolio builds one row per business with shared columns', () => {
  const matrix = buildPlatformPortfolio(
    [
      business('a', { googleReviewUrl: 'https://g.page/r/abc/review', yemekSepetiUrl: 'https://www.yemeksepeti.com/restaurant/abc' }),
      business('b', { googleReviewUrl: 'https://g.page/r/def/review' }),
    ],
    { b: { google: { ok: false, checkedAt: '2026-11-08T10:00:00.000Z', error: 'HTTP 404', statusCode: 404 } } },
  );
  const slugs = matrix.columns.map((column) => column.slug);
  assert.ok(slugs.includes('google'));
  assert.ok(slugs.includes('yemeksepeti'));
  assert.equal(matrix.rows.length, 2);
  const [a, b] = matrix.rows;
  assert.equal(a.cells.google?.state, 'connected');
  assert.equal(a.cells.yemeksepeti?.state, 'connected');
  assert.equal(b.cells.google?.state, 'issue');
  assert.equal(b.cells.yemeksepeti?.state, 'missing');
  assert.equal(b.needsWork, true);
  assert.equal(b.summary.issue, 1);
  // A connected business with only "not added" platforms is fine.
  assert.equal(a.needsWork, false);
});

test('out-of-sector platforms without a link are null and not columns', () => {
  const matrix = buildPlatformPortfolio([business('a', { googleReviewUrl: 'https://g.page/r/abc/review' })], {});
  // Airbnb is a hospitality platform — not relevant for a restaurant.
  assert.ok(!matrix.columns.some((column) => column.slug === 'airbnb'));
  assert.equal(matrix.rows[0].cells.airbnb, null);
});

test('a business with nothing connected needs work', () => {
  const matrix = buildPlatformPortfolio([business('a')], {});
  assert.equal(matrix.rows[0].summary.connected, 0);
  assert.equal(matrix.rows[0].needsWork, true);
});
