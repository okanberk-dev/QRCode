import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  CONTACT_EMAIL_MAX,
  COUPON_LABEL_REQUIRED_MESSAGE,
  OPTIONS_COUNT_MESSAGE,
  OPTIONS_DUPLICATE_MESSAGE,
  OPTION_LOCKED_MESSAGE,
  QUESTION_TYPE_LOCKED_MESSAGE,
  STALE_SURVEY_MESSAGE,
  SURVEY_EDIT_SELECT,
  SURVEY_OWNER_SELECT,
  SURVEY_PUBLIC_FALLBACK_BASE_URL,
  calculateNpsScore,
  deriveSurveyType,
  estimateSurveySeconds,
  findNewOptionDuplicates,
  formatSurveyDuration,
  getSurveyPublicBaseUrl,
  isCouponLabelMissing,
  isValidContactEmail,
  isOptionLocked,
  isQuestionTypeLocked,
  optionKey,
  planFailureToHttp,
  planQuestionSync,
  resolveUniqueSlug,
  slugifyTitle,
  surveyResponseShortId,
  surveyTypeIgnoredWarning,
  validateOptions,
  validateOptionsForWrite,
  type PlanExistingQuestion,
  type PlanIncomingQuestion,
  type QuestionPlan,
  type QuestionPlanFailure,
  type QuestionPlanSuccess,
} from '../src/lib/surveys';
import { npsBreakdown } from '../src/lib/survey-analytics';

// Surveys helpers. Phase 0: `surveyResponseShortId` (P0-3: the "Yanıt no" a
// customer sees on the thank-you screen is the last 6 chars of the REAL
// response id). Phase 1: slugifyTitle, derived type, duration wording, option
// rules R1–R3, planQuestionSync (PATCH never loses answers by accident), the
// coupon rule and the public base URL.

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

test('surveyResponseShortId: last 6 characters of the id, uppercased', () => {
  // A real cuid from the local DB shape: c + timestamp + counter + random.
  assert.equal(surveyResponseShortId('cmv6y2p3g000d7dbe2780altg'), '80ALTG');
  assert.equal(surveyResponseShortId('cmv4a2k9q0001xyz123'), 'XYZ123');
});

test('surveyResponseShortId: uses the random tail, not the shared head', () => {
  const a = surveyResponseShortId('cmv6y2p3g000d7dbe2780altg');
  const b = surveyResponseShortId('cmv6y2p3g000d7dbe2780bbbb');
  assert.notEqual(a, b);
});

test('surveyResponseShortId: output is ASCII-only [A-Z0-9], at most 6 chars', () => {
  const ids = [
    'cmv6y2p3g000d7dbe2780altg',
    'ckx1abcdefghijklmnopqrstu',
    'CLX9ZZZZZZ0000000000AAAAA',
    '0123456789',
  ];
  for (const id of ids) {
    const code = surveyResponseShortId(id);
    assert.match(code, /^[A-Z0-9]{1,6}$/, id);
    assert.equal(code.length, 6, id);
  }
});

test('surveyResponseShortId: non-ASCII characters are dropped, never transliterated or expanded', () => {
  // 'ß'.toUpperCase() === 'SS' would add letters; Turkish ı/İ/ş/ğ/ç/ö/ü are not ASCII.
  assert.equal(surveyResponseShortId('abcçğıöşü-ß_ŉ 12345xyz'), '345XYZ');
  assert.equal(surveyResponseShortId('xxxxxßß'), 'XXXXX');
  assert.equal(surveyResponseShortId('şğıöüç'), '');
});

test('surveyResponseShortId: locale-independent (Turkish dotted/dotless i)', () => {
  // toLocaleUpperCase('tr-TR') would turn "i" into "İ" (non-ASCII).
  assert.equal(surveyResponseShortId('qqqqqqi'), 'QQQQQI');
  assert.equal(surveyResponseShortId('ıiıiıi'), 'III');
});

test('surveyResponseShortId: separators are ignored, so formatted ids still give 6 characters', () => {
  assert.equal(surveyResponseShortId('a1b2-c3d4-e5f6'), 'D4E5F6');
  assert.equal(surveyResponseShortId('cm_v6 y2'), 'CMV6Y2');
});

test('surveyResponseShortId: short, empty or missing ids give a short/empty code, never a made-up one', () => {
  assert.equal(surveyResponseShortId('ab1'), 'AB1');
  assert.equal(surveyResponseShortId(''), '');
  assert.equal(surveyResponseShortId('   '), '');
  assert.equal(surveyResponseShortId('---'), '');
  assert.equal(surveyResponseShortId(null), '');
  assert.equal(surveyResponseShortId(undefined), '');
  assert.equal(surveyResponseShortId(12345 as unknown as string), '');
});

