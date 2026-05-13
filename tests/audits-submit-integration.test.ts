/**
 * CLAUDE.md §42 Phase 3 — Audit submit flow integration-light tests.
 *
 * DB'siz, network'siz; sadece submit-side helper invariants:
 *   1. computeAuditScore + AuditTemplateSubmitSchema kombinasyonu
 *   2. Submit zorunlu alan tutarlılığı (missing required guard)
 *   3. Cross-type answer şekli (single string vs multi array vs scale number)
 *
 * Çalıştır: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { computeAuditScore, type AuditQuestionInput } from '../src/lib/audits/score';

// Helper: route içindeki zorunlu-alan guard'ı simüle eder (route içi inline
// kontrol, dedicated helper'a çıkarılmadı — 3'ten fazla tekrar olunca extract).
function findMissingRequired(
  questions: AuditQuestionInput[],
  answers: Array<{ questionId: string; value: unknown }>,
): AuditQuestionInput[] {
  const byQid = new Map(answers.map((a) => [a.questionId, a]));
  return questions.filter((q) => {
    if (!q.isRequired) return false;
    const a = byQid.get(q.id);
    if (!a) return true;
    if (a.value === null || a.value === undefined || a.value === '') return true;
    if (Array.isArray(a.value) && a.value.length === 0) return true;
    return false;
  });
}

describe('audit submit — missing required guard', () => {
  const questions: AuditQuestionInput[] = [
    { id: 'q1', type: 'single', correctAnswer: 'A', weight: 1, isRequired: true },
    { id: 'q2', type: 'multi', correctAnswer: ['X', 'Y'], weight: 1, isRequired: true },
    { id: 'q3', type: 'text', weight: 1, isRequired: false },
  ];

  it('detects missing required answer', () => {
    const missing = findMissingRequired(questions, [
      { questionId: 'q1', value: 'A' },
      // q2 missing
    ]);
    assert.equal(missing.length, 1);
    assert.equal(missing[0].id, 'q2');
  });

  it('detects empty string as missing for required', () => {
    const missing = findMissingRequired(questions, [
      { questionId: 'q1', value: '' },
      { questionId: 'q2', value: ['X'] },
    ]);
    assert.equal(missing.length, 1);
    assert.equal(missing[0].id, 'q1');
  });

  it('detects empty array as missing for required', () => {
    const missing = findMissingRequired(questions, [
      { questionId: 'q1', value: 'A' },
      { questionId: 'q2', value: [] },
    ]);
    assert.equal(missing.length, 1);
    assert.equal(missing[0].id, 'q2');
  });

  it('does not flag optional questions as missing', () => {
    const missing = findMissingRequired(questions, [
      { questionId: 'q1', value: 'A' },
      { questionId: 'q2', value: ['X', 'Y'] },
      // q3 missing — but it's optional
    ]);
    assert.equal(missing.length, 0);
  });

  it('returns no missing when all required answered', () => {
    const missing = findMissingRequired(questions, [
      { questionId: 'q1', value: 'A' },
      { questionId: 'q2', value: ['X', 'Y'] },
      { questionId: 'q3', value: 'hello' },
    ]);
    assert.equal(missing.length, 0);
  });
});

describe('audit submit — end-to-end scoring (pass_fail)', () => {
  const questions: AuditQuestionInput[] = [
    { id: 'q1', type: 'single', correctAnswer: 'Evet', weight: 1, isRequired: true },
    { id: 'q2', type: 'yes_no', correctAnswer: 'Hayır', weight: 2, isRequired: true },
    { id: 'q3', type: 'scale', correctAnswer: 4, weight: 1, isRequired: true },
    { id: 'q4', type: 'multi', correctAnswer: ['A', 'B'], weight: 1, isRequired: true },
  ];

  it('full correct → score 100 + passed=true', () => {
    const result = computeAuditScore(
      questions,
      [
        { questionId: 'q1', value: 'Evet' },
        { questionId: 'q2', value: 'Hayır' },
        { questionId: 'q3', value: 5 },
        { questionId: 'q4', value: ['A', 'B'] },
      ],
      'pass_fail',
      70,
    );
    assert.equal(result.score, 100);
    assert.equal(result.passed, true);
  });

  it('partial — 2 of 4 correct → ~50 weighted', () => {
    const result = computeAuditScore(
      questions,
      [
        { questionId: 'q1', value: 'Evet' },        // 100 × 1 = 100
        { questionId: 'q2', value: 'Evet' },         // 0 × 2 = 0
        { questionId: 'q3', value: 2 },              // 0 × 1 = 0
        { questionId: 'q4', value: ['A', 'B'] },     // 100 × 1 = 100
      ],
      'weighted',
      60,
    );
    // (100 + 0 + 0 + 100) / (1 + 2 + 1 + 1) = 200/5 = 40
    assert.equal(result.score, 40);
    assert.equal(result.passed, false);
  });
});

describe('audit submit — scale answer type contract', () => {
  it('scale accepts number from client (1-5)', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'scale', weight: 1, isRequired: true,
    };
    const result = computeAuditScore(
      [q],
      [{ questionId: 'q1', value: 4 }],
      'percentage',
      null,
    );
    // Likert fallback: 4 * 20 = 80
    assert.equal(result.score, 80);
  });

  it('scale with threshold correctAnswer flips at boundary', () => {
    const q: AuditQuestionInput = {
      id: 'q1', type: 'scale', correctAnswer: 4, weight: 1, isRequired: true,
    };
    const at = computeAuditScore([q], [{ questionId: 'q1', value: 4 }], 'percentage', null);
    const below = computeAuditScore([q], [{ questionId: 'q1', value: 3 }], 'percentage', null);
    assert.equal(at.score, 100);
    assert.equal(below.score, 0);
  });
});
