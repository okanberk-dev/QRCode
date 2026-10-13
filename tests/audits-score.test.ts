/**
 * CLAUDE.md §42 — Audit scoring helper unit tests.
 *
 * Saf fonksiyon, DB'siz. computeAuditScore + scoreAnswer kapsanır.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeAuditScore,
  hasUsableCorrectAnswer,
  isScorableByDefinition,
  isScorableQuestion,
  questionsForRecompute,
  scoreAnswer,
  shouldRecompute,
  type AuditQuestionInput,
} from '../src/lib/audits/score';

describe('scoreAnswer — single + yes_no', () => {
  it('returns 100 when answer matches correct (case/space insensitive)', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'single', correctAnswer: 'Evet', weight: 1, isRequired: true,
    };
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 'evet' }), 100);
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: '  EVET  ' }), 100);
  });

  it('returns 0 when answer wrong or missing', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'single', correctAnswer: 'Evet', weight: 1, isRequired: true,
    };
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 'Hayır' }), 0);
    assert.equal(scoreAnswer(q, undefined), 0);
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: null }), 0);
  });

  it('yes_no behaves like single', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'yes_no', correctAnswer: 'Hayır', weight: 1, isRequired: true,
    };
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 'Hayır' }), 100);
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 'Evet' }), 0);
  });
});

describe('scoreAnswer — multi (Jaccard partial credit)', () => {
  it('returns 100 for exact set match', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'multi', correctAnswer: ['A', 'B', 'C'], weight: 1, isRequired: true,
    };
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: ['C', 'A', 'B'] }), 100);
  });

  it('returns partial credit for subset', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'multi', correctAnswer: ['A', 'B', 'C'], weight: 1, isRequired: true,
    };
    // intersect {A,B} / union {A,B,C} = 2/3 ≈ 67
    const score = scoreAnswer(q, { questionId: 'q1', value: ['A', 'B'] });
    assert.equal(score, 67);
  });

  it('penalises wrong extras', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'multi', correctAnswer: ['A', 'B'], weight: 1, isRequired: true,
    };
    // intersect {A} / union {A,B,X} = 1/3 ≈ 33
    const score = scoreAnswer(q, { questionId: 'q1', value: ['A', 'X'] });
    assert.equal(score, 33);
  });

  it('returns 0 when no overlap', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'multi', correctAnswer: ['A'], weight: 1, isRequired: true,
    };
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: ['B', 'C'] }), 0);
  });
});

describe('scoreAnswer — scale', () => {
  it('Likert fallback (no correctAnswer) maps 1-5 to 20-100', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'scale', weight: 1, isRequired: true,
    };
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 1 }), 20);
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 3 }), 60);
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 5 }), 100);
  });

  it('clamps out-of-range', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'scale', weight: 1, isRequired: true,
    };
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 0 }), 20);
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 10 }), 100);
  });

  it('threshold mode (numeric correctAnswer): >= passes', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'scale', correctAnswer: 4, weight: 1, isRequired: true,
    };
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 4 }), 100);
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 5 }), 100);
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 3 }), 0);
  });
});

describe('scoreAnswer — text + file', () => {
  it('text matches normalized', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'text', correctAnswer: 'Cevap', weight: 1, isRequired: true,
    };
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 'cevap' }), 100);
  });

  it('text returns 0 when no correctAnswer (manual review)', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'text', weight: 1, isRequired: true,
    };
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 'lorem' }), 0);
  });

  it('file always 0 (manual review)', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'file', weight: 1, isRequired: true,
    };
    assert.equal(scoreAnswer(q, { questionId: 'q1', value: 'https://x/y.pdf' }), 0);
  });
});

describe('computeAuditScore — percentage mode', () => {
  it('averages all questions equally', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'q1', type: 'single', correctAnswer: 'A', weight: 1, isRequired: true },
      { id: 'q2', type: 'single', correctAnswer: 'B', weight: 1, isRequired: true },
      { id: 'q3', type: 'single', correctAnswer: 'C', weight: 1, isRequired: true },
    ];
    const res = computeAuditScore(
      qs,
      [
        { questionId: 'q1', value: 'A' },
        { questionId: 'q2', value: 'B' },
        { questionId: 'q3', value: 'wrong' },
      ],
      'percentage',
      null,
    );
    assert.equal(res.score, 67); // 200/3 = 66.67 → 67
    assert.equal(res.scorePercentage, 6667);
    assert.equal(res.passed, null);
  });

  it('passingScore set produces boolean', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'q1', type: 'single', correctAnswer: 'A', weight: 1, isRequired: true },
      { id: 'q2', type: 'single', correctAnswer: 'B', weight: 1, isRequired: true },
    ];
    const res = computeAuditScore(
      qs,
      [
        { questionId: 'q1', value: 'A' },
        { questionId: 'q2', value: 'B' },
      ],
      'percentage',
      80,
    );
    assert.equal(res.score, 100);
    assert.equal(res.passed, true);
  });
});

describe('computeAuditScore — weighted mode', () => {
  it('weights high-value questions more', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'q1', type: 'single', correctAnswer: 'A', weight: 3, isRequired: true },
      { id: 'q2', type: 'single', correctAnswer: 'B', weight: 1, isRequired: true },
    ];
    // q1 correct (100 × 3 = 300), q2 wrong (0 × 1 = 0); total weight 4 → 75
    const res = computeAuditScore(
      qs,
      [
        { questionId: 'q1', value: 'A' },
        { questionId: 'q2', value: 'wrong' },
      ],
      'weighted',
      null,
    );
    assert.equal(res.score, 75);
  });

  it('weight clamped to 1-10', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'q1', type: 'single', correctAnswer: 'A', weight: 0, isRequired: true },
      { id: 'q2', type: 'single', correctAnswer: 'B', weight: 100, isRequired: true },
    ];
    const res = computeAuditScore(
      qs,
      [
        { questionId: 'q1', value: 'A' }, // 100 × 1
        { questionId: 'q2', value: 'wrong' }, // 0 × 10
      ],
      'weighted',
      null,
    );
    // (100 + 0) / 11 ≈ 9
    assert.equal(res.score, 9);
  });
});

describe('computeAuditScore — pass_fail', () => {
  it('passingScore drives the verdict', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'q1', type: 'single', correctAnswer: 'A', weight: 1, isRequired: true },
      { id: 'q2', type: 'single', correctAnswer: 'B', weight: 1, isRequired: true },
      { id: 'q3', type: 'single', correctAnswer: 'C', weight: 1, isRequired: true },
      { id: 'q4', type: 'single', correctAnswer: 'D', weight: 1, isRequired: true },
    ];
    // 3 correct of 4 = 75
    const ans = [
      { questionId: 'q1', value: 'A' },
      { questionId: 'q2', value: 'B' },
      { questionId: 'q3', value: 'C' },
      { questionId: 'q4', value: 'wrong' },
    ];
    const res1 = computeAuditScore(qs, ans, 'pass_fail', 70);
    assert.equal(res1.score, 75);
    assert.equal(res1.passed, true);

    const res2 = computeAuditScore(qs, ans, 'pass_fail', 80);
    assert.equal(res2.passed, false);
  });

  it('passingScore null on pass_fail still produces boolean (false)', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'q1', type: 'single', correctAnswer: 'A', weight: 1, isRequired: true },
    ];
    const res = computeAuditScore(qs, [{ questionId: 'q1', value: 'A' }], 'pass_fail', null);
    // passingScore null + pass_fail → passed null (no threshold to compare)
    assert.equal(res.passed, null);
  });
});

describe('computeAuditScore — manual override', () => {
  it('manualScore wins over autoScore', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'q1', type: 'text', correctAnswer: 'X', weight: 1, isRequired: true },
    ];
    // autoScore would be 0 (wrong text), but reviewer manually gives 80.
    const res = computeAuditScore(
      qs,
      [{ questionId: 'q1', value: 'lorem ipsum', manualScore: 80 }],
      'percentage',
      null,
    );
    assert.equal(res.score, 80);
    assert.equal(res.scoredAnswers[0].autoScore, 0);
    assert.equal(res.scoredAnswers[0].appliedScore, 80);
  });

  it('manualScore clamped 0-100', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'q1', type: 'text', weight: 1, isRequired: true },
    ];
    const r1 = computeAuditScore(qs, [{ questionId: 'q1', value: 'x', manualScore: 999 }], 'percentage', null);
    assert.equal(r1.score, 100);
    const r2 = computeAuditScore(qs, [{ questionId: 'q1', value: 'x', manualScore: -10 }], 'percentage', null);
    assert.equal(r2.score, 0);
  });
});

describe('computeAuditScore — edge cases', () => {
  it('empty question list returns 0', () => {
    const res = computeAuditScore([], [], 'percentage', null);
    assert.equal(res.score, 0);
    assert.equal(res.scorePercentage, 0);
    assert.equal(res.passed, null);
  });

  it('empty list with passingScore returns failed', () => {
    const res = computeAuditScore([], [], 'percentage', 50);
    assert.equal(res.passed, false);
  });

  it('missing answer counts as 0', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'q1', type: 'single', correctAnswer: 'A', weight: 1, isRequired: true },
      { id: 'q2', type: 'single', correctAnswer: 'B', weight: 1, isRequired: true },
    ];
    const res = computeAuditScore(qs, [{ questionId: 'q1', value: 'A' }], 'percentage', null);
    assert.equal(res.score, 50);
  });
});


// ─── Spec §5.2 (A1) — only scorable questions take part in the score ───────

/** Seeded "Günlük mutfak açılış kontrol listesi": 5 × yes_no (correct Evet) + optional note. */
function seededChecklist(): AuditQuestionInput[] {
  return [
    ...[1, 2, 3, 4, 5].map<AuditQuestionInput>((n) => ({
      id: `y${n}`, type: 'yes_no', correctAnswer: 'Evet', weight: 1, isRequired: true,
    })),
    { id: 'note', type: 'text', weight: 1, isRequired: false },
  ];
}

