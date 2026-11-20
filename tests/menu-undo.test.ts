// Menu Studio spec §5.5 / §8.14 — undo stack (20 entries, 29 minutes, undo only).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MENU_RESTORE_WINDOW_MS } from '../src/lib/menu-restore';
import {
  EMPTY_UNDO,
  UNDO_LIMIT,
  UNDO_MAX_AGE_MS,
  canUndo,
  pruneUndo,
  pushUndo,
  removeUndo,
  takeById,
  takeLatest,
  undoSettled,
  type UndoEntry,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-undo';

const entry = (id: string, createdAt: number): UndoEntry => ({
  id,
  label: id,
  createdAt,
  run: async () => ({ ok: true }),
});

test('limits: 20 entries, 29 minutes (one minute inside the restore window)', () => {
  assert.equal(UNDO_LIMIT, 20);
  assert.equal(UNDO_MAX_AGE_MS, 29 * 60_000);
  assert.equal(UNDO_MAX_AGE_MS, MENU_RESTORE_WINDOW_MS - 60_000);
});

test('pushUndo appends and caps at 20 (oldest falls off)', () => {
  let state = EMPTY_UNDO;
  for (let i = 0; i < 25; i += 1) state = pushUndo(state, entry(`e${i}`, 1000 + i), 1000 + i);
  assert.equal(state.entries.length, 20);
  assert.equal(state.entries[0].id, 'e5');
  assert.equal(state.entries[19].id, 'e24');
  assert.equal(EMPTY_UNDO.entries.length, 0, 'pure: the start state is untouched');
});

test('pushUndo with an existing id replaces it on top', () => {
  let state = pushUndo(EMPTY_UNDO, entry('a', 1), 1);
  state = pushUndo(state, entry('b', 2), 2);
  state = pushUndo(state, entry('a', 3), 3);
  assert.deepEqual(state.entries.map((e) => e.id), ['b', 'a']);
});

test('takeLatest takes the newest first and marks it running', () => {
  let state = EMPTY_UNDO;
  state = pushUndo(state, entry('a', 1), 1);
  state = pushUndo(state, entry('b', 2), 2);
  const first = takeLatest(state, 3);
  assert.equal(first.entry?.id, 'b');
  assert.equal(first.state.running, 'b');
  assert.deepEqual(first.state.entries.map((e) => e.id), ['a']);

  const blocked = takeLatest(first.state, 4);
  assert.equal(blocked.entry, null, 'nothing while another undo runs');
  assert.equal(canUndo(first.state, 4), false);

  const settled = undoSettled(first.state);
  assert.equal(settled.running, null);
  const second = takeLatest(settled, 5);
  assert.equal(second.entry?.id, 'a');
  assert.equal(takeLatest(undoSettled(second.state), 6).entry, null, 'empty');
});

test('takeById takes one entry from anywhere in the stack', () => {
  let state = EMPTY_UNDO;
  for (const id of ['a', 'b', 'c']) state = pushUndo(state, entry(id, 1), 1);
  const taken = takeById(state, 'b', 2);
  assert.equal(taken.entry?.id, 'b');
  assert.deepEqual(taken.state.entries.map((e) => e.id), ['a', 'c']);
  assert.equal(takeById(state, 'zzz', 2).entry, null);
});

test('pruneUndo drops entries older than 29 minutes (inclusive edge kept)', () => {
  const t0 = 1_000_000;
  let state = EMPTY_UNDO;
  state = pushUndo(state, entry('old', t0), t0);
  state = pushUndo(state, entry('edge', t0 + 60_000), t0 + 60_000);
  state = pushUndo(state, entry('new', t0 + 10 * 60_000), t0 + 10 * 60_000);
  const now = t0 + 60_000 + UNDO_MAX_AGE_MS;
  assert.deepEqual(pruneUndo(state, now).entries.map((e) => e.id), ['edge', 'new']);
  assert.equal(pruneUndo(state, t0), state, 'nothing expired → same state');
  // takeLatest never returns an expired entry
  const later = t0 + 10 * 60_000 + UNDO_MAX_AGE_MS + 1;
  assert.equal(takeLatest(state, later).entry, null);
  assert.equal(canUndo(state, later), false);
  assert.equal(canUndo(state, t0 + 1), true);
});

test('removeUndo removes by id; unknown id → same state', () => {
  let state = pushUndo(EMPTY_UNDO, entry('a', 1), 1);
  state = pushUndo(state, entry('b', 2), 2);
  assert.deepEqual(removeUndo(state, 'a').entries.map((e) => e.id), ['b']);
  assert.equal(removeUndo(state, 'zzz'), state);
});
