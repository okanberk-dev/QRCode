/**
 * Denetim Merkezi — tek sayfa builder'ın saf durum yardımcıları
 * (`src/components/audits/builder-state.ts`) birim testleri. React yok, DB yok.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCreatePayload,
  buildEditPayload,
  buildInitialState,
  buildPatchQuestions,
  builderSnapshot,
  effectiveKind,
  hasScorableQuestion,
  questionsFromRows,
  readPassingScore,
  resolveScoringMode,
  sameStructure,
  sanitizePassingInput,
  validateBuilder,
  type BuilderEditSource,
  type BuilderForkSource,
  type BuilderPayloadMeta,
} from '../src/components/audits/builder-state';
import {
  makeDefaultQuestion,
  type AuditBuilderQuestion,
  type ServerQuestionRow,
} from '../src/lib/audits/question-normalize';
import {
  AuditTemplatePatchSchema,
  AuditTemplateSubmitSchema,
} from '../src/lib/audits/wizard-state';

function row(over: Partial<ServerQuestionRow> & { id: string }): ServerQuestionRow {
  return {
    type: 'yes_no',
    prompt: 'Soru',
    helpText: null,
    options: ['Evet', 'Hayır'],
    correctAnswer: 'Evet',
    weight: 1,
    isRequired: true,
    sortOrder: 10,
    ...over,
  };
}

function q(over: Partial<AuditBuilderQuestion> = {}): AuditBuilderQuestion {
  return { ...makeDefaultQuestion('yes_no', 'tr', { prompt: 'Zemin temiz mi?' }), ...over };
}

const META: BuilderPayloadMeta = {
  title: '  Mutfak açılış  ',
  description: '   ',
  auditLocale: 'tr',
  sector: 'food',
  categoryId: null,
  scoringMode: 'percentage',
  passingScore: null,
};

describe('initial state', () => {
  it('blank create: Turkish, empty, derived sector / mode, checklist', () => {
    const s = buildInitialState({ mode: 'create' });
    assert.equal(s.title, '');
    assert.equal(s.locale, 'tr');
    assert.deepEqual(s.questions, []);
    assert.equal(s.sectorOverride, null);
    assert.equal(s.scoringOverride, null);
    assert.equal(s.startKind, 'checklist');
    assert.equal(s.passingScoreInput, '');
  });

  it('fork keeps the source language, sector, category and pass mark; questions are all new', () => {
    const fork: BuilderForkSource = {
      title: 'Hijyen testi',
      description: 'Not',
      sector: 'health',
      scoringMode: 'pass_fail',
      passingScore: 70,
      categoryId: 'cat1',
      locale: 'en',
      questions: [
        row({ id: 'b', sortOrder: 20, type: 'single', options: ['A', 'B'], correctAnswer: 'A' }),
        row({ id: 'a', sortOrder: 10 }),
      ],
    };
    const s = buildInitialState({ mode: 'create', fork });
    assert.equal(s.locale, 'en');
    assert.equal(s.sectorOverride, 'health');
    assert.equal(s.categoryId, 'cat1');
    assert.equal(s.passingScoreInput, '70');
    // seeded Pass / Fail survives; the question order follows sortOrder
    assert.equal(s.scoringOverride, 'pass_fail');
    assert.equal(s.questions[0].type, 'yes_no');
    assert.equal(s.questions[1].type, 'single');
    assert.ok(s.questions.every((x) => x.persistedId === null));
    assert.deepEqual(
      s.questions.map((x) => x.sortOrder),
      [10, 20],
    );
    // a single-choice question makes the start kind a test
    assert.equal(s.startKind, 'quiz');
  });

  it('fork of a percentage / weighted source derives the mode from the weights', () => {
    const base: BuilderForkSource = {
      title: 'T',
      description: null,
      sector: 'food',
      scoringMode: 'weighted',
      passingScore: null,
      categoryId: null,
      locale: 'tr',
      questions: [row({ id: 'a' })],
    };
    assert.equal(buildInitialState({ mode: 'create', fork: base }).scoringOverride, null);
  });

  it('edit loads persisted ids, the stored language / sector and keeps mode derivation open', () => {
    const edit: BuilderEditSource = {
      id: 'tpl1',
      restaurantId: 'r1',
      title: 'Günlük kontrol',
      description: null,
      sector: 'hotel',
      scoringMode: 'weighted',
      passingScore: 80,
      locale: 'tr',
      categoryId: null,
      isPublished: true,
      updatedAt: '2026-10-14T05:00:00.123Z',
      hasResponses: true,
      questions: [row({ id: 'q1' }), row({ id: 'q2', sortOrder: 20, type: 'scale', options: null, correctAnswer: null })],
      answeredQuestionIds: ['q1'],
    };
    const s = buildInitialState({ mode: 'edit', edit });
    assert.deepEqual(
      s.questions.map((x) => x.persistedId),
      ['q1', 'q2'],
    );
    assert.equal(s.sectorOverride, 'hotel');
    assert.equal(s.passingScoreInput, '80');
    assert.equal(s.scoringOverride, null);
  });

  it('question rows sort by sortOrder and renumber to 10, 20, …', () => {
    const qs = questionsFromRows(
      [row({ id: 'z', sortOrder: 50 }), row({ id: 'a', sortOrder: 5 }), row({ id: 'm', sortOrder: 30 })],
      { persisted: true },
    );
    assert.deepEqual(
      qs.map((x) => x.persistedId),
      ['a', 'm', 'z'],
    );
    assert.deepEqual(
      qs.map((x) => x.sortOrder),
      [10, 20, 30],
    );
  });
});

describe('derived values', () => {
  it('kind follows the questions, and falls back to the chosen start kind while empty', () => {
    assert.equal(effectiveKind([], 'quiz'), 'quiz');
    assert.equal(effectiveKind([], 'checklist'), 'checklist');
    assert.equal(effectiveKind([q()], 'quiz'), 'checklist');
    assert.equal(effectiveKind([q(), makeDefaultQuestion('single', 'tr', { prompt: 'S' })], 'checklist'), 'quiz');
  });

  it('a pass mark is only relevant with at least one scorable question', () => {
    // yes/no with an expected answer, scale: scorable
    assert.equal(hasScorableQuestion([q()], 'tr'), true);
    assert.equal(hasScorableQuestion([makeDefaultQuestion('scale', 'tr', { prompt: 'Puan' })], 'tr'), true);
    // no expected answer, note, photo: not scorable
    assert.equal(hasScorableQuestion([q({ correctAnswer: null })], 'tr'), false);
    assert.equal(hasScorableQuestion([makeDefaultQuestion('text', 'tr', { prompt: 'Not' })], 'tr'), false);
    assert.equal(hasScorableQuestion([makeDefaultQuestion('file', 'tr', { prompt: 'Foto' })], 'tr'), false);
    assert.equal(hasScorableQuestion([], 'tr'), false);
  });

  it('a choice question whose expected answer is not among its options is not scorable', () => {
    const single = makeDefaultQuestion('single', 'tr', {
      prompt: 'Hangisi?',
      options: ['A', 'B'],
      correctAnswer: 'C',
    });
    assert.equal(hasScorableQuestion([single], 'tr'), false);
    assert.equal(hasScorableQuestion([{ ...single, correctAnswer: 'A' }], 'tr'), true);
  });

  it('pass mark input: digits only, 3 characters, 0-100', () => {
    assert.equal(sanitizePassingInput('8a0b'), '80');
    assert.equal(sanitizePassingInput('12345'), '123');
    assert.deepEqual(readPassingScore(''), { value: null, invalid: false });
    assert.deepEqual(readPassingScore('  '), { value: null, invalid: false });
    assert.deepEqual(readPassingScore('0'), { value: 0, invalid: false });
    assert.deepEqual(readPassingScore('80'), { value: 80, invalid: false });
    assert.deepEqual(readPassingScore('100'), { value: 100, invalid: false });
    assert.deepEqual(readPassingScore('101'), { value: null, invalid: true });
    assert.deepEqual(readPassingScore('8.5'), { value: null, invalid: true });
    assert.deepEqual(readPassingScore('-3'), { value: null, invalid: true });
  });

  it('scoring mode: explicit wins; weights decide on create; responses freeze it on edit', () => {
    const heavy = [q({ weight: 3 })];
    const plain = [q()];
    const create = (qs: AuditBuilderQuestion[], explicit = null) =>
      resolveScoringMode({ mode: 'create', questions: qs, storedMode: null, hasResponses: false, explicitMode: explicit });
    assert.equal(create(plain), 'percentage');
    assert.equal(create(heavy), 'weighted');
    assert.equal(create(plain, 'pass_fail' as never), 'pass_fail');

    const edit = (storedMode: 'percentage' | 'weighted' | 'pass_fail', hasResponses: boolean, qs: AuditBuilderQuestion[]) =>
      resolveScoringMode({ mode: 'edit', questions: qs, storedMode, hasResponses, explicitMode: null });
    assert.equal(edit('percentage', false, heavy), 'weighted');
    assert.equal(edit('pass_fail', false, heavy), 'pass_fail');
    assert.equal(edit('percentage', true, heavy), 'percentage');
    assert.equal(edit('weighted', true, plain), 'weighted');
  });
});

describe('validation (inline, no step jumping)', () => {
  const base = {
    uiLocale: 'tr' as const,
    kind: 'checklist' as const,
    auditLocale: 'tr' as const,
    passingScoreInput: '',
    hasScorable: true,
    scoringMode: 'percentage' as const,
  };

  it('passes a titled audit with one valid item', () => {
    const v = validateBuilder({ ...base, title: 'Mutfak', questions: [q()] });
    assert.equal(v.ok, true);
    assert.equal(v.first, null);
  });

  it('title comes first, then an empty list', () => {
    const v = validateBuilder({ ...base, title: '  ', questions: [] });
    assert.equal(v.ok, false);
    assert.equal(v.titleError, 'Başlık yaz.');
    assert.equal(v.questionsError, 'En az bir madde ekle.');
    assert.deepEqual(v.first, { kind: 'title' });
    const noTitleOk = validateBuilder({ ...base, title: 'X', questions: [] });
    assert.deepEqual(noTitleOk.first, { kind: 'questions' });
  });

  it('a blank prompt and a choice with < 2 options are reported per question, in list order', () => {
    const a = q({ prompt: '   ' });
    const b = makeDefaultQuestion('single', 'tr', { prompt: 'Hangisi?', options: ['Yalnız bir'] });
    const ok = q({ prompt: 'Tamam' });
    const v = validateBuilder({ ...base, title: 'X', questions: [ok, a, b] });
    assert.equal(v.ok, false);
    assert.equal(Object.keys(v.questionErrors).length, 2);
    assert.equal(v.questionErrors[a.clientKey], 'Madde metni boş olamaz.');
    assert.match(v.questionErrors[b.clientKey], /En az 2 seçenek yaz/);
    assert.deepEqual(v.first, { kind: 'question', clientKey: a.clientKey });
  });

  it('wording follows the kind and the UI language', () => {
    const quiz = validateBuilder({ ...base, kind: 'quiz', title: 'X', questions: [] });
    assert.equal(quiz.questionsError, 'En az bir soru ekle.');
    const en = validateBuilder({ ...base, uiLocale: 'en', title: '', questions: [] });
    assert.equal(en.titleError, 'Write a title.');
    assert.equal(en.questionsError, 'Add at least one item.');
  });

  it('pass mark: >100 is wrong; Pass / Fail needs one; hidden section is never validated', () => {
    const over = validateBuilder({ ...base, title: 'X', questions: [q()], passingScoreInput: '101' });
    assert.equal(over.ok, false);
    assert.match(over.passingScoreError ?? '', /0 ile 100/);
    assert.deepEqual(over.first, { kind: 'passingScore' });

    const pf = validateBuilder({ ...base, title: 'X', questions: [q()], scoringMode: 'pass_fail' });
    assert.match(pf.passingScoreError ?? '', /Geçme puanı yaz|geçme puanı yaz/);

    const pfOk = validateBuilder({ ...base, title: 'X', questions: [q()], scoringMode: 'pass_fail', passingScoreInput: '70' });
    assert.equal(pfOk.ok, true);

    const hidden = validateBuilder({
      ...base,
      title: 'X',
      questions: [q()],
      scoringMode: 'pass_fail',
      hasScorable: false,
    });
    assert.equal(hidden.ok, true);
  });
});

describe('dirty tracking', () => {
  const same = {
    title: 'A',
    description: '',
    auditLocale: 'tr' as const,
    passingScoreInput: '',
    sectorOverride: null,
    scoringOverride: null,
    categoryId: null,
  };

  it('identical state → identical snapshot; client keys do not matter', () => {
    const a = q({ clientKey: 'q_a' });
    const b = { ...a, clientKey: 'q_b' };
    assert.equal(
      builderSnapshot({ ...same, questions: [a] }),
      builderSnapshot({ ...same, questions: [b] }),
    );
  });

  it('any visible edit changes the snapshot', () => {
    const a = q();
    const base = builderSnapshot({ ...same, questions: [a] });
    assert.notEqual(base, builderSnapshot({ ...same, title: 'B', questions: [a] }));
    assert.notEqual(base, builderSnapshot({ ...same, questions: [{ ...a, prompt: 'Başka' }] }));
    assert.notEqual(base, builderSnapshot({ ...same, questions: [{ ...a, isRequired: false }] }));
    assert.notEqual(base, builderSnapshot({ ...same, questions: [a, q()] }));
    assert.notEqual(base, builderSnapshot({ ...same, passingScoreInput: '80', questions: [a] }));
    assert.notEqual(base, builderSnapshot({ ...same, scoringOverride: 'pass_fail', questions: [a] }));
  });

  it('reordering is a change', () => {
    const a = q({ prompt: 'a' });
    const b = q({ prompt: 'b' });
    assert.notEqual(
      builderSnapshot({ ...same, questions: [a, b] }),
      builderSnapshot({ ...same, questions: [b, a] }),
    );
  });
});

describe('create payload', () => {
  it('draft: trimmed title, null description, no ids, no link', () => {
    const p = buildCreatePayload(META, [q()], false);
    assert.equal(p.title, 'Mutfak açılış');
    assert.equal(p.description, null);
    assert.equal(p.publish, false);
    assert.equal(p.assignment, undefined);
    assert.equal(p.questions[0].sortOrder, 10);
    assert.equal('id' in p.questions[0], false);
  });

  it('publish: opens one reusable (daily) link in the same request', () => {
    const p = buildCreatePayload(META, [q()], true);
    assert.equal(p.publish, true);
    assert.deepEqual(p.assignment, {
      enabled: true,
      assigneeType: 'link',
      recurrence: 'daily',
      assigneeName: null,
    });
  });

  it('is accepted by the real API schema', () => {
    const body = buildCreatePayload(META, [q(), q({ prompt: 'İkinci' })], true);
    const parsed = AuditTemplateSubmitSchema.safeParse(body);
    assert.equal(parsed.success, true, parsed.success ? '' : JSON.stringify(parsed.error.issues));
  });

  it('blank options are stripped before they reach the schema', () => {
    const choice = makeDefaultQuestion('single', 'tr', { prompt: 'Hangisi?', options: ['A', '', 'B', '  '] });
    const body = buildCreatePayload(META, [choice], false);
    assert.deepEqual(body.questions[0].options, ['A', 'B']);
    assert.equal(AuditTemplateSubmitSchema.safeParse(body).success, true);
  });
});

describe('edit payload (live edit keeps ids and links)', () => {
  const stored = questionsFromRows(
    [
      row({ id: 'q1', prompt: 'Birinci', sortOrder: 10 }),
      row({ id: 'q2', prompt: 'İkinci', sortOrder: 20 }),
    ],
    { persisted: true },
  );
  const initialById = new Map(stored.map((x) => [x.persistedId as string, x]));

  it('sends ids only for persisted questions and the stamp for the stale-edit guard', () => {
    const fresh = q({ prompt: 'Yeni madde' });
    const body = buildEditPayload(META, [...stored, fresh], '2026-10-14T05:00:00.123Z', initialById);
    assert.equal(body.expectedUpdatedAt, '2026-10-14T05:00:00.123Z');
    const ids = (body.questions ?? []).map((x) => ('id' in x ? x.id : undefined));
    assert.deepEqual(ids, ['q1', 'q2', undefined]);
    assert.deepEqual(
      (body.questions ?? []).map((x) => x.sortOrder),
      [10, 20, 30],
    );
    assert.equal(AuditTemplatePatchSchema.safeParse(body).success, true);
  });

  it('never touches the publish state', () => {
    const body = buildEditPayload(META, stored, '2026-10-14T05:00:00.123Z', initialById);
    assert.equal('publish' in body, false);
    assert.equal('assignment' in body, false);
  });

  it('reordering keeps ids and renumbers sortOrder to the new positions', () => {
    const body = buildEditPayload(META, [stored[1], stored[0]], '2026-10-14T05:00:00.123Z', initialById);
    assert.deepEqual(
      (body.questions ?? []).map((x) => ('id' in x ? x.id : undefined)),
      ['q2', 'q1'],
    );
    assert.deepEqual(
      (body.questions ?? []).map((x) => x.sortOrder),
      [10, 20],
    );
  });

  it('an untouched stored yes/no keeps its stored wording even when the audit language differs', () => {
    // English audit, but the stored options are Turkish (created through the old flows).
    const legacy = questionsFromRows(
      [row({ id: 'q1', options: ['Evet', 'Hayır'], correctAnswer: 'Evet' })],
      { persisted: true },
    );
    const byId = new Map(legacy.map((x) => [x.persistedId as string, x]));
    const [payload] = buildPatchQuestions(legacy, 'en', byId);
    assert.deepEqual(payload.options, ['Evet', 'Hayır']);
    assert.equal(payload.correctAnswer, 'Evet');
    assert.equal(payload.id, 'q1');
  });

  it('an untouched stored choice option with stray spaces is sent verbatim (no false lock)', () => {
    const spaced = questionsFromRows(
      [row({ id: 'q1', type: 'single', options: ['Evet ', 'Hayır'], correctAnswer: 'Evet ' })],
      { persisted: true },
    );
    const byId = new Map(spaced.map((x) => [x.persistedId as string, x]));
    const [payload] = buildPatchQuestions(spaced, 'tr', byId);
    assert.deepEqual(payload.options, ['Evet ', 'Hayır']);
    assert.equal(payload.correctAnswer, 'Evet ');
  });

  it('a changed question is normalized (blank options dropped) while its prompt edit goes through', () => {
    const edited = { ...stored[0], prompt: '  Düzeltilmiş  ' };
    const [payload] = buildPatchQuestions([edited], 'tr', initialById);
    assert.equal(payload.prompt, 'Düzeltilmiş');
    assert.equal(payload.id, 'q1');

    const choice = questionsFromRows(
      [row({ id: 'c1', type: 'single', options: ['A', 'B'], correctAnswer: 'A' })],
      { persisted: true },
    );
    const choiceById = new Map(choice.map((x) => [x.persistedId as string, x]));
    const changed = { ...choice[0], options: ['A', '', 'B', 'C'] };
    const [p2] = buildPatchQuestions([changed], 'tr', choiceById);
    assert.deepEqual(p2.options, ['A', 'B', 'C']);
  });

  it('structure comparison covers type, weight, options and the expected answer', () => {
    const a = stored[0];
    assert.equal(sameStructure(a, { ...a }), true);
    assert.equal(sameStructure(a, { ...a, weight: 2 }), false);
    assert.equal(sameStructure(a, { ...a, correctAnswer: 'Hayır' }), false);
    assert.equal(sameStructure(a, { ...a, options: ['Evet', 'Hayır', 'x'] }), false);
    assert.equal(sameStructure(a, { ...a, type: 'single' }), false);
    // the prompt is not structure
    assert.equal(sameStructure(a, { ...a, prompt: 'başka' }), true);
  });
});