describe('computeAuditScore — unscorable questions are excluded (A1)', () => {
  it('seeded checklist, every answer Evet + a note → 100 (was 83)', () => {
    const res = computeAuditScore(
      seededChecklist(),
      [
        ...[1, 2, 3, 4, 5].map((n) => ({ questionId: `y${n}`, value: 'Evet' })),
        { questionId: 'note', value: 'Her şey yolunda' },
      ],
      'percentage',
      null,
    );
    assert.equal(res.score, 100);
    assert.equal(res.scorePercentage, 10000);
    assert.equal(res.scorableCount, 5);
  });

  it('one "Hayır" on 5 scorable items → 80, the optional note does not dilute it', () => {
    const res = computeAuditScore(
      seededChecklist(),
      [
        { questionId: 'y1', value: 'Evet' },
        { questionId: 'y2', value: 'Evet' },
        { questionId: 'y3', value: 'Evet' },
        { questionId: 'y4', value: 'Evet' },
        { questionId: 'y5', value: 'Hayır' },
        { questionId: 'note', value: null },
      ],
      'percentage',
      null,
    );
    assert.equal(res.score, 80);
  });

  it('3 yes_no WITHOUT a correct answer, all Evet → score null / passed null (was 0)', () => {
    const qs: AuditQuestionInput[] = ['a', 'b', 'c'].map((id) => ({
      id, type: 'yes_no', weight: 1, isRequired: true,
    }));
    const res = computeAuditScore(
      qs,
      qs.map((q) => ({ questionId: q.id, value: 'Evet' })),
      'percentage',
      80,
    );
    assert.equal(res.score, null);
    assert.equal(res.scorePercentage, null);
    assert.equal(res.passed, null);
    assert.equal(res.scorableCount, 0);
    // every row is reported as not scorable, autoScore null (UI shows "—")
    assert.ok(res.scoredAnswers.every((s) => s.autoScore === null && s.scorable === false));
  });

  it('2 yes_no (correct Evet) + 1 photo, all Evet → 100 (was 67)', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'y1', type: 'yes_no', correctAnswer: 'Evet', weight: 1, isRequired: true },
      { id: 'y2', type: 'yes_no', correctAnswer: 'Evet', weight: 1, isRequired: true },
      { id: 'ph', type: 'file', weight: 1, isRequired: false },
    ];
    const res = computeAuditScore(
      qs,
      [
        { questionId: 'y1', value: 'Evet' },
        { questionId: 'y2', value: 'Evet' },
        { questionId: 'ph', value: 'data:image/webp;base64,AAAA' },
      ],
      'percentage',
      null,
    );
    assert.equal(res.score, 100);
  });

  it('pass_fail 90 + a note, perfect form → passed true (was "failed")', () => {
    const res = computeAuditScore(
      seededChecklist(),
      [
        ...[1, 2, 3, 4, 5].map((n) => ({ questionId: `y${n}`, value: 'Evet' })),
        { questionId: 'note', value: 'ok' },
      ],
      'pass_fail',
      90,
    );
    assert.equal(res.score, 100);
    assert.equal(res.passed, true);
  });

  it('mixed: scale (no correct answer) + text (no correct answer) → only the scale counts', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'sc', type: 'scale', weight: 1, isRequired: true },
      { id: 'tx', type: 'text', weight: 1, isRequired: false },
    ];
    const res = computeAuditScore(
      qs,
      [
        { questionId: 'sc', value: 4 },
        { questionId: 'tx', value: 'lorem' },
      ],
      'percentage',
      null,
    );
    assert.equal(res.score, 80);
    assert.equal(res.scorableCount, 1);
  });

  it('an answer with a finite manualScore makes its (otherwise unscorable) question scorable', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'y1', type: 'yes_no', correctAnswer: 'Evet', weight: 1, isRequired: true },
      { id: 'tx', type: 'text', weight: 1, isRequired: false },
    ];
    const res = computeAuditScore(
      qs,
      [
        { questionId: 'y1', value: 'Evet' },
        { questionId: 'tx', value: 'lorem', manualScore: 50 },
      ],
      'percentage',
      null,
    );
    // (100 + 50) / 2
    assert.equal(res.score, 75);
    const tx = res.scoredAnswers.find((s) => s.questionId === 'tx')!;
    assert.equal(tx.autoScore, null, 'no automatic score for a question without a correct answer');
    assert.equal(tx.appliedScore, 50);
    assert.equal(tx.scorable, true);
  });

  it('a photo question with a manualScore also counts', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'ph', type: 'file', weight: 1, isRequired: false },
    ];
    const res = computeAuditScore(qs, [{ questionId: 'ph', value: 'x', manualScore: 80 }], 'percentage', null);
    assert.equal(res.score, 80);
  });

  it('weighted mode averages over the scorable subset only', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'a', type: 'yes_no', correctAnswer: 'Evet', weight: 3, isRequired: true },
      { id: 'b', type: 'yes_no', correctAnswer: 'Evet', weight: 1, isRequired: true },
      { id: 'n', type: 'text', weight: 10, isRequired: false }, // unscorable, huge weight must NOT count
    ];
    const res = computeAuditScore(
      qs,
      [
        { questionId: 'a', value: 'Evet' },
        { questionId: 'b', value: 'Hayır' },
        { questionId: 'n', value: 'x' },
      ],
      'weighted',
      null,
    );
    // (100×3 + 0×1) / (3 + 1) = 75
    assert.equal(res.score, 75);
  });

  it('a scorable question with a missing answer still counts as 0 (unchanged)', () => {
    const qs: AuditQuestionInput[] = [
      { id: 'a', type: 'yes_no', correctAnswer: 'Evet', weight: 1, isRequired: false },
      { id: 'b', type: 'yes_no', correctAnswer: 'Evet', weight: 1, isRequired: false },
    ];
    const res = computeAuditScore(qs, [{ questionId: 'a', value: 'Evet' }], 'percentage', null);
    assert.equal(res.score, 50);
  });

  it('empty question list is unchanged: score 0, passed=false only when a passing score is set', () => {
    const noPass = computeAuditScore([], [], 'percentage', null);
    assert.equal(noPass.score, 0);
    assert.equal(noPass.passed, null);
    const withPass = computeAuditScore([], [], 'percentage', 60);
    assert.equal(withPass.score, 0);
    assert.equal(withPass.passed, false);
  });

  it('threshold passes through to `passed` for a checklist without pass_fail mode', () => {
    const ok = computeAuditScore(
      seededChecklist(),
      [
        { questionId: 'y1', value: 'Evet' },
        { questionId: 'y2', value: 'Evet' },
        { questionId: 'y3', value: 'Evet' },
        { questionId: 'y4', value: 'Evet' },
        { questionId: 'y5', value: 'Hayır' },
      ],
      'percentage',
      80,
    );
    assert.equal(ok.score, 80);
    assert.equal(ok.passed, true);
  });
});

