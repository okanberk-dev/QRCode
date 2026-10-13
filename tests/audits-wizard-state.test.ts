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
  AuditTemplatePatchSchema,
  AuditTemplateSubmitSchema,
  Step1Schema,
  Step2Schema,
  Step3Schema,
  buildShareLinkBody,
  createInitialWizardState,
  defaultOnceForKind,
  defaultShareAssignment,
  deriveScoringMode,
  recurrenceForOnce,
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

// ─── Spec §3.3 / §3.4 / A2 — paylaşım linki varsayılanları ──────────────

describe('createInitialWizardState (A2: reusable by default)', () => {
  it("defaults the share-link recurrence to 'daily', never 'once'", () => {
    assert.equal(createInitialWizardState('rid').recurrence, 'daily');
  });

  it('still has no assignment enabled until the owner opts in', () => {
    const s = createInitialWizardState('rid');
    assert.equal(s.assignmentEnabled, false);
    assert.equal(s.assigneeType, null);
  });
});

describe('share link helpers', () => {
  it('"Tek seferlik olsun" is OFF for checklists and ON for tests', () => {
    assert.equal(defaultOnceForKind('checklist'), false);
    assert.equal(defaultOnceForKind('quiz'), true);
  });

  it('recurrenceForOnce: off → daily (everyone can fill it again), on → once', () => {
    assert.equal(recurrenceForOnce(false), 'daily');
    assert.equal(recurrenceForOnce(true), 'once');
  });

  it("defaultShareAssignment: a 'link' assignment, daily, no contact fields", () => {
    const a = defaultShareAssignment();
    assert.deepEqual(a, {
      enabled: true,
      assigneeType: 'link',
      recurrence: 'daily',
      assigneeName: null,
    });
    // It must satisfy the API schema as-is.
    assert.equal(AssignmentDraftSchema.safeParse(a).success, true);
  });

  it('defaultShareAssignment: once toggle + trimmed owner-only link name', () => {
    const a = defaultShareAssignment({ once: true, name: '  Ayşe — kasiyer adayı ' });
    assert.equal(a.recurrence, 'once');
    assert.equal(a.assigneeName, 'Ayşe — kasiyer adayı');
    assert.equal(defaultShareAssignment({ name: '   ' }).assigneeName, null);
  });

  it("buildShareLinkBody: 'link' + templateId, recurrence follows the toggle", () => {
    assert.deepEqual(buildShareLinkBody('tpl1'), {
      templateId: 'tpl1',
      assigneeType: 'link',
      recurrence: 'daily',
      assigneeName: null,
    });
    const once = buildShareLinkBody('tpl1', { once: true, name: ' Mutfak tableti ' });
    assert.equal(once.recurrence, 'once');
    assert.equal(once.assigneeName, 'Mutfak tableti');
  });
});

describe('deriveScoringMode (spec §5.1)', () => {
  const plain = [{ weight: 1 }, { weight: 1 }];
  const heavy = [{ weight: 1 }, { weight: 3 }];

  it('create: weighted if any question has weight > 1, else percentage', () => {
    assert.equal(deriveScoringMode({ questions: plain, mode: 'create' }), 'percentage');
    assert.equal(deriveScoringMode({ questions: heavy, mode: 'create' }), 'weighted');
    assert.equal(deriveScoringMode({ questions: [], mode: 'create' }), 'percentage');
    assert.equal(deriveScoringMode({ questions: [{}, { weight: null }], mode: 'create' }), 'percentage');
  });

  it('edit with 0 responses re-derives (unless the stored mode is pass_fail)', () => {
    assert.equal(
      deriveScoringMode({ questions: heavy, mode: 'edit', storedMode: 'percentage', hasResponses: false }),
      'weighted',
    );
    assert.equal(
      deriveScoringMode({ questions: plain, mode: 'edit', storedMode: 'weighted', hasResponses: false }),
      'percentage',
    );
  });

  it('edit with responses NEVER re-derives — old responses keep the semantics they were scored with', () => {
    assert.equal(
      deriveScoringMode({ questions: heavy, mode: 'edit', storedMode: 'percentage', hasResponses: true }),
      'percentage',
    );
    assert.equal(
      deriveScoringMode({ questions: plain, mode: 'edit', storedMode: 'weighted', hasResponses: true }),
      'weighted',
    );
  });

  it('a stored pass_fail (seeded) mode is preserved on edit even without responses', () => {
    assert.equal(
      deriveScoringMode({ questions: heavy, mode: 'edit', storedMode: 'pass_fail', hasResponses: false }),
      'pass_fail',
    );
    assert.equal(
      deriveScoringMode({ questions: heavy, mode: 'edit', storedMode: 'pass_fail', hasResponses: true }),
      'pass_fail',
    );
  });

  it('an explicit choice under "Daha fazla ayar" always wins', () => {
    assert.equal(
      deriveScoringMode({ questions: plain, mode: 'create', explicitMode: 'pass_fail' }),
      'pass_fail',
    );
    assert.equal(
      deriveScoringMode({
        questions: plain,
        mode: 'edit',
        storedMode: 'weighted',
        hasResponses: true,
        explicitMode: 'percentage',
      }),
      'percentage',
    );
  });

  it('edit without a stored mode falls back to percentage', () => {
    assert.equal(deriveScoringMode({ questions: plain, mode: 'edit', hasResponses: true }), 'percentage');
  });
});

