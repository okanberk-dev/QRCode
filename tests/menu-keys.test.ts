// Menu Studio spec §9 — keyboard shortcuts (e.key, Turkish keyboards, WCAG 2.1.4 off switch).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SHORTCUTS,
  ariaKeyShortcuts,
  formatShortcut,
  isSingleCharCombo,
  isTypingTarget,
  matchShortcut,
  type ShortcutContext,
  type ShortcutKeyEvent,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-keys';

const key = (k: string, mods: Partial<ShortcutKeyEvent> = {}): ShortcutKeyEvent => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  isComposing: false,
  ...mods,
});

const ctx = (over: Partial<ShortcutContext> = {}): ShortcutContext => ({
  isMac: true,
  singleKeysEnabled: true,
  typing: false,
  modalOpen: false,
  menuOpen: false,
  inRow: false,
  ...over,
});

test('letters match e.key case-insensitively with an explicit Shift flag', () => {
  assert.equal(matchShortcut(key('n'), ctx()), 'newItem');
  assert.equal(matchShortcut(key('N'), ctx()), 'newItem', 'Caps Lock');
  assert.equal(matchShortcut(key('N', { shiftKey: true }), ctx()), 'newCategory');
  assert.equal(matchShortcut(key('p'), ctx()), 'togglePreview');
  assert.equal(matchShortcut(key('q'), ctx()), null);
});

test('symbols match exactly and ignore Shift ("/" is Shift+7 on Turkish Q)', () => {
  assert.equal(matchShortcut(key('/'), ctx()), 'search');
  assert.equal(matchShortcut(key('/', { shiftKey: true }), ctx()), 'search');
  assert.equal(matchShortcut(key('?', { shiftKey: true }), ctx()), 'help');
  assert.equal(matchShortcut(key('/', { ctrlKey: true, altKey: true }), ctx({ isMac: false })), 'search', 'AltGr');
  assert.equal(matchShortcut(key('/', { metaKey: true }), ctx()), null);
});

test('mod mapping: ⌘ on Mac, Ctrl elsewhere', () => {
  assert.equal(matchShortcut(key('z', { metaKey: true }), ctx({ isMac: true })), 'undo');
  assert.equal(matchShortcut(key('z', { ctrlKey: true }), ctx({ isMac: true })), null, 'Ctrl+Z on Mac is not undo');
  assert.equal(matchShortcut(key('z', { ctrlKey: true }), ctx({ isMac: false })), 'undo');
  assert.equal(matchShortcut(key('z', { metaKey: true }), ctx({ isMac: false })), null);
  assert.equal(matchShortcut(key('Z', { metaKey: true, shiftKey: true }), ctx()), null, 'no redo');
  assert.equal(matchShortcut(key('d', { metaKey: true }), ctx({ inRow: true })), 'duplicate');
  assert.equal(matchShortcut(key('z'), ctx()), null, 'plain z is nothing');
});

test('Alt+Arrow moves the row; plain arrows walk rows', () => {
  assert.equal(matchShortcut(key('ArrowUp', { altKey: true }), ctx({ inRow: true })), 'moveUp');
  assert.equal(matchShortcut(key('ArrowDown', { altKey: true }), ctx({ inRow: true })), 'moveDown');
  assert.equal(matchShortcut(key('ArrowUp'), ctx({ inRow: true })), 'rowPrev');
  assert.equal(matchShortcut(key('ArrowDown'), ctx({ inRow: true })), 'rowNext');
  assert.equal(matchShortcut(key('ArrowDown', { shiftKey: true }), ctx({ inRow: true })), null);
});

test('row shortcuts need focus on a row', () => {
  for (const [k, id] of [['s', 'toggleSoldOut'], ['h', 'toggleHidden'], ['x', 'select'], ['m', 'move'], ['e', 'open'], ['Enter', 'open'], ['Delete', 'delete'], ['Backspace', 'delete']] as const) {
    assert.equal(matchShortcut(key(k), ctx({ inRow: true })), id, k);
    assert.equal(matchShortcut(key(k), ctx({ inRow: false })), null, `${k} outside a row`);
  }
});

test('isComposing (IME) is ignored', () => {
  assert.equal(matchShortcut(key('n', { isComposing: true }), ctx()), null);
  assert.equal(matchShortcut(key('Escape', { isComposing: true }), ctx()), null);
});

test('typing, modal and menu guards block everything except Esc', () => {
  for (const blocked of [{ typing: true }, { modalOpen: true }, { menuOpen: true }]) {
    assert.equal(matchShortcut(key('n'), ctx(blocked)), null);
    assert.equal(matchShortcut(key('z', { metaKey: true }), ctx(blocked)), null);
    assert.equal(matchShortcut(key('s'), ctx({ ...blocked, inRow: true })), null);
    assert.equal(matchShortcut(key('Escape'), ctx(blocked)), 'escape');
  }
});

