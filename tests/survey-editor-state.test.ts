import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCENT_SWATCHES,
  DEFAULT_ACCENT,
  accentChoices,
  blankEditorQuestion,
  blankForm,
  buildCreateBody,
  buildPatchBody,
  changeQuestionType,
  describeSaveError,
  duplicateEditorQuestion,
  editorSnapshot,
  filledOptionTexts,
  formFromStored,
  formFromTemplate,
  insertDuplicate,
  isAnsweredTextChanged,
  isPresetAccent,
  isTypeLocked,
  moveQuestion,
  rebaseAfterSave,
  removeQuestionFromForm,
  validateEditor,
  type EditorForm,
  type StoredEditorSurvey,
} from '../src/app/[locale]/dashboard/surveys/_components/survey-editor-state';
import { instantiateTemplate, getSurveyTemplate } from '../src/lib/survey-templates';
import { planQuestionSync, validateOptionsForWrite } from '../src/lib/surveys';

// Surveys editor — pure state, validation and request bodies. The editor must
// be lossless: stored questions travel with their id, only deliberate deletes
// are named, locks mirror the server rules R1/R2, duplicates follow R3.

let seq = 0;
const id = () => `q_test_${++seq}`;
const key = () => `o_test_${++seq}`;

function stored(overrides: Partial<StoredEditorSurvey> = {}): StoredEditorSurvey {
  return {
    id: 'sv1',
    title: 'Memnuniyet',
    description: null,
    isPublished: true,
    accentColor: '#C6F24E',
    thankYouMessage: null,
    collectContact: true,
    couponCode: null,
    couponLabel: null,
    responseCount: 14,
    questions: [
      { id: 'qa', text: 'Genel puan', type: 'rating', options: null, required: true, answerCount: 14, usedOptions: [] },
      {
        id: 'qb',
        text: 'En çok neyi beğendiniz?',
        type: 'multiple_choice',
        options: ['Lezzet', 'Hizmet', 'Hız', 'Fiyat'],
        required: true,
        answerCount: 14,
        usedOptions: ['Lezzet', 'Hizmet'],
      },
      { id: 'qc', text: 'Not', type: 'long_text', options: null, required: false, answerCount: 3, usedOptions: [] },
    ],
    ...overrides,
  };
}

function loaded(overrides: Partial<StoredEditorSurvey> = {}): EditorForm {
  return formFromStored(stored(overrides), '#C6F24E', id, key);
}

// ── loading a stored survey ────────────────────────────────────────────────

test('formFromStored locks only answered options of an answered choice question', () => {
  const form = loaded();
  const choice = form.questions[1];
  assert.deepEqual(
    choice.options.map((o) => [o.text, o.locked]),
    [['Lezzet', true], ['Hizmet', true], ['Hız', false], ['Fiyat', false]],
  );
  assert.equal(isTypeLocked(form.questions[0]), true);
  assert.equal(form.questions[0].id, 'qa');
});

test('a question without answers has no locks even if usedOptions were passed', () => {
  const form = loaded({
    questions: [
      { id: 'qx', text: 'X', type: 'multiple_choice', options: ['A', 'B'], required: true, answerCount: 0, usedOptions: ['A'] },
    ],
  });
  assert.equal(form.questions[0].options.every((o) => !o.locked), true);
  assert.equal(isTypeLocked(form.questions[0]), false);
});

test('formFromStored falls back to the business colour, then lime', () => {
  assert.equal(loaded({ accentColor: null }).accentColor, '#C6F24E');
  const f = formFromStored(stored({ accentColor: null }), '#1a73e8', id, key);
  assert.equal(f.accentColor, '#1A73E8');
  const g = formFromStored(stored({ accentColor: 'nope' }), 'also-bad', id, key);
  assert.equal(g.accentColor, DEFAULT_ACCENT);
});

// ── lossless PATCH ─────────────────────────────────────────────────────────

test('an unchanged form produces a PATCH that planQuestionSync accepts with no removals', () => {
  const initial = loaded();
  const body = buildPatchBody(initial, initial);
  const questions = body.questions as Array<{ id?: string }>;
  assert.deepEqual(questions.map((q) => q.id), ['qa', 'qb', 'qc']);
  assert.deepEqual(body.removedQuestionIds, []);

  const existing = stored().questions.map((q) => ({ ...q }));
  const plan = planQuestionSync(existing, body.questions as never, body.removedQuestionIds as string[]);
  assert.equal(plan.ok, true);
  if (plan.ok) {
    assert.equal(plan.update.length, 3);
    assert.equal(plan.create.length, 0);
    assert.equal(plan.remove.length, 0);
  }
});

