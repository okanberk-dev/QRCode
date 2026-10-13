import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYTICS_ANSWER_LIMIT,
  SAMPLE_ITEM_LIMIT,
  buildPerQuestionStats,
  buildSurveySummary,
  npsBreakdown,
  pickHeadlineQuestions,
  type AnalyticsAnswer,
  type AnalyticsQuestion,
} from '../src/lib/survey-analytics';
import { calculateNpsScore } from '../src/lib/surveys';

// Surveys Phase 1 — the numbers behind the "Sonuçlar" tab. Pure functions only.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** n copies of each score: counts[score] = how many. */
function scoresFrom(counts: { p?: number; a?: number; d?: number }): number[] {
  return [
    ...Array<number>(counts.p ?? 0).fill(10),
    ...Array<number>(counts.a ?? 0).fill(8),
    ...Array<number>(counts.d ?? 0).fill(3),
  ];
}

// ── npsBreakdown ────────────────────────────────────────────────────────────

test('npsBreakdown: an empty list is all zeros, never NaN', () => {
  const b = npsBreakdown([]);
  assert.deepEqual(b, {
    total: 0,
    promoters: 0,
    passives: 0,
    detractors: 0,
    promoterPct: 0,
    passivePct: 0,
    detractorPct: 0,
    score: 0,
  });
  // returns a fresh object each time (the zero state is not shared and mutable)
  assert.notEqual(npsBreakdown([]), npsBreakdown([]));
});

test('npsBreakdown: segments are 9–10 / 7–8 / 0–6', () => {
  const b = npsBreakdown([10, 9, 9, 8, 7, 6, 3, 9, 10, 5]);
  assert.equal(b.total, 10);
  assert.equal(b.promoters, 5);
  assert.equal(b.passives, 2);
  assert.equal(b.detractors, 3);
  assert.equal(b.promoterPct, 50);
  assert.equal(b.passivePct, 20);
  assert.equal(b.detractorPct, 30);
  assert.equal(b.score, 20);

  // boundaries
  assert.equal(npsBreakdown([9]).promoters, 1);
  assert.equal(npsBreakdown([8]).passives, 1);
  assert.equal(npsBreakdown([7]).passives, 1);
  assert.equal(npsBreakdown([6]).detractors, 1);
  assert.equal(npsBreakdown([0]).detractors, 1);
  assert.equal(npsBreakdown([10]).score, 100);
  assert.equal(npsBreakdown([0]).score, -100);
  assert.equal(npsBreakdown([7, 8]).score, 0);
});

test('npsBreakdown: values that are not a 0–10 integer are not answers', () => {
  const b = npsBreakdown([10, Number.NaN, 11, -1, 7.5, null, undefined, 3]);
  assert.equal(b.total, 2);
  assert.equal(b.promoters, 1);
  assert.equal(b.detractors, 1);
  assert.equal(b.score, 0);
});

test('npsBreakdown: promoterPct − detractorPct === score for every mix of up to 14 answers per segment', () => {
  for (let p = 0; p <= 14; p++) {
    for (let a = 0; a <= 14; a++) {
      for (let d = 0; d <= 14; d++) {
        if (p + a + d === 0) continue;
        const b = npsBreakdown(scoresFrom({ p, a, d }));
        assert.equal(b.promoterPct - b.detractorPct, b.score, `p=${p} a=${a} d=${d}`);
        assert.equal(b.total, p + a + d);
        assert.ok(b.passivePct >= 0 && b.promoterPct >= 0 && b.detractorPct >= 0);
        assert.ok(b.promoterPct <= 100 && b.detractorPct <= 100 && b.passivePct <= 100);
        assert.ok(b.score >= -100 && b.score <= 100);
      }
    }
  }
});

test('npsBreakdown: the three percentages add up to 100 (101 only in the half-way tie where the passive share is clamped)', () => {
  for (let p = 0; p <= 14; p++) {
    for (let a = 0; a <= 14; a++) {
      for (let d = 0; d <= 14; d++) {
        if (p + a + d === 0) continue;
        const b = npsBreakdown(scoresFrom({ p, a, d }));
        const sum = b.promoterPct + b.passivePct + b.detractorPct;
        assert.ok(
          sum === 100 || (sum === 101 && b.passivePct === 0),
          `p=${p} a=${a} d=${d} sum=${sum}`,
        );
      }
    }
  }
  // The documented tie: 1 promoter + 7 detractors of 8 → 12.5% and 87.5% both round up.
  const tie = npsBreakdown(scoresFrom({ p: 1, d: 7 }));
  assert.equal(tie.promoterPct, 13);
  assert.equal(tie.detractorPct, 88);
  assert.equal(tie.passivePct, 0);
  assert.equal(tie.score, -75);
});