// ─── Spec §6.3 — PATCH schema ───────────────────────────────────────────

describe('AuditTemplatePatchSchema (no silent defaults — Zod 4 .partial() gotcha)', () => {
  const yesNo = {
    type: 'yes_no' as const,
    prompt: 'Eldiven var mı?',
    options: ['Evet', 'Hayır'],
    correctAnswer: 'Evet',
    weight: 1,
    isRequired: true,
    sortOrder: 10,
  };

  it('a title-only body parses to EXACTLY that body — no injected locale/publish', () => {
    const r = AuditTemplatePatchSchema.safeParse({ title: 'Yeni başlık' });
    assert.equal(r.success, true);
    if (r.success) {
      assert.deepEqual(r.data, { title: 'Yeni başlık' });
      assert.ok(!('locale' in r.data), 'locale must not be defaulted to tr');
      assert.ok(!('publish' in r.data), 'publish must not be defaulted to false (it would unpublish the audit)');
    }
  });

  it('an empty body is valid and stays empty', () => {
    const r = AuditTemplatePatchSchema.safeParse({});
    assert.equal(r.success, true);
    if (r.success) assert.deepEqual(r.data, {});
  });

  it('publish:true and publish:false are both kept as sent', () => {
    const on = AuditTemplatePatchSchema.safeParse({ publish: true });
    const off = AuditTemplatePatchSchema.safeParse({ publish: false });
    assert.equal(on.success && on.data.publish, true);
    assert.equal(off.success && off.data.publish, false);
  });

  it('accepts questions with and without ids, plus expectedUpdatedAt', () => {
    const r = AuditTemplatePatchSchema.safeParse({
      questions: [{ ...yesNo, id: 'srv-1' }, { ...yesNo, prompt: 'Yeni madde' }],
      expectedUpdatedAt: '2026-10-13T12:34:56.789Z',
    });
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.questions?.[0].id, 'srv-1');
      assert.equal(r.data.questions?.[1].id, undefined);
    }
  });

  it('rejects an invalid expectedUpdatedAt, an empty question list and unknown keys (strict)', () => {
    assert.equal(AuditTemplatePatchSchema.safeParse({ expectedUpdatedAt: 'yesterday' }).success, false);
    assert.equal(AuditTemplatePatchSchema.safeParse({ questions: [] }).success, false);
    assert.equal(AuditTemplatePatchSchema.safeParse({ isActive: false }).success, false);
    assert.equal(AuditTemplatePatchSchema.safeParse({ restaurantId: 'x' }).success, false);
  });

  it('keeps accepting (and ignoring) the legacy assignment block', () => {
    const r = AuditTemplatePatchSchema.safeParse({ assignment: { enabled: false } });
    assert.equal(r.success, true);
  });

  it('nullable fields can be cleared explicitly', () => {
    const r = AuditTemplatePatchSchema.safeParse({ description: null, categoryId: null, passingScore: null });
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.description, null);
      assert.equal(r.data.categoryId, null);
      assert.equal(r.data.passingScore, null);
    }
  });

  it('create still defaults locale to tr and publish to false (unchanged contract)', () => {
    const r = AuditTemplateSubmitSchema.safeParse({
      title: 'X',
      sector: 'food',
      scoringMode: 'percentage',
      questions: [yesNo],
    });
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.locale, 'tr');
      assert.equal(r.data.publish, false);
    }
  });
});