test('rewording an answered question keeps its id and is accepted', () => {
  const initial = loaded();
  const form: EditorForm = {
    ...initial,
    questions: initial.questions.map((q) => (q.id === 'qa' ? { ...q, text: 'Genel memnuniyet' } : q)),
  };
  assert.equal(isAnsweredTextChanged(form.questions[0]), true);
  const body = buildPatchBody(form, initial);
  const plan = planQuestionSync(stored().questions, body.questions as never, body.removedQuestionIds as string[]);
  assert.equal(plan.ok, true);
});

test('deleting a stored question names it in removedQuestionIds; the server then allows it', () => {
  const initial = loaded();
  const target = initial.questions[2];
  const form = removeQuestionFromForm(initial, target.localId);
  assert.equal(form.questions.length, 2);
  assert.deepEqual(form.removedQuestionIds, ['qc']);
  const body = buildPatchBody(form, initial);
  const plan = planQuestionSync(stored().questions, body.questions as never, body.removedQuestionIds as string[]);
  assert.equal(plan.ok, true);
  if (plan.ok) assert.deepEqual(plan.remove, [{ id: 'qc', answerCount: 3 }]);
});

test('the same removal WITHOUT the id list is refused by the server rule', () => {
  const initial = loaded();
  const form = removeQuestionFromForm(initial, initial.questions[2].localId);
  const body = buildPatchBody(form, initial);
  const plan = planQuestionSync(stored().questions, body.questions as never, []);
  assert.equal(plan.ok, false);
  if (!plan.ok) assert.equal(plan.code, 'removal_not_confirmed');
});

test('removing a question that was only added in this session records no id', () => {
  const initial = loaded();
  const added = blankEditorQuestion('short_text', id, key);
  const withNew: EditorForm = { ...initial, questions: [...initial.questions, added] };
  const form = removeQuestionFromForm(withNew, added.localId);
  assert.deepEqual(form.removedQuestionIds, []);
  assert.equal(form.questions.length, 3);
});

test('the last remaining question cannot be removed', () => {
  const form = blankForm(id, key);
  assert.equal(removeQuestionFromForm(form, form.questions[0].localId), form);
});

test('new questions travel without an id; choice options only for multiple choice', () => {
  const initial = loaded();
  const added = { ...blankEditorQuestion('multiple_choice', id, key), text: 'Yeni', options: [{ key: 'k1', text: 'A', locked: false }, { key: 'k2', text: ' B ', locked: false }, { key: 'k3', text: '', locked: false }] };
  const form: EditorForm = { ...initial, questions: [...initial.questions, added] };
  const body = buildPatchBody(form, initial);
  const sent = body.questions as Array<Record<string, unknown>>;
  assert.equal('id' in sent[3], false);
  assert.deepEqual(sent[3].options, ['A', 'B']);
  assert.equal('options' in sent[0], false);
  assert.equal('type' in body, false);
});

test('accent and coupon are only sent when they changed', () => {
  const initial = loaded();
  const same = buildPatchBody(initial, initial);
  assert.equal('accentColor' in same, false);
  assert.equal('couponCode' in same, false);
  assert.equal('couponLabel' in same, false);

  const changed: EditorForm = { ...initial, accentColor: '#1a73e8', couponCode: ' ABC ', couponLabel: 'İlk ziyarette %10' };
  const body = buildPatchBody(changed, initial);
  assert.equal(body.accentColor, '#1A73E8');
  assert.equal(body.couponCode, 'ABC');
  assert.equal(body.couponLabel, 'İlk ziyarette %10');
});

test('every key of the PATCH body is one the server schema accepts', () => {
  const initial = loaded();
  const body = buildPatchBody({ ...initial, accentColor: '#1A73E8', couponCode: 'X', couponLabel: 'Y' }, initial);
  const allowed = new Set([
    'title', 'description', 'accentColor', 'thankYouMessage', 'collectContact',
    'couponCode', 'couponLabel', 'isActive', 'questions', 'removedQuestionIds',
  ]);
  for (const k of Object.keys(body)) assert.ok(allowed.has(k), `unexpected key ${k}`);
  for (const q of body.questions as Array<Record<string, unknown>>) {
    for (const k of Object.keys(q)) assert.ok(['id', 'text', 'type', 'options', 'required'].includes(k), `unexpected question key ${k}`);
  }
});