test('surveyResponseShortId: deterministic — same id, same code, every time', () => {
  const rnd = mulberry32(99);
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 200; i++) {
    let id = 'c';
    for (let j = 0; j < 24; j++) id += alphabet[Math.floor(rnd() * alphabet.length)];
    const first = surveyResponseShortId(id);
    assert.equal(surveyResponseShortId(id), first);
    assert.equal(first, id.slice(-6).toUpperCase());
    assert.match(first, /^[A-Z0-9]{6}$/);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Phase 1 — slugifyTitle
// ────────────────────────────────────────────────────────────────────────────

test('slugifyTitle: apostrophes are removed, not turned into a dash', () => {
  assert.equal(slugifyTitle("Mama's Burger — Anket"), 'mamas-burger-anket');
  assert.equal(slugifyTitle('Mama’s Burger'), 'mamas-burger'); // right single quotation mark
  assert.equal(slugifyTitle('Mama‘s Burger'), 'mamas-burger'); // left single quotation mark
  assert.equal(slugifyTitle('Mama`s Burger'), 'mamas-burger'); // grave accent
  assert.equal(slugifyTitle('Mama´s Burger'), 'mamas-burger'); // acute accent
  assert.equal(slugifyTitle('Mamaʼs Burger'), 'mamas-burger'); // modifier letter apostrophe
  assert.equal(slugifyTitle("O'Brien's"), 'obriens');
});

test('slugifyTitle: Turkish characters fall back to ASCII', () => {
  assert.equal(slugifyTitle('Çağrı Şükrü İğdır Öğle'), 'cagri-sukru-igdir-ogle');
  assert.equal(slugifyTitle('ÇAĞRI ŞÜKRÜ'), 'cagri-sukru');
  assert.equal(slugifyTitle('Müşteri Memnuniyet Anketi'), 'musteri-memnuniyet-anketi');
});

test('slugifyTitle: empty or symbol-only titles fall back to "anket"', () => {
  assert.equal(slugifyTitle(''), 'anket');
  assert.equal(slugifyTitle('   '), 'anket');
  assert.equal(slugifyTitle('!!! ??? ---'), 'anket');
  assert.equal(slugifyTitle("'''"), 'anket');
});

test('slugifyTitle: collapses runs, trims dashes, never ends on a dash after the 60-char cut', () => {
  assert.equal(slugifyTitle('  Hello   World!!  '), 'hello-world');
  const long = `${'a'.repeat(59)} bbbbbb`; // the 60th character is the separating dash
  const slug = slugifyTitle(long);
  assert.equal(slug, 'a'.repeat(59));
  assert.ok(slug.length <= 60);
  assert.doesNotMatch(slug, /^-|-$/);
  assert.match(slugifyTitle('x'.repeat(200)), /^x{60}$/);
});

test('resolveUniqueSlug: free slug stays, taken slug gets -2, -3 …', () => {
  assert.equal(resolveUniqueSlug('mamas', new Set()), 'mamas');
  assert.equal(resolveUniqueSlug('mamas', new Set(['mamas'])), 'mamas-2');
  assert.equal(resolveUniqueSlug('mamas', new Set(['mamas', 'mamas-2'])), 'mamas-3');
});

// ────────────────────────────────────────────────────────────────────────────
// Phase 1 — derived type, duration wording
// ────────────────────────────────────────────────────────────────────────────

test('deriveSurveyType: one question is single, anything else is multi_step', () => {
  assert.equal(deriveSurveyType(1), 'single');
  assert.equal(deriveSurveyType(2), 'multi_step');
  assert.equal(deriveSurveyType(30), 'multi_step');
  assert.equal(deriveSurveyType(0), 'multi_step');
});

test('estimateSurveySeconds: 9 seconds per question plus 12', () => {
  assert.equal(estimateSurveySeconds(0), 12);
  assert.equal(estimateSurveySeconds(1), 21);
  assert.equal(estimateSurveySeconds(3), 39);
  assert.equal(estimateSurveySeconds(5), 57);
  assert.equal(estimateSurveySeconds(30), 282);
  assert.equal(estimateSurveySeconds(Number.NaN), 12);
});

test('formatSurveyDuration: boundaries 29/30/59/60/89/90 in Turkish and English', () => {
  const tr = (n: number) => formatSurveyDuration(n, 'tr');
  const en = (n: number) => formatSurveyDuration(n, 'en');
  assert.deepEqual([29, 30, 59, 60, 89, 90].map(tr), [
    '~20 sn',
    '~45 sn',
    '~45 sn',
    '~1 dk',
    '~1 dk',
    '~2 dk',
  ]);
  assert.deepEqual([29, 30, 59, 60, 89, 90].map(en), [
    '~20 sec',
    '~45 sec',
    '~45 sec',
    '~1 min',
    '~1 min',
    '~2 min',
  ]);
  assert.equal(tr(0), '~20 sn');
  assert.equal(tr(150), '~3 dk'); // 2.5 → 3
  assert.equal(tr(282), '~5 dk');
  assert.equal(en(282), '~5 min');
});

test('formatSurveyDuration: question counts the owner and the customer see agree', () => {
  // The old owner UI said "~39 sn" while the customer read "~45 sn".
  assert.equal(formatSurveyDuration(estimateSurveySeconds(3), 'tr'), '~45 sn');
  assert.equal(formatSurveyDuration(estimateSurveySeconds(1), 'tr'), '~20 sn');
  assert.equal(formatSurveyDuration(estimateSurveySeconds(6), 'tr'), '~1 dk');
});

// ────────────────────────────────────────────────────────────────────────────
// Phase 1 — public base URL, coupon rule, NPS delegation
// ────────────────────────────────────────────────────────────────────────────

test('getSurveyPublicBaseUrl: env url wins unless it is local, trailing slashes removed', () => {
  assert.equal(getSurveyPublicBaseUrl('https://app.example.com'), 'https://app.example.com');
  assert.equal(getSurveyPublicBaseUrl('  https://app.example.com//  '), 'https://app.example.com');
  assert.equal(getSurveyPublicBaseUrl('http://localhost:3000'), SURVEY_PUBLIC_FALLBACK_BASE_URL);
  assert.equal(getSurveyPublicBaseUrl('http://127.0.0.1:3000/'), SURVEY_PUBLIC_FALLBACK_BASE_URL);
  assert.equal(getSurveyPublicBaseUrl(undefined), SURVEY_PUBLIC_FALLBACK_BASE_URL);
  assert.equal(getSurveyPublicBaseUrl(''), SURVEY_PUBLIC_FALLBACK_BASE_URL);
  assert.equal(SURVEY_PUBLIC_FALLBACK_BASE_URL, 'https://www.buaze.com');
});

test('isCouponLabelMissing: a code needs a description, empty or blank counts as missing', () => {
  assert.equal(isCouponLabelMissing('TESEKKUR10', ''), true);
  assert.equal(isCouponLabelMissing('TESEKKUR10', '   '), true);
  assert.equal(isCouponLabelMissing('TESEKKUR10', null), true);
  assert.equal(isCouponLabelMissing('TESEKKUR10', undefined), true);
  assert.equal(isCouponLabelMissing('TESEKKUR10', 'Bir sonraki ziyarette %10 indirim'), false);
  assert.equal(isCouponLabelMissing('', ''), false);
  assert.equal(isCouponLabelMissing('   ', ''), false);
  assert.equal(isCouponLabelMissing(null, 'Sadece açıklama'), false);
  assert.equal(isCouponLabelMissing(undefined, undefined), false);
  assert.equal(COUPON_LABEL_REQUIRED_MESSAGE, 'Kupon koduna bir açıklama ekle.');
});

test('calculateNpsScore delegates to npsBreakdown (one formula)', () => {
  const rnd = mulberry32(2024);
  for (let i = 0; i < 300; i++) {
    const n = Math.floor(rnd() * 40);
    const scores = Array.from({ length: n }, () => Math.floor(rnd() * 11));
    assert.equal(calculateNpsScore(scores), npsBreakdown(scores).score);
  }
  assert.equal(calculateNpsScore([]), 0);
  assert.equal(calculateNpsScore([10, 9, 9, 8, 7, 6, 3, 9, 10, 5]), 20);
});

// ────────────────────────────────────────────────────────────────────────────
// Phase 1 — option rules R2 / R3
// ────────────────────────────────────────────────────────────────────────────

test('optionKey: trim, collapse whitespace, Turkish lower-casing', () => {
  assert.equal(optionKey('  İyi  '), 'iyi');
  assert.equal(optionKey('iyi'), 'iyi');
  assert.equal(optionKey('Çok   Hızlı'), 'çok hızlı');
  assert.equal(optionKey('IYI'), 'ıyı'); // Turkish casing: capital I is dotless ı
});

test('validateOptionsForWrite (R3): a NEW duplicate is rejected, case- and space-insensitive', () => {
  assert.equal(validateOptionsForWrite(['Evet', 'Hayır', 'Evet']), null);
  assert.equal(validateOptionsForWrite(['İyi', 'iyi']), null);
  assert.equal(validateOptionsForWrite(['Çok  hızlı', 'çok hızlı']), null);
  assert.equal(validateOptionsForWrite(['  Evet ', 'evet']), null);
  assert.deepEqual(validateOptionsForWrite(['Evet', 'Hayır']), ['Evet', 'Hayır']);
});

test('validateOptionsForWrite (R3): an OLD duplicate can be saved as is, one copy can be removed, a third cannot be added', () => {
  const stored = ['İyi', 'iyi', 'Kötü'];
  // saved unchanged
  assert.deepEqual(validateOptionsForWrite(['İyi', 'iyi', 'Kötü'], stored), ['İyi', 'iyi', 'Kötü']);
  // reordered
  assert.deepEqual(validateOptionsForWrite(['Kötü', 'iyi', 'İyi'], stored), ['Kötü', 'iyi', 'İyi']);
  // one copy deleted
  assert.deepEqual(validateOptionsForWrite(['İyi', 'Kötü'], stored), ['İyi', 'Kötü']);
  // a third copy
  assert.equal(validateOptionsForWrite(['İyi', 'iyi', 'İYİ', 'Kötü'], stored), null);
  // another, unrelated option is added next to the old duplicates
  assert.deepEqual(validateOptionsForWrite(['İyi', 'iyi', 'Kötü', 'Orta'], stored), [
    'İyi',
    'iyi',
    'Kötü',
    'Orta',
  ]);
  // …but a NEW duplicate of an unrelated option is still rejected
  assert.equal(validateOptionsForWrite(['İyi', 'iyi', 'Kötü', 'Orta', 'orta'], stored), null);
});

test('validateOptionsForWrite (R3): adding the second copy of an option that was single is rejected', () => {
  assert.equal(validateOptionsForWrite(['Evet', 'Hayır', 'evet'], ['Evet', 'Hayır']), null);
});

test('validateOptionsForWrite: 2–6 options, trimmed, previous list may be junk', () => {
  assert.equal(validateOptionsForWrite(['Tek']), null);
  assert.equal(validateOptionsForWrite([]), null);
  assert.equal(validateOptionsForWrite(['a', 'b', 'c', 'd', 'e', 'f', 'g']), null);
  assert.deepEqual(validateOptionsForWrite(['a', 'b', 'c', 'd', 'e', 'f']), ['a', 'b', 'c', 'd', 'e', 'f']);
  assert.deepEqual(validateOptionsForWrite([' a ', 'b']), ['a', 'b']);
  assert.equal(validateOptionsForWrite('nope'), null);
  assert.equal(validateOptionsForWrite(undefined), null);
  assert.deepEqual(validateOptionsForWrite(['a', 'b'], 'garbage'), ['a', 'b']);
  assert.deepEqual(validateOptionsForWrite(['a', 'b'], null), ['a', 'b']);
  assert.deepEqual(validateOptionsForWrite(['a', 'b'], [1, null, {}]), ['a', 'b']);
  // validateOptions itself is unchanged: blanks are dropped, it does not look at duplicates
  assert.deepEqual(validateOptions(['a', '', 'a']), ['a', 'a']);
});

test('findNewOptionDuplicates: reports the offending rows (the later copies), blanks ignored', () => {
  assert.deepEqual(findNewOptionDuplicates(['a', 'b', 'A']), [2]);
  assert.deepEqual(findNewOptionDuplicates(['a', 'a', 'a']), [1, 2]);
  assert.deepEqual(findNewOptionDuplicates(['a', 'b']), []);
  assert.deepEqual(findNewOptionDuplicates(['', '', 'a']), []);
  // old duplicates (2 stored) are fine, the third copy is flagged
  assert.deepEqual(findNewOptionDuplicates(['İyi', 'iyi', 'İYİ'], ['İyi', 'iyi']), [2]);
  assert.deepEqual(findNewOptionDuplicates(['İyi', 'iyi'], ['İyi', 'iyi']), []);
});

test('isQuestionTypeLocked / isOptionLocked: R1 and R2 in one place', () => {
  assert.equal(isQuestionTypeLocked({ answerCount: 0 }), false);
  assert.equal(isQuestionTypeLocked({ answerCount: 1 }), true);
  const q = { answerCount: 5, usedOptions: ['Lezzet'] };
  assert.equal(isOptionLocked(q, 'Lezzet'), true);
  assert.equal(isOptionLocked(q, 'Hız'), false);
  assert.equal(isOptionLocked({ answerCount: 0, usedOptions: ['Lezzet'] }, 'Lezzet'), false);
});

// ────────────────────────────────────────────────────────────────────────────
// Phase 1 — planQuestionSync
// ────────────────────────────────────────────────────────────────────────────

function stored(
  id: string,
  over: Partial<PlanExistingQuestion> = {},
): PlanExistingQuestion {
  return { id, type: 'rating', options: null, answerCount: 0, usedOptions: [], ...over };
}

function sent(
  text: string,
  over: Partial<PlanIncomingQuestion> = {},
): PlanIncomingQuestion {
  return { text, type: 'rating', ...over };
}

function ok(plan: QuestionPlan): QuestionPlanSuccess {
  assert.equal(plan.ok, true, plan.ok ? '' : `plan failed: ${plan.code}`);
  return plan as QuestionPlanSuccess;
}

function failed(plan: QuestionPlan): QuestionPlanFailure {
  assert.equal(plan.ok, false, 'plan should have failed');
  return plan as QuestionPlanFailure;
}

test('planQuestionSync: reordering keeps every id and writes new positions (×10)', () => {
  const plan = ok(
    planQuestionSync(
      [stored('a', { answerCount: 4 }), stored('b'), stored('c', { answerCount: 2 })],
      [sent('C', { id: 'c' }), sent('A', { id: 'a' }), sent('B', { id: 'b' })],
    ),
  );
  assert.deepEqual(
    plan.update.map((u) => [u.id, u.sortOrder]),
    [
      ['c', 0],
      ['a', 10],
      ['b', 20],
    ],
  );
  assert.equal(plan.create.length, 0);
  assert.equal(plan.remove.length, 0);
});

test('planQuestionSync: a text change is an in-place update (trimmed), answers untouched', () => {
  const plan = ok(
    planQuestionSync(
      [stored('a', { answerCount: 14 })],
      [sent('  Genel memnuniyetiniz nasıl?  ', { id: 'a', required: false })],
    ),
  );
  assert.equal(plan.update.length, 1);
  assert.equal(plan.update[0].id, 'a');
  assert.equal(plan.update[0].text, 'Genel memnuniyetiniz nasıl?');
  assert.equal(plan.update[0].required, false);
  assert.equal(plan.update[0].options, null);
  assert.equal(plan.remove.length, 0);
});

test('planQuestionSync: a question without id is created at its position', () => {
  const plan = ok(
    planQuestionSync(
      [stored('a'), stored('b')],
      [sent('A', { id: 'a' }), sent('Yeni soru'), sent('B', { id: 'b' })],
    ),
  );
  assert.deepEqual(plan.update.map((u) => [u.id, u.sortOrder]), [
    ['a', 0],
    ['b', 20],
  ]);
  assert.equal(plan.create.length, 1);
  assert.equal(plan.create[0].text, 'Yeni soru');
  assert.equal(plan.create[0].sortOrder, 10);
  assert.equal(plan.create[0].required, true); // default
});

test('planQuestionSync: an explicitly removed question is deleted and reports its answer count', () => {
  const plan = ok(
    planQuestionSync(
      [stored('a'), stored('b', { answerCount: 7 }), stored('c')],
      [sent('A', { id: 'a' }), sent('C', { id: 'c' })],
      ['b'],
    ),
  );
  assert.deepEqual(plan.remove, [{ id: 'b', answerCount: 7 }]);
  assert.deepEqual(plan.update.map((u) => [u.id, u.sortOrder]), [
    ['a', 0],
    ['c', 10],
  ]);
});

test('planQuestionSync: removing an ANSWERED question without asking is refused (removal_not_confirmed)', () => {
  const f = failed(
    planQuestionSync(
      [stored('a'), stored('b', { answerCount: 7 })],
      [sent('A', { id: 'a' })],
    ),
  );
  assert.equal(f.code, 'removal_not_confirmed');
  assert.deepEqual(f.questionIds, ['b']);
  assert.equal(f.message, STALE_SURVEY_MESSAGE);
});

test('planQuestionSync: removing an UNANSWERED question without asking is refused too', () => {
  const f = failed(
    planQuestionSync([stored('a'), stored('b')], [sent('A', { id: 'a' })], []),
  );
  assert.equal(f.code, 'removal_not_confirmed');
  assert.deepEqual(f.questionIds, ['b']);
});

test('planQuestionSync: a request that confirms only some removals is refused for the rest', () => {
  const f = failed(
    planQuestionSync(
      [stored('a'), stored('b', { answerCount: 3 }), stored('c')],
      [sent('A', { id: 'a' })],
      ['c'],
    ),
  );
  assert.equal(f.code, 'removal_not_confirmed');
  assert.deepEqual(f.questionIds, ['b']);
});

test('planQuestionSync: a caller that sends no ids looks like it removes everything → refused for every stored question', () => {
  const f = failed(
    planQuestionSync(
      [stored('a', { answerCount: 9 }), stored('b', { answerCount: 9 })],
      [sent('Yeni 1'), sent('Yeni 2')],
    ),
  );
  assert.equal(f.code, 'removal_not_confirmed');
  assert.deepEqual(f.questionIds, ['a', 'b']);
});

test('planQuestionSync: a full replace is possible only when every stored id is named', () => {
  const plan = ok(
    planQuestionSync(
      [stored('a', { answerCount: 9 }), stored('b')],
      [sent('Yeni 1'), sent('Yeni 2')],
      ['a', 'b'],
    ),
  );
  assert.equal(plan.update.length, 0);
  assert.equal(plan.create.length, 2);
  assert.deepEqual(plan.remove, [
    { id: 'a', answerCount: 9 },
    { id: 'b', answerCount: 0 },
  ]);
});

test('planQuestionSync: stale tab — a question added elsewhere is missing from the payload and from the removal list', () => {
  // The other device added Q3; this tab never saw it.
  const f = failed(
    planQuestionSync(
      [stored('a'), stored('b'), stored('q3-added-elsewhere', { answerCount: 2 })],
      [sent('A', { id: 'a' }), sent('B', { id: 'b' })],
      [],
    ),
  );
  assert.equal(f.code, 'removal_not_confirmed');
  assert.deepEqual(f.questionIds, ['q3-added-elsewhere']);
});

test('planQuestionSync: removedQuestionIds that are unknown or still present are ignored', () => {
  const plan = ok(
    planQuestionSync(
      [stored('a', { answerCount: 5 }), stored('b')],
      [sent('A', { id: 'a' }), sent('B', { id: 'b' })],
      ['does-not-exist', 'a'],
    ),
  );
  assert.deepEqual(plan.remove, []);
  assert.equal(plan.update.length, 2);
});

test('planQuestionSync: changing the type of an answered question is locked (R1)', () => {
  const f = failed(
    planQuestionSync(
      [stored('a', { answerCount: 3 })],
      [sent('A', { id: 'a', type: 'nps' })],
    ),
  );
  assert.equal(f.code, 'question_locked');
  assert.equal(f.questionId, 'a');
  assert.equal(f.message, QUESTION_TYPE_LOCKED_MESSAGE);
});

test('planQuestionSync: an unanswered question may change type and options freely (e)', () => {
  const plan = ok(
    planQuestionSync(
      [stored('a'), stored('b', { type: 'multiple_choice', options: ['x', 'y'] })],
      [
        sent('A as choice', { id: 'a', type: 'multiple_choice', options: ['Evet', 'Hayır'] }),
        sent('B as stars', { id: 'b', type: 'rating', options: ['ignored'] }),
      ],
    ),
  );
  const a = plan.update.find((u) => u.id === 'a');
  const b = plan.update.find((u) => u.id === 'b');
  assert.equal(a?.type, 'multiple_choice');
  assert.deepEqual(a?.options, ['Evet', 'Hayır']);
  assert.equal(b?.type, 'rating');
  assert.equal(b?.options, null); // options of a non-choice question are cleared
});

const choiceStored = (over: Partial<PlanExistingQuestion> = {}) =>
  stored('m', {
    type: 'multiple_choice',
    options: ['Lezzet', 'Hizmet', 'Hız', 'Fiyat'],
    answerCount: 12,
    usedOptions: ['Lezzet', 'Hizmet'],
    ...over,
  });

const choiceSent = (options: string[]) =>
  sent('En çok neyi beğendiniz?', { id: 'm', type: 'multiple_choice', options });

test('planQuestionSync: an option that was picked cannot be removed or renamed (R2)', () => {
  const removed = failed(planQuestionSync([choiceStored()], [choiceSent(['Hizmet', 'Hız', 'Fiyat'])]));
  assert.equal(removed.code, 'question_locked');
  assert.equal(removed.questionId, 'm');
  assert.equal(removed.message, OPTION_LOCKED_MESSAGE);

  const renamed = failed(
    planQuestionSync([choiceStored()], [choiceSent(['Lezzet!', 'Hizmet', 'Hız', 'Fiyat'])]),
  );
  assert.equal(renamed.code, 'question_locked');
});

test('planQuestionSync: unused options of an answered question can be removed, renamed, reordered; new ones added (R2)', () => {
  // 'Hız' (unused) removed, 'Fiyat' (unused) renamed, new 'Ortam' added, order shuffled.
  const plan = ok(
    planQuestionSync(
      [choiceStored()],
      [choiceSent(['Hizmet', 'Ortam', 'Lezzet', 'Fiyatlar'])],
    ),
  );
  assert.deepEqual(plan.update[0].options, ['Hizmet', 'Ortam', 'Lezzet', 'Fiyatlar']);
});

test('planQuestionSync: an answered choice question where nobody picked an option yet is not option-locked', () => {
  const plan = ok(
    planQuestionSync(
      [choiceStored({ usedOptions: [] })],
      [choiceSent(['Tamamen', 'Yeni'])],
    ),
  );
  assert.deepEqual(plan.update[0].options, ['Tamamen', 'Yeni']);
});

test('planQuestionSync: an incoming id that is not a stored question is stale (unknown_question)', () => {
  const f = failed(
    planQuestionSync([stored('a')], [sent('A', { id: 'a' }), sent('Ghost', { id: 'ghost' })]),
  );
  assert.equal(f.code, 'unknown_question');
  assert.deepEqual(f.questionIds, ['ghost']);
  assert.equal(f.message, STALE_SURVEY_MESSAGE);
});

test('planQuestionSync: the same id twice is unknown_question', () => {
  const f = failed(
    planQuestionSync([stored('a')], [sent('A', { id: 'a' }), sent('A again', { id: 'a' })]),
  );
  assert.equal(f.code, 'unknown_question');
  assert.deepEqual(f.questionIds, ['a']);
});

test('planQuestionSync: an id from ANOTHER survey is unknown (existing only holds this survey)', () => {
  const f = failed(planQuestionSync([stored('mine')], [sent('X', { id: 'someone-elses' })], ['mine']));
  assert.equal(f.code, 'unknown_question');
  assert.deepEqual(f.questionIds, ['someone-elses']);
});

test('planQuestionSync: a new choice question needs 2–6 distinct options (invalid_options)', () => {
  const few = failed(
    planQuestionSync([], [sent('Seç', { type: 'multiple_choice', options: ['Tek'] })]),
  );
  assert.equal(few.code, 'invalid_options');
  assert.equal(few.message, OPTIONS_COUNT_MESSAGE);
  assert.equal(few.question, 'Seç');

  const dup = failed(
    planQuestionSync([], [sent('Seç', { type: 'multiple_choice', options: ['Evet', 'evet'] })]),
  );
  assert.equal(dup.code, 'invalid_options');
  assert.equal(dup.message, OPTIONS_DUPLICATE_MESSAGE);
});

test('planQuestionSync: duplicates already stored do not block an edit, new duplicates do (R3 in the plan)', () => {
  const legacy = stored('m', { type: 'multiple_choice', options: ['İyi', 'iyi', 'Kötü'] });
  // untouched legacy duplicates + a text change
  ok(
    planQuestionSync(
      [legacy],
      [sent('Nasıldı?', { id: 'm', type: 'multiple_choice', options: ['İyi', 'iyi', 'Kötü'] })],
    ),
  );
  // one copy removed
  ok(
    planQuestionSync(
      [legacy],
      [sent('Nasıldı?', { id: 'm', type: 'multiple_choice', options: ['İyi', 'Kötü'] })],
    ),
  );
  // a third copy added
  const f = failed(
    planQuestionSync(
      [legacy],
      [sent('Nasıldı?', { id: 'm', type: 'multiple_choice', options: ['İyi', 'iyi', 'İYİ', 'Kötü'] })],
    ),
  );
  assert.equal(f.code, 'invalid_options');
  assert.equal(f.questionId, 'm');
});

test('planQuestionSync: a rating question converted to a choice question is strict (no earlier list)', () => {
  const f = failed(
    planQuestionSync(
      [stored('a')],
      [sent('A', { id: 'a', type: 'multiple_choice', options: ['x', 'X'] })],
    ),
  );
  assert.equal(f.code, 'invalid_options');
});

test('planQuestionSync: a stale payload is reported as stale before anything else', () => {
  // Unknown id AND an invalid option list AND a locked type change: stale wins.
  const f = failed(
    planQuestionSync(
      [stored('a', { answerCount: 2 })],
      [
        sent('A', { id: 'a', type: 'nps' }),
        sent('B', { id: 'ghost', type: 'multiple_choice', options: ['only'] }),
      ],
    ),
  );
  assert.equal(f.code, 'unknown_question');
});

test('planQuestionSync: the plan is deterministic and never mutates its inputs', () => {
  const existing = [stored('a', { answerCount: 1 }), stored('b')];
  const incoming = [sent('B', { id: 'b' }), sent('A', { id: 'a' })];
  const snapshot = JSON.stringify({ existing, incoming });
  const first = planQuestionSync(existing, incoming);
  const second = planQuestionSync(existing, incoming);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify({ existing, incoming }), snapshot);
});

test('planFailureToHttp: stale/locked/unconfirmed are 409, invalid options is 400, unknown_question is published as stale_survey', () => {
  const stale = planFailureToHttp(
    failed(planQuestionSync([stored('a')], [sent('G', { id: 'ghost' })])),
  );
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error, 'stale_survey');
  assert.deepEqual(stale.body.questionIds, ['ghost']);
  assert.equal(stale.body.message, STALE_SURVEY_MESSAGE);

  const unconfirmed = planFailureToHttp(
    failed(planQuestionSync([stored('a'), stored('b')], [sent('A', { id: 'a' })])),
  );
  assert.equal(unconfirmed.status, 409);
  assert.equal(unconfirmed.body.error, 'removal_not_confirmed');
  assert.deepEqual(unconfirmed.body.questionIds, ['b']);

  const locked = planFailureToHttp(
    failed(
      planQuestionSync(
        [stored('a', { answerCount: 1 })],
        [sent('A', { id: 'a', type: 'nps' })],
      ),
    ),
  );
  assert.equal(locked.status, 409);
  assert.equal(locked.body.error, 'question_locked');
  assert.equal(locked.body.questionId, 'a');

  const invalid = planFailureToHttp(
    failed(planQuestionSync([], [sent('Seç', { type: 'multiple_choice', options: ['x'] })])),
  );
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error, 'invalid_options');
  assert.equal(invalid.body.question, 'Seç');
});

