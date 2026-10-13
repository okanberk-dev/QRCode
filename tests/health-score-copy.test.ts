/**
 * Reputation health-score recommendation copy.
 *
 * `health-score.ts` used to carry unsourced claims about how Google ranks or
 * "trusts" a profile, an invented "%42 fewer clicks" cohort figure and a
 * "~30 seconds" reply-time figure (CLAUDE.md §35.8: no invented numbers).
 * These tests keep them out for good, in both languages, and pin the
 * thresholds that were deliberately left unchanged.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeHealthScore,
  getProfileRecommendations,
  scoreDeltaSign,
  scoreLabel,
  type HealthSnapshotInput,
  type ProfileRecommendation,
} from '../src/lib/reputation/health-score';

const BLANK: HealthSnapshotInput = {
  googleRating: null,
  googleReviewCount: null,
  googleMediaCount: null,
  googleUnansweredQs: null,
  profileComplete: null,
  feedbackTotal: null,
  feedbackAvgRating: null,
  feedbackLowRated: null,
  feedbackReplied: null,
};

function snap(overrides: Partial<HealthSnapshotInput>): HealthSnapshotInput {
  return { ...BLANK, ...overrides };
}

/** The pattern from the spec (§9.1 #10) plus the other forms those claims took. */
const FORBIDDEN = /%\s?42|~\s?42|ranking|\brank\b|sıralama|güvenilir|trust|~\s?30|algoritma|algorithm|kohort|cohort|fewer clicks|daha düşük/i;
// Real (colour) emoji only: the rating glyph "★" is the product's normal text symbol.
const EMOJI = /\p{Emoji_Presentation}|\uFE0F/u;

/** Snapshots that, between them, trigger every recommendation. */
const TRIGGERS: Array<[string, HealthSnapshotInput]> = [
  ['profile_incomplete', snap({ profileComplete: 30 })],
  ['no_photos', snap({ googleMediaCount: 0 })],
  ['few_photos', snap({ googleMediaCount: 2 })],
  ['unanswered_questions', snap({ googleUnansweredQs: 3 })],
  ['unanswered_questions', snap({ googleUnansweredQs: 1 })],
  ['low_reply_rate', snap({ feedbackTotal: 10, feedbackReplied: 2 })],
  ['few_google_reviews', snap({ googleReviewCount: 4 })],
  ['high_low_rating_rate', snap({ feedbackTotal: 20, feedbackLowRated: 10 })],
];

const ALL_IDS = [
  'profile_incomplete',
  'no_photos',
  'few_photos',
  'unanswered_questions',
  'low_reply_rate',
  'few_google_reviews',
  'high_low_rating_rate',
];

function strings(rec: ProfileRecommendation): string[] {
  return [rec.title, rec.body, rec.ctaLabel ?? ''].filter(Boolean);
}

function idsFor(snapshot: HealthSnapshotInput, locale: 'tr' | 'en' = 'tr'): string[] {
  return getProfileRecommendations(snapshot, locale).map((r) => r.id);
}

