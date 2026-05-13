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
  scoreAnswer,
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