// ── create body ────────────────────────────────────────────────────────────

test('the create body has no ids, no type, trims text and nulls empty optionals', () => {
  const template = getSurveyTemplate('satisfaction-plus');
  assert.ok(template);
  const form = formFromTemplate(instantiateTemplate(template, 'tr', id), key);
  const body = buildCreateBody({ ...form, description: '  ', couponCode: ' ', couponLabel: '' }, 'rest1', true);
  assert.equal(body.restaurantId, 'rest1');
  assert.equal(body.isPublished, true);
  assert.equal(body.description, null);
  assert.equal(body.couponCode, null);
  assert.equal(body.couponLabel, null);
  assert.equal('type' in body, false);
  assert.equal(body.questions.length, 3);
  for (const q of body.questions) assert.equal('id' in q, false);
  const choice = body.questions.find((q) => q.type === 'multiple_choice');
  assert.deepEqual(choice?.options, ['Kalite', 'Hizmet', 'Hız', 'Fiyat', 'Ortam']);
  // The server accepts the option list as a brand-new question.
  assert.ok(validateOptionsForWrite(choice?.options));
});

test('a template becomes a valid form straight away', () => {
  for (const tid of ['satisfaction-plus', 'nps-one', 'quick-stars', 'table-service', 'post-stay', 'post-visit', 'post-service', 'in-store'] as const) {
    for (const locale of ['tr', 'en'] as const) {
      const t = getSurveyTemplate(tid);
      assert.ok(t);
      const form = formFromTemplate(instantiateTemplate(t, locale, id), key);
      const v = validateEditor(form, { locale });
      assert.equal(v.ok, true, `${tid}/${locale}`);
      assert.equal(form.accentColor, DEFAULT_ACCENT);
    }
  }
});

test('blank form is one empty star question and fails validation on title and text', () => {
  const form = blankForm(id, key);
  assert.equal(form.questions.length, 1);
  assert.equal(form.questions[0].type, 'rating');
  const v = validateEditor(form, { locale: 'tr' });
  assert.equal(v.ok, false);
  assert.equal(v.count, 2);
  assert.deepEqual(v.first, { kind: 'title' });
});

// ── validation ─────────────────────────────────────────────────────────────

test('validation reports in page order and focuses the first problem', () => {
  const form = blankForm(id, key);
  const q = form.questions[0];
  const v = validateEditor({ ...form, title: 'Başlık', questions: [q] }, { locale: 'en' });
  assert.equal(v.titleError, null);
  assert.equal(v.questionErrors[q.localId].text, 'Write the question.');
  assert.deepEqual(v.first, { kind: 'question', localId: q.localId });
});

test('a choice question needs two filled options; blank rows are ignored', () => {
  const q = { ...blankEditorQuestion('multiple_choice', id, key), text: 'Seç' };
  q.options = [{ key: 'a', text: 'Bir', locked: false }, { key: 'b', text: '  ', locked: false }];
  const form: EditorForm = { ...blankForm(id, key), title: 'T', questions: [q] };
  const v = validateEditor(form, { locale: 'tr' });
  assert.equal(v.questionErrors[q.localId].options, 'En az 2 seçenek yaz.');
  assert.deepEqual(v.first, { kind: 'option', localId: q.localId, index: 1 });

  q.options = [{ key: 'a', text: 'Bir', locked: false }, { key: 'b', text: 'İki', locked: false }, { key: 'c', text: '', locked: false }];
  assert.equal(validateEditor(form, { locale: 'tr' }).ok, true);
  assert.deepEqual(filledOptionTexts(q), ['Bir', 'İki']);
});

test('a new duplicate option (case/space/Turkish-case insensitive) is flagged on its row', () => {
  const q = { ...blankEditorQuestion('multiple_choice', id, key), text: 'Seç' };
  q.options = [
    { key: 'a', text: 'Işık', locked: false },
    { key: 'b', text: 'Hız', locked: false },
    { key: 'c', text: '  ışık ', locked: false },
  ];
  const form: EditorForm = { ...blankForm(id, key), title: 'T', questions: [q] };
  const v = validateEditor(form, { locale: 'tr' });
  assert.equal(v.ok, false);
  assert.deepEqual(v.questionErrors[q.localId].duplicateRows, [2]);
  assert.deepEqual(v.first, { kind: 'option', localId: q.localId, index: 2 });
});

