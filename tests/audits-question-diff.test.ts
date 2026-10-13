/**
 * Denetim Merkezi — canlı denetim düzenleme DIFF planlayıcısı (spec §6.3, A3)
 * birim testleri. En riskli backend değişikliği olduğu için kapsamlı.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  describeQuestionDiffError,
  planQuestionDiff,
  resolveSortOrders,
  type ExistingQuestionRow,
  type IncomingQuestionInput,
} from '../src/lib/audits/question-diff';

function ex(id: string, over: Partial<ExistingQuestionRow> = {}): ExistingQuestionRow {
  return {
    id,
    type: 'yes_no',
    prompt: `Soru ${id}`,
    helpText: null,
    options: ['Evet', 'Hayır'],
    correctAnswer: 'Evet',
    weight: 1,
    isRequired: true,
    sortOrder: 10,
    ...over,
  };
}

function inc(id: string | undefined, over: Partial<IncomingQuestionInput> = {}): IncomingQuestionInput {
  return {
    id,
    type: 'yes_no',
    prompt: id ? `Soru ${id}` : 'Yeni soru',
    helpText: null,
    options: ['Evet', 'Hayır'],
    correctAnswer: 'Evet',
    weight: 1,
    isRequired: true,
    ...over,
  };
}

/** Existing = q1,q2,q3 at 10/20/30. */
const three = [ex('q1', { sortOrder: 10 }), ex('q2', { sortOrder: 20 }), ex('q3', { sortOrder: 30 })];
const sameThree = (): IncomingQuestionInput[] => [
  inc('q1', { sortOrder: 10 }),
  inc('q2', { sortOrder: 20 }),
  inc('q3', { sortOrder: 30 }),
];

function okPlan(r: ReturnType<typeof planQuestionDiff>) {
  assert.equal(r.ok, true, JSON.stringify(r));
  if (!r.ok) throw new Error('unreachable');
  return r.plan;
}

describe('planQuestionDiff — create / update / delete', () => {
  it('idempotent no-op: the same payload plans nothing', () => {
    const plan = okPlan(planQuestionDiff(three, sameThree(), []));
    assert.deepEqual(plan.creates, []);
    assert.deepEqual(plan.updates, []);
    assert.deepEqual(plan.deletes, []);
    assert.deepEqual(plan.unchangedIds, ['q1', 'q2', 'q3']);
  });

  it('prompt edit on an unanswered question → one update, only the changed field', () => {
    const incoming = sameThree();
    incoming[1] = inc('q2', { sortOrder: 20, prompt: 'Düzeltilmiş metin' });
    const plan = okPlan(planQuestionDiff(three, incoming, []));
    assert.equal(plan.updates.length, 1);
    assert.equal(plan.updates[0].id, 'q2');
    assert.deepEqual(plan.updates[0].data, { prompt: 'Düzeltilmiş metin' });
    assert.deepEqual(plan.updates[0].lockedFieldsChanged, []);
    assert.deepEqual(plan.unchangedIds, ['q1', 'q3']);
  });

  it('new question without an id → create (server generates the id), existing ones untouched', () => {
    const incoming = [...sameThree(), inc(undefined, { sortOrder: 40, prompt: 'Dördüncü' })];
    const plan = okPlan(planQuestionDiff(three, incoming, []));
    assert.equal(plan.creates.length, 1);
    assert.equal(plan.creates[0].index, 3);
    assert.equal(plan.creates[0].data.prompt, 'Dördüncü');
    assert.equal(plan.creates[0].data.sortOrder, 40);
    assert.ok(!('id' in plan.creates[0].data), 'a created question never carries a client id');
    assert.deepEqual(plan.updates, []);
    assert.deepEqual(plan.deletes, []);
  });

  it('removing an UNANSWERED question → delete', () => {
    const incoming = [inc('q1', { sortOrder: 10 }), inc('q3', { sortOrder: 30 })];
    const plan = okPlan(planQuestionDiff(three, incoming, []));
    assert.deepEqual(plan.deletes, ['q2']);
    assert.deepEqual(plan.creates, []);
  });

  it('reorder only: swaps sortOrder, nothing else changes', () => {
    const incoming = [
      inc('q3', { sortOrder: 10 }),
      inc('q1', { sortOrder: 20 }),
      inc('q2', { sortOrder: 30 }),
    ];
    const plan = okPlan(planQuestionDiff(three, incoming, ['q1', 'q2', 'q3']));
    assert.equal(plan.creates.length, 0);
    assert.equal(plan.deletes.length, 0);
    const byId = Object.fromEntries(plan.updates.map((u) => [u.id, u.data]));
    assert.deepEqual(byId, {
      q3: { sortOrder: 10 },
      q1: { sortOrder: 20 },
      q2: { sortOrder: 30 },
    });
    assert.ok(plan.updates.every((u) => u.lockedFieldsChanged.length === 0));
  });

  it('an unanswered question may change anything (type, options, correct answer, weight)', () => {
    const incoming = sameThree();
    incoming[0] = inc('q1', {
      sortOrder: 10,
      type: 'single',
      options: ['A', 'B', 'C'],
      correctAnswer: 'B',
      weight: 4,
    });
    const plan = okPlan(planQuestionDiff(three, incoming, ['q2']));
    assert.equal(plan.updates.length, 1);
    assert.deepEqual(plan.updates[0].lockedFieldsChanged.sort(), ['correctAnswer', 'options', 'type', 'weight']);
    assert.equal(plan.updates[0].data.type, 'single');
  });

  it('mixed payload: update + create + delete in one plan', () => {
    const incoming = [
      inc('q1', { sortOrder: 10, prompt: 'Değişti' }),
      inc(undefined, { sortOrder: 20, prompt: 'Yeni' }),
      inc('q3', { sortOrder: 30 }),
    ];
    const plan = okPlan(planQuestionDiff(three, incoming, []));
    assert.equal(plan.updates.length, 1);
    assert.equal(plan.creates.length, 1);
    assert.deepEqual(plan.deletes, ['q2']);
  });
});

