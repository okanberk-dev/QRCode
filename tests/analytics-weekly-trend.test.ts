import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWeeklyTrend,
  getWeeklyTrendWindow,
  startOfIsoWeek,
} from '../src/lib/analytics-weekly-trend';

const NOW = new Date('2026-05-07T12:00:00Z');

test('buildWeeklyTrend: empty input returns 14 empty buckets with null line values', () => {
  const rows = buildWeeklyTrend([], { now: NOW, weeks: 14, locale: 'tr' });
  assert.equal(rows.length, 14);
  assert.equal(rows[0].label, 'H1');
  assert.equal(rows[13].label, 'H14');
  assert.equal(rows.every((row) => row.rating === null), true);
  assert.equal(rows.every((row) => row.sentimentPct === null), true);
  assert.equal(rows.every((row) => row.volume === 0), true);
  assert.equal(rows.every((row) => row.hasData === false), true);
});

test('buildWeeklyTrend: one current-week feedback lands in H14', () => {
  const rows = buildWeeklyTrend(
    [{ rating: 5, createdAt: '2026-05-07T10:00:00Z' }],
    { now: NOW, weeks: 14, locale: 'tr' },
  );
  const current = rows[13];
  assert.equal(current.label, 'H14');
  assert.equal(current.rating, 5);
  assert.equal(current.volume, 1);
  assert.equal(current.sentimentPct, 100);
  assert.equal(current.hasData, true);
});

test('buildWeeklyTrend: ignores feedback outside the 14-week window', () => {
  const rows = buildWeeklyTrend(
    [
      { rating: 5, createdAt: '2025-12-01T10:00:00Z' },
      { rating: 3, createdAt: '2026-05-05T10:00:00Z' },
    ],
    { now: NOW, weeks: 14, locale: 'tr' },
  );
  assert.equal(rows.reduce((sum, row) => sum + row.volume, 0), 1);
  assert.equal(rows[13].rating, 3);
  assert.equal(rows[13].sentimentPct, 0);
});

test('buildWeeklyTrend: averages rating and computes positive sentiment', () => {
  const rows = buildWeeklyTrend(
    [
      { rating: 5, createdAt: '2026-04-28T10:00:00Z' },
      { rating: 4, createdAt: '2026-04-29T10:00:00Z' },
      { rating: 2, createdAt: '2026-04-30T10:00:00Z' },
    ],
    { now: NOW, weeks: 14, locale: 'en' },
  );
  const populated = rows.find((row) => row.volume === 3);
  assert.ok(populated);
  assert.equal(populated.rating, 3.67);
  assert.equal(populated.sentimentPct, 67);
  assert.equal(populated.hasData, true);
});

test('getWeeklyTrendWindow: starts on the oldest Monday and ends after current week', () => {
  const currentWeekStart = startOfIsoWeek(NOW);
  const window = getWeeklyTrendWindow(NOW, 14);
  assert.equal(window.start.getDay(), 1);
  assert.equal(window.end.getTime() - currentWeekStart.getTime(), 7 * 24 * 60 * 60 * 1000);
  assert.equal(window.end.getTime() - window.start.getTime(), 14 * 7 * 24 * 60 * 60 * 1000);
});