test('old stored duplicates stay editable (R3) but a third copy is flagged', () => {
  const legacy = loaded({
    questions: [
      { id: 'qd', text: 'Nasıldı?', type: 'multiple_choice', options: ['İyi', 'iyi', 'Kötü'], required: true, answerCount: 0, usedOptions: [] },
    ],
  });
  assert.equal(validateEditor(legacy, { locale: 'tr' }).ok, true);

  const q = legacy.questions[0];
  const third: EditorForm = { ...legacy, questions: [{ ...q, options: [...q.options, { key: 'z', text: 'İYİ', locked: false }] }] };
  assert.deepEqual(validateEditor(third, { locale: 'tr' }).questionErrors[q.localId].duplicateRows, [3]);

  const removedOne: EditorForm = { ...legacy, questions: [{ ...q, options: q.options.filter((o) => o.text !== 'iyi') }] };
  assert.equal(validateEditor(removedOne, { locale: 'tr' }).ok, true);
});

test('coupon code needs a description in create mode', () => {
  const form: EditorForm = { ...blankForm(id, key), title: 'T', couponCode: 'KOD' };
  form.questions[0].text = 'Soru';
  const v = validateEditor(form, { locale: 'en' });
  assert.equal(v.couponError, 'Add a description for the coupon code.');
  assert.deepEqual(v.first, { kind: 'coupon' });
});

test('a legacy bare coupon code does not block editing until the coupon is touched', () => {
  const initial = loaded({ couponCode: 'ESKI10', couponLabel: null });
  const ctx = { locale: 'tr' as const, initialCoupon: { code: initial.couponCode, label: initial.couponLabel } };
  assert.equal(validateEditor(initial, ctx).ok, true);
  const touched: EditorForm = { ...initial, couponCode: 'YENI10' };
  assert.equal(validateEditor(touched, ctx).couponError, 'Kupon koduna bir açıklama ekle.');
  const fixed: EditorForm = { ...initial, couponLabel: 'Bir sonraki ziyarette %10' };
  assert.equal(validateEditor(fixed, ctx).ok, true);
});

test('question count limits', () => {
  const base = blankForm(id, key);
  const many = Array.from({ length: 31 }, () => ({ ...blankEditorQuestion('rating', id, key), text: 'S' }));
  const v = validateEditor({ ...base, title: 'T', questions: many }, { locale: 'en' });
  assert.equal(v.questionsError, 'You can add up to 30 questions.');
  const none = validateEditor({ ...base, title: 'T', questions: [] }, { locale: 'tr' });
  assert.equal(none.questionsError, 'En az 1 soru olmalı.');
});

// ── list operations ────────────────────────────────────────────────────────

test('moveQuestion swaps neighbours and ignores out-of-range moves', () => {
  const form = loaded();
  const ids = (list: typeof form.questions) => list.map((q) => q.id);
  assert.deepEqual(ids(moveQuestion(form.questions, 0, 1)), ['qb', 'qa', 'qc']);
  assert.deepEqual(ids(moveQuestion(form.questions, 2, -1)), ['qa', 'qc', 'qb']);
  assert.deepEqual(ids(moveQuestion(form.questions, 0, -1)), ['qa', 'qb', 'qc']);
  assert.deepEqual(ids(moveQuestion(form.questions, 2, 1)), ['qa', 'qb', 'qc']);
});

test('a duplicate is a brand-new unlocked question placed right below', () => {
  const form = loaded();
  const copy = duplicateEditorQuestion(form.questions[1], id, key);
  assert.equal(copy.id, null);
  assert.equal(copy.answerCount, 0);
  assert.equal(copy.options.every((o) => !o.locked), true);
  assert.deepEqual(copy.options.map((o) => o.text), ['Lezzet', 'Hizmet', 'Hız', 'Fiyat']);
  const next = insertDuplicate(form.questions, 1, copy);
  assert.equal(next[2], copy);
  assert.equal(next.length, 4);
});

test('changing to multiple choice pads to two rows; other changes keep rows', () => {
  const q = blankEditorQuestion('rating', id, key);
  const choice = changeQuestionType(q, 'multiple_choice', key);
  assert.equal(choice.options.length, 2);
  const text = changeQuestionType(choice, 'short_text', key);
  assert.equal(text.options.length, 2);
  assert.equal(changeQuestionType(q, 'rating', key), q);
});