describe('planQuestionDiff — answered questions are protected', () => {
  const answered = new Set(['q2']);

  it('text-only edit of an answered question is allowed', () => {
    const incoming = sameThree();
    incoming[1] = inc('q2', { sortOrder: 20, prompt: 'Yeni metin', helpText: 'ipucu', isRequired: false });
    const plan = okPlan(planQuestionDiff(three, incoming, answered));
    assert.equal(plan.updates.length, 1);
    assert.deepEqual(plan.updates[0].data, {
      prompt: 'Yeni metin',
      helpText: 'ipucu',
      isRequired: false,
    });
  });

  it('changing type / options / correct answer / weight → QUESTION_LOCKED naming the item', () => {
    const cases: Array<[string, Partial<IncomingQuestionInput>]> = [
      ['type', { type: 'single' }],
      ['options', { options: ['Doğru', 'Yanlış'] }],
      ['correctAnswer', { correctAnswer: 'Hayır' }],
      ['weight', { weight: 5 }],
    ];
    for (const [field, change] of cases) {
      const incoming = sameThree();
      incoming[1] = inc('q2', { sortOrder: 20, ...change });
      const r = planQuestionDiff(three, incoming, answered);
      assert.equal(r.ok, false, field);
      if (r.ok) continue;
      assert.equal(r.error.code, 'QUESTION_LOCKED');
      if (r.error.code !== 'QUESTION_LOCKED') continue;
      assert.equal(r.error.index, 1);
      assert.equal(r.error.questionId, 'q2');
      assert.ok(r.error.fields.includes(field as never), `${field} reported`);
      assert.equal(describeQuestionDiffError(r.error).itemNumber, 2);
      assert.match(describeQuestionDiffError(r.error).message, /^2\. madde/);
    }
  });

  it('removing an answered question → QUESTION_HAS_ANSWERS (item number = position in the current list)', () => {
    const incoming = [inc('q1', { sortOrder: 10 }), inc('q3', { sortOrder: 30 })];
    const r = planQuestionDiff(three, incoming, answered);
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.deepEqual(r.error, { code: 'QUESTION_HAS_ANSWERS', existingIndex: 1, questionId: 'q2' });
    assert.equal(describeQuestionDiffError(r.error).itemNumber, 2);
  });

  it('a payload with NO ids on an audit with answers fails (why clients must send persisted ids)', () => {
    const incoming = sameThree().map((q) => ({ ...q, id: undefined }));
    const r = planQuestionDiff(three, incoming, answered);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, 'QUESTION_HAS_ANSWERS');
  });

  it('re-sending the same set of options in a different order for multi correctAnswer is NOT a change', () => {
    const existing = [
      ex('m', {
        type: 'multi',
        options: ['A', 'B', 'C'],
        correctAnswer: ['A', 'B'],
      }),
    ];
    const incoming = [
      inc('m', { type: 'multi', options: ['A', 'B', 'C'], correctAnswer: ['B', 'A'], sortOrder: 10 }),
    ];
    const plan = okPlan(planQuestionDiff(existing, incoming, ['m']));
    assert.deepEqual(plan.updates, []);
    assert.deepEqual(plan.unchangedIds, ['m']);
  });

  it('options ORDER is visible, so reordering the options of an answered question is a locked change', () => {
    const existing = [ex('s', { type: 'single', options: ['A', 'B'], correctAnswer: 'A' })];
    const incoming = [inc('s', { type: 'single', options: ['B', 'A'], correctAnswer: 'A', sortOrder: 10 })];
    const r = planQuestionDiff(existing, incoming, ['s']);
    assert.equal(r.ok, false);
  });

  it('null / undefined / blank correct answers and null vs [] options compare equal', () => {
    const existing = [ex('t', { type: 'text', options: null, correctAnswer: null, helpText: null })];
    const incoming = [
      inc('t', { type: 'text', options: [] as string[], correctAnswer: '', helpText: '   ', sortOrder: 10 }),
    ];
    const plan = okPlan(planQuestionDiff(existing, incoming, ['t']));
    assert.deepEqual(plan.updates, []);
  });
});