test('npsBreakdown: the score is the difference of the ROUNDED percentages, not the exact fraction', () => {
  // 1 promoter, 2 detractors, 3 passives of 6: exact (1−2)/6·100 = −16.67 → −17,
  // but the screen shows 17% and 33%, so the score must read 17 − 33 = −16.
  const b = npsBreakdown(scoresFrom({ p: 1, a: 3, d: 2 }));
  assert.equal(b.promoterPct, 17);
  assert.equal(b.detractorPct, 33);
  assert.equal(b.passivePct, 50);
  assert.equal(b.score, -16);
});

test('npsBreakdown: exact halves stay exact (integer numerator before dividing)', () => {
  // 1 of 8 = 12.5 → 13; 1 of 200 = 0.5 → 1
  assert.equal(npsBreakdown(scoresFrom({ p: 1, a: 7 })).promoterPct, 13);
  assert.equal(npsBreakdown(scoresFrom({ p: 1, a: 199 })).promoterPct, 1);
  assert.equal(npsBreakdown(scoresFrom({ d: 1, a: 199 })).detractorPct, 1);
});

test('calculateNpsScore equals npsBreakdown(x).score for random inputs', () => {
  const rnd = mulberry32(7);
  for (let i = 0; i < 500; i++) {
    const n = Math.floor(rnd() * 60);
    const scores = Array.from({ length: n }, () => Math.floor(rnd() * 11));
    assert.equal(calculateNpsScore(scores), npsBreakdown(scores).score);
  }
});

// ── pickHeadlineQuestions ───────────────────────────────────────────────────

test('pickHeadlineQuestions: the first rating and the first nps question by sortOrder', () => {
  const questions = [
    { id: 'r2', type: 'rating', sortOrder: 20 },
    { id: 'n2', type: 'nps', sortOrder: 30 },
    { id: 't', type: 'long_text', sortOrder: 0 },
    { id: 'r1', type: 'rating', sortOrder: 10 },
    { id: 'n1', type: 'nps', sortOrder: 5 },
  ];
  const picked = pickHeadlineQuestions(questions);
  assert.equal(picked.rating?.id, 'r1');
  assert.equal(picked.nps?.id, 'n1');
  // the input array is not reordered
  assert.deepEqual(questions.map((q) => q.id), ['r2', 'n2', 't', 'r1', 'n1']);
});

test('pickHeadlineQuestions: missing types give null, ties keep input order', () => {
  assert.deepEqual(pickHeadlineQuestions([]), { rating: null, nps: null });
  const onlyText = pickHeadlineQuestions([{ id: 't', type: 'short_text', sortOrder: 0 }]);
  assert.equal(onlyText.rating, null);
  assert.equal(onlyText.nps, null);
  const tie = pickHeadlineQuestions([
    { id: 'first', type: 'rating', sortOrder: 0 },
    { id: 'second', type: 'rating', sortOrder: 0 },
  ]);
  assert.equal(tie.rating?.id, 'first');
});

// ── buildPerQuestionStats ───────────────────────────────────────────────────

const Q = {
  rating: { id: 'q-rating', text: 'Puan', type: 'rating', sortOrder: 0 },
  nps: { id: 'q-nps', text: 'Tavsiye', type: 'nps', sortOrder: 10 },
  choice: {
    id: 'q-choice',
    text: 'Seç',
    type: 'multiple_choice',
    options: ['Lezzet', 'Hizmet', 'Hız'],
    sortOrder: 20,
  },
  short: { id: 'q-short', text: 'Kısa', type: 'short_text', sortOrder: 30 },
  long: { id: 'q-long', text: 'Uzun', type: 'long_text', sortOrder: 40 },
} satisfies Record<string, AnalyticsQuestion>;

