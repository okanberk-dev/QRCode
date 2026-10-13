/**
 * Denetim Merkezi — public submit sertleştirmesi (spec §6.8) + paylaşım linki
 * durum kuralları (spec §2 A2, §6.7) birim testleri.
 *
 * Eski `audits-submit-integration.test.ts` rota mantığını test içinde
 * "aynalıyordu"; bu dosya rotanın gerçekten çağırdığı saf fonksiyonları test
 * eder.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  canAcceptSubmission,
  isReusable,
  isUsedUp,
  nextAssignmentStatus,
} from '../src/lib/audits/assignment-state';
import {
  MULTI_ITEM_MAX_CHARS,
  MULTI_MAX_ITEMS,
  OWNER_MAIL_RESTAURANT_DAILY_RULE,
  OWNER_MAIL_TEMPLATE_RULE,
  PHOTOS_TOTAL_MAX_BYTES,
  PHOTO_MAX_BYTES,
  REPLAY_WINDOW_MS,
  REQUEST_MAX_BYTES,
  SUBMIT_ASSIGNMENT_DAILY_RULE,
  SUBMIT_ASSIGNMENT_RULE,
  SUBMIT_IP_RULE,
  TEXT_ANSWER_MAX_CHARS,
  findMissingRequired,
  isReplaySubmission,
  shouldNotifyOwner,
  validateAnswerPayload,
  visibleOutcome,
  visibleScore,
} from '../src/lib/audits/submit-guards';

const photo = (bytes: number) => 'data:image/webp;base64,' + 'A'.repeat(Math.max(0, bytes - 23));

describe('assignment-state — single-use vs reusable links (A2)', () => {
  it('isUsedUp is true ONLY for a completed one-time link', () => {
    assert.equal(isUsedUp({ status: 'completed', recurrence: 'once' }), true);
    assert.equal(isUsedUp({ status: 'pending', recurrence: 'once' }), false);
    assert.equal(isUsedUp({ status: 'completed', recurrence: 'daily' }), false);
    assert.equal(isUsedUp({ status: 'completed', recurrence: 'weekly' }), false);
    assert.equal(isUsedUp({ status: 'completed', recurrence: 'monthly' }), false);
    assert.equal(isUsedUp({ status: 'cancelled', recurrence: 'once' }), false);
  });

  it('isReusable: everything except once (null / undefined → reusable, they are not "once")', () => {
    assert.equal(isReusable('once'), false);
    assert.equal(isReusable('daily'), true);
    assert.equal(isReusable('weekly'), true);
    assert.equal(isReusable('monthly'), true);
    assert.equal(isReusable(undefined), true);
    assert.equal(isReusable(null), true);
  });

  it('nextAssignmentStatus: once flips to completed, reusable stays pending', () => {
    assert.equal(nextAssignmentStatus('once'), 'completed');
    assert.equal(nextAssignmentStatus('daily'), 'pending');
    assert.equal(nextAssignmentStatus('weekly'), 'pending');
    assert.equal(nextAssignmentStatus('monthly'), 'pending');
  });

  it('a DAILY link accepts two sequential submissions', () => {
    let status: string = 'pending';
    const link = { recurrence: 'daily', tokenRevoked: false };

    assert.equal(canAcceptSubmission({ ...link, status }), true);
    status = nextAssignmentStatus(link.recurrence); // after submission #1
    assert.equal(status, 'pending');

    assert.equal(canAcceptSubmission({ ...link, status }), true, 'second visitor is accepted');
    status = nextAssignmentStatus(link.recurrence); // after submission #2
    assert.equal(status, 'pending');
  });

  it('a ONCE link accepts the first submission and then rejects', () => {
    let status: string = 'pending';
    const link = { recurrence: 'once', tokenRevoked: false };

    assert.equal(canAcceptSubmission({ ...link, status }), true);
    status = nextAssignmentStatus(link.recurrence);
    assert.equal(status, 'completed');
    assert.equal(canAcceptSubmission({ ...link, status }), false);
  });

  it('revoked / cancelled links never accept, whatever the recurrence', () => {
    assert.equal(canAcceptSubmission({ status: 'pending', recurrence: 'daily', tokenRevoked: true }), false);
    assert.equal(canAcceptSubmission({ status: 'cancelled', recurrence: 'daily' }), false);
    assert.equal(canAcceptSubmission({ status: 'in_progress', recurrence: 'weekly' }), true);
    assert.equal(canAcceptSubmission({ status: 'sent', recurrence: 'once' }), true);
    assert.equal(canAcceptSubmission({ status: 'overdue', recurrence: 'once' }), true);
  });
});

describe('constants (spec §6.8)', () => {
  it('match the written limits', () => {
    assert.equal(PHOTO_MAX_BYTES, 800 * 1024);
    assert.equal(PHOTOS_TOTAL_MAX_BYTES, Math.round(2.4 * 1024 * 1024));
    assert.equal(REQUEST_MAX_BYTES, 3 * 1024 * 1024);
    assert.equal(TEXT_ANSWER_MAX_CHARS, 4000);
    assert.equal(MULTI_MAX_ITEMS, 50);
    assert.equal(MULTI_ITEM_MAX_CHARS, 200);
    assert.equal(REPLAY_WINDOW_MS, 30_000);
    assert.deepEqual(SUBMIT_IP_RULE, { max: 20, windowMs: 60_000 });
    assert.deepEqual(SUBMIT_ASSIGNMENT_RULE, { max: 30, windowMs: 60_000 });
    assert.deepEqual(SUBMIT_ASSIGNMENT_DAILY_RULE, { max: 300, windowMs: 86_400_000 });
    assert.deepEqual(OWNER_MAIL_TEMPLATE_RULE, { max: 1, windowMs: 3_600_000 });
    assert.deepEqual(OWNER_MAIL_RESTAURANT_DAILY_RULE, { max: 20, windowMs: 86_400_000 });
  });

  it('three max-size photos still fit the 2.4 MB budget; a fourth one exceeds it (the total cap is reachable)', () => {
    assert.ok(3 * PHOTO_MAX_BYTES <= PHOTOS_TOTAL_MAX_BYTES);
    assert.ok(4 * PHOTO_MAX_BYTES > PHOTOS_TOTAL_MAX_BYTES);
  });
});

describe('validateAnswerPayload', () => {
  const questions = [
    { id: 'yn', type: 'yes_no' },
    { id: 'sc', type: 'scale' },
    { id: 'tx', type: 'text' },
    { id: 'si', type: 'single' },
    { id: 'mu', type: 'multi' },
    { id: 'f1', type: 'file' },
    { id: 'f2', type: 'file' },
    { id: 'f3', type: 'file' },
    { id: 'f4', type: 'file' },
  ];

  it('accepts a clean mixed submission and reports the photo bytes', () => {
    const p = photo(1000);
    const r = validateAnswerPayload(questions, [
      { questionId: 'yn', value: 'Evet' },
      { questionId: 'sc', value: 4 },
      { questionId: 'tx', value: 'tamam' },
      { questionId: 'si', value: 'A' },
      { questionId: 'mu', value: ['A', 'B'] },
      { questionId: 'f1', value: p },
    ]);
    assert.deepEqual(r, { ok: true, photoBytes: p.length });
  });

  it('empty values (null / undefined / "" / []) are allowed here — required-ness is separate', () => {
    const r = validateAnswerPayload(questions, [
      { questionId: 'yn', value: null },
      { questionId: 'sc', value: undefined },
      { questionId: 'tx', value: '' },
      { questionId: 'mu', value: [] },
      { questionId: 'f1', value: null },
    ]);
    assert.equal(r.ok, true);
  });

  it('unknown question id → INVALID_QUESTION_ID', () => {
    const r = validateAnswerPayload(questions, [{ questionId: 'ghost', value: 'x' }]);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.code, 'INVALID_QUESTION_ID');
      assert.equal(r.questionId, 'ghost');
    }
  });

  it('the same question twice → INVALID_ANSWER (never reaches createMany)', () => {
    const r = validateAnswerPayload(questions, [
      { questionId: 'yn', value: 'Evet' },
      { questionId: 'yn', value: 'Hayır' },
    ]);
    assert.equal(r.ok === false && r.code, 'INVALID_ANSWER');
  });

  it('a photo over 800 KB → PHOTO_TOO_LARGE; exactly at the limit is fine', () => {
    const over = validateAnswerPayload(questions, [{ questionId: 'f1', value: photo(PHOTO_MAX_BYTES + 1) }]);
    assert.equal(over.ok === false && over.code, 'PHOTO_TOO_LARGE');
    const at = validateAnswerPayload(questions, [{ questionId: 'f1', value: photo(PHOTO_MAX_BYTES) }]);
    assert.equal(at.ok, true);
  });

  it('four 790 KB photos exceed the 2.4 MB total → PHOTO_TOO_LARGE on the offending (4th) one', () => {
    const each = 790 * 1024;
    const three = validateAnswerPayload(questions, [
      { questionId: 'f1', value: photo(each) },
      { questionId: 'f2', value: photo(each) },
      { questionId: 'f3', value: photo(each) },
    ]);
    assert.equal(three.ok, true, 'three photos fit the budget');

    const r = validateAnswerPayload(questions, [
      { questionId: 'f1', value: photo(each) },
      { questionId: 'f2', value: photo(each) },
      { questionId: 'f3', value: photo(each) },
      { questionId: 'f4', value: photo(each) },
    ]);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.code, 'PHOTO_TOO_LARGE');
      assert.equal(r.questionId, 'f4');
    }
  });

  it('a file answer that is not a data:image URL → INVALID_PHOTO', () => {
    for (const bad of ['https://evil.example/x.png', 'data:text/html;base64,AAAA', 42, ['data:image/png;base64,AA']]) {
      const r = validateAnswerPayload(questions, [{ questionId: 'f1', value: bad }]);
      assert.equal(r.ok === false && r.code, 'INVALID_PHOTO', JSON.stringify(bad));
    }
  });

  it('data: URLs cannot be smuggled into non-file answers', () => {
    for (const [id, value] of [
      ['tx', 'data:image/png;base64,AAAA'],
      ['si', 'data:text/plain,hi'],
      ['yn', 'data:x'],
      ['mu', ['ok', 'data:image/png;base64,AAAA']],
    ] as const) {
      const r = validateAnswerPayload(questions, [{ questionId: id, value }]);
      assert.equal(r.ok === false && r.code, 'INVALID_ANSWER', id);
    }
  });

  it('text answers: 4000 chars fine, 4001 rejected', () => {
    assert.equal(
      validateAnswerPayload(questions, [{ questionId: 'tx', value: 'a'.repeat(TEXT_ANSWER_MAX_CHARS) }]).ok,
      true,
    );
    const r = validateAnswerPayload(questions, [{ questionId: 'tx', value: 'a'.repeat(TEXT_ANSWER_MAX_CHARS + 1) }]);
    assert.equal(r.ok === false && r.code, 'INVALID_ANSWER');
  });

  it('multi: ≤ 50 items of ≤ 200 chars, strings only', () => {
    const fifty = Array.from({ length: MULTI_MAX_ITEMS }, (_, i) => `o${i}`);
    assert.equal(validateAnswerPayload(questions, [{ questionId: 'mu', value: fifty }]).ok, true);
    assert.equal(
      validateAnswerPayload(questions, [{ questionId: 'mu', value: [...fifty, 'one more'] }]).ok,
      false,
    );
    assert.equal(
      validateAnswerPayload(questions, [{ questionId: 'mu', value: ['x'.repeat(MULTI_ITEM_MAX_CHARS + 1)] }]).ok,
      false,
    );
    assert.equal(validateAnswerPayload(questions, [{ questionId: 'mu', value: ['ok', 5] }]).ok, false);
    assert.equal(validateAnswerPayload(questions, [{ questionId: 'mu', value: 'not-an-array' }]).ok, false);
  });

  it('scale: finite numbers or numeric strings; anything else rejected', () => {
    for (const ok of [1, 5, 0, 3.5, '4', ' 2 ']) {
      assert.equal(validateAnswerPayload(questions, [{ questionId: 'sc', value: ok }]).ok, true, String(ok));
    }
    for (const bad of ['abc', NaN, Infinity, {}, true, ['4'], '1'.repeat(40)]) {
      const r = validateAnswerPayload(questions, [{ questionId: 'sc', value: bad as unknown }]);
      assert.equal(r.ok, false, String(bad));
    }
  });

  it('wrong JSON types for string questions are rejected (object / number / boolean)', () => {
    for (const bad of [{ a: 1 }, 7, true]) {
      const r = validateAnswerPayload(questions, [{ questionId: 'tx', value: bad as unknown }]);
      assert.equal(r.ok === false && r.code, 'INVALID_ANSWER');
    }
  });

  it('an unknown question TYPE in the template is never accepted with a value', () => {
    const r = validateAnswerPayload([{ id: 'z', type: 'hologram' }], [{ questionId: 'z', value: 'x' }]);
    assert.equal(r.ok === false && r.code, 'INVALID_ANSWER');
  });
});

describe('findMissingRequired (the real helper the submit route uses)', () => {
  const qs = [
    { id: 'q1', isRequired: true },
    { id: 'q2', isRequired: true },
    { id: 'q3', isRequired: false },
  ];

  it('flags absent rows, null, "", whitespace and [] for required questions', () => {
    assert.deepEqual(
      findMissingRequired(qs, [{ questionId: 'q1', value: 'A' }]).map((q) => q.id),
      ['q2'],
    );
    assert.deepEqual(
      findMissingRequired(qs, [
        { questionId: 'q1', value: '' },
        { questionId: 'q2', value: '   ' },
      ]).map((q) => q.id),
      ['q1', 'q2'],
    );
    assert.deepEqual(
      findMissingRequired(qs, [
        { questionId: 'q1', value: null },
        { questionId: 'q2', value: [] },
      ]).map((q) => q.id),
      ['q1', 'q2'],
    );
  });

  it('never flags optional questions; a fully answered form has nothing missing', () => {
    assert.deepEqual(
      findMissingRequired(qs, [
        { questionId: 'q1', value: 'A' },
        { questionId: 'q2', value: ['X'] },
      ]),
      [],
    );
  });

  it('0 is an answer (a 0 on a scale is not "missing")', () => {
    assert.deepEqual(
      findMissingRequired([{ id: 's', isRequired: true }], [{ questionId: 's', value: 0 }]),
      [],
    );
  });
});

describe('isReplaySubmission — double tap / network retry', () => {
  const now = Date.UTC(2026, 9, 13, 12, 0, 0);
  const stored = (ageMs: number, over: Record<string, unknown> = {}) => ({
    createdAt: new Date(now - ageMs),
    respondentName: 'Ayşe',
    respondentEmail: null,
    respondentPhone: null,
    answers: [
      { questionId: 'a', value: 'Evet' },
      { questionId: 'b', value: 'Hayır' },
      { questionId: 'c', value: null },
    ],
    ...over,
  });
  const incoming = {
    respondentName: 'Ayşe',
    respondentEmail: null,
    respondentPhone: null,
    answers: [
      { questionId: 'a', value: 'Evet' },
      { questionId: 'b', value: 'Hayır' },
      { questionId: 'c', value: null },
    ],
  };

  it('same name + same answers within 30 s is a replay', () => {
    assert.equal(isReplaySubmission(stored(5_000), incoming, { now }), true);
    assert.equal(isReplaySubmission(stored(30_000), incoming, { now }), true, 'boundary is inclusive');
  });

  it('older than the window is a NEW submission (a legitimate second fill)', () => {
    assert.equal(isReplaySubmission(stored(30_001), incoming, { now }), false);
    assert.equal(isReplaySubmission(stored(5 * 60_000), incoming, { now }), false);
  });

  it('a different answer, a different name or different contact info is not a replay', () => {
    assert.equal(
      isReplaySubmission(
        stored(1_000),
        { ...incoming, answers: [{ questionId: 'a', value: 'Hayır' }, ...incoming.answers.slice(1)] },
        { now },
      ),
      false,
    );
    assert.equal(isReplaySubmission(stored(1_000), { ...incoming, respondentName: 'Mehmet' }, { now }), false);
    assert.equal(
      isReplaySubmission(stored(1_000), { ...incoming, respondentEmail: 'a@b.co' }, { now }),
      false,
    );
  });

  it('empty and missing values are equivalent; name comparison ignores case and padding', () => {
    const noC = { ...incoming, answers: incoming.answers.slice(0, 2) };
    assert.equal(isReplaySubmission(stored(1_000), noC, { now }), true);
    assert.equal(isReplaySubmission(stored(1_000), { ...incoming, respondentName: '  ayşe ' }, { now }), true);
    assert.equal(
      isReplaySubmission(
        stored(1_000, { respondentName: null }),
        { ...incoming, respondentName: '   ' },
        { now },
      ),
      true,
    );
  });

  it('multi answers compare as sets (order does not matter)', () => {
    const a = { ...incoming, answers: [{ questionId: 'm', value: ['B', 'A'] }] };
    const b = stored(1_000, { answers: [{ questionId: 'm', value: ['A', 'B'] }] });
    assert.equal(isReplaySubmission(b, a, { now }), true);
    const c = stored(1_000, { answers: [{ questionId: 'm', value: ['A'] }] });
    assert.equal(isReplaySubmission(c, a, { now }), false);
  });

  it('file answers are ignored on BOTH sides when listed (photos are never loaded from the DB)', () => {
    const withPhoto = { ...incoming, answers: [...incoming.answers, { questionId: 'f', value: photo(500) }] };
    const ignore = new Set(['f']);
    assert.equal(isReplaySubmission(stored(1_000), withPhoto, { now, ignoreQuestionIds: ignore }), true);
    assert.equal(isReplaySubmission(stored(1_000), withPhoto, { now }), false);
  });

  it('accepts ISO strings and a custom window; garbage dates are never a replay', () => {
    assert.equal(
      isReplaySubmission(
        { ...stored(0), createdAt: new Date(now - 1_000).toISOString() },
        incoming,
        { now },
      ),
      true,
    );
    assert.equal(isReplaySubmission(stored(10_000), incoming, { now, windowMs: 5_000 }), false);
    assert.equal(isReplaySubmission({ ...stored(0), createdAt: 'not a date' }, incoming, { now }), false);
  });
});

describe('shouldNotifyOwner — owner mail policy', () => {
  it('a clean checklist response sends NO mail', () => {
    assert.equal(shouldNotifyOwner({ passed: true, attentionCount: 0, kind: 'checklist' }), false);
    assert.equal(shouldNotifyOwner({ passed: null, attentionCount: 0, kind: 'checklist' }), false);
  });

  it('a failed response sends mail', () => {
    assert.equal(shouldNotifyOwner({ passed: false, attentionCount: 0, kind: 'checklist' }), true);
  });

  it('any item needing attention sends mail', () => {
    assert.equal(shouldNotifyOwner({ passed: null, attentionCount: 1, kind: 'checklist' }), true);
    assert.equal(shouldNotifyOwner({ passed: true, attentionCount: 3, kind: 'checklist' }), true);
  });

  it('a test (quiz) always notifies — the owner is waiting for candidates', () => {
    assert.equal(shouldNotifyOwner({ passed: true, attentionCount: 0, kind: 'quiz' }), true);
    assert.equal(shouldNotifyOwner({ passed: null, attentionCount: 0, kind: 'quiz' }), true);
  });
});

describe('visibleScore / visibleOutcome — the respondent never sees a test score', () => {
  it('checklists show their score; unscorable forms show nothing', () => {
    assert.equal(visibleScore({ score: 100, kind: 'checklist' }), 100);
    assert.equal(visibleScore({ score: 0, kind: 'checklist' }), 0);
    assert.equal(visibleScore({ score: null, kind: 'checklist' }), null);
    assert.equal(visibleScore({ score: undefined, kind: 'checklist' }), null);
    assert.equal(visibleScore({ score: NaN, kind: 'checklist' }), null);
  });

  it('tests (quiz) never show a score, even a perfect one', () => {
    assert.equal(visibleScore({ score: 100, kind: 'quiz' }), null);
    assert.equal(visibleScore({ score: 0, kind: 'quiz' }), null);
  });

  it('visibleOutcome: checklist → score + percentage/100 + passed', () => {
    assert.deepEqual(
      visibleOutcome({ score: 83, scorePercentage: 8333, passed: true, kind: 'checklist' }),
      { score: 83, scorePercentage: 83.33, passed: true },
    );
    assert.deepEqual(
      visibleOutcome({ score: 100, scorePercentage: 10000, passed: null, kind: 'checklist' }),
      { score: 100, scorePercentage: 100, passed: null },
    );
  });

  it('visibleOutcome: quiz and unscorable → all three null (nothing to probe)', () => {
    assert.deepEqual(
      visibleOutcome({ score: 90, scorePercentage: 9000, passed: true, kind: 'quiz' }),
      { score: null, scorePercentage: null, passed: null },
    );
    assert.deepEqual(
      visibleOutcome({ score: null, scorePercentage: null, passed: null, kind: 'checklist' }),
      { score: null, scorePercentage: null, passed: null },
    );
  });

  it('visibleOutcome falls back to the score when the stored percentage is missing', () => {
    assert.deepEqual(
      visibleOutcome({ score: 67, scorePercentage: undefined, passed: false, kind: 'checklist' }),
      { score: 67, scorePercentage: 67, passed: false },
    );
  });
});
