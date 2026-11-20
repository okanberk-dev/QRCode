'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEYS, safeSessionGet, safeSessionRemove, safeSessionSet } from '../kit/storage';
import type { SetupCategory } from '../menu-setup';

export type SetupEntry = 'template' | 'paste';

/** What the setup wizard keeps in this tab while the owner works (spec §10). */
export interface SetupDraftState {
  entry: SetupEntry;
  /** 0 = Tür / Yapıştır, 1 = Kategoriler, 2 = Ürünler. */
  step: 0 | 1 | 2;
  /** Furthest step reached (the step tracker lets the owner jump back to it). */
  reached: 0 | 1 | 2;
  /** Picked starter preset id, `'custom'`, or null. */
  choice: string | null;
  list: SetupCategory[];
  pasteText: string;
  /** The paste text `list` was built from (going back and changing it rebuilds the list). */
  listFromPaste: string | null;
}

const SAVE_DELAY_MS = 300;

const isStep = (v: unknown): v is 0 | 1 | 2 => v === 0 || v === 1 || v === 2;

function parse(raw: string | null): SetupDraftState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<SetupDraftState>;
    if (v.entry !== 'template' && v.entry !== 'paste') return null;
    if (!isStep(v.step) || !isStep(v.reached)) return null;
    if (!Array.isArray(v.list) || typeof v.pasteText !== 'string') return null;
    const list = v.list.filter(
      (c): c is SetupCategory =>
        !!c && typeof c.key === 'string' && typeof c.name === 'string' && typeof c.itemsText === 'string',
    );
    return {
      entry: v.entry,
      step: v.step,
      reached: v.reached,
      choice: typeof v.choice === 'string' ? v.choice : null,
      list,
      pasteText: v.pasteText,
      listFromPaste: typeof v.listFromPaste === 'string' ? v.listFromPaste : null,
    };
  } catch {
    return null;
  }
}

/**
 * Session copy of the setup wizard (`buaze:menu-setup:<restaurantId>`, spec
 * §10): a reload or an accidental navigation does not lose the categories and
 * pasted items. Saves are debounced (300 ms) and flushed when the wizard goes
 * away; `clear()` after the menu is created. Storage failures are ignored.
 */
export function useSetupDraft(restaurantId: string): {
  /** The draft found when the page opened (null = none). */
  restored: SetupDraftState | null;
  save: (state: SetupDraftState) => void;
  clear: () => void;
} {
  const key = STORAGE_KEYS.setup(restaurantId);
  const [restored] = useState(() => parse(safeSessionGet(key)));
  const timer = useRef<number | null>(null);
  const pendingState = useRef<SetupDraftState | null>(null);

  const flush = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    const state = pendingState.current;
    pendingState.current = null;
    if (state) safeSessionSet(key, JSON.stringify(state));
  }, [key]);

  const save = useCallback(
    (state: SetupDraftState) => {
      pendingState.current = state;
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  const clear = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    pendingState.current = null;
    safeSessionRemove(key);
  }, [key]);

  useEffect(() => flush, [flush]);

  return { restored, save, clear };
}