test('single-key switch off disables letters and symbols, not ⌘Z / ⌘D / Alt+↑ / Enter / Delete / Esc', () => {
  const off = ctx({ singleKeysEnabled: false, inRow: true });
  for (const k of ['/', '?', 'n', 'p', 's', 'h', 'x', 'm', 'e']) {
    assert.equal(matchShortcut(key(k, { shiftKey: k === '?' }), off), null, k);
  }
  assert.equal(matchShortcut(key('N', { shiftKey: true }), off), null);
  assert.equal(matchShortcut(key('z', { metaKey: true }), off), 'undo');
  assert.equal(matchShortcut(key('d', { metaKey: true }), off), 'duplicate');
  assert.equal(matchShortcut(key('ArrowUp', { altKey: true }), off), 'moveUp');
  assert.equal(matchShortcut(key('Enter'), off), 'open');
  assert.equal(matchShortcut(key('Delete'), off), 'delete');
  assert.equal(matchShortcut(key('Escape'), off), 'escape');
});

test('isTypingTarget: text fields, contenteditable, comboboxes', () => {
  const el = (tag: string, attrs: Record<string, string> = {}, isContentEditable = false) =>
    ({ tagName: tag, isContentEditable, getAttribute: (name: string) => attrs[name] ?? null }) as unknown as Element;
  assert.equal(isTypingTarget(null), false);
  assert.equal(isTypingTarget(el('INPUT')), true);
  assert.equal(isTypingTarget(el('input', { type: 'search' })), true);
  assert.equal(isTypingTarget(el('INPUT', { type: 'checkbox' })), false);
  assert.equal(isTypingTarget(el('INPUT', { type: 'button' })), false);
  assert.equal(isTypingTarget(el('TEXTAREA')), true);
  assert.equal(isTypingTarget(el('SELECT')), true);
  assert.equal(isTypingTarget(el('DIV', {}, true)), true);
  assert.equal(isTypingTarget(el('DIV', { contenteditable: '' })), true);
  assert.equal(isTypingTarget(el('DIV', { contenteditable: 'false' })), false);
  assert.equal(isTypingTarget(el('BUTTON', { role: 'combobox' })), true);
  assert.equal(isTypingTarget(el('BUTTON')), false);
});

test('SHORTCUTS: every entry has TR and EN labels, unique ids and unique combos', () => {
  const ids = new Set<string>();
  const combos = new Set<string>();
  for (const def of SHORTCUTS) {
    assert.ok(def.label.tr.trim() && def.label.en.trim(), def.id);
    assert.notEqual(def.label.tr, def.label.en, `${def.id} is translated`);
    assert.ok(!ids.has(def.id), `duplicate id ${def.id}`);
    ids.add(def.id);
    assert.ok(def.combos.length > 0);
    assert.equal(def.singleKey, def.combos.some(isSingleCharCombo), `${def.id} singleKey flag`);
    for (const c of def.combos) {
      const sig = `${c.key.toLowerCase()}|${!!c.mod}|${!!c.shift}|${!!c.alt}`;
      assert.ok(!combos.has(sig), `duplicate combo ${sig}`);
      combos.add(sig);
    }
  }
  assert.equal(ids.size, 18);
});

test('formatShortcut: ⌘ / ⇧ / ⌥ on Mac, Ctrl+ / Shift+ / Alt+ elsewhere', () => {
  const def = (id: string) => SHORTCUTS.find((s) => s.id === id)!;
  assert.deepEqual(formatShortcut(def('undo'), true), ['⌘Z']);
  assert.deepEqual(formatShortcut(def('undo'), false), ['Ctrl+Z']);
  assert.deepEqual(formatShortcut(def('newCategory'), true), ['⇧N']);
  assert.deepEqual(formatShortcut(def('newCategory'), false), ['Shift+N']);
  assert.deepEqual(formatShortcut(def('moveUp'), true), ['⌥↑']);
  assert.deepEqual(formatShortcut(def('moveUp'), false), ['Alt+↑']);
  assert.deepEqual(formatShortcut(def('open'), false), ['Enter', 'E']);
  assert.deepEqual(formatShortcut(def('search'), true), ['/']);
  assert.deepEqual(formatShortcut(def('delete'), false), ['Del', 'Backspace']);
});

test('ariaKeyShortcuts lists both platforms for ⌘/Ctrl combos', () => {
  const def = (id: string) => SHORTCUTS.find((s) => s.id === id)!;
  assert.equal(ariaKeyShortcuts(def('undo')), 'Meta+Z Control+Z');
  assert.equal(ariaKeyShortcuts(def('moveUp')), 'Alt+ArrowUp');
  assert.equal(ariaKeyShortcuts(def('newCategory')), 'Shift+N');
});
