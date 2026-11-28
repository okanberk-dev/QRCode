import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  combinedReplyRate,
  computeReplyTimes,
  describeChange,
  describeRatingChange,
  formatDuration,
  hasReplyChannel,
  needsReply,
  redirectBadgeLabel,
  topicSentimentText,
} from '../src/lib/feedback-metrics';
import { monotonePath } from '../src/components/ui/Sparkline';
import { buildVolumeSeries } from '../src/lib/volume-series';

const H = 3_600_000;
const D = 24 * H;

describe('describeChange', () => {
  it('equal → "Değişim yok" (also 0 → 0)', () => {
    assert.equal(describeChange(5, 5, { isTr: true }).text, 'Değişim yok');
    assert.equal(describeChange(0, 0, { isTr: true }).arrow, '');
  });
  it('big ratio reads "3 kat", never %999+', () => {
    assert.equal(describeChange(30, 10, { isTr: true }).text, '3 kat');
    assert.equal(describeChange(1154, 100, { isTr: false }).text, '12×');
  });
  it('shorter duration is good with ↓', () => {
    const c = describeChange(1 * H, 2.5 * H, { isTr: true, lowerIsBetter: true });
    assert.equal(c.arrow, '↓');
    assert.equal(c.tone, 'good');
  });
  it('small change is a plain percent', () => {
    assert.deepEqual(describeChange(12, 10, { isTr: true }), { text: '%20', arrow: '↑', tone: 'good' });
  });
});

describe('describeRatingChange', () => {
  it('0.0 → Değişim yok; null when a side is missing', () => {
    assert.equal(describeRatingChange(4.62, 4.6, true)?.text, 'Değişim yok');
    assert.equal(describeRatingChange(null, 4.6, true), null);
    assert.equal(describeRatingChange(4.2, 4.6, true)?.text, '0,4');
  });
});

describe('computeReplyTimes', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  const start = new Date(now.getTime() - 30 * D);
  const at = (msAgo: number) => new Date(now.getTime() - msAgo);
  it('median over reviews from the period; old reviews are backlog', () => {
    const stats = computeReplyTimes(
      [
        { createdAt: at(2 * D), firstReplyAt: at(2 * D - 1 * H) },
        { createdAt: at(3 * D), firstReplyAt: at(3 * D - 3 * H) },
        { createdAt: at(4 * D), firstReplyAt: null },
        // 60-day-old review answered today: backlog, not "60 days".
        { createdAt: at(60 * D), firstReplyAt: at(1 * H) },
      ],
      { start, end: now },
    );
    assert.equal(stats.medianMs, 2 * H);
    assert.equal(stats.answered, 2);
    assert.equal(stats.backlogReplies, 1);
  });
});

describe('formatting', () => {
  it('formatDuration', () => {
    assert.equal(formatDuration(75 * 60_000, true), '1 sa 15 dk');
    assert.equal(formatDuration(3 * D, true), '3 gün');
  });
  it('topic sentiment has no signed percents', () => {
    assert.equal(topicSentimentText(0, 100, true), '%0 olumlu · %100 olumsuz');
  });
  it('redirect badge uses Turkish dative', () => {
    assert.equal(redirectBadgeLabel('google', true), "Google'a yönlendirildi");
    assert.equal(redirectBadgeLabel('yemeksepeti', true), "Yemeksepeti'ne yönlendirildi");
    assert.equal(redirectBadgeLabel(null, true), 'Platforma yönlendirildi');
  });
  it('combined reply rate weights by volume', () => {
    assert.equal(combinedReplyRate([{ replied: 1, total: 4 }, { replied: 96, total: 96 }]), 97);
    assert.equal(combinedReplyRate([]), null);
  });
});

describe('monotonePath', () => {
  it('never overshoots between samples', () => {
    const d = monotonePath([[0, 10], [10, 0], [20, 0], [30, 10]]);
    const ys = [...d.matchAll(/[ ,](-?[\d.]+)(?= |$)/g)].map((m) => Number(m[1]));
    assert.ok(ys.every((y) => y >= 0 && y <= 10), d);
  });
});

describe('buildVolumeSeries', () => {
  it('splits redirects and feedback per day in the display time zone', () => {
    const end = new Date('2026-11-25T20:00:00Z'); // 23:00 Istanbul
    const pts = buildVolumeSeries(
      [
        { createdAt: new Date('2026-11-25T21:30:00Z'), rating: 5, redirected: true }, // 26 Nov local → outside
        { createdAt: new Date('2026-11-25T08:00:00Z'), rating: 5, redirected: true },
        { createdAt: new Date('2026-11-25T09:00:00Z'), rating: 2, redirected: false },
      ],
      { windowDays: 3, end, timeZone: 'Europe/Istanbul', locale: 'tr' },
    );
    assert.equal(pts.length, 3);
    const last = pts[2];
    assert.equal(last.redirects, 1);
    assert.equal(last.feedback, 1);
    assert.equal(last.avgRating, 3.5);
  });
  it('weekly buckets after 92 days', () => {
    const pts = buildVolumeSeries([], { windowDays: 140, end: new Date('2026-11-25T12:00:00Z'), timeZone: 'UTC', locale: 'en' });
    assert.equal(pts.length, 20);
  });
});

describe('needsReply (§58: replies go out by e-mail)', () => {
  it('needs an e-mail', () => {
    assert.equal(hasReplyChannel('a@b.co'), true);
    assert.equal(hasReplyChannel('   '), false);
    assert.equal(hasReplyChannel(''), false);
    assert.equal(hasReplyChannel(null), false);
    assert.equal(hasReplyChannel(undefined), false);
  });
  it('low, unreplied, with e-mail only', () => {
    assert.equal(needsReply({ rating: 2, isReplied: false, customerEmail: 'a@b.co' }), true);
    assert.equal(needsReply({ rating: 3, customerEmail: 'a@b.co' }), true);
    assert.equal(needsReply({ rating: 2, isReplied: false, customerEmail: null }), false);
    assert.equal(needsReply({ rating: 4, isReplied: false, customerEmail: 'a@b.co' }), false);
    assert.equal(needsReply({ rating: 1, isReplied: true, customerEmail: 'a@b.co' }), false);
  });
});
