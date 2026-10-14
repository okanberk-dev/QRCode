/**
 * Herkese açık denetim doldurma taslağı (`publicAuditDraft.ts`) birim testleri.
 * sessionStorage yerine sahte depolama kullanılır; React / DOM yok.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DRAFT_MAX_AGE_MS,
  clearDraft,
  draftKey,
  loadDraft,
  saveDraft,
  stripPhotoAnswers,
  type StorageLike,
} from '../src/app/audits/[token]/publicAuditDraft';

function fakeStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => (data.has(k) ? (data.get(k) as string) : null),
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
}

const TOKEN = 'abcdef0123456789ABCDEF0123456789';
const NOW = Date.UTC(2026, 9, 14, 12, 0, 0);

describe('draft key', () => {
  it('uses the first 16 characters of the token only', () => {
    assert.equal(draftKey(TOKEN), 'bz_audit_draft_abcdef0123456789');
    assert.ok(!draftKey(TOKEN).includes('ABCDEF'));
  });
});

describe('save and load', () => {
  it('restores answers and name within 12 hours', () => {
    const st = fakeStorage();
    assert.equal(saveDraft(st, TOKEN, { answers: { q1: 'Evet', q2: 4, q3: ['a', 'b'] }, name: 'Ayşe' }, NOW), true);
    const draft = loadDraft(st, TOKEN, NOW + 60 * 60 * 1000);
    assert.ok(draft);
    assert.deepEqual(draft.answers, { q1: 'Evet', q2: 4, q3: ['a', 'b'] });
    assert.equal(draft.name, 'Ayşe');
    assert.equal(draft.ts, NOW);
  });

  it('expires after 12 hours and deletes the stale entry', () => {
    const st = fakeStorage();
    saveDraft(st, TOKEN, { answers: { q1: 'Evet' }, name: '' }, NOW);
    assert.ok(loadDraft(st, TOKEN, NOW + DRAFT_MAX_AGE_MS));
    assert.equal(loadDraft(st, TOKEN, NOW + DRAFT_MAX_AGE_MS + 1), null);
    assert.equal(st.data.size, 0);
  });

  it('ignores a draft stamped far in the future', () => {
    const st = fakeStorage();
    saveDraft(st, TOKEN, { answers: { q1: 'Evet' }, name: '' }, NOW + 3 * 60 * 60 * 1000);
    assert.equal(loadDraft(st, TOKEN, NOW), null);
  });

  it('is separate per link', () => {
    const st = fakeStorage();
    saveDraft(st, TOKEN, { answers: { q1: 'Evet' }, name: '' }, NOW);
    assert.equal(loadDraft(st, 'zzzzzzzzzzzzzzzzzzzz', NOW), null);
  });

  it('stores nothing (and removes an old draft) when there is nothing to keep', () => {
    const st = fakeStorage();
    saveDraft(st, TOKEN, { answers: { q1: 'Evet' }, name: '' }, NOW);
    assert.equal(st.data.size, 1);
    saveDraft(st, TOKEN, { answers: { q1: null, q2: '  ', q3: [] }, name: '  ' }, NOW);
    assert.equal(st.data.size, 0);
  });

  it('survives corrupt JSON and wrong shapes', () => {
    const st = fakeStorage();
    st.setItem(draftKey(TOKEN), '{not json');
    assert.equal(loadDraft(st, TOKEN, NOW), null);
    assert.equal(st.data.size, 0);

    st.setItem(draftKey(TOKEN), JSON.stringify({ answers: 'x', name: 5, ts: 'now' }));
    assert.equal(loadDraft(st, TOKEN, NOW), null);

    st.setItem(draftKey(TOKEN), JSON.stringify([1, 2]));
    assert.equal(loadDraft(st, TOKEN, NOW), null);
  });

  it('drops unknown value types when loading', () => {
    const st = fakeStorage();
    st.setItem(
      draftKey(TOKEN),
      JSON.stringify({ answers: { a: 'ok', b: { x: 1 }, c: [1, 2], d: true, e: 3 }, name: 'N', ts: NOW }),
    );
    const draft = loadDraft(st, TOKEN, NOW);
    assert.ok(draft);
    assert.deepEqual(draft.answers, { a: 'ok', e: 3 });
  });
});

describe('photos are never persisted', () => {
  const photo = 'data:image/webp;base64,' + 'A'.repeat(1000);

  it('stripPhotoAnswers removes data URLs only', () => {
    assert.deepEqual(stripPhotoAnswers({ p: photo, q: 'Evet', n: 3 }), { q: 'Evet', n: 3 });
  });

  it('saveDraft writes no data URL to storage', () => {
    const st = fakeStorage();
    saveDraft(st, TOKEN, { answers: { p: photo, q: 'Evet' }, name: '' }, NOW);
    const raw = st.getItem(draftKey(TOKEN)) ?? '';
    assert.ok(!raw.includes('data:image'));
    assert.ok(raw.includes('Evet'));
  });

  it('a draft holding only a photo is not written at all', () => {
    const st = fakeStorage();
    saveDraft(st, TOKEN, { answers: { p: photo }, name: '' }, NOW);
    assert.equal(st.data.size, 0);
  });

  it('loadDraft strips a data URL that somehow got stored', () => {
    const st = fakeStorage();
    st.setItem(draftKey(TOKEN), JSON.stringify({ answers: { p: photo, q: 'Hayır' }, name: '', ts: NOW }));
    assert.deepEqual(loadDraft(st, TOKEN, NOW)?.answers, { q: 'Hayır' });
  });
});

describe('storage failures do not break the form', () => {
  const throwing: StorageLike = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('quota');
    },
    removeItem() {
      throw new Error('blocked');
    },
  };

  it('save returns false instead of throwing', () => {
    assert.equal(saveDraft(throwing, TOKEN, { answers: { q: 'Evet' }, name: '' }, NOW), false);
  });

  it('load returns null instead of throwing', () => {
    assert.equal(loadDraft(throwing, TOKEN, NOW), null);
  });

  it('clear does not throw', () => {
    assert.doesNotThrow(() => clearDraft(throwing, TOKEN));
  });

  it('null storage (private mode) is a no-op', () => {
    assert.equal(saveDraft(null, TOKEN, { answers: { q: 'Evet' }, name: '' }, NOW), false);
    assert.equal(loadDraft(null, TOKEN, NOW), null);
    assert.doesNotThrow(() => clearDraft(null, TOKEN));
  });
});

describe('clear', () => {
  it('removes the draft after a successful submit', () => {
    const st = fakeStorage();
    saveDraft(st, TOKEN, { answers: { q: 'Evet' }, name: 'A' }, NOW);
    clearDraft(st, TOKEN);
    assert.equal(loadDraft(st, TOKEN, NOW), null);
    assert.equal(st.data.size, 0);
  });
});
