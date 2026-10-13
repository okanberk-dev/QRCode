/**
 * Denetim Merkezi — builder ↔ API soru eşlemesi (spec §5.4 + §4.4) birim testleri.
 * Saf fonksiyonlar, DB'siz.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  checkQuestionForSave,
  fromServerQuestion,
  makeClientKey,
  makeDefaultQuestion,
  normalizeQuestionForSave,
  toCreateQuestions,
  toPatchQuestions,
  type QuestionDraftLike,
} from '../src/lib/audits/question-normalize';
import { AuditQuestionSchema } from '../src/lib/audits/wizard-state';

describe('makeDefaultQuestion (spec §4.4 defaults)', () => {
  it('yes_no: language-pair options, correct answer = first option, required', () => {
    const tr = makeDefaultQuestion('yes_no', 'tr');
    assert.deepEqual(tr.options, ['Evet', 'Hayır']);
    assert.equal(tr.correctAnswer, 'Evet');
    assert.equal(tr.isRequired, true);
    assert.equal(tr.weight, 1);
    assert.equal(tr.persistedId, null);

    const en = makeDefaultQuestion('yes_no', 'en');
    assert.deepEqual(en.options, ['Yes', 'No']);
    assert.equal(en.correctAnswer, 'Yes');
  });

  it('scale: no options, no correct answer, required', () => {
    const q = makeDefaultQuestion('scale', 'tr');
    assert.equal(q.options, null);
    assert.equal(q.correctAnswer, null);
    assert.equal(q.isRequired, true);
  });

  it('single / multi: two EMPTY option slots (placeholders are never values), no correct answer', () => {
    for (const type of ['single', 'multi'] as const) {
      const q = makeDefaultQuestion(type, 'tr');
      assert.deepEqual(q.options, ['', '']);
      assert.equal(q.correctAnswer, null);
      assert.equal(q.isRequired, true);
    }
  });

  it('text / file: optional and unscored', () => {
    for (const type of ['text', 'file'] as const) {
      const q = makeDefaultQuestion(type, 'tr');
      assert.equal(q.isRequired, false);
      assert.equal(q.options, null);
      assert.equal(q.correctAnswer, null);
    }
  });

  it('overrides win; clientKeys are unique and never look like a server id source', () => {
    const q = makeDefaultQuestion('text', 'tr', { prompt: 'Not', isRequired: true });
    assert.equal(q.prompt, 'Not');
    assert.equal(q.isRequired, true);
    const keys = new Set(Array.from({ length: 50 }, () => makeClientKey()));
    assert.equal(keys.size, 50);
    for (const k of keys) assert.match(k, /^q_/);
  });
});

describe('normalizeQuestionForSave — option hygiene', () => {
  it('trims prompt / help text and drops blank options (single)', () => {
    const n = normalizeQuestionForSave({
      type: 'single',
      prompt: '  Hangisi?  ',
      helpText: '   ',
      options: [' A ', '', '  ', 'B'],
      correctAnswer: 'A',
      weight: 1,
      isRequired: true,
    });
    assert.equal(n.prompt, 'Hangisi?');
    assert.equal(n.helpText, null);
    assert.deepEqual(n.options, ['A', 'B']);
    assert.equal(n.correctAnswer, 'A');
  });

  it('prunes a stale correct answer that is no longer among the remaining options', () => {
    const single = normalizeQuestionForSave({
      type: 'single',
      prompt: 'q',
      options: ['A', 'B'],
      correctAnswer: 'C',
    });
    assert.equal(single.correctAnswer, null);

    const multi = normalizeQuestionForSave({
      type: 'multi',
      prompt: 'q',
      options: ['A', 'B', 'C'],
      correctAnswer: ['A', 'Z', 'C', 'A'],
    });
    assert.deepEqual(multi.correctAnswer, ['A', 'C']);

    const multiAllGone = normalizeQuestionForSave({
      type: 'multi',
      prompt: 'q',
      options: ['A', 'B'],
      correctAnswer: ['X', 'Y'],
    });
    assert.equal(multiAllGone.correctAnswer, null);
  });

  it('correct-answer matching is case-insensitive and keeps the option\'s own spelling', () => {
    const n = normalizeQuestionForSave({
      type: 'single',
      prompt: 'q',
      options: ['Kırmızı', 'Mavi'],
      correctAnswer: ' kırmızı ',
    });
    assert.equal(n.correctAnswer, 'Kırmızı');
  });

  it('forces yes_no options to the audit language and maps the correct answer by position', () => {
    const toEn = normalizeQuestionForSave(
      { type: 'yes_no', prompt: 'q', options: ['Evet', 'Hayır'], correctAnswer: 'Hayır' },
      'en',
    );
    assert.deepEqual(toEn.options, ['Yes', 'No']);
    assert.equal(toEn.correctAnswer, 'No');

    const toTr = normalizeQuestionForSave(
      { type: 'yes_no', prompt: 'q', options: ['Yes', 'No'], correctAnswer: 'yes' },
      'tr',
    );
    assert.deepEqual(toTr.options, ['Evet', 'Hayır']);
    assert.equal(toTr.correctAnswer, 'Evet');

    const asciiTr = normalizeQuestionForSave(
      { type: 'yes_no', prompt: 'q', correctAnswer: 'hayir' },
      'tr',
    );
    assert.equal(asciiTr.correctAnswer, 'Hayır');
  });

  it('yes_no without a (recognisable) correct answer stays unscored (null)', () => {
    const none = normalizeQuestionForSave({ type: 'yes_no', prompt: 'q', correctAnswer: null });
    assert.equal(none.correctAnswer, null);
    const junk = normalizeQuestionForSave({ type: 'yes_no', prompt: 'q', correctAnswer: 'belki' });
    assert.equal(junk.correctAnswer, null);
  });

  it('scale / text / file get no options; scale keeps a numeric threshold only', () => {
    const scale = normalizeQuestionForSave({
      type: 'scale',
      prompt: 'q',
      options: ['x', 'y'],
      correctAnswer: 4,
    });
    assert.equal(scale.options, null);
    assert.equal(scale.correctAnswer, 4);

    const scaleBad = normalizeQuestionForSave({ type: 'scale', prompt: 'q', correctAnswer: '4' });
    assert.equal(scaleBad.correctAnswer, null);

    const file = normalizeQuestionForSave({
      type: 'file',
      prompt: 'q',
      options: ['x'],
      correctAnswer: 'x',
    });
    assert.equal(file.options, null);
    assert.equal(file.correctAnswer, null);

    const text = normalizeQuestionForSave({ type: 'text', prompt: 'q', correctAnswer: '  ok  ' });
    assert.equal(text.correctAnswer, 'ok');
    const textBlank = normalizeQuestionForSave({ type: 'text', prompt: 'q', correctAnswer: '   ' });
    assert.equal(textBlank.correctAnswer, null);
  });

  it('weight is clamped to 1-10 integers; non-numbers fall back to 1', () => {
    const w = (weight: unknown) =>
      normalizeQuestionForSave({ type: 'scale', prompt: 'q', weight: weight as number }).weight;
    assert.equal(w(0), 1);
    assert.equal(w(-5), 1);
    assert.equal(w(11), 10);
    assert.equal(w(2.6), 3);
    assert.equal(w(undefined), 1);
    assert.equal(w('abc'), 1);
  });

  it('the normalized result passes the existing AuditQuestionSchema (no blank option left to trip min(1))', () => {
    const n = normalizeQuestionForSave({
      type: 'multi',
      prompt: 'Çoklu',
      options: ['A', '', 'B', ' '],
      correctAnswer: ['A'],
      sortOrder: 10,
    });
    const parsed = AuditQuestionSchema.safeParse(n);
    assert.equal(parsed.success, true, JSON.stringify(parsed));
  });
});

describe('checkQuestionForSave — friendly pre-Zod errors', () => {
  it('blank prompt → prompt error', () => {
    const r = checkQuestionForSave({ type: 'yes_no', prompt: '   ' }, 'tr');
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.field, 'prompt');
      assert.equal(r.message, 'Madde metni boş olamaz.');
    }
  });

  it('single / multi need at least 2 NON-BLANK options → "En az 2 seçenek yaz."', () => {
    for (const type of ['single', 'multi'] as const) {
      const r = checkQuestionForSave({ type, prompt: 'q', options: ['Tek', '', ' '] }, 'tr');
      assert.equal(r.ok, false);
      if (!r.ok) {
        assert.equal(r.field, 'options');
        assert.equal(r.message, 'En az 2 seçenek yaz.');
      }
    }
    const en = checkQuestionForSave({ type: 'single', prompt: 'q', options: ['One'] }, 'en');
    assert.equal(en.ok === false && en.message, 'Write at least 2 options.');
  });

  it('a valid question passes and is returned normalized', () => {
    const r = checkQuestionForSave(
      { type: 'single', prompt: ' q ', options: ['A', 'B'], correctAnswer: 'B' },
      'tr',
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.question.prompt, 'q');
      assert.equal(r.question.correctAnswer, 'B');
    }
  });

  it('yes_no never needs typed options (they are forced)', () => {
    assert.equal(checkQuestionForSave({ type: 'yes_no', prompt: 'q' }, 'tr').ok, true);
  });
});

describe('toPatchQuestions — ids only for persisted questions (spec §5.4)', () => {
  const draft = (over: Partial<QuestionDraftLike>): QuestionDraftLike => ({
    type: 'yes_no',
    prompt: 'q',
    ...over,
  });

  it('sends `id` ONLY for questions that carry a persistedId; new ones go id-less', () => {
    const out = toPatchQuestions(
      [
        draft({ clientKey: 'q_a', persistedId: 'srv-1', prompt: 'persisted' }),
        draft({ clientKey: 'q_b', persistedId: null, prompt: 'new one' }),
        draft({ clientKey: 'q_c', prompt: 'also new' }),
      ],
      'tr',
    );
    assert.equal(out[0].id, 'srv-1');
    assert.ok(!('id' in out[1]));
    assert.ok(!('id' in out[2]));
  });

  it('never leaks clientKey or a legacy wizard draft id', () => {
    const out = toPatchQuestions([draft({ clientKey: 'q_a', id: 'legacy-dnd-id' })], 'tr');
    assert.ok(!('id' in out[0]));
    assert.ok(!('clientKey' in out[0]));
    assert.ok(!('persistedId' in out[0]));
  });

  it('sortOrder follows array position: (i+1)*10, whatever the drafts carried', () => {
    const out = toPatchQuestions(
      [draft({ sortOrder: 999 }), draft({ sortOrder: 0 }), draft({ sortOrder: 5 })],
      'tr',
    );
    assert.deepEqual(
      out.map((q) => q.sortOrder),
      [10, 20, 30],
    );
  });

  it('accepts `{ questions, locale }` and uses that locale for yes_no options', () => {
    const out = toPatchQuestions(
      { questions: [draft({ correctAnswer: 'Evet' })], locale: 'en' },
      undefined,
    );
    assert.deepEqual(out[0].options, ['Yes', 'No']);
    assert.equal(out[0].correctAnswer, 'Yes');
  });

  it('every produced question passes the API schema', () => {
    const out = toPatchQuestions(
      [
        draft({ persistedId: 'srv-1', correctAnswer: 'Evet' }),
        { type: 'scale', prompt: 'Puan' },
        { type: 'text', prompt: 'Not', isRequired: false },
        { type: 'file', prompt: 'Foto', isRequired: false },
        { type: 'single', prompt: 'Seç', options: ['A', '', 'B'], correctAnswer: 'A' },
      ],
      'tr',
    );
    for (const q of out) {
      const parsed = AuditQuestionSchema.safeParse(q);
      assert.equal(parsed.success, true, `${q.type}: ${JSON.stringify(parsed)}`);
    }
  });
});

describe('toCreateQuestions — POST sends no ids at all', () => {
  it('drops persistedId and keeps order', () => {
    const out = toCreateQuestions(
      [
        { type: 'yes_no', prompt: 'a', persistedId: 'srv-9', id: 'x' },
        { type: 'yes_no', prompt: 'b' },
      ],
      'tr',
    );
    assert.ok(out.every((q) => !('id' in q)));
    assert.deepEqual(
      out.map((q) => q.sortOrder),
      [10, 20],
    );
  });
});

describe('fromServerQuestion — server row → builder state', () => {
  it('keeps the persisted id and reads Json columns defensively', () => {
    const q = fromServerQuestion({
      id: 'cuid-1',
      type: 'multi',
      prompt: 'Çoklu',
      helpText: null,
      options: ['A', 'B', 7, null],
      correctAnswer: ['A', 3],
      weight: 3,
      isRequired: false,
      sortOrder: 40,
    });
    assert.equal(q.persistedId, 'cuid-1');
    assert.deepEqual(q.options, ['A', 'B']);
    assert.deepEqual(q.correctAnswer, ['A']);
    assert.equal(q.weight, 3);
    assert.equal(q.isRequired, false);
    assert.equal(q.sortOrder, 40);
    assert.match(q.clientKey, /^q_/);
  });

  it('missing / odd columns fall back to safe defaults', () => {
    const q = fromServerQuestion({ id: 'x', type: 'scale', prompt: 'p', options: {}, correctAnswer: { a: 1 } });
    assert.equal(q.options, null);
    assert.equal(q.correctAnswer, null);
    assert.equal(q.weight, 1);
    assert.equal(q.isRequired, true);
    assert.equal(q.sortOrder, 0);
  });

  it('round trip: load → save sends the same id back', () => {
    const loaded = fromServerQuestion({
      id: 'cuid-7',
      type: 'yes_no',
      prompt: 'Eldiven var mı?',
      options: ['Evet', 'Hayır'],
      correctAnswer: 'Evet',
      weight: 1,
      isRequired: true,
      sortOrder: 10,
    });
    const [out] = toPatchQuestions([loaded], 'tr');
    assert.equal(out.id, 'cuid-7');
    assert.equal(out.prompt, 'Eldiven var mı?');
    assert.equal(out.correctAnswer, 'Evet');
  });
});
