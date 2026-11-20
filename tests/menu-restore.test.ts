// Menu Studio spec §6.1 — the 30-minute undo window for deleted menu rows.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MENU_RESTORE_WINDOW_MS, canRestore, restoreCutoff } from '../src/lib/menu-restore';

const now = new Date('2026-11-20T12:00:00.000Z');
const ago = (ms: number) => new Date(now.getTime() - ms);

test('MENU_RESTORE_WINDOW_MS is 30 minutes', () => {
  assert.equal(MENU_RESTORE_WINDOW_MS, 30 * 60 * 1000);
});

test('canRestore: not deleted → active', () => {
  assert.equal(canRestore(null, now), 'active');
  assert.equal(canRestore(undefined, now), 'active');
});

test('canRestore: deleted inside the window → ok', () => {
  assert.equal(canRestore(ago(0), now), 'ok');
  assert.equal(canRestore(ago(60_000), now), 'ok');
  assert.equal(canRestore(ago(29 * 60_000 + 59_999), now), 'ok');
});

test('canRestore: exactly 30 minutes is still ok; one millisecond later is expired', () => {
  assert.equal(canRestore(ago(MENU_RESTORE_WINDOW_MS), now), 'ok');
  assert.equal(canRestore(ago(MENU_RESTORE_WINDOW_MS + 1), now), 'expired');
  assert.equal(canRestore(ago(2 * 60 * 60_000), now), 'expired');
});

test('canRestore: string dates (JSON) and a custom window', () => {
  assert.equal(canRestore(ago(5 * 60_000).toISOString(), now), 'ok');
  assert.equal(canRestore(ago(31 * 60_000).toISOString(), now), 'expired');
  assert.equal(canRestore(ago(5_000), now, 1_000), 'expired');
  assert.equal(canRestore(ago(500), now, 1_000), 'ok');
});

test('canRestore: an unreadable timestamp is expired; slight clock skew into the future is ok', () => {
  assert.equal(canRestore('not a date', now), 'expired');
  assert.equal(canRestore(new Date(now.getTime() + 2_000), now), 'ok');
});

test('restoreCutoff is now minus the window', () => {
  assert.equal(restoreCutoff(now).getTime(), now.getTime() - MENU_RESTORE_WINDOW_MS);
  assert.equal(canRestore(restoreCutoff(now), now), 'ok');
});