describe('getProfileRecommendations — copy', () => {
  it('every recommendation is reachable by the trigger snapshots', () => {
    const seen = new Set<string>();
    for (const [expected, snapshot] of TRIGGERS) {
      const ids = idsFor(snapshot);
      assert.ok(ids.includes(expected), `${expected} not produced by ${JSON.stringify(snapshot)}`);
      ids.forEach((id) => seen.add(id));
    }
    assert.deepEqual([...seen].sort(), [...ALL_IDS].sort());
  });

  it('no recommendation string — title, body or button — carries an unsourced claim (both languages)', () => {
    let checked = 0;
    for (const locale of ['tr', 'en'] as const) {
      for (const [, snapshot] of TRIGGERS) {
        for (const rec of getProfileRecommendations(snapshot, locale)) {
          for (const s of strings(rec)) {
            checked++;
            assert.doesNotMatch(s, FORBIDDEN, `${locale}/${rec.id}: "${s}"`);
            assert.doesNotMatch(s, EMOJI, `${locale}/${rec.id}: emoji in "${s}"`);
            assert.doesNotMatch(s, /undefined|NaN|null|\[object/, `${locale}/${rec.id}: unrendered value in "${s}"`);
          }
        }
      }
    }
    assert.ok(checked > 40, 'the sweep must actually look at strings');
  });

  it('uses the replacement copy from the spec (Turkish)', () => {
    const body = (id: string) => {
      for (const [, snapshot] of TRIGGERS) {
        const rec = getProfileRecommendations(snapshot, 'tr').find((r) => r.id === id);
        if (rec) return rec.body;
      }
      throw new Error(`no ${id}`);
    };
    assert.equal(
      body('profile_incomplete'),
      'Profilindeki temel bilgiler (ad, adres, kategori, çalışma saatleri, telefon) eksiksiz olduğunda müşteriler sana doğrudan ulaşabilir.',
    );
    assert.equal(
      body('no_photos'),
      'Henüz fotoğraf yok. En az 4 fotoğraf ekle: dış cephe, iç mekan, ürün/hizmet, ekip.',
    );
    assert.equal(
      body('few_photos'),
      'Müşteriler mekanı fotoğraflardan tanır. En az 4 fotoğraf öneriyoruz: dış mekan, iç mekan, en sevilen 2 ürün/hizmet, bir müşteri anı.',
    );
    assert.equal(
      body('unanswered_questions'),
      "Google'daki soru bölümünde yanıtsız sorular var. Hızlı yanıt, müşterinin merak ettiği şeyi öğrenmesini sağlar.",
    );
    assert.equal(
      body('low_reply_rate'),
      "Müşteri geri bildirimlerinin %60'ından fazlasını yanıtlamak sadakati artırır. Pulse AI taslakları bu işi hızlandırır.",
    );
    assert.equal(
      body('few_google_reviews'),
      'Yorum sayın az. QR kod, müşterilerin yorum bırakmasını kolaylaştırır.',
    );
  });

  it('English parity: same recommendations, English text, no Turkish left behind', () => {
    for (const [, snapshot] of TRIGGERS) {
      const tr = getProfileRecommendations(snapshot, 'tr');
      const en = getProfileRecommendations(snapshot, 'en');
      assert.deepEqual(en.map((r) => r.id), tr.map((r) => r.id));
      assert.deepEqual(en.map((r) => r.severity), tr.map((r) => r.severity));
      for (let i = 0; i < en.length; i++) {
        assert.notEqual(en[i]!.body, tr[i]!.body, `${en[i]!.id}: body not translated`);
        assert.notEqual(en[i]!.title, tr[i]!.title, `${en[i]!.id}: title not translated`);
        assert.doesNotMatch(en[i]!.body, /[ığşöçüİĞŞÖÇÜ]/, `${en[i]!.id}: Turkish letters in English body`);
      }
    }
  });

  it('the recommendations that read as plain advice never promise an outcome', () => {
    const promises = /guarantee|garanti|always|her zaman|will rank|will appear|üst sıra/i;
    for (const locale of ['tr', 'en'] as const) {
      for (const [, snapshot] of TRIGGERS) {
        for (const rec of getProfileRecommendations(snapshot, locale)) {
          for (const s of strings(rec)) assert.doesNotMatch(s, promises, `${locale}/${rec.id}`);
        }
      }
    }
  });

  it('keeps its own numbers honest: they come from the snapshot or the documented thresholds', () => {
    const few = getProfileRecommendations(snap({ googleMediaCount: 2 }), 'tr').find((r) => r.id === 'few_photos')!;
    assert.equal(few.title, 'Fotoğraf sayını artır (2/4+)');
    const q3 = getProfileRecommendations(snap({ googleUnansweredQs: 3 }), 'en').find((r) => r.id === 'unanswered_questions')!;
    assert.equal(q3.title, '3 questions awaiting reply');
    const q1 = getProfileRecommendations(snap({ googleUnansweredQs: 1 }), 'en').find((r) => r.id === 'unanswered_questions')!;
    assert.equal(q1.title, '1 question awaiting reply');
    const reply = getProfileRecommendations(snap({ feedbackTotal: 8, feedbackReplied: 2 }), 'tr').find((r) => r.id === 'low_reply_rate')!;
    assert.equal(reply.title, 'Yanıt oranın düşük: %25');
    const reviews = getProfileRecommendations(snap({ googleReviewCount: 4 }), 'en').find((r) => r.id === 'few_google_reviews')!;
    assert.equal(reviews.title, 'Only 4 Google reviews');
  });
});

describe('getProfileRecommendations — thresholds are unchanged', () => {
  it('profile_incomplete fires below 60 and stays silent for null', () => {
    assert.ok(idsFor(snap({ profileComplete: 59 })).includes('profile_incomplete'));
    assert.ok(!idsFor(snap({ profileComplete: 60 })).includes('profile_incomplete'));
    assert.ok(!idsFor(snap({ profileComplete: null })).includes('profile_incomplete'));
  });

  it('photo recommendations: 0 critical, 1-3 warn, 4+ none, null none', () => {
    assert.deepEqual(idsFor(snap({ googleMediaCount: 0 })), ['no_photos']);
    assert.deepEqual(idsFor(snap({ googleMediaCount: 1 })), ['few_photos']);
    assert.deepEqual(idsFor(snap({ googleMediaCount: 3 })), ['few_photos']);
    assert.deepEqual(idsFor(snap({ googleMediaCount: 4 })), []);
    assert.deepEqual(idsFor(snap({ googleMediaCount: null })), []);
  });

  it('unanswered questions: only when there is at least one', () => {
    assert.deepEqual(idsFor(snap({ googleUnansweredQs: 0 })), []);
    assert.deepEqual(idsFor(snap({ googleUnansweredQs: null })), []);
    assert.deepEqual(idsFor(snap({ googleUnansweredQs: 1 })), ['unanswered_questions']);
  });

  it('reply rate: below 60 percent fires, 60 does not', () => {
    assert.deepEqual(idsFor(snap({ feedbackTotal: 100, feedbackReplied: 59 })), ['low_reply_rate']);
    assert.deepEqual(idsFor(snap({ feedbackTotal: 100, feedbackReplied: 60 })), []);
    assert.deepEqual(idsFor(snap({ feedbackTotal: 0, feedbackReplied: 0 })), []);
    assert.deepEqual(idsFor(snap({ feedbackTotal: 10, feedbackReplied: null })), []);
  });

  it('few Google reviews: fewer than 10 fires (0 included), 10 does not, null does not', () => {
    assert.deepEqual(idsFor(snap({ googleReviewCount: 0 })), ['few_google_reviews']);
    assert.deepEqual(idsFor(snap({ googleReviewCount: 9 })), ['few_google_reviews']);
    assert.deepEqual(idsFor(snap({ googleReviewCount: 10 })), []);
    assert.deepEqual(idsFor(snap({ googleReviewCount: null })), []);
  });

  it('low-rating tip: needs 10+ feedback and more than 25 percent low', () => {
    assert.deepEqual(idsFor(snap({ feedbackTotal: 9, feedbackLowRated: 9 })), []);
    assert.deepEqual(idsFor(snap({ feedbackTotal: 20, feedbackLowRated: 5 })), []);
    assert.deepEqual(idsFor(snap({ feedbackTotal: 20, feedbackLowRated: 6 })), ['high_low_rating_rate']);
  });

  it('a blank snapshot produces no recommendations (missing data is never nagged about)', () => {
    assert.deepEqual(getProfileRecommendations(BLANK, 'tr'), []);
    assert.deepEqual(getProfileRecommendations(BLANK, 'en'), []);
  });

  it('orders critical before warn before tip when several fire', () => {
    const all = snap({
      profileComplete: 30,
      googleMediaCount: 0,
      googleUnansweredQs: 2,
      googleReviewCount: 3,
      feedbackTotal: 20,
      feedbackReplied: 4,
      feedbackLowRated: 10,
    });
    const recs = getProfileRecommendations(all, 'tr');
    assert.deepEqual(
      recs.map((r) => r.severity),
      ['critical', 'critical', 'warn', 'warn', 'warn', 'tip'],
    );
    assert.deepEqual(recs.map((r) => r.id), [
      'profile_incomplete',
      'no_photos',
      'unanswered_questions',
      'low_reply_rate',
      'few_google_reviews',
      'high_low_rating_rate',
    ]);
  });
});

describe('computeHealthScore / labels — behaviour untouched by the copy change', () => {
  it('a brand-new business lands in the documented 30-40 band', () => {
    assert.deepEqual(computeHealthScore(BLANK), { profile: 20, responsiveness: 62, reputation: 35, overall: 37 });
  });

  it('a complete, well-reviewed business scores high', () => {
    const score = computeHealthScore(
      snap({
        googleRating: 4.8,
        googleReviewCount: 120,
        googleMediaCount: 12,
        googleUnansweredQs: 0,
        profileComplete: 100,
        feedbackTotal: 40,
        feedbackAvgRating: 4.6,
        feedbackLowRated: 2,
        feedbackReplied: 38,
      }),
    );
    assert.ok(score.overall >= 90, `overall ${score.overall}`);
    for (const v of Object.values(score)) assert.ok(v >= 0 && v <= 100);
  });

  it('labels and delta signs keep their cut-offs', () => {
    assert.equal(scoreLabel(85, 'tr'), 'Çok iyi');
    assert.equal(scoreLabel(84, 'tr'), 'İyi');
    assert.equal(scoreLabel(50, 'en'), 'Fair');
    assert.equal(scoreLabel(29, 'en'), 'Critical');
    assert.deepEqual(scoreDeltaSign(2), { sign: '+', color: 'positive' });
    assert.deepEqual(scoreDeltaSign(-2), { sign: '-', color: 'negative' });
    assert.deepEqual(scoreDeltaSign(1), { sign: '=', color: 'neutral' });
  });
});
