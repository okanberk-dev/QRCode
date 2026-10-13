/**
 * CLAUDE.md §42 Phase 3 — Audit submit flow integration-light tests.
 *
 * DB'siz, network'siz; submit rotasının gerçekten çağırdığı saf yardımcılar:
 *   1. findMissingRequired (submit-guards) — zorunlu alan kontrolü
 *   2. computeAuditScore + visibleOutcome — skor ve katılımcıya dönen sonuç
 *   3. Cross-type answer şekli (single string vs multi array vs scale number)
 *
 * (Eskiden zorunlu-alan kontrolü bu dosyada "aynalanıyordu"; artık rotanın
 * kullandığı gerçek fonksiyon test ediliyor — spec §9.1 #8.)
 *
 * Çalıştır: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { computeAuditScore, type AuditQuestionInput } from '../src/lib/audits/score';
import { deriveAuditKind } from '../src/lib/audits/kind';
import { findMissingRequired, visibleOutcome } from '../src/lib/audits/submit-guards';

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

describe('audit submit — what the respondent is told (spec §6.8 score visibility)', () => {
  // The seeded "Günlük mutfak açılış kontrol listesi": 5 yes/no (correct "Evet") + 1 optional note.
  const checklist: AuditQuestionInput[] = [
    ...['a', 'b', 'c', 'd', 'e'].map((id) => ({
      id,
      type: 'yes_no' as const,
      correctAnswer: 'Evet',
      weight: 1,
      isRequired: true,
    })),
    { id: 'note', type: 'text', weight: 1, isRequired: false },
  ];

  it('all Evet + a note scores 100 and the respondent sees 100/100 (A1: was 83)', () => {
    const kind = deriveAuditKind(checklist.map((q) => q.type));
    assert.equal(kind, 'checklist');
    const scoring = computeAuditScore(
      checklist,
      [
        ...['a', 'b', 'c', 'd', 'e'].map((id) => ({ questionId: id, value: 'Evet' })),
        { questionId: 'note', value: 'Her şey yolunda' },
      ],
      'percentage',
      null,
    );
    assert.equal(scoring.score, 100);
    const out = visibleOutcome({ ...scoring, kind });
    assert.equal(out.score, 100);
    assert.equal(out.scorePercentage, 100);
  });

  it('a form with nothing scorable returns null to the respondent (no "0/100" chip)', () => {
    const notes: AuditQuestionInput[] = [
      { id: 'n1', type: 'text', weight: 1, isRequired: false },
      { id: 'p1', type: 'file', weight: 1, isRequired: false },
    ];
    const scoring = computeAuditScore(notes, [{ questionId: 'n1', value: 'x' }], 'percentage', null);
    assert.equal(scoring.score, null);
    const out = visibleOutcome({ ...scoring, kind: deriveAuditKind(notes.map((q) => q.type)) });
    assert.deepEqual(out, { score: null, scorePercentage: null, passed: null });
  });

  it('a test (single/multi) is scored for the owner but hidden from the respondent', () => {
    const test: AuditQuestionInput[] = [
      { id: 't1', type: 'single', correctAnswer: 'A', weight: 1, isRequired: true },
      { id: 't2', type: 'multi', correctAnswer: ['X', 'Y'], weight: 1, isRequired: true },
    ];
    const kind = deriveAuditKind(test.map((q) => q.type));
    assert.equal(kind, 'quiz');
    const scoring = computeAuditScore(
      test,
      [
        { questionId: 't1', value: 'A' },
        { questionId: 't2', value: ['X', 'Y'] },
      ],
      'percentage',
      70,
    );
    assert.equal(scoring.score, 100, 'the owner still gets the real score');
    assert.equal(scoring.passed, true);
    assert.deepEqual(visibleOutcome({ ...scoring, kind }), {
      score: null,
      scorePercentage: null,
      passed: null,
    });
  });
});
