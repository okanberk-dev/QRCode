/**
 * The builder's undo stack (Menu Studio, spec §5.5 / §8.14).
 *
 * Every reversible change pushes one entry (a toast's "Geri al", the
 * SaveIndicator's transient "Geri al", the toolbar Undo button and ⌘/Ctrl+Z
 * all run entries from here). Undo only — no redo. At most `UNDO_LIMIT`
 * entries, each valid for `UNDO_MAX_AGE_MS`: one minute less than the server's
 * restore window, so an offered undo of a delete never hits `RESTORE_EXPIRED`.
 * Session only (nothing is stored).
 *
 * Pure state transitions; the toaster owns the state and runs the entries.
 */
import { MENU_RESTORE_WINDOW_MS } from '@/lib/menu-restore';

export interface UndoEntry {
  id: string;
  /** What will be undone, for screen readers and the toast ("“Ayran” silindi"). */
  label: string;
  createdAt: number;
  run: () => Promise<{ ok: boolean; message?: string }>;
}

export interface UndoState {
  /** Oldest first. */
  entries: UndoEntry[];
  /** Id of the entry being undone right now (others are ignored meanwhile). */
  running: string | null;
}

export const UNDO_LIMIT = 20;
export const UNDO_MAX_AGE_MS = MENU_RESTORE_WINDOW_MS - 60_000; // 29 min

export const EMPTY_UNDO: UndoState = { entries: [], running: null };

/** Drop entries older than `UNDO_MAX_AGE_MS`. Same state object when nothing expired. */
export function pruneUndo(state: UndoState, now: number): UndoState {
  const entries = state.entries.filter((e) => now - e.createdAt <= UNDO_MAX_AGE_MS);
  return entries.length === state.entries.length ? state : { ...state, entries };
}

/** Add an entry on top; the oldest falls off beyond `UNDO_LIMIT`. */
export function pushUndo(state: UndoState, entry: UndoEntry, now: number): UndoState {
  const entries = [...pruneUndo(state, now).entries.filter((e) => e.id !== entry.id), entry];
  return { ...state, entries: entries.slice(Math.max(0, entries.length - UNDO_LIMIT)) };
}

/**
 * Take the newest live entry off the stack and mark it running. Nothing is
 * taken (`entry: null`) while another undo is still running or when the stack
 * is empty.
 */
export function takeLatest(state: UndoState, now: number): { state: UndoState; entry: UndoEntry | null } {
  if (state.running !== null) return { state, entry: null };
  const pruned = pruneUndo(state, now);
  const entry = pruned.entries[pruned.entries.length - 1] ?? null;
  if (!entry) return { state: pruned, entry: null };
  return { state: { entries: pruned.entries.slice(0, -1), running: entry.id }, entry };
}

/** Take one entry by id (a toast's own "Geri al"). Same rules as `takeLatest`. */
export function takeById(
  state: UndoState,
  id: string,
  now: number,
): { state: UndoState; entry: UndoEntry | null } {
  if (state.running !== null) return { state, entry: null };
  const pruned = pruneUndo(state, now);
  const entry = pruned.entries.find((e) => e.id === id) ?? null;
  if (!entry) return { state: pruned, entry: null };
  return { state: { entries: pruned.entries.filter((e) => e.id !== id), running: entry.id }, entry };
}

export function removeUndo(state: UndoState, id: string): UndoState {
  if (!state.entries.some((e) => e.id === id)) return state;
  return { ...state, entries: state.entries.filter((e) => e.id !== id) };
}

/** The running undo finished (whatever the outcome). */
export function undoSettled(state: UndoState): UndoState {
  return state.running === null ? state : { ...state, running: null };
}

/** Whether ⌘Z / the toolbar button has anything to undo. */
export function canUndo(state: UndoState, now: number): boolean {
  return state.running === null && pruneUndo(state, now).entries.length > 0;
}
