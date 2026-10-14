/**
 * Herkese açık denetim doldurma akışının saf kuralları (`publicAuditFlow.ts`):
 * mod seçimi, sayaçlar, eksik zorunlu maddeler, soru seti uzlaştırma, vurgu rengi.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CHECKLIST_MAX_ITEMS,
  buildAnswerRows,
  chooseFillMode,
  countAnswered,
  findMissingRequiredIds,
  isAnswerFilled,
  reconcileAnswers,
  safeAccent,
  totalPhotoBytes,
} from '../src/app/audits/[token]/publicAuditFlow';
import type { PublicQuestion } from '../src/components/audits/PublicQuestionInput';

function q(id: string, type: PublicQuestion['type'], extra: Partial<PublicQuestion> = {}): PublicQuestion {
  return { id, type, prompt: id, helpText: null, options: null, isRequired: true, ...extra };
}

describe('chooseFillMode', () => {
  it('a yes/no checklist is one page', () => {
    assert.equal(chooseFillMode([q('a', 'yes_no'), q('b', 'yes_no'), q('c', 'text')]), 'checklist');
  });

  it('scale, note and photo items stay on one page too', () => {
    assert.equal(chooseFillMode([q('a', 'scale'), q('b', 'text'), q('c', 'file')]), 'checklist');
  });

  it('any single / multi question switches to steps', () => {
    assert.equal(chooseFillMode([q('a', 'yes_no'), q('b', 'single')]), 'steps');
    assert.equal(chooseFillMode([q('a', 'multi')]), 'steps');
  });

  it('more than 15 items switches to steps; exactly 15 stays a checklist', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => q(`q${i}`, 'yes_no'));
    assert.equal(CHECKLIST_MAX_ITEMS, 15);
    assert.equal(chooseFillMode(many(15)), 'checklist');
    assert.equal(chooseFillMode(many(16)), 'steps');
  });

  it('an empty audit is a checklist (the intro refuses to start)', () => {
    assert.equal(chooseFillMode([]), 'checklist');
  });
});

describe('answers', () => {
  it('isAnswerFilled treats blanks as unanswered', () => {
    assert.equal(isAnswerFilled(undefined), false);
    assert.equal(isAnswerFilled(null), false);
    assert.equal(isAnswerFilled(''), false);
    assert.equal(isAnswerFilled('   '), false);
    assert.equal(isAnswerFilled([]), false);
    assert.equal(isAnswerFilled('Evet'), true);
    assert.equal(isAnswerFilled(0), true);
    assert.equal(isAnswerFilled(['a']), true);
  });

  it('countAnswered counts filled items only', () => {
    const qs = [q('a', 'yes_no'), q('b', 'yes_no'), q('c', 'text', { isRequired: false })];
    assert.equal(countAnswered(qs, { a: 'Evet', b: null, c: '  ' }), 1);
    assert.equal(countAnswered(qs, { a: 'Evet', b: 'Hayır', c: 'not' }), 3);
  });

  it('findMissingRequiredIds keeps question order and ignores optional items', () => {
    const qs = [q('a', 'yes_no'), q('b', 'text', { isRequired: false }), q('c', 'scale'), q('d', 'yes_no')];
    assert.deepEqual(findMissingRequiredIds(qs, { a: 'Evet', d: null }), ['c', 'd']);
    assert.deepEqual(findMissingRequiredIds(qs, { a: 'Evet', c: 4, d: 'Hayır' }), []);
  });

  it('buildAnswerRows posts a row for every question (blank = null)', () => {
    const rows = buildAnswerRows([{ id: 'a' }, { id: 'b' }], { a: 'Evet' });
    assert.deepEqual(rows, [
      { questionId: 'a', value: 'Evet' },
      { questionId: 'b', value: null },
    ]);
  });
});

describe('reconcileAnswers (live edit while someone is filling)', () => {
  const photo = 'data:image/webp;base64,AAAA';

  it('keeps answers whose question still exists and fits', () => {
    const qs = [q('a', 'yes_no'), q('b', 'scale'), q('c', 'text')];
    const kept = reconcileAnswers(qs, { a: 'Evet', b: 4, c: 'not' });
    assert.deepEqual(kept, { a: 'Evet', b: 4, c: 'not' });
  });

  it('drops answers of deleted questions', () => {
    const kept = reconcileAnswers([q('a', 'yes_no')], { a: 'Evet', gone: 'Hayır' });
    assert.deepEqual(kept, { a: 'Evet' });
  });

  it('drops an answer whose question type changed', () => {
    const kept = reconcileAnswers([q('a', 'scale')], { a: 'Evet' });
    assert.deepEqual(kept, {});
  });

  it('drops a single choice that is no longer an option', () => {
    const qs = [q('a', 'single', { options: ['Kırmızı', 'Mavi'] })];
    assert.deepEqual(reconcileAnswers(qs, { a: 'Mavi' }), { a: 'Mavi' });
    assert.deepEqual(reconcileAnswers(qs, { a: 'Yeşil' }), {});
  });

  it('multi keeps only options that still exist', () => {
    const qs = [q('a', 'multi', { options: ['A', 'B', 'C'] })];
    assert.deepEqual(reconcileAnswers(qs, { a: ['A', 'Z'] }), { a: ['A'] });
    assert.deepEqual(reconcileAnswers(qs, { a: ['Z'] }), {});
  });

  it('yes/no uses the audit language options', () => {
    const qs = [q('a', 'yes_no')];
    assert.deepEqual(reconcileAnswers(qs, { a: 'Yes' }, 'en'), { a: 'Yes' });
    assert.deepEqual(reconcileAnswers(qs, { a: 'Yes' }, 'tr'), {});
  });

  it('rejects out-of-range scale values and keeps photos only as data URLs', () => {
    const qs = [q('s', 'scale'), q('p', 'file')];
    assert.deepEqual(reconcileAnswers(qs, { s: 9, p: photo }), { p: photo });
    assert.deepEqual(reconcileAnswers(qs, { s: 5, p: 'x' }), { s: 5 });
  });
});

describe('photos', () => {
  it('totalPhotoBytes sums data URL lengths of photo questions only', () => {
    const qs = [q('p1', 'file'), q('p2', 'file'), q('t', 'text')];
    const answers = { p1: 'data:image/webp;base64,AAAA', p2: null, t: 'data:not-a-photo' };
    assert.equal(totalPhotoBytes(qs, answers), 'data:image/webp;base64,AAAA'.length);
  });
});

describe('safeAccent', () => {
  it('accepts 3 and 6 digit hex', () => {
    assert.equal(safeAccent('#1E3A8A'), '#1E3A8A');
    assert.equal(safeAccent('#abc'), '#abc');
  });

  it('falls back to lime for anything else', () => {
    assert.equal(safeAccent(null), '#C6F24E');
    assert.equal(safeAccent(undefined), '#C6F24E');
    assert.equal(safeAccent(''), '#C6F24E');
    assert.equal(safeAccent('red'), '#C6F24E');
    assert.equal(safeAccent('url(javascript:alert(1))'), '#C6F24E');
  });
});
