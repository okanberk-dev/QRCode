/**
 * CLAUDE.md §42 Phase 2 — Wizard Zod schema unit tests.
 *
 * Saf doğrulama; DB'siz. Step1/2/3/Assignment + full submit + toSubmitPayload
 * mapper'ı kapsanır.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AssignmentDraftSchema,
  AuditQuestionSchema,
  AuditTemplateSubmitSchema,
  Step1Schema,
  Step2Schema,
  Step3Schema,
  createInitialWizardState,
  toSubmitPayload,
} from '../src/lib/audits/wizard-state';

describe('AuditQuestionSchema', () => {
  it('accepts a valid single-choice question with correctAnswer', () => {
    const ok = AuditQuestionSchema.safeParse({
      type: 'single',
      prompt: 'Test?',
      options: ['A', 'B'],
      correctAnswer: 'A',
      weight: 1,
      isRequired: true,
      sortOrder: 0,
    });
    assert.equal(ok.success, true);
  });

  it('rejects single without enough options', () => {
    const bad = AuditQuestionSchema.safeParse({
      type: 'single',
      prompt: 'Test?',
      options: ['A'],
      weight: 1,
      isRequired: true,
      sortOrder: 0,
    });
    assert.equal(bad.success, false);
  });

  it('accepts scale with no options', () => {
    const ok = AuditQuestionSchema.safeParse({
      type: 'scale',
      prompt: 'Rate the cleanliness',
      weight: 2,
      isRequired: true,
      sortOrder: 0,
    });
    assert.equal(ok.success, true);
  });

  it('accepts text with optional correctAnswer', () => {
    const ok = AuditQuestionSchema.safeParse({
      type: 'text',
      prompt: 'Explain.',
      correctAnswer: null,
      weight: 1,
      isRequired: false,
      sortOrder: 0,
    });
    assert.equal(ok.success, true);
  });

  it('clamps weight in schema range (rejects 0 or 11)', () => {
    const tooLow = AuditQuestionSchema.safeParse({
      type: 'scale',
      prompt: 'x',
      weight: 0,
      isRequired: true,
      sortOrder: 0,
    });
    const tooHigh = AuditQuestionSchema.safeParse({
      type: 'scale',
      prompt: 'x',
      weight: 11,
      isRequired: true,
      sortOrder: 0,
    });
    assert.equal(tooLow.success, false);
    assert.equal(tooHigh.success, false);
  });
});

describe('Step1Schema', () => {
  it('accepts a fully-filled step', () => {
    const ok = Step1Schema.safeParse({
      restaurantId: 'rid',
      title: 'Hijyen',
      description: 'desc',
      sector: 'food',
      categoryId: null,
      locale: 'tr',
    });
    assert.equal(ok.success, true);
  });

  it('rejects missing restaurantId', () => {
    const bad = Step1Schema.safeParse({
      restaurantId: '',
      title: 'x',
      sector: 'food',
    });
    assert.equal(bad.success, false);
  });
});

describe('Step2Schema (passingScore conditional)', () => {
  it('pass_fail with passingScore is OK', () => {
    const ok = Step2Schema.safeParse({ scoringMode: 'pass_fail', passingScore: 70 });
    assert.equal(ok.success, true);
  });

  it('pass_fail without passingScore is rejected', () => {
    const bad = Step2Schema.safeParse({ scoringMode: 'pass_fail', passingScore: null });
    assert.equal(bad.success, false);
  });

  it('percentage without passingScore is OK (optional badge)', () => {
    const ok = Step2Schema.safeParse({ scoringMode: 'percentage' });
    assert.equal(ok.success, true);
  });
});

describe('Step3Schema', () => {
  it('rejects empty question list', () => {
    const bad = Step3Schema.safeParse({ questions: [] });
    assert.equal(bad.success, false);
  });

  it('accepts one valid question', () => {
    const ok = Step3Schema.safeParse({
      questions: [
        {
          type: 'yes_no',
          prompt: 'Eldiven var mı?',
          options: ['Evet', 'Hayır'],
          correctAnswer: 'Evet',
          weight: 1,
          isRequired: true,
          sortOrder: 10,
        },
      ],
    });
    assert.equal(ok.success, true);
  });
});

describe('AssignmentDraftSchema', () => {
  it('disabled assignment requires nothing', () => {
    const ok = AssignmentDraftSchema.safeParse({ enabled: false });
    assert.equal(ok.success, true);
  });

  it('enabled team_member without member id fails', () => {
    const bad = AssignmentDraftSchema.safeParse({
      enabled: true,
      assigneeType: 'team_member',
    });
    assert.equal(bad.success, false);
  });

  it('enabled candidate without contact fails', () => {
    const bad = AssignmentDraftSchema.safeParse({
      enabled: true,
      assigneeType: 'candidate',
    });
    assert.equal(bad.success, false);
  });

  it('enabled candidate with email OK', () => {
    const ok = AssignmentDraftSchema.safeParse({
      enabled: true,
      assigneeType: 'candidate',
      assigneeEmail: 'a@b.com',
    });
    assert.equal(ok.success, true);
  });

  it('enabled link needs no contact (anonymous)', () => {
    const ok = AssignmentDraftSchema.safeParse({
      enabled: true,
      assigneeType: 'link',
    });
    assert.equal(ok.success, true);
  });
});

describe('AuditTemplateSubmitSchema', () => {
  it('accepts a minimum-viable submission', () => {
    const ok = AuditTemplateSubmitSchema.safeParse({
      title: 'X',
      sector: 'food',
      scoringMode: 'percentage',
      questions: [
        {
          type: 'yes_no',
          prompt: 'q?',
          options: ['Evet', 'Hayır'],
          correctAnswer: 'Evet',
          weight: 1,
          isRequired: true,
          sortOrder: 0,
        },
      ],
      publish: false,
    });
    assert.equal(ok.success, true);
  });

  it('rejects unknown extra fields (strict)', () => {
    const bad = AuditTemplateSubmitSchema.safeParse({
      title: 'X',
      sector: 'food',
      scoringMode: 'percentage',
      questions: [
        {
          type: 'yes_no',
          prompt: 'q?',
          options: ['Evet', 'Hayır'],
          weight: 1,
          isRequired: true,
          sortOrder: 0,
        },
      ],
      publish: false,
      foo: 'bar',
    });
    assert.equal(bad.success, false);
  });
});

describe('toSubmitPayload mapper', () => {
  it('serializes initial wizard state with no assignment', () => {
    const state = createInitialWizardState('rid');
    state.title = ' My audit ';
    state.description = '';
    state.questions = [
      {
        id: 'q1',
        type: 'yes_no',
        prompt: 'a?',
        options: ['Evet', 'Hayır'],
        correctAnswer: 'Evet',
        weight: 1,
        isRequired: true,
        sortOrder: 0,
      },
    ];
    const payload = toSubmitPayload(state, false);
    assert.equal(payload.title, 'My audit');
    assert.equal(payload.description, null);
    assert.equal(payload.questions.length, 1);
    assert.equal(payload.questions[0].sortOrder, 10);
    assert.equal(payload.publish, false);
    assert.equal(payload.assignment, undefined);
  });

  it('includes assignment when enabled with team_member', () => {
    const state = createInitialWizardState('rid');
    state.title = 'X';
    state.questions = [
      { id: 'q1', type: 'scale', prompt: 'r?', weight: 1, isRequired: true, sortOrder: 0 },
    ];
    state.assignmentEnabled = true;
    state.assigneeType = 'team_member';
    state.assigneeTeamMemberId = 'tm1';
    state.dueAt = '2026-06-01';
    state.recurrence = 'weekly';
    const payload = toSubmitPayload(state, true);
    assert.equal(payload.publish, true);
    assert.notEqual(payload.assignment, undefined);
    assert.equal(payload.assignment!.assigneeType, 'team_member');
    assert.equal(payload.assignment!.assigneeTeamMemberId, 'tm1');
    assert.equal(payload.assignment!.dueAt, '2026-06-01');
    assert.equal(payload.assignment!.recurrence, 'weekly');
  });

  it('drops assignment block when assignmentEnabled but no assigneeType', () => {
    const state = createInitialWizardState('rid');
    state.title = 'X';
    state.questions = [
      { id: 'q1', type: 'scale', prompt: 'r?', weight: 1, isRequired: true, sortOrder: 0 },
    ];
    state.assignmentEnabled = true;
    state.assigneeType = null;
    const payload = toSubmitPayload(state, false);
    assert.equal(payload.assignment, undefined);
  });
});