function at(minutes: number): Date {
  return new Date(Date.UTC(2026, 9, 1, 12, 0, 0) + minutes * 60_000);
}

function ans(
  questionId: string,
  over: Partial<AnalyticsAnswer> & { minute?: number } = {},
): AnalyticsAnswer {
  const { minute = 0, ...rest } = over;
  return {
    questionId,
    textValue: null,
    numberValue: null,
    optionValue: null,
    createdAt: at(minute),
    ...rest,
  };
}

test('buildPerQuestionStats: rating — mean (unrounded), fixed 1..5 distribution, no nps fields', () => {
  const [stats] = buildPerQuestionStats(
    [Q.rating],
    [5, 4, 4, 3, 5].map((n) => ans(Q.rating.id, { numberValue: n })),
  );
  assert.equal(stats.type, 'rating');
  assert.equal(stats.count, 5);
  assert.equal(stats.avg, 4.2);
  assert.deepEqual(stats.distribution, { '1': 0, '2': 0, '3': 1, '4': 2, '5': 2 });
  assert.equal(stats.npsScore, null);
  assert.equal(stats.nps, undefined);
});

test('buildPerQuestionStats: rating without answers — avg null, zero distribution', () => {
  const [stats] = buildPerQuestionStats([Q.rating], []);
  assert.equal(stats.count, 0);
  assert.equal(stats.avg, null);
  assert.deepEqual(stats.distribution, { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 });
});

test('buildPerQuestionStats: nps — score and segments come from npsBreakdown', () => {
  const numbers = [10, 9, 9, 8, 7, 6, 3, 9, 10, 5];
  const [stats] = buildPerQuestionStats(
    [Q.nps],
    numbers.map((n) => ans(Q.nps.id, { numberValue: n })),
  );
  const direct = npsBreakdown(numbers);
  assert.deepEqual(stats.nps, direct);
  assert.equal(stats.npsScore, direct.score);
  assert.equal(stats.count, 10);
  assert.equal(Object.keys(stats.distribution ?? {}).length, 11);
  assert.equal(stats.distribution?.['9'], 3);
  assert.equal(stats.avg, 7.6);
});

test('buildPerQuestionStats: multiple choice — distribution per option, ranked by count with stable ties', () => {
  const answers = [
    ...Array.from({ length: 5 }, () => ans(Q.choice.id, { optionValue: 'Hizmet' })),
    ...Array.from({ length: 3 }, () => ans(Q.choice.id, { optionValue: 'Lezzet' })),
    ...Array.from({ length: 3 }, () => ans(Q.choice.id, { optionValue: 'Hız' })),
    ans(Q.choice.id, { optionValue: 'Silinmiş seçenek' }), // not in the list any more
  ];
  const [stats] = buildPerQuestionStats([Q.choice], answers);
  assert.deepEqual(stats.distribution, { Lezzet: 3, Hizmet: 5, Hız: 3 });
  assert.equal(stats.count, 12); // every answer to the question
  assert.deepEqual(stats.ranked, [
    { option: 'Hizmet', count: 5, pct: 45 }, // 5 of the 11 counted answers
    { option: 'Lezzet', count: 3, pct: 27 }, // tie with Hız: option order wins (Lezzet first)
    { option: 'Hız', count: 3, pct: 27 },
  ]);
});

test('buildPerQuestionStats: multiple choice without answers — zero percentages, options in order', () => {
  const [stats] = buildPerQuestionStats([Q.choice], []);
  assert.deepEqual(stats.ranked, [
    { option: 'Lezzet', count: 0, pct: 0 },
    { option: 'Hizmet', count: 0, pct: 0 },
    { option: 'Hız', count: 0, pct: 0 },
  ]);
});

test('buildPerQuestionStats: text answers are listed newest → oldest whatever order they arrive in', () => {
  const answers = [
    ans(Q.short.id, { textValue: 'ikinci', minute: 10 }),
    ans(Q.short.id, { textValue: 'en yeni', minute: 30 }),
    ans(Q.short.id, { textValue: 'en eski', minute: 1 }),
    ans(Q.short.id, { textValue: 'üçüncü', minute: 20 }),
  ];
  const [stats] = buildPerQuestionStats([Q.short], answers);
  assert.deepEqual(stats.samples, ['en yeni', 'üçüncü', 'ikinci', 'en eski']);
  assert.deepEqual(
    stats.sampleItems?.map((s) => s.text),
    ['en yeni', 'üçüncü', 'ikinci', 'en eski'],
  );
  assert.deepEqual(
    stats.sampleItems?.map((s) => s.at),
    [at(30), at(20), at(10), at(1)].map((d) => d.toISOString()),
  );
  // Phase 1 never attaches a rating chip
  assert.ok(stats.sampleItems?.every((s) => s.rating === null));
});

