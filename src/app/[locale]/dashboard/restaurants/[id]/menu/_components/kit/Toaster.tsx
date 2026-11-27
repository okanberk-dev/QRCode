'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import type { MenuCopy } from '../menu-i18n';
import {
  EMPTY_UNDO, canUndo as canUndoNow, pushUndo as pushEntry, takeById, takeLatest, undoSettled,
  type UndoEntry, type UndoState,
} from '../menu-undo';
import { useKeyboardInset } from '../menu-ui';

/**
 * One toast at a time + the undo stack (spec §5.5). A newer toast replaces the
 * visible one; its undo entry stays in the stack (⌘Z / toolbar Undo can still
 * reach it). Durations: 8 s with "Geri al", 4 s otherwise, errors until
 * dismissed; hover / focus pauses the timer.
 *
 * Silent entries (`pushUndo`) are for inline edits, quick-add and photos: no
 * toast, the SaveIndicator offers a transient "Geri al" instead (G4).
 */

type Tone = 'success' | 'error' | 'info';
type UndoRun = UndoEntry['run'];

export interface ToastOptions {
  message: string;
  tone?: Tone;
  undo?: UndoRun;
  undoLabel?: string;
  action?: { label: string; run: () => void };
  durationMs?: number;
  /** Inside an open modal the toast would sit behind Radix's inert layer: push the undo entry only. */
  silentIfModal?: boolean;
}

export interface ToasterApi {
  notify: (o: ToastOptions) => void;
  /** Silent undo entry; returns its id. */
  pushUndo: (label: string, run: UndoRun) => string;
  undoLatest: () => Promise<void>;
  undoById: (id: string) => Promise<void>;
  dismiss: () => void;
}

export interface ToasterState {
  canUndo: boolean;
  lastSilentUndo: { id: string; at: number } | null;
}

interface VisibleToast {
  key: number;
  message: string;
  tone: Tone;
  undoId: string | null;
  undoLabel: string | null;
  action: { label: string; run: () => void } | null;
  durationMs: number | null;
  busy: boolean;
}

const ApiContext = createContext<ToasterApi | null>(null);
const StateContext = createContext<ToasterState>({ canUndo: false, lastSilentUndo: null });

let entrySeq = 0;
const newEntryId = () => `u${Date.now().toString(36)}${(entrySeq += 1).toString(36)}`;

/** A modal is open: the shared `Modal` (`aria-modal`) or a Radix sheet (`data-state="open"`). */
export const isModalOpen = (): boolean =>
  typeof document !== 'undefined' &&
  document.querySelector('[role="dialog"][aria-modal="true"], [role="dialog"][data-state="open"]') !== null;
const modalOpen = isModalOpen;

export function ToasterProvider({
  copy,
  published,
  children,
}: {
  copy: MenuCopy;
  /** Lime "live" dot on toasts while the menu is published. */
  published: boolean;
  children: ReactNode;
}) {
  // The ref is read synchronously by the actions; the state copy re-renders `canUndo`.
  const undoRef = useRef<UndoState>(EMPTY_UNDO);
  const [undoState, setUndoState] = useState<UndoState>(EMPTY_UNDO);
  const [toast, setToast] = useState<VisibleToast | null>(null);
  const [lastSilentUndo, setLastSilentUndo] = useState<{ id: string; at: number } | null>(null);
  const [announce, setAnnounce] = useState('');
  const copyRef = useRef(copy);
  copyRef.current = copy;

  const setUndo = useCallback((next: UndoState) => {
    if (next === undoRef.current) return;
    undoRef.current = next;
    setUndoState(next);
  }, []);

  const show = useCallback((t: Omit<VisibleToast, 'key'>) => {
    setToast({ ...t, key: Date.now() + Math.random() });
    if (t.tone !== 'error') setAnnounce(t.message);
  }, []);

  const notify = useCallback(
    (o: ToastOptions) => {
      let undoId: string | null = null;
      if (o.undo) {
        undoId = newEntryId();
        setUndo(pushEntry(undoRef.current, { id: undoId, label: o.message, createdAt: Date.now(), run: o.undo }, Date.now()));
      }
      if (o.silentIfModal && modalOpen()) return;
      const tone = o.tone ?? 'success';
      show({
        message: o.message,
        tone,
        undoId,
        undoLabel: o.undo ? (o.undoLabel ?? copyRef.current.toast.undo) : null,
        action: o.action ?? null,
        durationMs: tone === 'error' ? null : (o.durationMs ?? (o.undo ? 8000 : 4000)),
        busy: false,
      });
    },
    [setUndo, show],
  );

  const pushUndo = useCallback(
    (label: string, run: UndoRun) => {
      const id = newEntryId();
      setUndo(pushEntry(undoRef.current, { id, label, createdAt: Date.now(), run }, Date.now()));
      setLastSilentUndo({ id, at: Date.now() });
      return id;
    },
    [setUndo],
  );

  const runEntry = useCallback(
    async (taken: { state: UndoState; entry: UndoEntry | null }) => {
      if (!taken.entry) return;
      const entry = taken.entry;
      setUndo(taken.state);
      setLastSilentUndo((cur) => (cur && cur.id === entry.id ? null : cur));
      show({
        message: copyRef.current.toast.undoing,
        tone: 'info',
        undoId: null,
        undoLabel: null,
        action: null,
        durationMs: null,
        busy: true,
      });
      let result: { ok: boolean; message?: string };
      try {
        result = await entry.run();
      } catch {
        result = { ok: false };
      }
      setUndo(undoSettled(undoRef.current));
      if (result.ok) {
        show({ message: copyRef.current.toast.undone, tone: 'info', undoId: null, undoLabel: null, action: null, durationMs: 4000, busy: false });
      } else {
        show({
          message: result.message ?? copyRef.current.save.error,
          tone: 'error',
          undoId: null,
          undoLabel: null,
          action: null,
          durationMs: null,
          busy: false,
        });
      }
    },
    [setUndo, show],
  );

  const undoLatest = useCallback(() => runEntry(takeLatest(undoRef.current, Date.now())), [runEntry]);
  const undoById = useCallback((id: string) => runEntry(takeById(undoRef.current, id, Date.now())), [runEntry]);
  const dismiss = useCallback(() => setToast(null), []);

  // A dismissed toast's entry stays in the stack: ⌘Z / the toolbar can still
  // reach it for its whole 29 minutes.
  const api = useMemo<ToasterApi>(
    () => ({ notify, pushUndo, undoLatest, undoById, dismiss }),
    [notify, pushUndo, undoLatest, undoById, dismiss],
  );
  const state = useMemo<ToasterState>(
    () => ({ canUndo: canUndoNow(undoState, Date.now()), lastSilentUndo }),
    [undoState, lastSilentUndo],
  );

  return (
    <ApiContext.Provider value={api}>
      <StateContext.Provider value={state}>
        {children}
        {/* `contents`: the dashboard shell sizes its direct children (`[&>*]:w-full`), which would
            stretch the absolute sr-only region to the panel's width (sideways overflow) and the fixed bar. */}
        <div className="contents">
          <div role="status" aria-live="polite" className="sr-only">
            {announce}
          </div>
          {toast && (
            <ToastBar
              key={toast.key}
              toast={toast}
              copy={copy}
              published={published}
              onUndo={(id) => void undoById(id)}
              onDismiss={dismiss}
            />
          )}
        </div>
      </StateContext.Provider>
    </ApiContext.Provider>
  );
}

