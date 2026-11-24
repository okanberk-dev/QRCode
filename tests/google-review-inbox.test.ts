/**
 * Google review reply inbox (CLAUDE.md §54) — the DB-free rules:
 *  - "(Translated by Google)" cleaning, language detection, keywords, templates
 *  - full sync pagination (nextPageToken) and row conversion
 *  - reply-time statistics (sign / trend of the change)
 *  - inbox filters and bulk eligibility
 *  - state after a sent / deleted reply
 *  - bulk reply queue: quota, retry with backoff, idempotency, pause
 *  - reply settings and personalized drafts
 *
 * Run: npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  detectReviewLanguage,
  extractReviewKeywords,
  fillReplyTemplate,
  reviewerFirstName,
  splitGoogleTranslation,
} from '../src/lib/google-review-text';
import { collectAllReviewPages, toGoogleReviewRow } from '../src/lib/google-review-sync';
import {
  buildInboxWhere,
  computeResponseTime,
  formatChangePct,
  isBulkEligible,
  parseInboxFilter,
  zonedDayStart,
  type InsightRow,
} from '../src/lib/google-review-inbox';
import {
  applyReplyDeleted,
  applyReplySent,
  neighbourAfter,
  removeReview,
  type InboxListState,
  type InboxReview,
} from '../src/components/dashboard/google/inbox/inbox-client';
import {
  retryDelayMs,
  runReplyQueue,
  type QuotaDecision,
  type ReplyQueueItem,
  type ReplyQueueStore,
  type SendOutcome,
} from '../src/lib/google-reply-queue';
import { findBannedPhrases, readGoogleReplySettings } from '../src/lib/google-reply-settings';
import { buildGoogleDraftPrompt, shortThanksDraft } from '../src/lib/google-review-draft';
import type { GoogleReview, GoogleReviewsResponse } from '../src/lib/google-business';

// ─── text ────────────────────────────────────────────────────────────────

describe('splitGoogleTranslation', () => {
  it('keeps only the original when the translation follows it', () => {
    const r = splitGoogleTranslation('Очень вкусно!\n\n(Translated by Google)\nVery tasty!');
    assert.equal(r.original, 'Очень вкусно!');
    assert.equal(r.translated, 'Very tasty!');
  });

  it('handles "(Translated by Google) … (Original) …"', () => {
    const r = splitGoogleTranslation('(Translated by Google) Great coffee\n\n(Original)\nHarika kahve');
    assert.equal(r.original, 'Harika kahve');
    assert.equal(r.translated, 'Great coffee');
  });

  it('handles the Turkish markers', () => {
    const r = splitGoogleTranslation('(Google tarafından çevrildi) Çok güzel\n\n(Orijinal)\nVery nice');
    assert.equal(r.original, 'Very nice');
    assert.equal(r.translated, 'Çok güzel');
  });

  it('returns the text unchanged when there is no translation', () => {
    assert.deepEqual(splitGoogleTranslation('  Kahve harika  '), { original: 'Kahve harika', translated: null });
    assert.deepEqual(splitGoogleTranslation(''), { original: null, translated: null });
  });
});

describe('detectReviewLanguage', () => {
  it('detects scripts and common Latin languages', () => {
    assert.equal(detectReviewLanguage('Очень вкусный кофе и приятная атмосфера'), 'ru');
    assert.equal(detectReviewLanguage('Kahveler çok güzel, ortam da harika ve sakin'), 'tr');
    assert.equal(detectReviewLanguage('The coffee was great and the staff very friendly'), 'en');
    assert.equal(detectReviewLanguage('Der Kaffee war sehr lecker und das Personal freundlich'), 'de');
  });

  it('returns null when it cannot tell', () => {
    assert.equal(detectReviewLanguage('ok'), null);
    assert.equal(detectReviewLanguage(null), null);
  });
});

describe('extractReviewKeywords', () => {
  it('counts the original words only, without stopwords, once per review', () => {
    const items = [
      splitGoogleTranslation('Kahve harika kahve!\n\n(Translated by Google)\nCoffee great coffee'),
      splitGoogleTranslation('Kahve ve tatlı çok güzel'),
      splitGoogleTranslation('Tatlı harika'),
    ].map((s, i) => ({ text: s.original, rating: 5 - i, language: 'tr' }));
    const words = extractReviewKeywords(items).map((k) => k.word);
    assert.ok(words.includes('kahve'));
    assert.ok(words.includes('tatlı'));
    assert.ok(!words.includes('coffee'), 'translation must not be counted');
    assert.ok(!words.includes('ve') && !words.includes('çok'));
    const kahve = extractReviewKeywords(items).find((k) => k.word === 'kahve');
    assert.equal(kahve?.mentions, 2, 'one count per review');
  });
});

describe('fillReplyTemplate', () => {
  it('fills {ad} and {işletme}', () => {
    assert.equal(
      fillReplyTemplate('Merhaba {ad}, {işletme} ekibi olarak teşekkürler!', { firstName: 'Ayşe', businessName: "L'Affogato" }),
      "Merhaba Ayşe, L'Affogato ekibi olarak teşekkürler!",
    );
  });
  it('removes {ad} cleanly without a name', () => {
    assert.equal(fillReplyTemplate('Merhaba {ad}, teşekkürler!', { firstName: null }), 'Merhaba, teşekkürler!');
  });
  it('uses only the first name', () => {
    assert.equal(reviewerFirstName('Gülnur Karakaya'), 'Gülnur');
  });
});

// ─── sync ────────────────────────────────────────────────────────────────

function review(id: string, extra: Partial<GoogleReview> = {}): GoogleReview {
  return { name: `accounts/1/locations/2/reviews/${id}`, reviewId: id, starRating: 'FIVE', ...extra };
}

describe('collectAllReviewPages', () => {
  it('follows nextPageToken until the last page', async () => {
    const pages: Record<string, GoogleReviewsResponse> = {
      first: { reviews: [review('a'), review('b')], averageRating: 4.6, totalReviewCount: 5, nextPageToken: 't2' },
      t2: { reviews: [review('c'), review('b')], averageRating: null, totalReviewCount: 0, nextPageToken: 't3' },
      t3: { reviews: [review('d'), review('e')], averageRating: null, totalReviewCount: 0 },
    };
    const seen: (string | undefined)[] = [];
    const res = await collectAllReviewPages(async (token) => {
      seen.push(token);
      return pages[token ?? 'first'];
    }, { gapMs: 0 });
    assert.deepEqual(seen, [undefined, 't2', 't3']);
    assert.equal(res.complete, true);
    assert.equal(res.pages, 3);
    assert.deepEqual(res.reviews.map((r) => r.reviewId), ['a', 'b', 'c', 'd', 'e'], 'duplicates dropped');
    assert.equal(res.averageRating, 4.6);
    assert.equal(res.totalReviewCount, 5);
  });

  it('stops at maxPages and reports an incomplete pass', async () => {
    const res = await collectAllReviewPages(
      async () => ({ reviews: [review(Math.random().toString(36).slice(2))], averageRating: 5, totalReviewCount: 9, nextPageToken: 'more' }),
      { maxPages: 3, gapMs: 0 },
    );
    assert.equal(res.pages, 3);
    assert.equal(res.complete, false);
  });

  it('keeps the pages read before a later error, throws on the first', async () => {
    const partial = await collectAllReviewPages(async (token) => {
      if (token) throw new Error('429');
      return { reviews: [review('a')], averageRating: 5, totalReviewCount: 2, nextPageToken: 'x' };
    }, { gapMs: 0 });
    assert.equal(partial.complete, false);
    assert.equal(partial.reviews.length, 1);
    assert.ok(partial.error);
    await assert.rejects(collectAllReviewPages(async () => { throw new Error('boom'); }, { gapMs: 0 }));
  });
});

describe('toGoogleReviewRow', () => {
  it('keeps the comment unchanged and splits the translation', () => {
    const raw = review('x', {
      comment: 'Вкусно\n\n(Translated by Google)\nTasty',
      reviewer: { displayName: 'Ivan P', profilePhotoUrl: 'http://insecure/p.png' },
      createTime: '2026-11-01T10:00:00Z',
    });
    const row = toGoogleReviewRow(raw)!;
    assert.equal(row.comment, raw.comment);
    assert.equal(row.originalText, 'Вкусно');
    assert.equal(row.translatedText, 'Tasty');
    assert.equal(row.language, 'ru');
    assert.equal(row.reviewerPhotoUrl, null, 'non-https photo dropped');
    assert.equal(row.rating, 5);
    assert.equal(row.hasText, true);
  });

  it('a reply deleted on Google comes back as no reply', () => {
    const row = toGoogleReviewRow(review('y', { reviewReply: undefined }))!;
    assert.equal(row.hasReply, false);
    assert.equal(row.replyComment, null);
    const replied = toGoogleReviewRow(review('z', { reviewReply: { comment: 'Teşekkürler', updateTime: '2026-11-02T00:00:00Z' } }))!;
    assert.equal(replied.hasReply, true);
    assert.equal(replied.replyComment, 'Teşekkürler');
  });

  it('anonymous reviewers keep no name or photo', () => {
    const row = toGoogleReviewRow(review('q', { reviewer: { displayName: 'X', isAnonymous: true } }))!;
    assert.equal(row.reviewerName, null);
    assert.equal(row.isAnonymous, true);
  });
});

// ─── statistics ──────────────────────────────────────────────────────────

describe('computeResponseTime', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  const day = 24 * 3600_000;
  const row = (createdDaysAgo: number, repliedDaysAgo: number): InsightRow => ({
    rating: 5,
    createTime: new Date(now.getTime() - createdDaysAgo * day),
    hasReply: true,
    replyUpdateTime: new Date(now.getTime() - repliedDaysAgo * day),
    originalText: null,
    language: null,
  });

  it('shorter reply time is "faster" with a negative change', () => {
    // last 30 days: 1 day per reply · 30–60 days ago: 10 days per reply
    const stats = computeResponseTime([row(3, 2), row(4, 3), row(45, 35)], now);
    assert.equal(stats.trend, 'faster');
    assert.equal(stats.changePct, -90);
    assert.equal(formatChangePct(stats.changePct!, 'tr'), '−%90');
  });

  it('longer reply time is "slower" with a positive change', () => {
    const stats = computeResponseTime([row(12, 2), row(37, 36)], now); // 10 d now vs 1 d before
    assert.equal(stats.trend, 'slower');
    assert.equal(stats.changePct, 900);
    assert.equal(formatChangePct(900, 'tr'), '+%900');
    assert.equal(formatChangePct(1154, 'en'), '+999+%');
  });

  it('no comparison without replies in both windows', () => {
    const stats = computeResponseTime([row(3, 2)], now);
    assert.equal(stats.changePct, null);
    assert.equal(stats.trend, null);
  });
});

describe('inbox filter', () => {
  it('parses and defaults to unanswered', () => {
    const f = parseInboxFilter(new URLSearchParams('stars=5,4,9&text=with&from=2026-01-01&to=bad&q=%20kahve%20'));
    assert.equal(f.status, 'unreplied');
    assert.deepEqual(f.stars, [4, 5]);
    assert.equal(f.text, 'with');
    assert.equal(f.from, '2026-01-01');
    assert.equal(f.to, null);
    assert.equal(f.q, 'kahve');
  });

  it('builds a where clause scoped to the business', () => {
    const where = buildInboxWhere('r1', parseInboxFilter(new URLSearchParams('status=all')), 'Europe/Istanbul');
    assert.deepEqual(where, { restaurantId: 'r1' });
    const w2 = JSON.stringify(buildInboxWhere('r1', parseInboxFilter(new URLSearchParams('stars=1&text=without')), 'UTC'));
    assert.ok(w2.includes('"hasReply":false') && w2.includes('"hasText":false') && w2.includes('"rating"'));
  });

  it('turns a day into the local midnight', () => {
    assert.equal(zonedDayStart('2026-03-10', 'Europe/Istanbul').toISOString(), '2026-03-09T21:00:00.000Z');
    assert.equal(zonedDayStart('2026-03-10', 'UTC').toISOString(), '2026-03-10T00:00:00.000Z');
  });

  it('bulk is only for unanswered 4–5★', () => {
    assert.equal(isBulkEligible({ rating: 5, hasReply: false }), true);
    assert.equal(isBulkEligible({ rating: 3, hasReply: false }), false);
    assert.equal(isBulkEligible({ rating: 4, hasReply: true }), false);
  });
});

// ─── state after a reply ─────────────────────────────────────────────────

function inboxReview(id: string, extra: Partial<InboxReview> = {}): InboxReview {
  return {
    id: `row-${id}`,
    reviewId: id,
    reviewName: `accounts/1/locations/2/reviews/${id}`,
    reviewerName: 'A',
    reviewerPhotoUrl: null,
    isAnonymous: false,
    rating: 5,
    originalText: 'x',
    translatedText: null,
    language: 'tr',
    createTime: null,
    updateTime: null,
    hasReply: false,
    replyComment: null,
    replyUpdateTime: null,
    draft: { body: 'd', source: 'ai', generatedAt: '' },
    ...extra,
  };
}

function listState(items: InboxReview[], replied: number, stored: number): InboxListState {
  return {
    items,
    matching: items.length,
    summary: {
      averageRating: 4.5,
      totalReviewCount: stored,
      stored,
      unreplied: stored - replied,
      replied,
      replyRate: Math.round((replied / stored) * 100),
      fetchedAt: null,
      syncing: false,
      lastErrorCode: null,
      reviewsUrl: null,
      needsSync: false,
      activeJobId: null,
    },
  };
}

describe('state after a reply', () => {
  it('a sent reply closes the item, shows the reply and moves the counters', () => {
    const state = listState([inboxReview('a'), inboxReview('b')], 8, 10);
    const next = applyReplySent(state, 'a', { comment: 'Teşekkürler', updateTime: '2026-11-24T00:00:00Z' }, 'unreplied');
    const a = next.items.find((r) => r.reviewId === 'a')!;
    assert.equal(a.hasReply, true);
    assert.equal(a.replyComment, 'Teşekkürler');
    assert.equal(a.draft, null);
    assert.equal(next.summary.unreplied, 1);
    assert.equal(next.summary.replied, 9);
    assert.equal(next.summary.replyRate, 90);
    assert.equal(next.leaves, true, 'leaves the "unanswered" list');
    assert.equal(applyReplySent(state, 'a', { comment: 'x', updateTime: null }, 'all').leaves, false);
  });

  it('editing an existing reply does not change the counters', () => {
    const state = listState([inboxReview('a', { hasReply: true, replyComment: 'old' })], 5, 10);
    const next = applyReplySent(state, 'a', { comment: 'new', updateTime: null }, 'replied');
    assert.equal(next.summary.replied, 5);
    assert.equal(next.items[0].replyComment, 'new');
  });

  it('a deleted reply reopens the review', () => {
    const state = listState([inboxReview('a', { hasReply: true, replyComment: 'r' })], 5, 10);
    const next = applyReplyDeleted(state, 'a', 'replied');
    assert.equal(next.items[0].hasReply, false);
    assert.equal(next.summary.unreplied, 6);
    assert.equal(next.leaves, true);
  });

  it('removes the review and focuses the next one', () => {
    const items = [inboxReview('a'), inboxReview('b'), inboxReview('c')];
    assert.equal(neighbourAfter(items, 'b'), 'c');
    assert.equal(neighbourAfter(items, 'c'), 'b');
    const after = removeReview(listState(items, 0, 3), 'b');
    assert.deepEqual(after.items.map((r) => r.reviewId), ['a', 'c']);
    assert.equal(after.matching, 2);
  });
});

// ─── bulk queue ──────────────────────────────────────────────────────────

class MemoryStore implements ReplyQueueStore {
  items: (ReplyQueueItem & { errorCode?: string | null; sentAt?: Date | null })[] = [];
  replied = new Set<string>();
  missing = new Set<string>();
  leaseUntil: Date | null = null;
  status: string = 'running';

  constructor(ids: string[]) {
    this.items = ids.map((id, i) => ({ id: `i${i}`, reviewId: id, comment: `c-${id}`, status: 'pending', attempts: 0, nextAttemptAt: null }));
  }
  async acquireLease(_j: string, until: Date, now: Date) {
    if (this.leaseUntil && this.leaseUntil > now) return false;
    this.leaseUntil = until;
    return true;
  }
  async releaseLease() {
    this.leaseUntil = null;
  }
  async requeueStuck() {
    for (const i of this.items) if (i.status === 'sending') i.status = 'pending';
  }
  async nextDueItem(_j: string, now: Date) {
    return this.items.find((i) => i.status === 'pending' && (!i.nextAttemptAt || i.nextAttemptAt <= now)) ?? null;
  }
  async nextPendingAt() {
    const p = this.items.filter((i) => i.status === 'pending');
    return p.length ? p[0].nextAttemptAt ?? new Date() : null;
  }
  async claim(itemId: string, attempts: number) {
    const i = this.items.find((x) => x.id === itemId)!;
    if (i.status !== 'pending') return false;
    i.status = 'sending';
    i.attempts = attempts;
    return true;
  }
  async reviewState(_j: string, reviewId: string) {
    return { exists: !this.missing.has(reviewId), hasReply: this.replied.has(reviewId) };
  }
  async markSent(itemId: string, at: Date) {
    const i = this.items.find((x) => x.id === itemId)!;
    i.status = 'sent';
    i.sentAt = at;
    this.replied.add(i.reviewId);
  }
  async markRetry(itemId: string, code: string, at: Date) {
    const i = this.items.find((x) => x.id === itemId)!;
    i.status = 'pending';
    i.errorCode = code;
    i.nextAttemptAt = at;
  }
  async markFailed(itemId: string, code: string) {
    const i = this.items.find((x) => x.id === itemId)!;
    i.status = 'failed';
    i.errorCode = code;
  }
  async markSkipped(itemId: string, code: string) {
    const i = this.items.find((x) => x.id === itemId)!;
    i.status = 'skipped';
    i.errorCode = code;
  }
  async setJobStatus(_j: string, status: 'running' | 'paused' | 'done') {
    this.status = status;
  }
  statusOf(reviewId: string) {
    return this.items.find((i) => i.reviewId === reviewId)!.status;
  }
}

const allow = { take: async (): Promise<QuotaDecision> => ({ allowed: true }) };
const fixedClock = () => {
  let t = new Date('2026-11-24T10:00:00Z').getTime();
  return { now: () => new Date(t), advance: (ms: number) => { t += ms; } };
};

describe('runReplyQueue', () => {
  it('sends every item once and finishes the job', async () => {
    const store = new MemoryStore(['a', 'b', 'c']);
    const sent: string[] = [];
    const res = await runReplyQueue('job', {
      store,
      quota: allow,
      sender: { send: async (id, comment) => { sent.push(id); return { ok: true, reply: { comment } }; } },
      sleep: async () => {},
    });
    assert.deepEqual(sent, ['a', 'b', 'c']);
    assert.equal(res.sent, 3);
    assert.equal(store.status, 'done');
  });

  it('skips a review that already has a reply (idempotent)', async () => {
    const store = new MemoryStore(['a', 'b']);
    store.replied.add('a');
    const sent: string[] = [];
    const res = await runReplyQueue('job', {
      store,
      quota: allow,
      sender: { send: async (id, comment) => { sent.push(id); return { ok: true, reply: { comment } }; } },
      sleep: async () => {},
    });
    assert.deepEqual(sent, ['b']);
    assert.equal(res.skipped, 1);
    assert.equal(store.statusOf('a'), 'skipped');
  });

  it('a 429 retries later with backoff and ends the run', async () => {
    const store = new MemoryStore(['a', 'b']);
    const clock = fixedClock();
    const res = await runReplyQueue('job', {
      store,
      quota: allow,
      now: clock.now,
      sender: { send: async (): Promise<SendOutcome> => ({ ok: false, code: 'GOOGLE_RATE_LIMITED', retriable: true, quota: true, retryAfterSeconds: 30 }) },
      sleep: async () => {},
    });
    assert.equal(res.stoppedFor, 'quota');
    assert.equal(store.statusOf('a'), 'pending');
    assert.equal(store.statusOf('b'), 'pending', 'the rest waits for the next run');
    const a = store.items[0];
    assert.equal(a.attempts, 1);
    assert.ok(a.nextAttemptAt!.getTime() - clock.now().getTime() >= 30_000, 'Retry-After respected');
  });

  it('a 5xx retries until MAX attempts, then fails', async () => {
    const store = new MemoryStore(['a']);
    const clock = fixedClock();
    let calls = 0;
    for (let run = 0; run < 6; run++) {
      await runReplyQueue('job', {
        store,
        quota: allow,
        now: clock.now,
        sender: { send: async (): Promise<SendOutcome> => { calls++; return { ok: false, code: 'GOOGLE_SERVER_ERROR', retriable: true }; } },
        sleep: async () => {},
      }, { maxAttempts: 3 });
      clock.advance(60 * 60_000);
    }
    assert.equal(calls, 3);
    assert.equal(store.statusOf('a'), 'failed');
  });

  it('out of daily quota pauses the job without sending', async () => {
    const store = new MemoryStore(['a']);
    let calls = 0;
    const res = await runReplyQueue('job', {
      store,
      quota: { take: async () => ({ allowed: false, scope: 'day', retryAfterSeconds: 3600 }) },
      sender: { send: async (_id, comment) => { calls++; return { ok: true, reply: { comment } }; } },
      sleep: async () => {},
    });
    assert.equal(calls, 0);
    assert.equal(res.stoppedFor, 'daily_quota');
    assert.equal(store.status, 'paused');
    assert.equal(store.statusOf('a'), 'pending');
  });

  it('lost Google access pauses the job', async () => {
    const store = new MemoryStore(['a', 'b']);
    const res = await runReplyQueue('job', {
      store,
      quota: allow,
      sender: { send: async (): Promise<SendOutcome> => ({ ok: false, code: 'GOOGLE_REAUTH_REQUIRED', retriable: false, reauth: true }) },
      sleep: async () => {},
    });
    assert.equal(res.stoppedFor, 'reauth');
    assert.equal(store.status, 'paused');
    assert.equal(store.statusOf('b'), 'pending');
  });

  it('a held lease means another runner is sending', async () => {
    const store = new MemoryStore(['a']);
    store.leaseUntil = new Date(Date.now() + 60_000);
    const res = await runReplyQueue('job', { store, quota: allow, sender: { send: async () => ({ ok: true, reply: { comment: '' } }) } });
    assert.equal(res.busy, true);
    assert.equal(store.statusOf('a'), 'pending');
  });

  it('backoff grows and respects Retry-After', () => {
    assert.equal(retryDelayMs(1), 5_000);
    assert.equal(retryDelayMs(3), 20_000);
    assert.equal(retryDelayMs(20), 10 * 60_000);
    assert.equal(retryDelayMs(1, 90), 90_000);
  });
});

// ─── settings + drafts ───────────────────────────────────────────────────

describe('reply settings and drafts', () => {
  it('reads stored settings safely', () => {
    const s = readGoogleReplySettings({ tone: 'formal', length: 'huge', bannedPhrases: ['İndirim', 'indirim', ' ', 'ücretsiz'] });
    assert.equal(s.tone, 'formal');
    assert.equal(s.length, 'medium');
    assert.deepEqual(s.bannedPhrases, ['İndirim', 'ücretsiz']);
    assert.deepEqual(readGoogleReplySettings(null).bannedPhrases, []);
  });

  it('finds banned phrases case-insensitively', () => {
    assert.deepEqual(findBannedPhrases('Size İNDİRİM yapalım', ['indirim']), ['indirim']);
    assert.deepEqual(findBannedPhrases('Teşekkürler', ['indirim']), []);
  });

  it('short thanks are varied within a batch and signed', () => {
    const business = {
      name: "L'Affogato",
      locale: 'tr' as const,
      settings: { ...readGoogleReplySettings(null), signature: "L'Affogato ekibi" },
    };
    const used = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const body = shortThanksDraft({ reviewId: 'same-id', reviewerName: 'Ali Veli', rating: 5, originalText: null, language: null }, business, used);
      assert.ok(!used.has(body), 'no duplicate in a batch');
      assert.ok(body.endsWith("L'Affogato ekibi"));
      assert.ok(body.includes('Ali') && !body.includes('Veli'));
      used.add(body);
    }
  });

  it('the prompt asks for the review language, the settings and avoids banned phrases', () => {
    const prompt = buildGoogleDraftPrompt(
      { reviewId: 'r', reviewerName: 'Ivan Petrov', rating: 2, originalText: 'Кофе был холодный', language: 'ru' },
      { name: 'Cafe', locale: 'tr', settings: { ...readGoogleReplySettings(null), bannedPhrases: ['indirim'], length: 'short' } },
      { avoidOpenings: ['Dear Ivan thank'] },
    );
    assert.ok(prompt.system.includes('Russian'));
    assert.ok(prompt.system.includes('"indirim"'));
    assert.ok(prompt.system.includes('apology'));
    assert.ok(prompt.system.includes('"Ivan"'));
    assert.ok(prompt.system.includes('Dear Ivan thank'));
    assert.ok(prompt.user.includes('Кофе был холодный'));
  });
});