describe('isScorableQuestion / isScorableByDefinition / hasUsableCorrectAnswer', () => {
  it('file is never scorable by definition', () => {
    assert.equal(isScorableByDefinition({ type: 'file', correctAnswer: 'x' }), false);
  });

  it('scale is always scorable (Likert fallback)', () => {
    assert.equal(isScorableByDefinition({ type: 'scale' }), true);
    assert.equal(isScorableByDefinition({ type: 'scale', correctAnswer: 4 }), true);
  });

  it('single / yes_no / text need a non-blank string correct answer', () => {
    for (const type of ['single', 'yes_no', 'text'] as const) {
      assert.equal(isScorableByDefinition({ type }), false, `${type} without correctAnswer`);
      assert.equal(isScorableByDefinition({ type, correctAnswer: null }), false);
      assert.equal(isScorableByDefinition({ type, correctAnswer: '' }), false, `${type} blank`);
      assert.equal(isScorableByDefinition({ type, correctAnswer: '   ' }), false);
      assert.equal(isScorableByDefinition({ type, correctAnswer: 'Evet' }), true);
    }
  });

  it('multi needs a non-empty array', () => {
    assert.equal(isScorableByDefinition({ type: 'multi' }), false);
    assert.equal(isScorableByDefinition({ type: 'multi', correctAnswer: [] }), false);
    assert.equal(isScorableByDefinition({ type: 'multi', correctAnswer: ['A'] }), true);
    assert.equal(hasUsableCorrectAnswer({ type: 'multi', correctAnswer: ['A', 'B'] }), true);
  });

  it('manualScore overrides the definition, but NaN / null do not', () => {
    const q = { type: 'text' as const, correctAnswer: null };
    assert.equal(isScorableQuestion(q), false);
    assert.equal(isScorableQuestion(q, { manualScore: null }), false);
    assert.equal(isScorableQuestion(q, { manualScore: Number.NaN }), false);
    assert.equal(isScorableQuestion(q, { manualScore: 0 }), true, '0 is a real manual score');
    assert.equal(isScorableQuestion({ type: 'file' }, { manualScore: 70 }), true);
  });
});