function ToastBar({
  toast, copy, published, onUndo, onDismiss,
}: {
  toast: VisibleToast;
  copy: MenuCopy;
  published: boolean;
  onUndo: (id: string) => void;
  onDismiss: () => void;
}) {
  const inset = useKeyboardInset();
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.durationMs);
  const startedAt = useRef(0);

  useEffect(() => {
    if (remaining.current === null || paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(onDismiss, remaining.current);
    return () => {
      window.clearTimeout(timer);
      if (remaining.current !== null) remaining.current = Math.max(800, remaining.current - (Date.now() - startedAt.current));
    };
  }, [paused, onDismiss]);

  const error = toast.tone === 'error';
  const live = published && !error && !toast.busy;
  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={inset > 0 ? { bottom: inset + 12 } : undefined}
      className={`fixed inset-x-4 bottom-[calc(var(--dash-bottom-nav-h,0px)+var(--menu-stack,0px)+12px)] z-[65] mx-auto flex max-w-[560px] items-center gap-3 rounded-[24px] border px-4 py-3 shadow-lg bz-toast-in sm:inset-x-auto sm:left-1/2 sm:w-[min(560px,calc(100vw-56px))] sm:-translate-x-1/2 lg:bottom-[calc(var(--menu-stack,0px)+24px)] ${
        error ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]' : 'border-pn-ink-2 bg-pn-ink text-white'
      }`}
    >
      {toast.busy ? (
        <Loader2 size={14} className="shrink-0 animate-spin" aria-hidden="true" />
      ) : live ? (
        <span className="h-2 w-2 shrink-0 rounded-full bg-pn-accent" aria-hidden="true" />
      ) : null}
      <p role={error ? 'alert' : undefined} className="min-w-0 flex-1 text-[13px] font-medium leading-snug">
        {toast.message}
        {live && <span className="sr-only"> {copy.toast.liveSr}</span>}
      </p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.run();
            onDismiss();
          }}
          className={`h-11 shrink-0 rounded-[14px] px-3 text-[13px] font-medium pointer-fine:h-9 ${
            error ? 'bg-white text-[#991B1B] ring-1 ring-[#FECACA]' : 'bg-pn-accent text-pn-ink'
          }`}
        >
          {toast.action.label}
        </button>
      )}
      {toast.undoId && (
        <button
          type="button"
          onClick={() => toast.undoId && onUndo(toast.undoId)}
          className="h-11 shrink-0 rounded-[14px] bg-pn-accent px-3 pointer-fine:h-9 text-[13px] font-medium text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {toast.undoLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={copy.toast.dismiss}
        className={`bz-btn-icon h-11 w-11 shrink-0 pointer-fine:h-8 pointer-fine:w-8 ${error ? '' : 'bz-btn-icon-on-dark'}`}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

export function useToaster(): ToasterApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useToaster must be used inside <ToasterProvider>');
  return api;
}

export function useToasterState(): ToasterState {
  return useContext(StateContext);
}
