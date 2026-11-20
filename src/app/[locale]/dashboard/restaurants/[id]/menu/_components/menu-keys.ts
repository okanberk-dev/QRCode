/**
 * Keyboard shortcuts of the builder — one table for the key handler and the
 * "Klavye kısayolları" dialog (Menu Studio, spec §9).
 *
 * Rules that matter on Turkish keyboards:
 *  - compare `e.key` (the character typed), never `e.code` (the physical key):
 *    on Turkish Q and F layouts the keys sit elsewhere;
 *  - letters match case-insensitively, with an explicit Shift flag (Shift+N
 *    arrives as 'N'); symbols ('/', '?') match exactly and ignore Shift
 *    (on Turkish Q, '/' is Shift+7);
 *  - ⌘ on Mac, Ctrl elsewhere.
 * Single-character shortcuts can be switched off ("Tek tuş kısayolları",
 * WCAG 2.1.4); combinations with ⌘/Ctrl or Alt and named keys (Enter, Esc,
 * arrows, Delete) keep working.
 *
 * Pure and React-free (node:test).
 */

export type ShortcutId =
  | 'search'
  | 'help'
  | 'newItem'
  | 'newCategory'
  | 'togglePreview'
  | 'undo'
  | 'escape'
  | 'rowPrev'
  | 'rowNext'
  | 'open'
  | 'toggleSoldOut'
  | 'toggleHidden'
  | 'select'
  | 'move'
  | 'duplicate'
  | 'delete'
  | 'moveUp'
  | 'moveDown';

export interface ShortcutCombo {
  /** `KeyboardEvent.key`: a lower-case letter, a symbol, or a named key ('Enter', 'ArrowUp', …). */
  key: string;
  /** ⌘ on Mac, Ctrl elsewhere. */
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export interface ShortcutDef {
  id: ShortcutId;
  combos: ShortcutCombo[];
  /** `page`: anywhere on the builder; `row`: only with focus on a row of the outline. */
  scope: 'page' | 'row';
  /** Has a single-character combo (turned off with "Tek tuş kısayolları"). */
  singleKey: boolean;
  group: 'general' | 'rows';
  label: { tr: string; en: string };
}

export const SHORTCUTS: readonly ShortcutDef[] = [
  { id: 'search', combos: [{ key: '/' }], scope: 'page', singleKey: true, group: 'general', label: { tr: 'Ürün ara', en: 'Search items' } },
  { id: 'help', combos: [{ key: '?' }], scope: 'page', singleKey: true, group: 'general', label: { tr: 'Klavye kısayolları', en: 'Keyboard shortcuts' } },
  { id: 'newItem', combos: [{ key: 'n' }], scope: 'page', singleKey: true, group: 'general', label: { tr: 'Bu kategoriye ürün ekle', en: 'Add an item to this category' } },
  { id: 'newCategory', combos: [{ key: 'n', shift: true }], scope: 'page', singleKey: true, group: 'general', label: { tr: 'Yeni kategori', en: 'New category' } },
  { id: 'togglePreview', combos: [{ key: 'p' }], scope: 'page', singleKey: true, group: 'general', label: { tr: 'Önizlemeyi aç / kapat', en: 'Show / hide the preview' } },
  { id: 'undo', combos: [{ key: 'z', mod: true }], scope: 'page', singleKey: false, group: 'general', label: { tr: 'Son değişikliği geri al', en: 'Undo the last change' } },
  { id: 'escape', combos: [{ key: 'Escape' }], scope: 'page', singleKey: false, group: 'general', label: { tr: 'Vazgeç, kapat ya da temizle', en: 'Cancel, close or clear' } },
  { id: 'rowPrev', combos: [{ key: 'ArrowUp' }], scope: 'row', singleKey: false, group: 'rows', label: { tr: 'Önceki ürün', en: 'Previous item' } },
  { id: 'rowNext', combos: [{ key: 'ArrowDown' }], scope: 'row', singleKey: false, group: 'rows', label: { tr: 'Sonraki ürün', en: 'Next item' } },
  { id: 'open', combos: [{ key: 'Enter' }, { key: 'e' }], scope: 'row', singleKey: true, group: 'rows', label: { tr: 'Ayrıntıları aç', en: 'Open details' } },
  { id: 'toggleSoldOut', combos: [{ key: 's' }], scope: 'row', singleKey: true, group: 'rows', label: { tr: 'Satışta ⇄ Tükendi', en: 'Available ⇄ Sold out' } },
  { id: 'toggleHidden', combos: [{ key: 'h' }], scope: 'row', singleKey: true, group: 'rows', label: { tr: 'Gizle ⇄ Göster', en: 'Hide ⇄ Show' } },
  { id: 'select', combos: [{ key: 'x' }], scope: 'row', singleKey: true, group: 'rows', label: { tr: 'Seç / seçimi kaldır', en: 'Select / unselect' } },
  { id: 'move', combos: [{ key: 'm' }], scope: 'row', singleKey: true, group: 'rows', label: { tr: 'Başka kategoriye taşı…', en: 'Move to category…' } },
  { id: 'duplicate', combos: [{ key: 'd', mod: true }], scope: 'row', singleKey: false, group: 'rows', label: { tr: 'Kopyasını oluştur', en: 'Duplicate' } },
  { id: 'delete', combos: [{ key: 'Delete' }, { key: 'Backspace' }], scope: 'row', singleKey: false, group: 'rows', label: { tr: 'Sil (geri alınabilir)', en: 'Delete (can be undone)' } },
  { id: 'moveUp', combos: [{ key: 'ArrowUp', alt: true }], scope: 'row', singleKey: false, group: 'rows', label: { tr: 'Yukarı taşı', en: 'Move up' } },
  { id: 'moveDown', combos: [{ key: 'ArrowDown', alt: true }], scope: 'row', singleKey: false, group: 'rows', label: { tr: 'Aşağı taşı', en: 'Move down' } },
];

/** A letter, digit or symbol typed on its own (WCAG 2.1.4 "character key" shortcut). */
export function isSingleCharCombo(combo: ShortcutCombo): boolean {
  return combo.key.length === 1 && !combo.mod && !combo.alt;
}

const isLetter = (key: string): boolean => key.length === 1 && key.toLowerCase() !== key.toUpperCase();

const NON_TEXT_INPUTS = new Set([
  'button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit',
]);

/** Focus is in something that takes text (shortcuts must not steal the keystroke). */
export function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = (el.tagName || '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    return !NON_TEXT_INPUTS.has(type);
  }
  if ((el as HTMLElement).isContentEditable) return true;
  const editable = el.getAttribute('contenteditable');
  if (editable !== null && editable.toLowerCase() !== 'false') return true;
  return el.getAttribute('role') === 'combobox';
}