describe('planQuestionDiff — client ids are never trusted', () => {
  it('a FOREIGN id (not one of this template\'s questions) is treated as a create with no id', () => {
    const incoming = [
      ...sameThree(),
      inc('someone-elses-question-id', { sortOrder: 40, prompt: 'Başka şablonun id\'si' }),
    ];
    const plan = okPlan(planQuestionDiff(three, incoming, ['q1', 'q2', 'q3']));
    assert.equal(plan.creates.length, 1);
    assert.ok(!('id' in plan.creates[0].data));
    assert.deepEqual(plan.updates, []);
    assert.deepEqual(plan.deletes, []);
  });

  it('a temp client id (q_abc123) creates a new question and the old one is deleted when unanswered', () => {
    const incoming = [inc('q_abc123', { sortOrder: 10, prompt: 'Yeniden yazılmış' })];
    const plan = okPlan(planQuestionDiff([ex('q1')], incoming, []));
    assert.equal(plan.creates.length, 1);
    assert.deepEqual(plan.deletes, ['q1']);
  });

  it('duplicate incoming ids → DUPLICATE_QUESTION_ID (first duplicate, by incoming index)', () => {
    const incoming = [inc('q1'), inc('q2'), inc('q1')];
    const r = planQuestionDiff(three, incoming, []);
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.deepEqual(r.error, { code: 'DUPLICATE_QUESTION_ID', index: 2, questionId: 'q1' });
  });

  it('duplicate FOREIGN/temp ids are rejected too', () => {
    const r = planQuestionDiff(three, [inc('tmp'), inc('tmp')], []);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, 'DUPLICATE_QUESTION_ID');
  });

  it('absent / blank ids are never duplicates', () => {
    const incoming = [inc(undefined), inc(undefined), inc('', {}), inc('   ', {})];
    const plan = okPlan(planQuestionDiff([], incoming, []));
    assert.equal(plan.creates.length, 4);
  });

  it('error precedence: duplicate → locked → has-answers', () => {
    const existing = [ex('a'), ex('b')];
    // dup + locked + would-delete-answered all at once → DUPLICATE wins
    const r1 = planQuestionDiff(existing, [inc('a', { type: 'scale' }), inc('a')], ['a', 'b']);
    assert.equal(r1.ok === false && r1.error.code, 'DUPLICATE_QUESTION_ID');
    // locked + answered-missing → LOCKED wins
    const r2 = planQuestionDiff(existing, [inc('a', { type: 'scale' })], ['a', 'b']);
    assert.equal(r2.ok === false && r2.error.code, 'QUESTION_LOCKED');
  });
});

describe('planQuestionDiff — sort order', () => {
  it('strictly increasing sortOrders are kept as sent (builder sends (i+1)*10)', () => {
    assert.deepEqual(resolveSortOrders([{ sortOrder: 10 }, { sortOrder: 20 }, { sortOrder: 35 }]), [10, 20, 35]);
    assert.deepEqual(resolveSortOrders([{ sortOrder: 0 }, { sortOrder: 10 }]), [0, 10]);
  });

  it('all-zero / missing / tied / non-monotonic orders fall back to the array position', () => {
    assert.deepEqual(resolveSortOrders([{ sortOrder: 0 }, { sortOrder: 0 }, { sortOrder: 0 }]), [10, 20, 30]);
    assert.deepEqual(resolveSortOrders([{}, {}]), [10, 20]);
    assert.deepEqual(resolveSortOrders([{ sortOrder: 30 }, { sortOrder: 10 }]), [10, 20]);
    assert.deepEqual(resolveSortOrders([{ sortOrder: 10 }, { sortOrder: 10 }]), [10, 20]);
  });

  it('array order wins: an unsorted payload without usable sortOrders is positional', () => {
    const plan = okPlan(
      planQuestionDiff(
        [ex('a', { sortOrder: 10 }), ex('b', { sortOrder: 20 })],
        [inc('b', { sortOrder: 0 }), inc('a', { sortOrder: 0 })],
        [],
      ),
    );
    const byId = Object.fromEntries(plan.updates.map((u) => [u.id, u.data.sortOrder]));
    assert.deepEqual(byId, { b: 10, a: 20 });
  });
});
