/**
 * weekly-report hero + chart copy must follow the data: the hero accent is the
 * delta or the review count (never a bare "+"), and the chart heading names
 * the real peak day.
 *
 * Mail copy is pinned to inline defaults (no DB) via setMailCopyDraft.
 *
 * Run: npm test
 */

import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { clearMailCopyDraft, setMailCopyDraft } from '../src/lib/email/copy-loader';
import { renderWeeklyReport, type WeeklyReportParams } from '../src/lib/email/templates/weekly-report';

const base: WeeklyReportParams = {
  restaurantName: 'Kadıköy Bistro',
  period: { from: new Date('2026-10-12T00:00:00Z'), to: new Date('2026-10-18T23:59:00Z') },
  weekNumber: 42,
  stats: {
    total: 47,
    avgRating: 4.6,
    highRatings: 38,
    lowRatings: 4,
    distribution: { 5: 28, 4: 10, 3: 5, 2: 3, 1: 1 },
    conversionRate: 78,
    aspects: { food: 4.7, service: 4.5, atmosphere: 4.6 },
  },
  dashboardUrl: 'https://www.buaze.com/tr/dashboard',
};

/** Inner HTML of the lime accent span in the hero <h1>. */
function heroAccent(html: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '';
  return h1.match(/<span[^>]*>([\s\S]*?)<\/span>/)?.[1].trim() ?? '';
}

describe('renderWeeklyReport hero + chart copy', () => {
  beforeEach(() => {
    setMailCopyDraft('weekly-report', 'tr', {});
    setMailCopyDraft('weekly-report', 'en', {});
  });
  afterEach(() => {
    clearMailCopyDraft('weekly-report', 'tr');
    clearMailCopyDraft('weekly-report', 'en');
  });

  it('without deltas the accent is the review count, not a bare "+"', async () => {
    for (const locale of ['tr', 'en'] as const) {
      const r = await renderWeeklyReport(base, locale);
      const accent = heroAccent(r.html);
      assert.match(accent, /\d/, `${locale}: accent contains a digit`);
      assert.equal(accent, '47');
      assert.ok(!/^\+$/.test(accent));
    }
  });

  it('with a delta the accent shows it (escaped)', async () => {
    const r = await renderWeeklyReport({ ...base, deltas: { totalDelta: '−32%' } }, 'tr');
    assert.equal(heroAccent(r.html), '−32%');
  });

  it('hero lead line does not claim a "quiet" week for every week', async () => {
    const r = await renderWeeklyReport({ ...base, deltas: { totalDelta: '+18%' } }, 'tr');
    assert.ok(!/Sessiz başlayan/.test(r.html));
  });

  it('chart heading names the real peak day', async () => {
    const thu = await renderWeeklyReport({ ...base, trend: [0, 1, 2, 9, 3, 2, 2] }, 'tr');
    assert.match(thu.html, /Perşembe günü zirve yaptın\./);
    const mon = await renderWeeklyReport({ ...base, trend: [30, 9, 5, 5, 8, 8, 7] }, 'en');
    assert.match(mon.html, /Monday hit the peak\./);
  });

  it('chart is hidden when no day has reviews', async () => {
    const r = await renderWeeklyReport({ ...base, trend: [0, 0, 0, 0, 0, 0, 0] }, 'tr');
    assert.ok(!/zirve yaptın/.test(r.html));
    assert.ok(!r.html.includes('Günlük dağılım'));
  });
});