test('buildPerQuestionStats: text samples skip empty values and stop at the limit', () => {
  const answers = [
    ...Array.from({ length: SAMPLE_ITEM_LIMIT + 7 }, (_, i) =>
      ans(Q.long.id, { textValue: `yorum ${i}`, minute: i }),
    ),
    ans(Q.long.id, { textValue: '', minute: 999 }),
    ans(Q.long.id, { textValue: null, minute: 1000 }),
  ];
  const [stats] = buildPerQuestionStats([Q.long], answers);
  assert.equal(stats.sampleItems?.length, SAMPLE_ITEM_LIMIT);
  assert.equal(stats.samples?.length, SAMPLE_ITEM_LIMIT);
  assert.equal(stats.samples?.[0], `yorum ${SAMPLE_ITEM_LIMIT + 6}`);
  assert.equal(stats.count, SAMPLE_ITEM_LIMIT + 7 + 2);
});

test('buildPerQuestionStats: equal timestamps keep the arrival order', () => {
  const [stats] = buildPerQuestionStats(
    [Q.short],
    ['a', 'b', 'c'].map((t) => ans(Q.short.id, { textValue: t, minute: 5 })),
  );
  assert.deepEqual(stats.samples, ['a', 'b', 'c']);
});

test('buildPerQuestionStats: one entry per question in the given order, answers of other questions never leak', () => {
  const stats = buildPerQuestionStats(
    [Q.short, Q.rating],
    [
      ans(Q.rating.id, { numberValue: 5 }),
      ans(Q.short.id, { textValue: 'x' }),
      ans('unknown-question', { numberValue: 1 }),
    ],
  );
  assert.deepEqual(stats.map((s) => s.id), [Q.short.id, Q.rating.id]);
  assert.equal(stats[0].count, 1);
  assert.equal(stats[1].count, 1);
  assert.equal(stats[1].avg, 5);
});

// ── buildSurveySummary ──────────────────────────────────────────────────────

const baseInput = {
  responses: 14,
  responsesAllTime: 20,
  collectContact: true,
  contactResponses: 9,
  lastResponseAt: at(500),
};

test('buildSurveySummary: counts, last response and contact figures are passed through', () => {
  const s = buildSurveySummary({ ...baseInput, questions: [Q.rating], answers: [] });
  assert.equal(s.responses, 14);
  assert.equal(s.responsesAllTime, 20);
  assert.equal(s.withContact, 9);
  assert.equal(s.lastResponseAt, at(500).toISOString());
  assert.equal(s.truncated, false);
});

test('buildSurveySummary: withContact only exists when the survey collects contact details', () => {
  const off = buildSurveySummary({
    ...baseInput,
    collectContact: false,
    contactResponses: 9, // legacy rows may still hold contact data
    questions: [],
    answers: [],
  });
  assert.equal(off.withContact, null);
  const on = buildSurveySummary({ ...baseInput, questions: [], answers: [] });
  assert.equal(on.withContact, 9);
  const zero = buildSurveySummary({ ...baseInput, contactResponses: 0, questions: [], answers: [] });
  assert.equal(zero.withContact, 0);
});

test('buildSurveySummary: lastResponseAt accepts Date, ISO string and null', () => {
  const iso = '2026-10-02T08:30:00.000Z';
  assert.equal(
    buildSurveySummary({ ...baseInput, lastResponseAt: iso, questions: [], answers: [] })
      .lastResponseAt,
    iso,
  );
  assert.equal(
    buildSurveySummary({ ...baseInput, lastResponseAt: null, questions: [], answers: [] })
      .lastResponseAt,
    null,
  );
});