// ─── Spec §6.6 (A10) — re-score rules ───────────────────────────────────────

describe('shouldRecompute — a review-note-only PATCH must not re-score', () => {
  it('false when overrides is absent / empty / null', () => {
    assert.equal(shouldRecompute({}), false);
    assert.equal(shouldRecompute({ overrides: undefined }), false);
    assert.equal(shouldRecompute({ overrides: null }), false);
    assert.equal(shouldRecompute({ overrides: {} }), false);
    assert.equal(shouldRecompute(null), false);
    assert.equal(shouldRecompute(undefined), false);
  });

  it('true when at least one override key is present (including a clearing null)', () => {
    assert.equal(shouldRecompute({ overrides: { q1: 80 } }), true);
    assert.equal(shouldRecompute({ overrides: { q1: null } }), true);
  });
});

describe('questionsForRecompute — only questions the response has an answer row for', () => {
  const template = [
    ...[1, 2, 3, 4, 5].map<AuditQuestionInput>((n) => ({
      id: `y${n}`, type: 'yes_no', correctAnswer: 'Evet', weight: 1, isRequired: true,
    })),
    // added AFTER the response was submitted → no answer row
    { id: 'late', type: 'yes_no', correctAnswer: 'Evet', weight: 1, isRequired: true } as AuditQuestionInput,
  ];
  const answered = ['y1', 'y2', 'y3', 'y4', 'y5'];
  const answers = answered.map((id) => ({ questionId: id, value: 'Evet' }));

  it('excludes a later-added question', () => {
    const picked = questionsForRecompute(template, answered);
    assert.deepEqual(picked.map((q) => q.id), answered);
  });

  it('a later-added scorable question does not count as 0 for an old response, and does not flip `passed`', () => {
    const naive = computeAuditScore(template, answers, 'percentage', 90);
    assert.equal(naive.score, 83, 'regression guard: over ALL template questions the old response would drop');
    assert.equal(naive.passed, false);

    const fixed = computeAuditScore(questionsForRecompute(template, answered), answers, 'percentage', 90);
    assert.equal(fixed.score, 100);
    assert.equal(fixed.passed, true);
  });

  it('keeps the order of the template questions and accepts any iterable', () => {
    const picked = questionsForRecompute(template, new Set(['y3', 'y1']));
    assert.deepEqual(picked.map((q) => q.id), ['y1', 'y3']);
  });
});
