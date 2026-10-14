/**
 * Denetim Merkezi — "Dikkat edilecek maddeler" (spec §5.3) birim testleri.
 * Cevap değeri + GÜNCEL soru tanımı tabanlı; saklanmış autoScore kullanılmaz.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  SCALE_ISSUE_MAX,
  countIssues,
  isEmptyAnswerValue,
  isIssueAnswer,
  rankMisses,
  summarizeMisses,
  type MissQuestion,
} from '../src/lib/audits/misses';

const yesNo = (id: string, correct?: string | null): MissQuestion => ({
  id, type: 'yes_no', correctAnswer: correct,
});

describe('isIssueAnswer — scale', () => {
  const likert: MissQuestion = { id: 's', type: 'scale', correctAnswer: null };

  it('Likert 4/5 and 3/5 are NOT issues; 2/5 and 1/5 are', () => {
    assert.equal(SCALE_ISSUE_MAX, 2);
    assert.equal(isIssueAnswer(likert, 5), false);
    assert.equal(isIssueAnswer(likert, 4), false);
    assert.equal(isIssueAnswer(likert, 3), false);
    assert.equal(isIssueAnswer(likert, 2), true);
    assert.equal(isIssueAnswer(likert, 1), true);
  });

  it('numeric strings are read like numbers; garbage is not applicable', () => {
    assert.equal(isIssueAnswer(likert, '2'), true);
    assert.equal(isIssueAnswer(likert, '4'), false);
    assert.equal(isIssueAnswer(likert, 'abc'), null);
  });

  it('threshold scale (numeric correctAnswer): below the threshold is the issue', () => {
    const th: MissQuestion = { id: 's', type: 'scale', correctAnswer: 4 };
    assert.equal(isIssueAnswer(th, 3), true);
    assert.equal(isIssueAnswer(th, 4), false);
    assert.equal(isIssueAnswer(th, 5), false);
  });
});

describe('isIssueAnswer — yes_no / single', () => {
  it('without a correct answer the item is not applicable (excluded)', () => {
    assert.equal(isIssueAnswer(yesNo('q', null), 'Hayır'), null);
    assert.equal(isIssueAnswer(yesNo('q', undefined), 'Evet'), null);
    assert.equal(isIssueAnswer(yesNo('q', ''), 'Evet'), null);
    assert.equal(isIssueAnswer({ id: 'q', type: 'single', correctAnswer: null }, 'A'), null);
  });

  it('mismatch is an issue, match is fine (trim + case-insensitive)', () => {
    assert.equal(isIssueAnswer(yesNo('q', 'Evet'), 'Hayır'), true);
    assert.equal(isIssueAnswer(yesNo('q', 'Evet'), '  evet '), false);
    assert.equal(isIssueAnswer({ id: 'q', type: 'single', correctAnswer: 'B' }, 'a'), true);
  });

  it('a negatively phrased item (correct "Hayır") flags an "Evet"', () => {
    assert.equal(isIssueAnswer(yesNo('q', 'Hayır'), 'Evet'), true);
    assert.equal(isIssueAnswer(yesNo('q', 'Hayır'), 'Hayır'), false);
  });
});

describe('isIssueAnswer — multi', () => {
  const multi: MissQuestion = { id: 'm', type: 'multi', correctAnswer: ['A', 'B'] };

  it('exact set (any order, case-insensitive) is fine', () => {
    assert.equal(isIssueAnswer(multi, ['B', 'A']), false);
    assert.equal(isIssueAnswer(multi, ['a', 'b']), false);
  });

  it('missing item, extra item or wrong item is an issue', () => {
    assert.equal(isIssueAnswer(multi, ['A']), true);
    assert.equal(isIssueAnswer(multi, ['A', 'B', 'C']), true);
    assert.equal(isIssueAnswer(multi, ['A', 'C']), true);
  });

  it('without a (non-empty) correct array → not applicable', () => {
    assert.equal(isIssueAnswer({ id: 'm', type: 'multi', correctAnswer: [] }, ['A']), null);
    assert.equal(isIssueAnswer({ id: 'm', type: 'multi', correctAnswer: null }, ['A']), null);
  });
});

describe('isIssueAnswer — text / file / empty values', () => {
  it('text without a correct string is not applicable; with one it compares', () => {
    assert.equal(isIssueAnswer({ id: 't', type: 'text', correctAnswer: null }, 'lorem'), null);
    assert.equal(isIssueAnswer({ id: 't', type: 'text', correctAnswer: 'ok' }, 'nope'), true);
    assert.equal(isIssueAnswer({ id: 't', type: 'text', correctAnswer: 'ok' }, ' OK '), false);
  });

  it('file is always excluded (even with a value)', () => {
    assert.equal(isIssueAnswer({ id: 'f', type: 'file' }, 'data:image/webp;base64,AAAA'), null);
  });

  it('skipped optional items (null / undefined / "" / whitespace / []) are excluded', () => {
    const q = yesNo('q', 'Evet');
    for (const v of [null, undefined, '', '   ', []]) {
      assert.equal(isIssueAnswer(q, v), null, JSON.stringify(v));
      assert.equal(isEmptyAnswerValue(v), true);
    }
    assert.equal(isEmptyAnswerValue('Evet'), false);
    assert.equal(isEmptyAnswerValue(0), false);
  });
});

describe('summarizeMisses', () => {
  const qs: MissQuestion[] = [
    yesNo('fridge', 'Evet'),
    yesNo('soap', 'Evet'),
    { id: 'note', type: 'text', correctAnswer: null },
    { id: 'photo', type: 'file' },
    yesNo('nocorrect', null),
    { id: 'rating', type: 'scale', correctAnswer: null },
  ];

  it('counts answered / missed / rate per question', () => {
    const rows = [
      { questionId: 'fridge', value: 'Evet' },
      { questionId: 'fridge', value: 'Hayır' },
      { questionId: 'fridge', value: 'Hayır' },
      { questionId: 'fridge', value: 'Evet' },
      { questionId: 'soap', value: 'Evet' },
    ];
    const out = summarizeMisses(qs, rows);
    const fridge = out.find((o) => o.questionId === 'fridge')!;
    assert.equal(fridge.answered, 4);
    assert.equal(fridge.missed, 2);
    assert.equal(fridge.missRate, 0.5);
    const soap = out.find((o) => o.questionId === 'soap')!;
    assert.deepEqual([soap.answered, soap.missed, soap.missRate], [1, 0, 0]);
  });

  it('omits items with answered = 0 and never lists notes / photos / correct-answer-less yes-no', () => {
    const rows = [
      { questionId: 'note', value: 'something' },
      { questionId: 'photo', value: 'data:image/webp;base64,AAAA' },
      { questionId: 'nocorrect', value: 'Hayır' },
      { questionId: 'rating', value: 5 },
    ];
    const out = summarizeMisses(qs, rows);
    assert.deepEqual(out.map((o) => o.questionId), ['rating']);
    assert.equal(out[0].missed, 0);
  });

  it('skipped optional rows (null / "" / []) count in neither answered nor missed', () => {
    const rows = [
      { questionId: 'soap', value: null },
      { questionId: 'soap', value: '' },
      { questionId: 'soap', value: [] },
      { questionId: 'soap', value: 'Hayır' },
    ];
    const [soap] = summarizeMisses(qs, rows);
    assert.deepEqual([soap.answered, soap.missed], [1, 1]);
  });

  it('legacy rows are ignored: a stored autoScore of 0 on a note never produces an alarm', () => {
    // rows carry no autoScore at all — the summary is value + definition based.
    const rows = [{ questionId: 'note', value: 'ok', autoScore: 0 } as { questionId: string; value: unknown }];
    assert.deepEqual(summarizeMisses(qs, rows), []);
  });

  it('a Likert 80 (4/5) is not a miss; unknown question ids are skipped', () => {
    const out = summarizeMisses(qs, [
      { questionId: 'rating', value: 4 },
      { questionId: 'rating', value: 1 },
      { questionId: 'ghost', value: 'x' },
    ]);
    assert.equal(out.length, 1);
    assert.deepEqual([out[0].answered, out[0].missed], [2, 1]);
  });
});

describe('rankMisses', () => {
  it('keeps missed > 0, sorts by miss rate desc then count desc, honours the limit', () => {
    const items = [
      { questionId: 'a', answered: 10, missed: 1, missRate: 0.1 },
      { questionId: 'b', answered: 2, missed: 2, missRate: 1 },
      { questionId: 'c', answered: 10, missed: 5, missRate: 0.5 },
      { questionId: 'd', answered: 4, missed: 2, missRate: 0.5 },
      { questionId: 'e', answered: 9, missed: 0, missRate: 0 },
    ];
    assert.deepEqual(rankMisses(items).map((i) => i.questionId), ['b', 'c', 'd', 'a']);
    assert.deepEqual(rankMisses(items, 2).map((i) => i.questionId), ['b', 'c']);
  });
});

describe('countIssues (one response → attention count for the owner mail)', () => {
  const qs: MissQuestion[] = [
    yesNo('a', 'Evet'),
    yesNo('b', 'Evet'),
    yesNo('c', 'Evet'),
    { id: 'n', type: 'text', correctAnswer: null },
  ];

  it('counts only evaluable mismatches', () => {
    assert.equal(
      countIssues(qs, [
        { questionId: 'a', value: 'Evet' },
        { questionId: 'b', value: 'Hayır' },
        { questionId: 'c', value: 'Hayır' },
        { questionId: 'n', value: 'not' },
      ]),
      2,
    );
  });

  it('a clean checklist → 0, skipped optionals do not count, unknown ids ignored', () => {
    assert.equal(
      countIssues(qs, [
        { questionId: 'a', value: 'Evet' },
        { questionId: 'b', value: null },
        { questionId: 'zzz', value: 'Hayır' },
      ]),
      0,
    );
  });
});