test('buildSurveySummary: the headline questions are the lowest-sortOrder rating and nps, not the first in the list', () => {
  const questions: AnalyticsQuestion[] = [
    { id: 'r-late', text: 'Geç puan', type: 'rating', sortOrder: 50 },
    { id: 'n-late', text: 'Geç tavsiye', type: 'nps', sortOrder: 60 },
    { id: 'r-early', text: 'Erken puan', type: 'rating', sortOrder: 10 },
    { id: 'n-early', text: 'Erken tavsiye', type: 'nps', sortOrder: 20 },
  ];
  const answers = [
    ans('r-late', { numberValue: 1 }),
    ans('r-early', { numberValue: 5 }),
    ans('n-late', { numberValue: 0 }),
    ans('n-early', { numberValue: 10 }),
  ];
  const s = buildSurveySummary({ ...baseInput, questions, answers });
  assert.equal(s.rating?.questionId, 'r-early');
  assert.equal(s.rating?.text, 'Erken puan');
  assert.equal(s.rating?.avg, 5);
  assert.equal(s.nps?.questionId, 'n-early');
  assert.equal(s.nps?.score, 100);
});

test('buildSurveySummary: the average is rounded to one decimal', () => {
  const avgOf = (values: number[]) =>
    buildSurveySummary({
      ...baseInput,
      questions: [Q.rating],
      answers: values.map((n) => ans(Q.rating.id, { numberValue: n })),
    }).rating;
  assert.equal(avgOf([5, 4, 4, 4, 4, 4])?.avg, 4.2); // 4.1666…
  assert.equal(avgOf([4, 4, 4, 5])?.avg, 4.3); // 4.25 → 4.3
  assert.equal(avgOf([5, 5, 4, 4, 3])?.avg, 4.2); // 4.2 exactly
  assert.equal(avgOf([3, 4])?.avg, 3.5);
  assert.equal(avgOf([4, 4, 4])?.avg, 4);
  assert.equal(avgOf([5, 4, 4, 4, 4, 4])?.count, 6);
});

test('buildSurveySummary: rating and nps are null without such a question or without answers', () => {
  const noQuestions = buildSurveySummary({ ...baseInput, questions: [Q.short], answers: [] });
  assert.equal(noQuestions.rating, null);
  assert.equal(noQuestions.nps, null);
  const noAnswers = buildSurveySummary({ ...baseInput, questions: [Q.rating, Q.nps], answers: [] });
  assert.equal(noAnswers.rating, null);
  assert.equal(noAnswers.nps, null);
});

test('buildSurveySummary: the nps block mirrors npsBreakdown, so the card and the legend agree', () => {
  const numbers = scoresFrom({ p: 5, a: 3, d: 2 });
  const s = buildSurveySummary({
    ...baseInput,
    questions: [Q.nps],
    answers: numbers.map((n) => ans(Q.nps.id, { numberValue: n })),
  });
  const direct = npsBreakdown(numbers);
  assert.deepEqual(s.nps, {
    questionId: Q.nps.id,
    text: Q.nps.text,
    score: direct.score,
    count: direct.total,
    promoters: direct.promoters,
    passives: direct.passives,
    detractors: direct.detractors,
    promoterPct: direct.promoterPct,
    passivePct: direct.passivePct,
    detractorPct: direct.detractorPct,
  });
  assert.equal(s.nps!.promoterPct - s.nps!.detractorPct, s.nps!.score);
  // and it is the same number the per-question card shows
  const [perQuestion] = buildPerQuestionStats(
    [Q.nps],
    numbers.map((n) => ans(Q.nps.id, { numberValue: n })),
  );
  assert.equal(perQuestion.npsScore, s.nps!.score);
});

test('buildSurveySummary: truncated turns on exactly at the answer limit', () => {
  const make = (n: number) =>
    Array.from({ length: n }, () => ans(Q.short.id, { textValue: 'x' }));
  const below = buildSurveySummary({
    ...baseInput,
    questions: [Q.short],
    answers: make(ANALYTICS_ANSWER_LIMIT - 1),
  });
  assert.equal(below.truncated, false);
  const exactly = buildSurveySummary({
    ...baseInput,
    questions: [Q.short],
    answers: make(ANALYTICS_ANSWER_LIMIT),
  });
  assert.equal(exactly.truncated, true);
  assert.equal(ANALYTICS_ANSWER_LIMIT, 10_000);
});
