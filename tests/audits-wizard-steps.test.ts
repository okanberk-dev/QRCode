/**
 * Denetim Merkezi — 3 adımlı sihirbazın saf yardımcıları
 * (`stepForTarget`, `firstErrorInStep`, `pickStarterTemplates`).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  firstErrorInStep,
  pickStarterTemplates,
  stepForTarget,
  validateBuilder,
} from '../src/components/audits/builder-state';
import { makeDefaultQuestion } from '../src/lib/audits/question-normalize';

describe('stepForTarget', () => {
  it('maps each error to the step where it is fixed', () => {
    assert.equal(stepForTarget({ kind: 'title' }), 0);
    assert.equal(stepForTarget({ kind: 'questions' }), 1);
    assert.equal(stepForTarget({ kind: 'question', clientKey: 'q1' }), 1);
    assert.equal(stepForTarget({ kind: 'passingScore' }), 2);
  });
});

describe('firstErrorInStep', () => {
  const base = {
    uiLocale: 'tr' as const,
    kind: 'checklist' as const,
    auditLocale: 'tr' as const,
    passingScoreInput: '',
    hasScorable: false,
    scoringMode: 'percentage' as const,
  };

  it('step 0 only checks the title', () => {
    const v = validateBuilder({ ...base, title: '', questions: [] });
    assert.deepEqual(firstErrorInStep(v, 0), { kind: 'title' });
    const ok = validateBuilder({ ...base, title: 'Açılış', questions: [] });
    assert.equal(firstErrorInStep(ok, 0), null);
  });

  it('step 1 asks for at least one item, then for each item text', () => {
    const empty = validateBuilder({ ...base, title: 'Açılış', questions: [] });
    assert.deepEqual(firstErrorInStep(empty, 1), { kind: 'questions' });

    const blank = { ...makeDefaultQuestion('yes_no', 'tr'), clientKey: 'k1', prompt: '' };
    const v = validateBuilder({ ...base, title: 'Açılış', questions: [blank] });
    assert.deepEqual(firstErrorInStep(v, 1), { kind: 'question', clientKey: 'k1' });

    const good = { ...blank, prompt: 'Tezgah temiz mi?' };
    const ok = validateBuilder({ ...base, title: 'Açılış', questions: [good] });
    assert.equal(firstErrorInStep(ok, 1), null);
  });

  it('step 2 checks the pass mark', () => {
    const good = { ...makeDefaultQuestion('yes_no', 'tr'), clientKey: 'k1', prompt: 'Tezgah temiz mi?' };
    const v = validateBuilder({
      ...base,
      title: 'Açılış',
      questions: [good],
      hasScorable: true,
      passingScoreInput: '150',
    });
    assert.deepEqual(firstErrorInStep(v, 2), { kind: 'passingScore' });
  });
});

describe('pickStarterTemplates', () => {
  const rows = [
    { id: 'a', title: 'Zeta mutfak', sector: 'food' as const, locale: 'tr' as const },
    { id: 'b', title: 'Alfa otel', sector: 'hotel' as const, locale: 'tr' as const },
    { id: 'c', title: 'Beta mutfak', sector: 'food' as const, locale: 'tr' as const },
    { id: 'd', title: 'Kitchen EN', sector: 'food' as const, locale: 'en' as const },
    { id: 'e', title: 'Gamma güzellik', sector: 'beauty' as const, locale: 'tr' as const },
  ];

  it('puts the business sector first, in the audit language, capped', () => {
    const picked = pickStarterTemplates(rows, 'food', 'tr', 3).map((r) => r.id);
    assert.deepEqual(picked, ['c', 'a', 'b']);
  });

  it('falls back to every language when none match', () => {
    const only = [{ id: 'x', title: 'Only EN', sector: 'food' as const, locale: 'en' as const }];
    assert.deepEqual(pickStarterTemplates(only, 'food', 'tr').map((r) => r.id), ['x']);
  });
});