// ────────────────────────────────────────────────────────────────────────────
// Phase 1 — select shapes
// ────────────────────────────────────────────────────────────────────────────

test('SURVEY_EDIT_SELECT: the owner select plus a per-question answer count; the plain select is unchanged', () => {
  assert.equal(SURVEY_EDIT_SELECT.questions.select._count.select.answers, true);
  for (const key of ['id', 'text', 'type', 'options', 'required', 'sortOrder'] as const) {
    assert.equal(SURVEY_EDIT_SELECT.questions.select[key], true, key);
  }
  assert.deepEqual(SURVEY_EDIT_SELECT.questions.orderBy, { sortOrder: 'asc' });
  assert.equal(SURVEY_EDIT_SELECT.slug, true);
  assert.equal(SURVEY_EDIT_SELECT._count.select.responses, true);
  // the shared select must not grow a per-question count
  assert.equal('_count' in SURVEY_OWNER_SELECT.questions.select, false);
});

// ────────────────────────────────────────────────────────────────────────────
// Contact e-mail on the public form + POST `type` note
// ────────────────────────────────────────────────────────────────────────────

test('isValidContactEmail: the form accepts exactly what the submit route (z.string().email().max(200)) accepts', () => {
  const route = z.string().email().max(CONTACT_EMAIL_MAX);
  const samples = [
    'ad@ornek.com',
    'ad.soyad@ornek.com.tr',
    'ad+etiket@ornek.com',
    "o'neil@ornek.com",
    'a@b.co',
    'abc',
    'abc@',
    '@ornek.com',
    'ad@ornek',
    'ad@ornek..com',
    'ad..soyad@ornek.com',
    '.ad@ornek.com',
    'ad.@ornek.com',
    'ad @ornek.com',
    'ad@orn ek.com',
    'ad@ornek.c',
    'ad@-ornek.com',
    'ad@ornek.com.',
    'türkçe@ornek.com',
    `${'a'.repeat(CONTACT_EMAIL_MAX)}@ornek.com`,
  ];
  for (const sample of samples) {
    assert.equal(isValidContactEmail(sample), route.safeParse(sample).success, JSON.stringify(sample));
  }
});

test('isValidContactEmail: surrounding spaces are ignored (the form trims), empty is not an address', () => {
  assert.equal(isValidContactEmail('  ad@ornek.com  '), true);
  assert.equal(isValidContactEmail(''), false);
  assert.equal(isValidContactEmail('   '), false);
  assert.equal(isValidContactEmail('abc'), false);
});

test('surveyTypeIgnoredWarning: only a type that disagrees with the stored one is reported', () => {
  assert.equal(surveyTypeIgnoredWarning(undefined, 'multi_step'), null);
  assert.equal(surveyTypeIgnoredWarning('multi_step', 'multi_step'), null);
  assert.equal(surveyTypeIgnoredWarning('single', 'single'), null);
  const w = surveyTypeIgnoredWarning('single', 'multi_step');
  assert.equal(w?.code, 'type_ignored');
  assert.match(w?.message ?? '', /"single" was ignored and "multi_step" was stored/);
});