export interface ShortcutKeyEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing: boolean;
}

export interface ShortcutContext {
  isMac: boolean;
  /** "Tek tuş kısayolları" switch (default on). */
  singleKeysEnabled: boolean;
  /** Focus is in a text field (`isTypingTarget`). */
  typing: boolean;
  /** A modal dialog (`[role=dialog][aria-modal=true]`) is open. */
  modalOpen: boolean;
  /** A PulseMenu (`[role=menu]`) is open. */
  menuOpen: boolean;
  /** Focus is on a row (`[data-item-id]`) inside `#menu-items-pane`. */
  inRow: boolean;
}

function comboMatches(combo: ShortcutCombo, e: ShortcutKeyEvent, isMac: boolean): boolean {
  const mod = isMac ? e.metaKey : e.ctrlKey;
  // The other platform's modifier (Ctrl on Mac, the Windows key elsewhere).
  const otherMod = isMac ? e.ctrlKey : e.metaKey;

  if (combo.mod) {
    if (!mod || otherMod) return false;
    if (Boolean(combo.alt) !== e.altKey || Boolean(combo.shift) !== e.shiftKey) return false;
    return e.key.toLowerCase() === combo.key.toLowerCase();
  }

  if (combo.key.length === 1 && !isLetter(combo.key)) {
    // Symbol: exact character, Shift ignored. AltGr (Ctrl+Alt on Windows) may produce it.
    const altGr = !isMac && e.ctrlKey && e.altKey;
    if (!altGr && (mod || otherMod || e.altKey)) return false;
    return e.key === combo.key;
  }

  if (mod || otherMod) return false;
  if (Boolean(combo.alt) !== e.altKey) return false;
  if (Boolean(combo.shift) !== e.shiftKey) return false;
  if (isLetter(combo.key)) return e.key.length === 1 && e.key.toLowerCase() === combo.key;
  return e.key === combo.key;
}

/**
 * Which shortcut a keydown is, or null. Esc is always reported (the handler
 * runs its cascade); everything else waits while typing, while a modal or a
 * menu is open, and row shortcuts need focus on a row.
 */
export function matchShortcut(e: ShortcutKeyEvent, ctx: ShortcutContext): ShortcutId | null {
  if (e.isComposing) return null;
  for (const def of SHORTCUTS) {
    for (const combo of def.combos) {
      if (!comboMatches(combo, e, ctx.isMac)) continue;
      if (def.id === 'escape') return def.id;
      if (ctx.typing || ctx.modalOpen || ctx.menuOpen) return null;
      if (!ctx.singleKeysEnabled && isSingleCharCombo(combo)) return null;
      if (def.scope === 'row' && !ctx.inRow) return null;
      return def.id;
    }
  }
  return null;
}

const KEY_LABELS: Record<string, { mac: string; other: string }> = {
  ArrowUp: { mac: '↑', other: '↑' },
  ArrowDown: { mac: '↓', other: '↓' },
  Escape: { mac: 'Esc', other: 'Esc' },
  Enter: { mac: '↩', other: 'Enter' },
  Delete: { mac: '⌦', other: 'Del' },
  Backspace: { mac: '⌫', other: 'Backspace' },
};

/** Labels for the dialog, one per combo: `⌘Z` / `Ctrl+Z`, `⇧N` / `Shift+N`, `⌥↑` / `Alt+↑`. */
export function formatShortcut(def: ShortcutDef, isMac: boolean): string[] {
  return def.combos.map((combo) => {
    const named = KEY_LABELS[combo.key];
    const key = named ? (isMac ? named.mac : named.other) : combo.key.length === 1 ? combo.key.toUpperCase() : combo.key;
    const parts: string[] = [];
    if (combo.mod) parts.push(isMac ? '⌘' : 'Ctrl');
    if (combo.alt) parts.push(isMac ? '⌥' : 'Alt');
    if (combo.shift) parts.push(isMac ? '⇧' : 'Shift');
    parts.push(key);
    return isMac ? parts.join('') : parts.join('+');
  });
}

/** For `aria-keyshortcuts` (WAI-ARIA syntax: `Meta+Z Control+Z`). */
export function ariaKeyShortcuts(def: ShortcutDef): string {
  const out: string[] = [];
  for (const combo of def.combos) {
    const key = combo.key.length === 1 ? combo.key.toUpperCase() : combo.key;
    const prefix = `${combo.alt ? 'Alt+' : ''}${combo.shift ? 'Shift+' : ''}`;
    if (combo.mod) out.push(`Meta+${prefix}${key}`, `Control+${prefix}${key}`);
    else out.push(`${prefix}${key}`);
  }
  return out.join(' ');
}