// ── snapshot / dirty ───────────────────────────────────────────────────────

test('the snapshot ignores local ids and notices real edits', () => {
  const a = loaded();
  const b = loaded();
  assert.equal(editorSnapshot(a), editorSnapshot(b));
  assert.notEqual(editorSnapshot(a), editorSnapshot({ ...a, title: 'Başka' }));
  assert.notEqual(editorSnapshot(a), editorSnapshot({ ...a, questions: moveQuestion(a.questions, 0, 1) }));
  assert.notEqual(editorSnapshot(a), editorSnapshot(removeQuestionFromForm(a, a.questions[2].localId)));
  assert.notEqual(
    editorSnapshot(a),
    editorSnapshot({ ...a, questions: a.questions.map((q, i) => (i === 0 ? { ...q, required: false } : q)) }),
  );
});

test('rebaseAfterSave adopts new ids and clears the removal list', () => {
  const initial = loaded();
  const added = { ...blankEditorQuestion('short_text', id, key), text: 'Yeni' };
  const form = removeQuestionFromForm({ ...initial, questions: [...initial.questions, added] }, initial.questions[2].localId);
  const rebased = rebaseAfterSave(form, ['qa', 'qb', 'q_new']);
  assert.deepEqual(rebased.questions.map((q) => q.id), ['qa', 'qb', 'q_new']);
  assert.deepEqual(rebased.removedQuestionIds, []);
  assert.equal(rebased.questions[2].answerCount, 0);
  assert.equal(rebased.questions[2].originalText, 'Yeni');
  assert.equal(rebased.questions[0].answerCount, 14);
});

// ── accent ─────────────────────────────────────────────────────────────────

test('no ink swatch; brand colour shows only when it is not a swatch', () => {
  assert.equal(ACCENT_SWATCHES.length, 7);
  assert.equal(ACCENT_SWATCHES.some((s) => s.hex === '#0A0A0A'), false);
  assert.equal(accentChoices('#c6f24e').brand, null);
  assert.equal(accentChoices('#123456').brand, '#123456');
  assert.equal(accentChoices(null).brand, null);
  assert.equal(isPresetAccent('#1a73e8', null), true);
  assert.equal(isPresetAccent('#123456', '#123456'), true);
  assert.equal(isPresetAccent('#654321', '#123456'), false);
});

// ── server error wording ───────────────────────────────────────────────────

test('stale / unconfirmed removal map to the reload warning in both languages', () => {
  for (const code of ['stale_survey', 'removal_not_confirmed']) {
    const tr = describeSaveError(409, { error: code, message: 'x' }, 'tr');
    assert.equal(tr.kind, 'stale');
    assert.match(tr.message, /başka bir yerde değiştirilmiş/);
    assert.match(tr.message, /yenilemen gerekiyor/);
    const en = describeSaveError(409, { error: code }, 'en');
    assert.equal(en.kind, 'stale');
    assert.match(en.message, /changed somewhere else/);
  }
});

test('other errors never leak a raw code', () => {
  assert.match(describeSaveError(403, { error: 'surveys_disabled' }, 'en').message, /turned off/);
  assert.equal(describeSaveError(403, { error: 'surveys_disabled' }, 'en').kind, 'disabled');
  assert.match(describeSaveError(409, { error: 'question_locked' }, 'en').message, /responses/);
  assert.equal(describeSaveError(429, { error: 'rate_limit' }, 'tr').message, 'Çok fazla istek. Biraz bekleyip tekrar dene.');
  assert.equal(describeSaveError(409, { error: 'question_locked', message: 'Yanıtı olan sorunun tipi değiştirilemez.' }, 'tr').message, 'Yanıtı olan sorunun tipi değiştirilemez.');
  assert.match(describeSaveError(400, { error: 'validation_error', message: 'Request body failed validation.' }, 'tr').message, /geçersiz/);
  assert.equal(describeSaveError(500, null, 'tr').message, 'Bir şeyler ters gitti. Tekrar dene.');
  assert.equal(describeSaveError(500, null, 'en').message, 'Something went wrong. Please try again.');
  for (const m of [
    describeSaveError(500, { error: 'server_error' }, 'tr').message,
    describeSaveError(400, { error: 'invalid_options', message: 'Seçenekler birbirinden farklı olmalı (2–6 seçenek).', question: 'Soru' }, 'tr').message,
  ]) assert.ok(!/server_error|invalid_options/.test(m));
});
