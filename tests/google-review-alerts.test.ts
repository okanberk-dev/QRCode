/**
 * Google review alerts (CLAUDE.md §54): which new Google reviews mail the
 * owner, the source-labelled subjects, and the widget snapshot merge used by
 * the page-entry ("recent") refresh.
 */
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prepareMailRender } from './fixtures/mail/_env';
import { GOOGLE_ALERT_WINDOW_MS, shouldMailGoogleReview } from '../src/lib/google-review-alerts';
import { mergeShowcase, type PublicGoogleReview } from '../src/lib/google-review-showcase';
import { reviewAlertSubject } from '../src/lib/email/review-source';
import { renderLowRatingAlert } from '../src/lib/email/templates/low-rating-alert';
import { renderNewReview } from '../src/lib/email/templates/new-review';

const now = new Date('2026-11-26T12:00:00Z');

describe('shouldMailGoogleReview', () => {
  it('mails new 1–3★ reviews only', () => {
    const fresh = new Date(now.getTime() - 60_000);
    assert.equal(shouldMailGoogleReview({ rating: 1, createTime: fresh }, now), true);
    assert.equal(shouldMailGoogleReview({ rating: 3, createTime: fresh }, now), true);
    assert.equal(shouldMailGoogleReview({ rating: 4, createTime: fresh }, now), false);
    assert.equal(shouldMailGoogleReview({ rating: null, createTime: fresh }, now), false);
  });
  it('never mails an old review that just appeared', () => {
    const old = new Date(now.getTime() - GOOGLE_ALERT_WINDOW_MS - 1);
    assert.equal(shouldMailGoogleReview({ rating: 1, createTime: old }, now), false);
    assert.equal(shouldMailGoogleReview({ rating: 1, createTime: null }, now), false);
  });
});

describe('source-labelled subjects', () => {
  it('Google vs Buaze', () => {
    assert.equal(
      reviewAlertSubject({ source: 'google', locale: 'tr', rating: 2, restaurantName: 'Moda Kahve', low: true }),
      'Google yorumu geldi · Düşük puan 2★ · Moda Kahve',
    );
    assert.equal(
      reviewAlertSubject({ source: 'buaze', locale: 'tr', rating: 5, restaurantName: 'Moda Kahve', branch: 'Kadıköy', low: false }),
      'Buaze yorumu geldi · 5★ · Moda Kahve · Kadıköy',
    );
    assert.equal(
      reviewAlertSubject({ source: 'google', locale: 'en', rating: 1, restaurantName: 'X', branch: 'X', low: true }),
      'New Google review · Low rating 1★ · X',
    );
  });
});

describe('templates carry the source', () => {
  before(() => prepareMailRender());
  const url = 'https://www.buaze.com/tr/dashboard/google-reviews';

  it('low-rating alert from Google', async () => {
    const r = await renderLowRatingAlert({ rating: 2, restaurantName: 'Moda', reviewUrl: url, source: 'google' }, 'tr');
    assert.ok(r.subject.startsWith('Google yorumu geldi'));
    assert.ok(r.html.includes('Google yorumu'));
    assert.ok(r.html.includes('dashboard/google-reviews'));
    assert.ok(r.text.startsWith('Google yorumu'));
  });
  it('low-rating alert from the QR form defaults to Buaze', async () => {
    const r = await renderLowRatingAlert({ rating: 2, restaurantName: 'Moda', reviewUrl: url }, 'tr');
    assert.ok(r.subject.startsWith('Buaze yorumu geldi'));
    assert.ok(r.html.includes('Buaze yorumu'));
  });
  it('new-review mail from Google (EN)', async () => {
    const r = await renderNewReview({ rating: 5, restaurantName: 'Moda', reviewUrl: url, source: 'google' }, 'en');
    assert.ok(r.subject.startsWith('New Google review'));
    assert.ok(r.html.includes('Google review'));
  });
});

describe('mergeShowcase', () => {
  const review = (id: string): PublicGoogleReview => ({
    reviewId: id,
    reviewer: { displayName: id, profilePhotoUrl: null, isAnonymous: false },
    rating: 5,
    comment: null,
    createTime: null,
    updateTime: null,
    reviewReply: null,
  });
  it('newest page first, then stored ones it did not contain, capped', () => {
    const merged = mergeShowcase([review('n1'), review('s1')], [review('s1'), review('s2'), review('s3')], 4);
    assert.deepEqual(merged.map((r) => r.reviewId), ['n1', 's1', 's2', 's3']);
    assert.equal(mergeShowcase([review('a')], [review('b'), review('c')], 2).length, 2);
  });
});
